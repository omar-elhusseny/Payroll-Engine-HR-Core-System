import { Queue, Worker } from 'bullmq';
import Decimal from 'decimal.js';
import { redis } from '../cache/redis.js';
import prisma from '../prisma/client.js';
import { calculateNetSalary } from '../modules/payroll/payroll.engine.js';

export const payrollQueue = new Queue('payroll', {
    connection: redis,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
    },
});

const worker = new Worker('payroll', async (job) => {
    const { payrollRunId, companyId, month, year } = job.data;

    console.log(`[Payroll] Starting run ${payrollRunId} for company ${companyId}`);

    await prisma.payrollRun.update({
        where: { id: payrollRunId },
        data: { status: 'PROCESSING' },
    });

    const employees = await prisma.employee.findMany({
        where: { companyId, status: 'ACTIVE' },
    });

    // Fetch all approved undeducted advances for this company
    const advances = await prisma.advance.findMany({
        where: {
            employee: { companyId },
            status: 'APPROVED',
            deductedInId: null,
        },
    });

    // Fetch all attendance deductions for this month that haven't been consumed yet
    const attendanceDeductions = await prisma.deduction.findMany({
        where: {
            employee: { companyId },
            month,
            year,
            deductedInId: null,
        },
    });

    // Group advances by employee
    const advancesByEmployee = advances.reduce((map, adv) => {
        if (!map[adv.employeeId]) map[adv.employeeId] = [];
        map[adv.employeeId].push(adv);
        return map;
    }, {});

    // Group deductions by employee
    const deductionByEmployee = attendanceDeductions.reduce((map, d) => {
        map[d.employeeId] = d;
        return map;
    }, {});

    let processed = 0;

    for (const employee of employees) {
        const employeeAdvances = advancesByEmployee[employee.id] || [];
        const attendanceDeduction = deductionByEmployee[employee.id] || null;

        const totalAdvances = employeeAdvances.reduce((sum, a) => sum + Number(a.amount), 0);
        const totalAttendanceDeduction = attendanceDeduction ? Number(attendanceDeduction.totalAmount) : 0;

        const result = calculateNetSalary({
            grossSalary: Number(employee.grossSalary),
            advances: totalAdvances,
            deductions: totalAttendanceDeduction,
        });

        await prisma.$transaction([
            prisma.payslip.create({
                data: {
                    employeeId: employee.id,
                    payrollRunId,
                    grossSalary: result.grossSalary,
                    insuranceEmployee: result.insuranceEmployee,
                    insuranceEmployer: result.insuranceEmployer,
                    taxDeduction: result.taxDeduction,
                    advanceDeduction: result.advanceDeduction,
                    attendanceDeduction: new Decimal(totalAttendanceDeduction).toDecimalPlaces(2),
                    otherDeductions: result.otherDeductions,
                    netSalary: result.netSalary,
                },
            }),
            // Mark all advances as deducted in this run
            ...employeeAdvances.map(adv =>
                prisma.advance.update({
                    where: { id: adv.id },
                    data: { deductedInId: payrollRunId },
                })
            ),
            // Mark attendance deduction as consumed by this run
            ...(attendanceDeduction ? [
                prisma.deduction.update({
                    where: { id: attendanceDeduction.id },
                    data: { deductedInId: payrollRunId },
                }),
            ] : []),
        ]);

        // Update stored netSalary on employee record
        // await prisma.employee.update({
        //     where: { id: employee.id },
        //     data: { netSalary: result.netSalary },
        // });

        processed++;
        await job.updateProgress(Math.round((processed / employees.length) * 100));
    }

    await prisma.payrollRun.update({
        where: { id: payrollRunId },
        data: { status: 'DONE' },
    });

    console.log(`[Payroll] Run ${payrollRunId} complete — ${processed} payslips generated`);
    return { processed };

}, { connection: redis, concurrency: 1 });

worker.on('completed', (job, result) => {
    console.log(`[Payroll] Job ${job.id} completed:`, result);
});

worker.on('failed', async (job, err) => {
    console.error(`[Payroll] Job ${job.id} failed:`, err.message);
    if (job.attemptsMade >= job.opts.attempts) {
        await prisma.payrollRun.update({
            where: { id: job.data.payrollRunId },
            data: { status: 'FAILED' },
        }).catch(() => { });
    }
});

export default payrollQueue;
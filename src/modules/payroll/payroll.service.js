import prisma from '../../prisma/client.js';
import { payrollQueue } from '../../queues/payroll.queue.js';
import { calculateNetSalary, verifyCalculation } from './payroll.engine.js';

export async function triggerPayrollRun({ companyId, month, year, triggeredBy }) {
    const now = new Date();
    if (year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1)) {
        const err = new Error('Cannot run payroll for a future month');
        err.status = 400;
        throw err;
    }

    const existing = await prisma.payrollRun.findUnique({
        where: { companyId_month_year: { companyId, month, year } },
    });

    if (existing) {
        const err = new Error(`Payroll for ${month}/${year} already exists with status: ${existing.status}`);
        err.status = 409;
        throw err;
    }

    const run = await prisma.payrollRun.create({
        data: { companyId, month, year, triggeredBy, status: 'PENDING' },
    });

    await payrollQueue.add(
        `payroll-${run.id}`,
        { payrollRunId: run.id, companyId, month, year },
        { jobId: run.id }
    );

    return run;
}

export async function getPayrollRuns({ companyId }) {
    return prisma.payrollRun.findMany({
        where: { companyId },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        include: { _count: { select: { payslips: true } } },
    });
}

export async function getPayrollRunStatus({ runId, companyId }) {
    const run = await prisma.payrollRun.findUnique({
        where: { id: runId },
        include: { _count: { select: { payslips: true } } },
    });

    if (!run || run.companyId !== companyId) {
        const err = new Error('Payroll run not found');
        err.status = 404;
        throw err;
    }

    let queueProgress = null;
    if (run.status === 'PROCESSING' || run.status === 'PENDING') {
        const job = await payrollQueue.getJob(runId);
        if (job) queueProgress = { progress: await job.progress, attempts: job.attemptsMade };
    }

    return { ...run, queueProgress };
}

export async function getPayslipsForRun({ runId, companyId }) {
    const run = await prisma.payrollRun.findUnique({ where: { id: runId } });
    if (!run || run.companyId !== companyId) {
        const err = new Error('Payroll run not found');
        err.status = 404;
        throw err;
    }

    return prisma.payslip.findMany({
        where: { payrollRunId: runId },
        include: { employee: { select: { id: true, name: true, jobTitle: true } } },
        orderBy: { employee: { name: 'asc' } },
    });
}

export async function getMyPayslips({ employeeId }) {
    return prisma.payslip.findMany({
        where: { employeeId },
        include: { payrollRun: { select: { month: true, year: true, status: true } } },
        orderBy: [
            { payrollRun: { year: 'desc' } },
            { payrollRun: { month: 'desc' } },
        ],
    });
}

export async function previewPayslip({ employeeId, companyId }) {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });

    if (!employee || employee.companyId !== companyId) {
        const err = new Error('Employee not found');
        err.status = 404;
        throw err;
    }

    const pendingAdvances = await prisma.advance.findMany({
        where: { employeeId, status: 'APPROVED', deductedInId: null },
    });

    const totalAdvances = pendingAdvances.reduce((sum, a) => sum + Number(a.amount), 0);

    return calculateNetSalary({
        grossSalary: Number(employee.baseSalary),
        advances: totalAdvances,
    });
}

export async function complianceCheck({ grossSalary, claimedNetSalary }) {
    return verifyCalculation({ grossSalary, claimedNetSalary });
}
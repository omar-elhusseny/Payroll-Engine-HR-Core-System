import Decimal from 'decimal.js';
import prisma from '../../prisma/client.js';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// Egyptian labor law treats a month as 30 working days.
// A working day is 8 hours = 480 minutes.
// ─────────────────────────────────────────────────────────────
const WORKING_DAYS_PER_MONTH = 30;
const MINUTES_PER_DAY = 8 * 60; // 480

// ─────────────────────────────────────────────────────────────
// deriveRates
// All rates derived from grossSalary — never hardcoded.
//
// dailyRate  = grossSalary / 30
// minuteRate = dailyRate   / 480
// ─────────────────────────────────────────────────────────────
function deriveRates(grossSalary) {
    const gross = new Decimal(grossSalary);
    const dailyRate = gross.dividedBy(WORKING_DAYS_PER_MONTH).toDecimalPlaces(4);
    const minuteRate = dailyRate.dividedBy(MINUTES_PER_DAY).toDecimalPlaces(6);

    return { dailyRate, minuteRate };
}

// ─────────────────────────────────────────────────────────────
// calculateAttendanceDeductions
// Analyses one employee's attendance for a given month and
// writes (or updates) a Deduction record with the amounts.
//
// Absent  = working days with no valid clock-in record.
// Late    = lateMinutes already stored on each Attendance row
//           at clock-in time by the geo service.
//
// Safe to call multiple times — uses upsert, so re-running
// before payroll simply refreshes the numbers.
// ─────────────────────────────────────────────────────────────
export async function calculateAttendanceDeductions({
    employeeId,
    companyId,
    month,
    year,
}) {
    // 1. Verify employee exists and belongs to this company
    const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
    });

    if (!employee || employee.companyId !== companyId) {
        const err = new Error('Employee not found');
        err.status = 404;
        throw err;
    }

    // 2. Fetch all valid attendance records for this employee this month
    const startDate = new Date(year, month - 1, 1);  // e.g. 2026-04-01 00:00:00
    const endDate = new Date(year, month, 1);       // e.g. 2026-05-01 00:00:00

    const attendances = await prisma.attendance.findMany({
        where: {
            employeeId,
            isValid: true,  // only geo-fence-passed records count as present
            clockIn: { gte: startDate, lt: endDate },
        },
    });

    // 3. Count distinct calendar days the employee actually showed up
    const presentDays = new Set(
        attendances.map(attendance => new Date(attendance.clockIn).toDateString())
    ).size;

    // 4. Absent days = 30 − present days (capped at 0)
    const absentDays = Math.max(0, WORKING_DAYS_PER_MONTH - presentDays);

    // 5. Sum all late minutes recorded across the month
    const totalLateMinutes = attendances.reduce(
        (sum, attendance) => sum + (attendance.lateMinutes ?? 0),
        0
    );

    // 6. Calculate deduction amounts
    const { dailyRate, minuteRate } = deriveRates(employee.grossSalary);

    const absenceAmount = dailyRate.times(absentDays).toDecimalPlaces(2);
    const latenessAmount = minuteRate.times(totalLateMinutes).toDecimalPlaces(2);
    const totalAmount = absenceAmount.plus(latenessAmount).toDecimalPlaces(2);

    // 7. Upsert — create if first time, update if HR re-runs before payroll
    const deduction = await prisma.deduction.upsert({
        where: { employeeId_month_year: { employeeId, month, year } },
        create: {
            employeeId,
            month,
            year,
            absentDays,
            lateMinutes: totalLateMinutes,
            absenceAmount,
            latenessAmount,
            totalAmount,
        },
        update: {
            absentDays,
            lateMinutes: totalLateMinutes,
            absenceAmount,
            latenessAmount,
            totalAmount,
        },
    });

    return deduction;
}

// ─────────────────────────────────────────────────────────────
// calculateAllDeductionsForCompany
// HR calls this once before triggering a payroll run.
// Loops through all active employees and upserts their
// deduction record for the given month.
// ─────────────────────────────────────────────────────────────
export async function calculateAllDeductionsForCompany({ companyId, month, year }) {
    const employees = await prisma.employee.findMany({
        where: { companyId, status: 'ACTIVE' },
        select: { id: true },
    });

    if (employees.length === 0) {
        return [];
    }

    // Run all calculations in parallel — each upserts independently
    const results = await Promise.all(
        employees.map(employee =>
            calculateAttendanceDeductions({
                employeeId: employee.id,
                companyId,
                month,
                year,
            })
        )
    );

    return results;
}
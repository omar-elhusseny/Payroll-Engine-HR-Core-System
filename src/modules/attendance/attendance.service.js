import prisma from '../../prisma/client.js';
import { isWithinFence, calculateLateMinutes } from './geo.js';
import {
    calculateAttendanceDeductions,
    calculateAllDeductionsForCompany,
} from './attendance.dedution.js';

// ─────────────────────────────────────────────────────────────
// clockIn
// Employee sends their GPS coordinates.
// Backend checks geo-fence and calculates late minutes.
// Both results are stored immediately on the record.
// ─────────────────────────────────────────────────────────────
export async function clockIn({ employeeId, companyId, locationId, latitude, longitude }) {
    // Verify location belongs to this company
    const location = await prisma.officeLocation.findUnique({
        where: { id: locationId },
    });

    if (!location || location.companyId !== companyId) {
        const err = new Error('Location not found');
        err.status = 404;
        throw err;
    }

    // Guard: employee cannot clock in twice on the same day
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const existingToday = await prisma.attendance.findFirst({
        where: {
            employeeId,
            clockIn: { gte: startOfDay, lt: endOfDay },
        },
    });

    if (existingToday) {
        const err = new Error('Already clocked in today');
        err.status = 409;
        throw err;
    }

    // Geo-fence check
    const { isValid, distance } = isWithinFence({
        employeeLat: latitude,
        employeeLon: longitude,
        officeLat: location.latitude,
        officeLon: location.longitude,
        radiusMeters: location.fenceRadiusM,
    });

    // Late minutes — calculated against the location's shift start time
    const now = new Date();
    const lateMinutes = calculateLateMinutes(now, location.shiftStartTime);

    const attendance = await prisma.attendance.create({
        data: {
            employeeId,
            locationId,
            clockIn: now,
            latitude,
            longitude,
            isValid,
            lateMinutes,
        },
    });

    return {
        ...attendance,
        distance, // metres from the office — useful for the employee to see
        message: isValid
            ? lateMinutes > 0
                ? `Clocked in ${lateMinutes} minutes late`
                : 'Clocked in on time'
            : `Outside geo-fence (${distance}m from office). Clock-in recorded but marked invalid.`,
    };
}

// ─────────────────────────────────────────────────────────────
// clockOut
// Employee clocks out. Sets clockOut on today's attendance record.
// ─────────────────────────────────────────────────────────────
export async function clockOut({ employeeId }) {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const attendance = await prisma.attendance.findFirst({
        where: {
            employeeId,
            clockIn: { gte: startOfDay, lt: endOfDay },
            clockOut: null, // hasn't clocked out yet
        },
    });

    if (!attendance) {
        const err = new Error('No active clock-in found for today');
        err.status = 404;
        throw err;
    }

    const updated = await prisma.attendance.update({
        where: { id: attendance.id },
        data: { clockOut: new Date() },
    });

    return updated;
}

// ─────────────────────────────────────────────────────────────
// getMonthlyAttendance
// Returns all attendance records for an employee for a given month.
// HR or manager can pass any employeeId.
// An employee can only query their own.
// ─────────────────────────────────────────────────────────────
export async function getMonthlyAttendance({ employeeId, companyId, month, year, requesterId, requesterRole }) {
    // Employees can only view their own attendance
    if (requesterRole === 'EMPLOYEE' && requesterId !== employeeId) {
        const err = new Error('You can only view your own attendance');
        err.status = 403;
        throw err;
    }

    // Verify employee belongs to this company
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee || employee.companyId !== companyId) {
        const err = new Error('Employee not found');
        err.status = 404;
        throw err;
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const records = await prisma.attendance.findMany({
        where: {
            employeeId,
            clockIn: { gte: startDate, lt: endDate },
        },
        orderBy: { clockIn: 'asc' },
    });

    // Build a summary alongside the raw records
    const validDays = records.filter(record => record.isValid).length;
    const totalLateMinutes = records.reduce((totalMinutes, record) => totalMinutes + record.lateMinutes, 0);

    return {
        records,
        summary: {
            totalDays: records.length,
            validDays,
            invalidDays: records.length - validDays,
            absentDays: Math.max(0, 30 - validDays), // 30-day Egyptian month
            totalLateMinutes,
        },
    };
}

// ─────────────────────────────────────────────────────────────
// triggerDeductionCalculation
// HR calls this before running payroll to compute attendance
// deductions for all employees. Safe to call multiple times —
// it upserts, so re-running just refreshes the numbers.
// ─────────────────────────────────────────────────────────────
export async function triggerDeductionCalculation({ companyId, month, year }) {
    return calculateAllDeductionsForCompany({ companyId, month, year });
}

// ─────────────────────────────────────────────────────────────
// getDeductionSummary
// Returns all attendance deductions for a company for a given
// month so HR can review before triggering payroll.
// ─────────────────────────────────────────────────────────────
export async function getDeductionSummary({ companyId, month, year }) {
    return prisma.deduction.findMany({
        where: {
            month,
            year,
            employee: { companyId },
        },
        include: {
            employee: { select: { id: true, name: true, jobTitle: true } },
        },
        orderBy: { totalAmount: 'desc' },
    });
}
import { z } from 'zod';
import {
    clockIn,
    clockOut,
    getMonthlyAttendance,
    triggerDeductionCalculation,
    getDeductionSummary,
} from './attendance.service.js';

// ── Validation schemas ────────────────────────────────────────

const clockInSchema = z.object({
    locationId: z.string().cuid(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
});

const monthSchema = z.object({
    month: z.coerce.number().int().min(1).max(12),
    year: z.coerce.number().int().min(2020).max(2100),
});

// ── Controllers ───────────────────────────────────────────────

export async function clockInHandler(req, res, next) {
    try {
        const data = clockInSchema.parse(req.body);
        const result = await clockIn({
            employeeId: req.user.employeeId,
            companyId: req.user.companyId,
            ...data,
        });
        res.status(201).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
}

export async function clockOutHandler(req, res, next) {
    try {
        const result = await clockOut({ employeeId: req.user.employeeId });
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
}

export async function monthlyAttendance(req, res, next) {
    try {
        const { month, year } = monthSchema.parse(req.query);
        const result = await getMonthlyAttendance({
            employeeId: req.params.employeeId,
            companyId: req.user.companyId,
            month,
            year,
            requesterId: req.user.employeeId,
            requesterRole: req.user.role,
        });
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
}

// HR only — calculate deductions for all employees before payroll
export async function calculateDeductions(req, res, next) {
    try {
        const { month, year } = monthSchema.parse(req.body);
        const results = await triggerDeductionCalculation({
            companyId: req.user.companyId,
            month,
            year,
        });
        res.json({
            success: true,
            message: `Deductions calculated for ${results.length} employees`,
            data: results,
        });
    } catch (err) {
        next(err);
    }
}

// HR only — review deductions before running payroll
export async function deductionSummary(req, res, next) {
    try {
        const { month, year } = monthSchema.parse(req.query);
        const data = await getDeductionSummary({
            companyId: req.user.companyId,
            month,
            year,
        });
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
}
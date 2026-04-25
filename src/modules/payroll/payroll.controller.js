import { z } from 'zod';
import {
    triggerPayrollRun,
    getPayrollRuns,
    getPayrollRunStatus,
    getPayslipsForRun,
    getMyPayslips,
    previewPayslip,
    complianceCheck,
} from './payroll.service.js';

// ── Validation schemas ────────────────────────────────────────

const triggerSchema = z.object({
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2020).max(2100),
});

const complianceSchema = z.object({
    grossSalary: z.number().positive(),
    claimedNetSalary: z.number().positive(),
});

// ── Controllers ───────────────────────────────────────────────

export async function trigger(req, res, next) {
    try {
        const { month, year } = triggerSchema.parse(req.body);
        const run = await triggerPayrollRun({
            companyId: req.user.companyId,
            month,
            year,
            triggeredBy: req.user.employeeId,
        });
        res.status(202).json({
            success: true,
            message: 'Payroll run started. Processing in background.',
            data: run,
        });
    } catch (err) {
        next(err);
    }
}

export async function listRuns(req, res, next) {
    try {
        const runs = await getPayrollRuns({ companyId: req.user.companyId });
        res.json({ success: true, data: runs });
    } catch (err) {
        next(err);
    }
}

export async function runStatus(req, res, next) {
    try {
        const status = await getPayrollRunStatus({
            runId: req.params.runId,
            companyId: req.user.companyId,
        });
        res.json({ success: true, data: status });
    } catch (err) {
        next(err);
    }
}

export async function runPayslips(req, res, next) {
    try {
        const payslips = await getPayslipsForRun({
            runId: req.params.runId,
            companyId: req.user.companyId,
        });
        res.json({ success: true, data: payslips });
    } catch (err) {
        next(err);
    }
}

export async function myPayslips(req, res, next) {
    try {
        const payslips = await getMyPayslips({ employeeId: req.user.employeeId });
        res.json({ success: true, data: payslips });
    } catch (err) {
        next(err);
    }
}

export async function preview(req, res, next) {
    try {
        const result = await previewPayslip({
            employeeId: req.params.employeeId,
            companyId: req.user.companyId,
        });
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
}

// Public — no auth middleware on this route
export async function compliance(req, res, next) {
    try {
        const data = complianceSchema.parse(req.body);
        const result = await complianceCheck(data);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
}
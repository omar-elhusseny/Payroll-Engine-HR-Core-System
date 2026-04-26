import { z } from 'zod';
import {
    requestAdvance,
    decideAdvance,
    listAdvances,
    getAdvance,
    cancelAdvance,
} from './advances.service.js';

// ── Validation schemas ────────────────────────────────────────

const requestSchema = z.object({
    amount: z.number().positive(),
    reason: z.string().min(5, 'Please provide a reason of at least 5 characters').optional(),
});

const decideSchema = z.object({
    decision: z.enum(['APPROVED', 'REJECTED']),
});

const listSchema = z.object({
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});

// ── Controllers ───────────────────────────────────────────────

export async function request(req, res, next) {
    try {
        const { amount, reason } = requestSchema.parse(req.body);
        // employeeId always from JWT — employee can only request for themselves
        const advance = await requestAdvance({
            employeeId: req.user.employeeId,
            amount,
            reason,
        });
        res.status(201).json({ success: true, data: advance });
    } catch (err) {
        next(err);
    }
}

export async function decide(req, res, next) {
    try {
        const { decision } = decideSchema.parse(req.body);
        const advance = await decideAdvance({
            advanceId: req.params.advanceId,
            companyId: req.user.companyId,
            approverId: req.user.employeeId,
            decision,
        });
        res.json({ success: true, data: advance });
    } catch (err) {
        next(err);
    }
}

export async function list(req, res, next) {
    try {
        const filters = listSchema.parse(req.query);
        const result = await listAdvances({
            companyId: req.user.companyId,
            employeeId: req.user.employeeId,
            role: req.user.role,
            filters,
        });
        res.json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
}

export async function getOne(req, res, next) {
    try {
        const advance = await getAdvance({
            advanceId: req.params.advanceId,
            companyId: req.user.companyId,
            employeeId: req.user.employeeId,
            role: req.user.role,
        });
        res.json({ success: true, data: advance });
    } catch (err) {
        next(err);
    }
}

export async function cancel(req, res, next) {
    try {
        const result = await cancelAdvance({
            advanceId: req.params.advanceId,
            employeeId: req.user.employeeId,
        });
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
}
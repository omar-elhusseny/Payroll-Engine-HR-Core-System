import { z } from 'zod';
import {
    createEmployee,
    listEmployees,
    getEmployee,
    updateEmployee,
    terminateEmployee,
    getEmployeeSummary,
} from './employees.service.js';

// ── Validation schemas ────────────────────────────────────────

const createSchema = z.object({
    name: z.string().min(2),
    nationalId: z.string().length(14, 'Egyptian National ID must be 14 digits').regex(/^\d+$/),
    baseSalary: z.number().positive(),
    jobTitle: z.string().optional(),
    hireDate: z.string().datetime({ offset: true }).or(z.string().date()),
    departmentId: z.string().cuid().optional(),
});

// All fields optional for partial update
const updateSchema = z.object({
    name: z.string().min(2).optional(),
    baseSalary: z.number().positive().optional(),
    jobTitle: z.string().optional(),
    departmentId: z.string().cuid().optional(),
    status: z.enum(['ACTIVE', 'ON_LEAVE', 'TERMINATED']).optional(),
}).strict(); // .strict() rejects any extra fields not in the schema

const listSchema = z.object({
    status: z.enum(['ACTIVE', 'ON_LEAVE', 'TERMINATED']).optional(),
    departmentId: z.string().cuid().optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});

// ── Controllers ───────────────────────────────────────────────

export async function create(req, res, next) {
    try {
        const data = createSchema.parse(req.body);
        const companyId = req.user.companyId; // from JWT — never from body
        const employee = await createEmployee({ companyId, data });
        res.status(201).json({ success: true, data: employee });
    } catch (err) {
        next(err);
    }
}

export async function list(req, res, next) {
    try {
        const filters = listSchema.parse(req.query);
        const companyId = req.user.companyId;
        const result = await listEmployees({ companyId, filters });
        res.json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
}

export async function getOne(req, res, next) {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;
        const employee = await getEmployee({ id, companyId });
        res.json({ success: true, data: employee });
    } catch (err) {
        next(err);
    }
}

export async function update(req, res, next) {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;
        const data = updateSchema.parse(req.body);
        const employee = await updateEmployee({ id, companyId, data });
        res.json({ success: true, data: employee });
    } catch (err) {
        next(err);
    }
}

export async function terminate(req, res, next) {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;
        const employee = await terminateEmployee({ id, companyId });
        res.json({ success: true, data: employee });
    } catch (err) {
        next(err);
    }
}

export async function summary(req, res, next) {
    try {
        const companyId = req.user.companyId;
        const data = await getEmployeeSummary({ companyId });
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
}
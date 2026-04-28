import { z } from 'zod';
import {
    createCompany,
    getCompany,
    updateCompany,
    createDepartment,
    listDepartments,
    updateDepartment,
    deleteDepartment,
    createLocation,
    listLocations,
    updateLocation,
    deleteLocation,
} from './companies.service.js';

// ── Validation schemas ────────────────────────────────────────

const createCompanySchema = z.object({
    name: z.string().min(2),
    taxId: z.string().min(9, 'Invalid Egyptian Tax ID'),
    industry: z.string().optional(),
});

const updateCompanySchema = z.object({
    name: z.string().min(2).optional(),
    industry: z.string().optional(),
}).strict();

const departmentSchema = z.object({
    name: z.string().min(2),
    managerId: z.string().cuid().optional(),
});

const locationSchema = z.object({
    name: z.string().min(2),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    fenceRadiusM: z.number().int().positive().default(50),
    shiftStartTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:MM').default('09:00'),
    shiftEndTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:MM').default('17:00'),
});

const updateLocationSchema = locationSchema.partial().strict();
const updateDepartmentSchema = departmentSchema.partial().strict();

// ── Company controllers ───────────────────────────────────────

export async function create(req, res, next) {
    try {
        const data = createCompanySchema.parse(req.body);
        const company = await createCompany(data);
        res.status(201).json({ success: true, data: company });
    } catch (err) {
        next(err);
    }
}

export async function getOne(req, res, next) {
    try {
        // companyId always from JWT — users can only see their own company
        const company = await getCompany({ companyId: req.user.companyId });
        res.json({ success: true, data: company });
    } catch (err) {
        next(err);
    }
}

export async function update(req, res, next) {
    try {
        const data = updateCompanySchema.parse(req.body);
        const company = await updateCompany({ companyId: req.user.companyId, data });
        res.json({ success: true, data: company });
    } catch (err) {
        next(err);
    }
}

// ── Department controllers ────────────────────────────────────

export async function createDept(req, res, next) {
    try {
        const data = departmentSchema.parse(req.body);
        const dept = await createDepartment({ companyId: req.user.companyId, ...data });
        res.status(201).json({ success: true, data: dept });
    } catch (err) {
        next(err);
    }
}

export async function listDepts(req, res, next) {
    try {
        const data = await listDepartments({ companyId: req.user.companyId });
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
}

export async function updateDept(req, res, next) {
    try {
        const data = updateDepartmentSchema.parse(req.body);
        const dept = await updateDepartment({
            departmentId: req.params.departmentId,
            companyId: req.user.companyId,
            data,
        });
        res.json({ success: true, data: dept });
    } catch (err) {
        next(err);
    }
}

export async function deleteDept(req, res, next) {
    try {
        const result = await deleteDepartment({
            departmentId: req.params.departmentId,
            companyId: req.user.companyId,
        });
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
}

// ── Location controllers ──────────────────────────────────────

export async function createLoc(req, res, next) {
    try {
        const data = locationSchema.parse(req.body);
        const location = await createLocation({ companyId: req.user.companyId, data });
        res.status(201).json({ success: true, data: location });
    } catch (err) {
        next(err);
    }
}

export async function listLocs(req, res, next) {
    try {
        const data = await listLocations({ companyId: req.user.companyId });
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
}

export async function updateLoc(req, res, next) {
    try {
        const data = updateLocationSchema.parse(req.body);
        const location = await updateLocation({
            locationId: req.params.locationId,
            companyId: req.user.companyId,
            data,
        });
        res.json({ success: true, data: location });
    } catch (err) {
        next(err);
    }
}

export async function deleteLoc(req, res, next) {
    try {
        const result = await deleteLocation({
            locationId: req.params.locationId,
            companyId: req.user.companyId,
        });
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
}
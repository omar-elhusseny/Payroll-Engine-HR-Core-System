import prisma from '../../prisma/client.js';
import { calculateNetSalary } from '../payroll/payroll.engine.js';

// ─────────────────────────────────────────────────────────────
// createCompany
// The first thing that happens when a new client signs up.
// Creates the company record. The HR admin who registers
// will be linked to this company via their employee record.
// ─────────────────────────────────────────────────────────────
export async function createCompany({ name, taxId, industry }) {
    // Tax ID must be unique — one company per ETA registration
    const existing = await prisma.company.findUnique({ where: { taxId } });
    if (existing) {
        const err = new Error('A company with this tax ID already exists');
        err.status = 409;
        throw err;
    }

    return prisma.company.create({
        data: { name, taxId, industry },
    });
}

// ─────────────────────────────────────────────────────────────
// getCompany
// Returns company details. Only accessible by members of that company.
// companyId comes from req.user — not from a URL param —
// so an HR admin can only ever fetch their own company.
// ─────────────────────────────────────────────────────────────
export async function getCompany({ companyId }) {
    const company = await prisma.company.findUnique({
        where: { id: companyId },
        include: {
            _count: {
                select: {
                    employees: true,
                    departments: true,
                    locations: true,
                },
            },
        },
    });

    if (!company) {
        const err = new Error('Company not found');
        err.status = 404;
        throw err;
    }

    return company;
}

// ─────────────────────────────────────────────────────────────
// updateCompany
// HR admin can update company name or industry.
// taxId is intentionally excluded — it's a legal identifier
// and should not change after registration.
// ─────────────────────────────────────────────────────────────
export async function updateCompany({ companyId, data }) {
    return prisma.company.update({
        where: { id: companyId },
        data,
    });
}

// ─────────────────────────────────────────────────────────────
// DEPARTMENTS
// ─────────────────────────────────────────────────────────────

export async function createDepartment({ companyId, name, managerId }) {
    // If managerId is provided, verify the manager belongs to this company
    if (managerId) {
        const manager = await prisma.employee.findUnique({ where: { id: managerId } });
        if (!manager || manager.companyId !== companyId) {
            const err = new Error('Manager not found in your company');
            err.status = 404;
            throw err;
        }
    }

    return prisma.department.create({
        data: { companyId, name, managerId },
        include: {
            manager: { select: { id: true, name: true } },
        },
    });
}

export async function listDepartments({ companyId }) {
    return prisma.department.findMany({
        where: { companyId },
        include: {
            manager: { select: { id: true, name: true } },
            _count: { select: { employees: true } },
        },
        orderBy: { name: 'asc' },
    });
}

export async function updateDepartment({ departmentId, companyId, data }) {
    // Verify department belongs to this company
    const dept = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!dept || dept.companyId !== companyId) {
        const err = new Error('Department not found');
        err.status = 404;
        throw err;
    }

    // If updating managerId, verify new manager belongs to this company
    if (data.managerId) {
        const manager = await prisma.employee.findUnique({ where: { id: data.managerId } });
        if (!manager || manager.companyId !== companyId) {
            const err = new Error('Manager not found in your company');
            err.status = 404;
            throw err;
        }
    }

    return prisma.department.update({
        where: { id: departmentId },
        data,
        include: { manager: { select: { id: true, name: true } } },
    });
}

export async function deleteDepartment({ departmentId, companyId }) {
    const dept = await prisma.department.findUnique({
        where: { id: departmentId },
        include: { _count: { select: { employees: true } } },
    });

    if (!dept || dept.companyId !== companyId) {
        const err = new Error('Department not found');
        err.status = 404;
        throw err;
    }

    // Refuse deletion if employees are still assigned to this department
    if (dept._count.employees > 0) {
        const err = new Error(
            `Cannot delete department with ${dept._count.employees} active employee(s). Reassign them first.`
        );
        err.status = 409;
        throw err;
    }

    await prisma.department.delete({ where: { id: departmentId } });
    return { message: 'Department deleted' };
}

// ─────────────────────────────────────────────────────────────
// OFFICE LOCATIONS
// ─────────────────────────────────────────────────────────────

export async function createLocation({ companyId, data }) {
    return prisma.officeLocation.create({
        data: { ...data, companyId },
    });
}

export async function listLocations({ companyId }) {
    return prisma.officeLocation.findMany({
        where: { companyId },
        orderBy: { name: 'asc' },
    });
}

export async function updateLocation({ locationId, companyId, data }) {
    const location = await prisma.officeLocation.findUnique({ where: { id: locationId } });
    if (!location || location.companyId !== companyId) {
        const err = new Error('Location not found');
        err.status = 404;
        throw err;
    }

    return prisma.officeLocation.update({
        where: { id: locationId },
        data,
    });
}

export async function deleteLocation({ locationId, companyId }) {
    const location = await prisma.officeLocation.findUnique({ where: { id: locationId } });
    if (!location || location.companyId !== companyId) {
        const err = new Error('Location not found');
        err.status = 404;
        throw err;
    }

    await prisma.officeLocation.delete({ where: { id: locationId } });
    return { message: 'Location deleted' };
}
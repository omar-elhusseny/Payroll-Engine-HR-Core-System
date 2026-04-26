import { prisma } from '../../prisma/client.js';

// ─────────────────────────────────────────────────────────────
// requestAdvance
// Only the employee themselves can request an advance.
// employeeId comes from req.user — never from the body.
// ─────────────────────────────────────────────────────────────
export async function requestAdvance({ employeeId, amount, reason }) {
    // Guard: employee must be ACTIVE to request an advance
    const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
    });

    if (!employee || employee.status !== 'ACTIVE') {
        const err = new Error('Only active employees can request advances');
        err.status = 403;
        throw err;
    }

    // Guard: no more than one PENDING advance at a time
    const existingPending = await prisma.advance.findFirst({
        where: { employeeId, status: 'PENDING' },
    });

    if (existingPending) {
        const err = new Error('You already have a pending advance request');
        err.status = 409;
        throw err;
    }

    // Guard: advance cannot exceed the employee's monthly gross salary
    if (amount > Number(employee.baseSalary)) {
        const err = new Error('Advance cannot exceed your monthly gross salary');
        err.status = 400;
        throw err;
    }

    const advance = await prisma.advance.create({
        data: {
            employeeId,
            amount,
            reason,
            status: 'PENDING',
        },
    });

    return advance;
}

// ─────────────────────────────────────────────────────────────
// decideAdvance
// Called by MANAGER or HR_ADMIN to approve or reject.
// approverId is the logged-in manager's employeeId from req.user.
// ─────────────────────────────────────────────────────────────
export async function decideAdvance({ advanceId, companyId, approverId, decision }) {
    // Fetch the advance and verify it belongs to this company
    const advance = await prisma.advance.findUnique({
        where: { id: advanceId },
        include: { employee: { select: { companyId: true } } },
    });

    if (!advance || advance.employee.companyId !== companyId) {
        const err = new Error('Advance not found');
        err.status = 404;
        throw err;
    }

    // State machine guard — can only decide a PENDING advance
    if (advance.status !== 'PENDING') {
        const err = new Error(`Advance is already ${advance.status.toLowerCase()}`);
        err.status = 409;
        throw err;
    }

    const updated = await prisma.advance.update({
        where: { id: advanceId },
        data: {
            status: decision,           // 'APPROVED' or 'REJECTED'
            approvedBy: approverId,
            decidedAt: new Date(),
        },
        include: {
            employee: { select: { id: true, name: true } },
        },
    });

    return updated;
}

// ─────────────────────────────────────────────────────────────
// listAdvances
// HR_ADMIN sees all advances for the company.
// MANAGER sees advances for their department's employees.
// EMPLOYEE sees only their own advances.
// The filtering logic is driven by the role passed in.
// ─────────────────────────────────────────────────────────────
export async function listAdvances({ companyId, employeeId, role, filters = {} }) {
    const { status, page = 1, limit = 20 } = filters;

    // Build the where clause based on role
    let where = {};

    if (role === 'EMPLOYEE') {
        // Employees only see their own
        where = { employeeId };
    } else if (role === 'MANAGER') {
        // Managers see advances from employees in their department
        const managedDept = await prisma.department.findFirst({
            where: { managerId: employeeId, companyId },
        });
        if (!managedDept) {
            return { data: [], pagination: { total: 0, page: 1, limit, totalPages: 0 } };
        }
        where = { employee: { departmentId: managedDept.id } };
    } else {
        // HR_ADMIN sees all advances in the company
        where = { employee: { companyId } };
    }

    // Apply optional status filter on top
    if (status) where.status = status;

    const [total, advances] = await Promise.all([
        prisma.advance.count({ where }),
        prisma.advance.findMany({
            where,
            include: {
                employee: { select: { id: true, name: true, jobTitle: true } },
                approver: { select: { id: true, name: true } },
            },
            orderBy: { requestedAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
    ]);

    return {
        data: advances,
        pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / limit),
        },
    };
}

// ─────────────────────────────────────────────────────────────
// getAdvance
// Fetch a single advance with ownership check.
// ─────────────────────────────────────────────────────────────
export async function getAdvance({ advanceId, companyId, employeeId, role }) {
    const advance = await prisma.advance.findUnique({
        where: { id: advanceId },
        include: {
            employee: { select: { id: true, name: true, companyId: true } },
            approver: { select: { id: true, name: true } },
        },
    });

    if (!advance || advance.employee.companyId !== companyId) {
        const err = new Error('Advance not found');
        err.status = 404;
        throw err;
    }

    // Employees can only view their own advance
    if (role === 'EMPLOYEE' && advance.employeeId !== employeeId) {
        const err = new Error('Advance not found');
        err.status = 404;
        throw err;
    }

    return advance;
}

// ─────────────────────────────────────────────────────────────
// cancelAdvance
// An employee can cancel their own PENDING advance.
// Once decided (APPROVED/REJECTED) it cannot be cancelled.
// ─────────────────────────────────────────────────────────────
export async function cancelAdvance({ advanceId, employeeId }) {
    const advance = await prisma.advance.findUnique({
        where: { id: advanceId },
    });

    if (!advance || advance.employeeId !== employeeId) {
        const err = new Error('Advance not found');
        err.status = 404;
        throw err;
    }

    if (advance.status !== 'PENDING') {
        const err = new Error(`Cannot cancel an advance that is already ${advance.status.toLowerCase()}`);
        err.status = 409;
        throw err;
    }

    await prisma.advance.delete({ where: { id: advanceId } });

    return { message: 'Advance request cancelled' };
} s
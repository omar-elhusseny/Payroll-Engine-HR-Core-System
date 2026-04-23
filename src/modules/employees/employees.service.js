import prisma from '../../prisma/client.js';

// ─────────────────────────────────────────────────────────────
// createEmployee
// Creates a new employee under the company of the logged-in user.
// companyId always comes from req.user — never from the request body.
// This is the multi-tenancy rule: the client never decides which
// company a record belongs to. The server decides from the JWT.
// ─────────────────────────────────────────────────────────────
export async function createEmployee({ companyId, data }) {
    // Guard: national ID must be unique globally (it's a real Egyptian ID)
    const existing = await prisma.employee.findUnique({
        where: { nationalId: data.nationalId },
    });

    if (existing) {
        const err = new Error('An employee with this national ID already exists');
        err.status = 409;
        throw err;
    }

    // If departmentId is provided, verify it belongs to this company
    if (data.departmentId) {
        const dept = await prisma.department.findUnique({
            where: { id: data.departmentId },
        });
        if (!dept || dept.companyId !== companyId) {
            const err = new Error('Department not found in your company');
            err.status = 404;
            throw err;
        }
    }

    const employee = await prisma.employee.create({
        data: {
            ...data,
            companyId, // always injected from the JWT, never from body
        },
        include: {
            department: { select: { id: true, name: true } },
        },
    });

    return employee;
}

// ─────────────────────────────────────────────────────────────
// listEmployees
// Returns all employees for the logged-in user's company.
// Supports optional filters: status, departmentId, search by name.
// ─────────────────────────────────────────────────────────────
export async function listEmployees({ companyId, filters = {} }) {
    const { status, departmentId, search, page = 1, limit = 20 } = filters;

    const where = {
        companyId, // ALWAYS scope to the company — this is the multi-tenancy guard
        ...(status && { status }),
        ...(departmentId && { departmentId }),
        ...(search && {
            name: { contains: search, mode: 'insensitive' },
        }),
    };

    // Run count and data fetch in parallel for efficiency
    const [total, employees] = await Promise.all([
        prisma.employee.count({ where }),
        prisma.employee.findMany({
            where,
            include: {
                department: { select: { id: true, name: true } },
                // Include user to show if they have a login account
                user: { select: { id: true, email: true, role: true } },
            },
            orderBy: { name: 'asc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
    ]);

    return {
        data: employees,
        pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / limit),
        },
    };
}

// ─────────────────────────────────────────────────────────────
// getEmployee
// Fetches a single employee by ID.
// The companyId check here is critical — without it, any logged-in
// user could fetch any employee across ALL companies just by guessing IDs.
// ─────────────────────────────────────────────────────────────
export async function getEmployee({ id, companyId }) {
    const employee = await prisma.employee.findUnique({
        where: { id, companyId },
        include: {
            department: { select: { id: true, name: true } },
            user: { select: { id: true, email: true, role: true } },
        },
    });

    // Check existence AND company ownership in one step
    if (!employee || employee.companyId !== companyId) {
        const err = new Error('Employee not found');
        err.status = 404;
        throw err;
    }

    return employee;
}

// ─────────────────────────────────────────────────────────────
// updateEmployee
// Partial update — only the fields sent in the request body change.
// Prisma's update with spread handles this cleanly.
// ─────────────────────────────────────────────────────────────
export async function updateEmployee({ id, companyId, data }) {
    // First verify the employee belongs to this company
    await getEmployee({ id, companyId });

    // If updating departmentId, verify the new department belongs here too
    if (data.departmentId) {
        const dept = await prisma.department.findUnique({
            where: { id: data.departmentId },
        });
        if (!dept || dept.companyId !== companyId) {
            const err = new Error('Department not found in your company');
            err.status = 404;
            throw err;
        }
    }

    const updated = await prisma.employee.update({
        where: { id },
        data,
        include: {
            department: { select: { id: true, name: true } },
        },
    });

    return updated;
}

// ─────────────────────────────────────────────────────────────
// terminateEmployee
// We never hard-delete employees — payroll history must be preserved.
// Instead we set status = TERMINATED and record the date.
// ─────────────────────────────────────────────────────────────
export async function terminateEmployee({ id, companyId }) {
    await getEmployee({ id, companyId }); // verifies ownership

    const terminated = await prisma.employee.update({
        where: { id },
        data: { status: 'TERMINATED' },
    });

    return terminated;
}

// ─────────────────────────────────────────────────────────────
// getEmployeeSummary
// Quick stats for the HR dashboard — total headcount by status.
// ─────────────────────────────────────────────────────────────
export async function getEmployeeSummary({ companyId }) {
    const summary = await prisma.employee.groupBy({
        by: ['status'],
        where: { companyId },
        _count: { id: true },
    });

    // Transform into a readable shape
    return summary.reduce((acc, row) => {
        acc[row.status.toLowerCase()] = row._count.id;
        return acc;
    }, { active: 0, on_leave: 0, terminated: 0 });
}
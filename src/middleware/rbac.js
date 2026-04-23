// ─────────────────────────────────────────────────────────────
// authorize(...roles)
// A middleware factory — you call it with the allowed roles and
// it returns the actual middleware function.
//
// Usage in routes:
//   router.post('/payroll/run', authenticate, authorize('HR_ADMIN'), runPayroll);
//   router.patch('/advances/:id', authenticate, authorize('HR_ADMIN', 'MANAGER'), approveAdvance);
//
// IMPORTANT: always use authenticate BEFORE authorize.
// authorize reads req.user which authenticate sets.
// ─────────────────────────────────────────────────────────────
export function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            // Should never happen if routes are set up correctly,
            // but this is a defensive check
            return res.status(401).json({
                success: false,
                error: 'Not authenticated',
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: `Access denied. Required role: ${roles.join(' or ')}`,
            });
        }

        next();
    };
}

// ─────────────────────────────────────────────────────────────
// sameCompany
// An extra guard for multi-tenancy.
// Ensures the resource being accessed belongs to the same company
// as the logged-in user. Protects against a user from Company A
// accessing data from Company B even with a valid token.
//
// Usage: attach after authenticate on any route with a companyId param
//   router.get('/companies/:companyId/employees', authenticate, sameCompany, listEmployees);
// ─────────────────────────────────────────────────────────────
export function sameCompany(req, res, next) {
    const requestedCompanyId = req.params.companyId;

    if (requestedCompanyId && requestedCompanyId !== req.user.companyId) {
        return res.status(403).json({
            success: false,
            error: 'Access denied. You do not belong to this company.',
        });
    }

    next();
}
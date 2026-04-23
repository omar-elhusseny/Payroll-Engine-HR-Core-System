import jwt from 'jsonwebtoken';

// ─────────────────────────────────────────────────────────────
// authenticate
// Reads the Authorization header, verifies the JWT, and attaches
// the decoded payload to req.user so every downstream handler
// knows who is making the request without hitting the database.
//
// Usage in routes:
//   router.get('/payroll', authenticate, payrollController.list);
// ─────────────────────────────────────────────────────────────
export function authenticate(req, res, next) {
    // The header must look like: Authorization: Bearer <token>
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: 'Missing or malformed Authorization header',
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        // jwt.verify throws if the token is expired, tampered, or invalid
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach to request — now every handler can read req.user
        // decoded contains: { userId, employeeId, companyId, role }
        req.user = decoded;

        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired token',
        });
    }
}
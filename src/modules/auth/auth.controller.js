import { z } from 'zod';
import { registerUser, loginUser } from './auth.service.js';

// ── Validation schemas ────────────────────────────────────────
// Validating the request body with zod before it touches the service.
// If validation fails, Zod throws — the error handler catches it.

const registerSchema = z.object({
    employeeId: z.string().cuid(),
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(['HR_ADMIN', 'MANAGER', 'EMPLOYEE']).optional(),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

// ── Controllers ───────────────────────────────────────────────

export async function register(req, res, next) {
    try {
        // parse() throws a ZodError if the body is invalid
        const data = registerSchema.parse(req.body);
        const user = await registerUser(data);
        res.status(201).json({ success: true, data: user });
    } catch (err) {
        next(err); // passes to the global error handler in app.js
    }
}

export async function login(req, res, next) {
    try {
        const data = loginSchema.parse(req.body);
        const result = await loginUser(data);
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
}

// Returns the currently logged-in user's profile
// req.user is attached by the auth middleware
export async function me(req, res) {
    res.json({ success: true, data: req.user });
}
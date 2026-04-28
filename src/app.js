// ── Import dependencies ────────────────────────────────────────────────────
import express from 'express';
import cors from 'cors';

// ── Import local files ────────────────────────────────────────────────────
import authRoutes from './modules/auth/auth.routes.js';
import employeeRoutes from './modules/employees/employees.routes.js';
import payrollRoutes from './modules/payroll/payroll.routes.js';
import attendanceRoutes from './modules/attendance/attendance.routes.js';
import advanceRoutes from './modules/advances/advances.routes.js';
import companyRoutes from './modules/companies/companies.routes.js';

const app = express();

// ── Global middleware ────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Health check ─────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/advances', advanceRoutes);
app.use('/api/companies', companyRoutes);

// ── Global error handler ─────────────────────────────────────
app.use((err, req, res, next) => {
    // Handle Zod validation errors with clean field-level messages
    if (err.name === 'ZodError') {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: (err.issues || []).map(e => ({
                field: e.path.join('.'),
                message: e.message,
            })),
        });
    }

    console.error(err.stack);
    const status = err.status || 500;
    res.status(status).json({
        success: false,
        error: {
            message: err.message || 'Internal server error',
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        },
    });
});

export default app;
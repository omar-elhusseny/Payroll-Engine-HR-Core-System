import express from 'express';
import cors from 'cors';

// import authRoutes from './modules/auth/auth.routes.js';
// import employeeRoutes from './modules/employees/employees.routes.js';
// import payrollRoutes from './modules/payroll/payroll.routes.js';
// import attendanceRoutes from './modules/attendance/attendance.routes.js';
// import advanceRoutes from './modules/advances/advances.routes.js';
// import companyRoutes from './modules/companies/companies.routes.js';

const app = express();

// ── Global middleware ────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Health check ─────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Routes ────────────────────────────────────────────────────
// app.use('/api/auth',       authRoutes);
// app.use('/api/employees',  employeeRoutes);
// app.use('/api/payroll',    payrollRoutes);
// app.use('/api/attendance', attendanceRoutes);
// app.use('/api/advances',   advanceRoutes);
// app.use('/api/companies',  companyRoutes);

// ── Global error handler ─────────────────────────────────────
// Must have 4 params for Express to treat it as an error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    const status = err.status || 500;
    res.status(status).json({
        error: {
            message: err.message || 'Internal server error',
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        },
    });
});

export default app;
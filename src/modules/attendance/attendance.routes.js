import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import {
    clockInHandler,
    clockOutHandler,
    monthlyAttendance,
    calculateDeductions,
    deductionSummary,
} from './attendance.controller.js';

const router = Router();

router.use(authenticate);

// ── Role rules ────────────────────────────────────────────────
// POST /attendance/clock-in            — any employee (themselves only)
// POST /attendance/clock-out           — any employee (themselves only)
// GET  /attendance/:employeeId/monthly — HR/manager sees anyone, employee sees own
// POST /attendance/deductions/calculate — HR_ADMIN only (run before payroll)
// GET  /attendance/deductions           — HR_ADMIN only (review before payroll)

router.post('/clock-in', clockInHandler);
router.post('/clock-out', clockOutHandler);

router.get(
    '/:employeeId/monthly',
    monthlyAttendance
);

router.post(
    '/deductions/calculate',
    authorize('HR_ADMIN'),
    calculateDeductions
);

router.get(
    '/deductions',
    authorize('HR_ADMIN'),
    deductionSummary
);

export default router;
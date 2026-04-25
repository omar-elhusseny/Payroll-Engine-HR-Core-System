import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import {
    trigger,
    listRuns,
    runStatus,
    runPayslips,
    myPayslips,
    preview,
    compliance,
} from './payroll.controller.js';

const router = Router();

// ── Public route — no token needed ───────────────────────────
// This is your GTM "free compliance audit" tool.
// Any company can POST their salary + claimed net to see if
// their tax calculations are legally correct.
router.post('/compliance-check', compliance);

// ── All routes below require authentication ───────────────────
router.use(authenticate);

// HR_ADMIN only
router.post('/run', authorize('HR_ADMIN'), trigger);
router.get('/runs', authorize('HR_ADMIN'), listRuns);
router.get('/runs/:runId', authorize('HR_ADMIN'), runStatus);
router.get('/runs/:runId/payslips', authorize('HR_ADMIN'), runPayslips);
router.get('/preview/:employeeId', authorize('HR_ADMIN'), preview);

// Any logged-in employee — sees only their own payslips
router.get('/my-payslips', myPayslips);

export default router;
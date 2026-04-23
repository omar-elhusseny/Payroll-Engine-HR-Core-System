import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { create, list, getOne, update, terminate, summary } from './employees.controller.js';

const router = Router();

// All employee routes require a valid token
router.use(authenticate);

// ── Role rules ────────────────────────────────────────────────
// GET /employees           — any logged-in user can list (their company's) employees
// GET /employees/summary   — HR_ADMIN only (salary-level insight)
// GET /employees/:id       — any logged-in user
// POST /employees          — HR_ADMIN only
// PATCH /employees/:id     — HR_ADMIN only
// DELETE /employees/:id    — HR_ADMIN only (sets status = TERMINATED)

router.get('/summary', authorize('HR_ADMIN'), summary);
router.get('/', list);
router.get('/:id', getOne);
router.post('/', authorize('HR_ADMIN'), create);
router.patch('/:id', authorize('HR_ADMIN'), update);
router.delete('/:id', authorize('HR_ADMIN'), terminate);

export default router;
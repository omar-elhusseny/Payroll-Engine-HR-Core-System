import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { request, decide, list, getOne, cancel, } from './advances.controller.js';

const router = Router();

router.use(authenticate);

// ── Role rules ────────────────────────────────────────────────
// POST   /advances             — any employee requests their own advance
// GET    /advances             — all roles see advances (filtered by role in service)
// GET    /advances/:id         — all roles (ownership enforced in service)
// PATCH  /advances/:id/decide  — MANAGER or HR_ADMIN only
// DELETE /advances/:id         — employee cancels their own PENDING advance

router.post('/', request);
router.get('/', list);
router.get('/:advanceId', getOne);
router.patch('/:advanceId/decide', authorize('MANAGER', 'HR_ADMIN'), decide);
router.delete('/:advanceId', cancel);

export default router;
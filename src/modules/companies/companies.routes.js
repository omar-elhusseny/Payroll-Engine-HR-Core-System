import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import {
    create,
    getOne,
    update,
    createDept,
    listDepts,
    updateDept,
    deleteDept,
    createLoc,
    listLocs,
    updateLoc,
    deleteLoc,
} from './companies.controller.js';

const router = Router();

// ── Company registration — public ─────────────────────────────
// This is called once during onboarding before any user exists.
// After the company is created, the first HR admin employee
// and user account are created, linked to this companyId.
router.post('/', create);

// ── All routes below require authentication ───────────────────
router.use(authenticate);

// ── Company ───────────────────────────────────────────────────
// Any logged-in user can view their own company details.
// Only HR_ADMIN can update company info.
router.get('/', getOne);
router.patch('/', authorize('HR_ADMIN'), update);

// ── Departments ───────────────────────────────────────────────
// Any logged-in user can list departments (used in dropdowns).
// Only HR_ADMIN can create, update, or delete.
router.get('/departments', listDepts);
router.post('/departments', authorize('HR_ADMIN'), createDept);
router.patch('/departments/:departmentId', authorize('HR_ADMIN'), updateDept);
router.delete('/departments/:departmentId', authorize('HR_ADMIN'), deleteDept);

// ── Office Locations ──────────────────────────────────────────
// Any logged-in user can list locations (needed for clock-in).
// Only HR_ADMIN can create, update, or delete.
router.get('/locations', listLocs);
router.post('/locations', authorize('HR_ADMIN'), createLoc);
router.patch('/locations/:locationId', authorize('HR_ADMIN'), updateLoc);
router.delete('/locations/:locationId', authorize('HR_ADMIN'), deleteLoc);

export default router;
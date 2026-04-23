import { Router } from 'express';
import { register, login, me } from './auth.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

// Public routes — no token required
router.post('/register', register);
router.post('/login',    login);

// Protected route — token required (authenticate runs first)
router.get('/me', authenticate, me);

export default router;
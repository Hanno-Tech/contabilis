import { Router } from 'express';
import { asyncHandler } from '../../lib/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { getDashboard } from './dashboard.repository.js';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

// Métricas agregadas da tela inicial.
dashboardRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await getDashboard());
  }),
);

import 'express-async-errors';
import express from 'express';
import cors from 'cors';

import { requireAuth } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.routes.js';
import ingredientsRoutes from './routes/ingredients.routes.js';
import recipesRoutes from './routes/recipes.routes.js';
import overheadRoutes from './routes/overhead.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import profileRoutes from './routes/profile.routes.js';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/ingredients', requireAuth, ingredientsRoutes);
app.use('/api/recipes', requireAuth, recipesRoutes);
app.use('/api/overhead', requireAuth, overheadRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/profile', requireAuth, profileRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

export default app;

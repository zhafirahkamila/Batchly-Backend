import { pool } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { validateOverhead, parseIdParam } from '../middleware/validate.js';
import * as overheadModel from '../models/overhead.model.js';

export async function list(req, res) {
  const rows = await overheadModel.listByUser(pool, req.user.id);
  res.json(rows);
}

export async function create(req, res) {
  const data = validateOverhead(req.body);
  const id = await overheadModel.create(pool, req.user.id, data);
  const row = await overheadModel.findByIdForUser(pool, id, req.user.id);
  res.status(201).json(row);
}

export async function update(req, res) {
  const id = parseIdParam(req.params.id);
  const data = validateOverhead(req.body);
  const affected = await overheadModel.update(pool, id, req.user.id, data);
  if (affected === 0) throw new HttpError(404, 'overhead not found');
  const row = await overheadModel.findByIdForUser(pool, id, req.user.id);
  res.json(row);
}

export async function remove(req, res) {
  const id = parseIdParam(req.params.id);
  const affected = await overheadModel.remove(pool, id, req.user.id);
  if (affected === 0) throw new HttpError(404, 'overhead not found');
  res.status(204).end();
}

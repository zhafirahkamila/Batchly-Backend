import { pool } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { validateProfileUpdate } from '../middleware/validate.js';
import * as usersModel from '../models/users.model.js';

export async function get(req, res) {
  const user = await usersModel.findById(pool, req.user.id);
  if (!user) throw new HttpError(404, 'user not found');
  res.json(user);
}

export async function update(req, res) {
  const data = validateProfileUpdate(req.body);
  const affected = await usersModel.updateProfile(pool, req.user.id, data);
  if (affected === 0) throw new HttpError(404, 'user not found');
  const user = await usersModel.findById(pool, req.user.id);
  res.json(user);
}

import { pool } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { validateIngredient, parseIdParam } from '../middleware/validate.js';
import * as ingredientsModel from '../models/ingredients.model.js';
import { pricePerBaseUnit } from '../utils/units.js';

export async function list(req, res) {
  const rows = await ingredientsModel.listByUser(pool, req.user.id);
  res.json(rows);
}

export async function create(req, res) {
  const data = validateIngredient(req.body);
  const price_per_base_unit = pricePerBaseUnit(
    data.purchase_price,
    data.purchase_qty,
    data.purchase_unit
  );
  const id = await ingredientsModel.create(pool, req.user.id, {
    ...data,
    price_per_base_unit,
  });
  const row = await ingredientsModel.findByIdForUser(pool, id, req.user.id);
  res.status(201).json(row);
}

export async function update(req, res) {
  const id = parseIdParam(req.params.id);
  const data = validateIngredient(req.body);
  const price_per_base_unit = pricePerBaseUnit(
    data.purchase_price,
    data.purchase_qty,
    data.purchase_unit
  );
  const affected = await ingredientsModel.update(pool, id, req.user.id, {
    ...data,
    price_per_base_unit,
  });
  if (affected === 0) throw new HttpError(404, 'ingredient not found');
  const row = await ingredientsModel.findByIdForUser(pool, id, req.user.id);
  res.json(row);
}

export async function remove(req, res) {
  const id = parseIdParam(req.params.id);
  const affected = await ingredientsModel.remove(pool, id, req.user.id);
  if (affected === 0) throw new HttpError(404, 'ingredient not found');
  res.status(204).end();
}

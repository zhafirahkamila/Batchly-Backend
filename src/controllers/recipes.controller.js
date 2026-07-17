import { pool, withTransaction } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { validateRecipe, parseIdParam } from '../middleware/validate.js';
import * as recipesModel from '../models/recipes.model.js';
import * as recipeIngredientsModel from '../models/recipeIngredients.model.js';
import * as recipeOverheadModel from '../models/recipeOverhead.model.js';
import * as ingredientsModel from '../models/ingredients.model.js';
import * as pricingModel from '../models/pricing.model.js';
import { convertQtyToBaseOf, unitFamily } from '../utils/units.js';

// Validate that every ingredient_id in the payload:
//   (1) belongs to the requesting user (else 400 to avoid leaking existence)
//   (2) has a purchase_unit in the same family as the recipe's chosen unit
// Runs first thing inside the txn so a race can't slip a deleted ingredient through.
async function assertIngredientsUsable(conn, userId, items) {
  const ids = [...new Set(items.map((i) => i.ingredient_id))];
  const owned = await ingredientsModel.findIdsForUser(conn, ids, userId);
  if (owned.length !== ids.length) {
    throw new HttpError(400, 'one or more ingredient_id values are invalid');
  }
  const byId = new Map(owned.map((r) => [r.id, r.purchase_unit]));
  for (const item of items) {
    const purchaseUnit = byId.get(item.ingredient_id);
    const recipeFamily = unitFamily(item.unit);
    const ingFamily = unitFamily(purchaseUnit);
    if (recipeFamily !== ingFamily) {
      throw new HttpError(
        400,
        `ingredient ${item.ingredient_id} priced in "${purchaseUnit}" (${ingFamily}) cannot be used as "${item.unit}" (${recipeFamily})`
      );
    }
  }
}

// Compute per-overhead allocated_per_unit given the linked overhead_costs row.
function allocatedPerUnit(overheadRow, ro, yieldQty) {
  if (overheadRow.period === 'per_bulan') {
    const emp = Number(ro.estimated_monthly_production);
    if (!(emp > 0)) return null;
    return overheadRow.amount / emp;
  }
  // per_batch
  return overheadRow.amount / yieldQty;
}

export async function list(req, res) {
  const rows = await recipesModel.listByUser(pool, req.user.id);
  res.json(rows);
}

export async function create(req, res) {
  const data = validateRecipe(req.body);

  const recipeId = await withTransaction(async (conn) => {
    await assertIngredientsUsable(conn, req.user.id, data.ingredients);
    const insertId = await recipesModel.create(conn, req.user.id, {
      name: data.name,
      yield_qty: data.yield_qty,
      yield_unit: data.yield_unit,
    });
    await recipeIngredientsModel.bulkInsert(conn, insertId, data.ingredients);
    return insertId;
  });

  const recipe = await recipesModel.findByIdForUser(pool, recipeId, req.user.id);
  res.status(201).json(recipe);
}

export async function detail(req, res) {
  const id = parseIdParam(req.params.id);
  const recipe = await recipesModel.findByIdForUser(pool, id, req.user.id);
  if (!recipe) throw new HttpError(404, 'recipe not found');

  const [ingredientRows, overheadRows, pricingRow] = await Promise.all([
    recipeIngredientsModel.listByRecipe(pool, id),
    recipeOverheadModel.listByRecipe(pool, id),
    pricingModel.findByRecipe(pool, id),
  ]);

  // line_cost is best-effort: if the ingredient's purchase_unit was changed
  // to an incompatible family after the recipe was saved, return null instead
  // of 500 — the detail view stays usable, and /calculate is where we hard-error.
  const ingredients = ingredientRows.map((row) => {
    let line_cost = null;
    try {
      const qtyBase = convertQtyToBaseOf(row.qty_used, row.unit, row.purchase_unit);
      line_cost = qtyBase * row.price_per_base_unit;
    } catch (err) {
      console.warn(`[recipe ${id}] line_cost skipped for ri ${row.id}: ${err.message}`);
    }
    return {
      id: row.id,
      ingredient_id: row.ingredient_id,
      name: row.name,
      category: row.category,
      qty_used: row.qty_used,
      unit: row.unit,
      purchase_unit: row.purchase_unit,
      price_per_base_unit: row.price_per_base_unit,
      line_cost,
    };
  });

  const overhead = overheadRows.map((row) => ({
    id: row.id,
    overhead_cost_id: row.overhead_cost_id,
    name: row.name,
    amount: row.amount,
    period: row.period,
    estimated_monthly_production: row.estimated_monthly_production,
    allocated_per_unit: allocatedPerUnit(row, row, recipe.yield_qty),
  }));

  res.json({
    ...recipe,
    ingredients,
    overhead,
    pricing: pricingRow || null,
  });
}

export async function update(req, res) {
  const id = parseIdParam(req.params.id);
  const data = validateRecipe(req.body);

  await withTransaction(async (conn) => {
    const owned = await recipesModel.findByIdForUser(conn, id, req.user.id);
    if (!owned) throw new HttpError(404, 'recipe not found');

    await assertIngredientsUsable(conn, req.user.id, data.ingredients);
    await recipesModel.update(conn, id, req.user.id, {
      name: data.name,
      yield_qty: data.yield_qty,
      yield_unit: data.yield_unit,
    });
    await recipeIngredientsModel.deleteByRecipe(conn, id);
    await recipeIngredientsModel.bulkInsert(conn, id, data.ingredients);
  });

  const recipe = await recipesModel.findByIdForUser(pool, id, req.user.id);
  res.json(recipe);
}

export async function remove(req, res) {
  const id = parseIdParam(req.params.id);
  const affected = await recipesModel.remove(pool, id, req.user.id);
  if (affected === 0) throw new HttpError(404, 'recipe not found');
  res.status(204).end();
}

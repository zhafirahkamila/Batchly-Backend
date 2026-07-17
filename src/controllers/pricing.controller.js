import { pool, withTransaction } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { validateCalculate, parseIdParam } from '../middleware/validate.js';
import * as recipesModel from '../models/recipes.model.js';
import * as recipeIngredientsModel from '../models/recipeIngredients.model.js';
import * as recipeOverheadModel from '../models/recipeOverhead.model.js';
import * as overheadModel from '../models/overhead.model.js';
import * as pricingModel from '../models/pricing.model.js';
import { convertQtyToBaseOf } from '../utils/units.js';
import { isPackagingCategory } from '../utils/categories.js';

// ---------------------------------------------------------------------------
// HPP (Harga Pokok Produksi / cost of production) calculation.
// Core business logic — kept in one function so the math is easy to audit.
//
// Given:
//   recipe with yield_qty (e.g. 24 pcs per batch)
//   recipe_ingredients: [{ qty_used, unit, ingredient.category,
//                         ingredient.price_per_base_unit, ingredient.purchase_unit }]
//   overhead_allocations: [{ overhead_cost_id, estimated_monthly_production, overhead.amount, overhead.period }]
//   target_margin_percent (0..99.99)
//   price_buffer_percent  (>= 0, optional — pads HPP before margin math to
//                          hedge against expected raw-material price rises)
//
// Steps:
//   1. For each recipe_ingredient row:
//        qty_in_base_unit = convert qty_used (from its unit) into the ingredient's
//                           purchase_unit family's base unit (gram/ml/pcs)
//        line_cost        = qty_in_base_unit * price_per_base_unit
//      Split rows by ingredient.category:
//        ingredient_cost_per_unit = Σ line_cost (category != 'Packaging') / yield_qty
//        packaging_cost_per_unit  = Σ line_cost (category == 'Packaging') / yield_qty
//   2. For each overhead allocation:
//        if period='per_bulan': allocated_per_unit = amount / estimated_monthly_production
//        if period='per_batch': allocated_per_unit = amount / yield_qty
//      overhead_cost_per_unit   = Σ allocated_per_unit
//   3. hpp_before_buffer = ingredient_cost_per_unit + packaging_cost_per_unit + overhead_cost_per_unit
//   4. hpp_per_unit      = hpp_before_buffer * (1 + price_buffer_percent/100)
//                          (buffer applied before margin so the margin defends the padded cost)
//   5. suggested_price   = hpp_per_unit / (1 - target_margin_percent/100)
//                          (target_margin_percent must be < 100)
//   6. profit_per_unit   = suggested_price - hpp_per_unit
// ---------------------------------------------------------------------------
export async function calculate(req, res) {
  const recipeId = parseIdParam(req.params.id);
  const { target_margin_percent, price_buffer_percent, overhead_allocations } = validateCalculate(req.body);

  // Reject duplicate overhead_cost_id in allocations — otherwise double-counted.
  const overheadIds = overhead_allocations.map((a) => a.overhead_cost_id);
  if (new Set(overheadIds).size !== overheadIds.length) {
    throw new HttpError(400, 'duplicate overhead_cost_id in allocations');
  }

  const response = await withTransaction(async (conn) => {
    const recipe = await recipesModel.findByIdForUser(conn, recipeId, req.user.id);
    if (!recipe) throw new HttpError(404, 'recipe not found');

    const yieldQty = Number(recipe.yield_qty);
    if (!(yieldQty > 0)) {
      throw new HttpError(400, 'recipe yield_qty must be > 0');
    }

    // Load ingredients + JOINed pricing.
    const ingredientRows = await recipeIngredientsModel.listByRecipe(conn, recipeId);
    if (ingredientRows.length === 0) {
      throw new HttpError(400, 'recipe has no ingredients — nothing to calculate');
    }

    // Validate every overhead_cost_id in the request is owned by this user.
    let overheadCosts = [];
    if (overheadIds.length > 0) {
      overheadCosts = await overheadModel.findByIdsForUser(conn, overheadIds, req.user.id);
      if (overheadCosts.length !== overheadIds.length) {
        throw new HttpError(400, 'one or more overhead_cost_id values are invalid');
      }
    }
    const overheadById = new Map(overheadCosts.map((o) => [o.id, o]));

    // 1. Ingredient cost breakdown — split by category (Packaging vs. everything else).
    const ingredient_breakdown = ingredientRows.map((row) => {
      const qty_in_base_unit = convertQtyToBaseOf(row.qty_used, row.unit, row.purchase_unit);
      const line_cost = qty_in_base_unit * row.price_per_base_unit;
      return {
        ingredient_id: row.ingredient_id,
        name: row.name,
        category: row.category,
        is_packaging: isPackagingCategory(row.category),
        qty_used: row.qty_used,
        unit: row.unit,
        qty_in_base_unit,
        purchase_unit: row.purchase_unit,
        price_per_base_unit: row.price_per_base_unit,
        line_cost,
      };
    });

    const ingredient_cost_total = ingredient_breakdown
      .filter((r) => !r.is_packaging)
      .reduce((s, r) => s + r.line_cost, 0);
    const packaging_cost_total = ingredient_breakdown
      .filter((r) => r.is_packaging)
      .reduce((s, r) => s + r.line_cost, 0);
    const ingredient_cost_per_unit = ingredient_cost_total / yieldQty;
    const packaging_cost_per_unit = packaging_cost_total / yieldQty;

    // 2. Overhead breakdown.
    const overhead_breakdown = overhead_allocations.map((alloc) => {
      const oc = overheadById.get(alloc.overhead_cost_id);
      let allocated_per_unit;
      if (oc.period === 'per_bulan') {
        // per_bulan requires a positive estimated_monthly_production.
        if (!(alloc.estimated_monthly_production > 0)) {
          throw new HttpError(
            400,
            `overhead ${oc.id} is per_bulan — estimated_monthly_production must be > 0`
          );
        }
        allocated_per_unit = oc.amount / alloc.estimated_monthly_production;
      } else {
        // per_batch — estimated_monthly_production is stored for audit but unused in math.
        allocated_per_unit = oc.amount / yieldQty;
      }
      return {
        overhead_cost_id: oc.id,
        name: oc.name,
        amount: oc.amount,
        period: oc.period,
        estimated_monthly_production: alloc.estimated_monthly_production,
        allocated_per_unit,
      };
    });

    const overhead_cost_per_unit = overhead_breakdown.reduce((s, r) => s + r.allocated_per_unit, 0);

    // 3-6. HPP (raw + buffered) + suggested price + profit.
    const hpp_before_buffer = ingredient_cost_per_unit + packaging_cost_per_unit + overhead_cost_per_unit;
    const hpp_per_unit = hpp_before_buffer * (1 + price_buffer_percent / 100);
    const suggested_price = hpp_per_unit / (1 - target_margin_percent / 100);
    const profit_per_unit = suggested_price - hpp_per_unit;

    // Persist: pricing row (upsert) + recipe_overhead allocations (replace).
    await pricingModel.upsert(conn, recipeId, {
      ingredient_cost_per_unit,
      packaging_cost_per_unit,
      overhead_cost_per_unit,
      price_buffer_percent,
      hpp_before_buffer,
      hpp_per_unit,
      target_margin_percent,
      suggested_price,
    });
    await recipeOverheadModel.deleteByRecipe(conn, recipeId);
    await recipeOverheadModel.bulkInsert(
      conn,
      recipeId,
      overhead_allocations.map((a) => ({
        overhead_cost_id: a.overhead_cost_id,
        estimated_monthly_production: a.estimated_monthly_production,
      }))
    );

    // Read back the pricing row so we include the DB-truncated numbers + timestamp.
    const persisted = await pricingModel.findByRecipe(conn, recipeId);

    return {
      recipe_id: recipeId,
      yield_qty: recipe.yield_qty,
      yield_unit: recipe.yield_unit,
      target_margin_percent,
      price_buffer_percent,
      ingredient_breakdown,
      overhead_breakdown,
      ingredient_cost_total,
      packaging_cost_total,
      ingredient_cost_per_unit,
      packaging_cost_per_unit,
      overhead_cost_per_unit,
      hpp_before_buffer,
      hpp_per_unit,
      suggested_price,
      profit_per_unit,
      calculated_at: persisted?.updated_at || null,
    };
  });

  res.json(response);
}

export async function getLatest(req, res) {
  const recipeId = parseIdParam(req.params.id);

  const recipe = await recipesModel.findByIdForUser(pool, recipeId, req.user.id);
  if (!recipe) throw new HttpError(404, 'recipe not found');

  const [pricingRow, overheadRows, latest] = await Promise.all([
    pricingModel.findByRecipe(pool, recipeId),
    recipeOverheadModel.listByRecipe(pool, recipeId),
    recipesModel.latestChangeTimestamp(pool, recipeId),
  ]);
  if (!pricingRow) throw new HttpError(404, 'no pricing has been calculated for this recipe yet');

  const yieldQty = Number(recipe.yield_qty);
  const overhead_allocations = overheadRows.map((row) => {
    let allocated_per_unit;
    if (row.period === 'per_bulan') {
      const emp = Number(row.estimated_monthly_production);
      allocated_per_unit = emp > 0 ? row.amount / emp : null;
    } else {
      allocated_per_unit = row.amount / yieldQty;
    }
    return {
      overhead_cost_id: row.overhead_cost_id,
      name: row.name,
      amount: row.amount,
      period: row.period,
      estimated_monthly_production: row.estimated_monthly_production,
      allocated_per_unit,
    };
  });

  // stale = pricing was calculated before the recipe or any used ingredient
  // was last updated. Signal only; server does not auto-recompute.
  const stale = latest ? String(latest) > String(pricingRow.updated_at) : false;

  const hpp = Number(pricingRow.hpp_per_unit);
  const price = Number(pricingRow.suggested_price);
  const profit_per_unit = Number.isFinite(price) && Number.isFinite(hpp) ? price - hpp : null;

  res.json({
    recipe_id: recipeId,
    ingredient_cost_per_unit: pricingRow.ingredient_cost_per_unit,
    packaging_cost_per_unit: pricingRow.packaging_cost_per_unit,
    overhead_cost_per_unit: pricingRow.overhead_cost_per_unit,
    price_buffer_percent: pricingRow.price_buffer_percent,
    hpp_before_buffer: pricingRow.hpp_before_buffer,
    hpp_per_unit: pricingRow.hpp_per_unit,
    target_margin_percent: pricingRow.target_margin_percent,
    suggested_price: pricingRow.suggested_price,
    profit_per_unit,
    calculated_at: pricingRow.updated_at,
    stale,
    overhead_allocations,
  });
}

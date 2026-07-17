import { pool } from '../config/db.js';
import * as pricingModel from '../models/pricing.model.js';

export async function summary(req, res) {
  const rows = await pricingModel.dashboardRowsForUser(pool, req.user.id);

  const items = rows.map((row) => {
    const hpp = row.hpp_per_unit;
    const price = row.suggested_price;
    let margin_percent = null;
    if (price != null && hpp != null && price > 0) {
      margin_percent = ((price - hpp) / price) * 100;
    }
    return {
      recipe_id: row.recipe_id,
      name: row.name,
      yield_qty: row.yield_qty,
      yield_unit: row.yield_unit,
      hpp_per_unit: hpp ?? null,
      suggested_price: price ?? null,
      target_margin_percent: row.target_margin_percent ?? null,
      margin_percent,
      calculated_at: row.calculated_at ?? null,
    };
  });

  // Sort ascending by margin so problem products surface first.
  // Null margins (never priced) go last so the actionable list stays on top.
  items.sort((a, b) => {
    if (a.margin_percent == null && b.margin_percent == null) return 0;
    if (a.margin_percent == null) return 1;
    if (b.margin_percent == null) return -1;
    return a.margin_percent - b.margin_percent;
  });

  res.json(items);
}

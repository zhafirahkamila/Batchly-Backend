export async function findByRecipe(conn, recipeId) {
  const [rows] = await conn.query(
    `SELECT id, recipe_id,
            ingredient_cost_per_unit, packaging_cost_per_unit, overhead_cost_per_unit,
            price_buffer_percent, hpp_before_buffer,
            hpp_per_unit, target_margin_percent, suggested_price, updated_at
     FROM pricing WHERE recipe_id = ? LIMIT 1`,
    [recipeId]
  );
  return rows[0];
}

// Upsert one pricing row per recipe. The schema has UNIQUE(recipe_id) so
// ON DUPLICATE KEY UPDATE guarantees single-row-per-recipe.
export async function upsert(conn, recipeId, {
  ingredient_cost_per_unit,
  packaging_cost_per_unit,
  overhead_cost_per_unit,
  price_buffer_percent,
  hpp_before_buffer,
  hpp_per_unit,
  target_margin_percent,
  suggested_price,
}) {
  const [result] = await conn.query(
    `INSERT INTO pricing
       (recipe_id, ingredient_cost_per_unit, packaging_cost_per_unit, overhead_cost_per_unit,
        price_buffer_percent, hpp_before_buffer,
        hpp_per_unit, target_margin_percent, suggested_price)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       ingredient_cost_per_unit = VALUES(ingredient_cost_per_unit),
       packaging_cost_per_unit = VALUES(packaging_cost_per_unit),
       overhead_cost_per_unit = VALUES(overhead_cost_per_unit),
       price_buffer_percent = VALUES(price_buffer_percent),
       hpp_before_buffer = VALUES(hpp_before_buffer),
       hpp_per_unit = VALUES(hpp_per_unit),
       target_margin_percent = VALUES(target_margin_percent),
       suggested_price = VALUES(suggested_price)`,
    [
      recipeId,
      ingredient_cost_per_unit,
      packaging_cost_per_unit,
      overhead_cost_per_unit,
      price_buffer_percent,
      hpp_before_buffer,
      hpp_per_unit,
      target_margin_percent,
      suggested_price,
    ]
  );
  return result;
}

// Dashboard query — every recipe for the user, LEFT JOINed with its latest pricing.
export async function dashboardRowsForUser(conn, userId) {
  const [rows] = await conn.query(
    `SELECT r.id AS recipe_id, r.name, r.yield_qty, r.yield_unit,
            p.hpp_per_unit, p.suggested_price, p.target_margin_percent,
            p.updated_at AS calculated_at
     FROM recipes r
     LEFT JOIN pricing p ON p.recipe_id = r.id
     WHERE r.user_id = ?`,
    [userId]
  );
  return rows;
}

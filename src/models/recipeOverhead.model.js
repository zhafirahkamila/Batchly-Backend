// Note: recipe_overhead stores estimated_monthly_production for audit, but no
// allocated_per_unit column. Allocation math is recomputed on read using the
// linked overhead_costs.amount/period + this row's estimated_monthly_production
// + the recipe's yield_qty (for per_batch entries).
export async function listByRecipe(conn, recipeId) {
  const [rows] = await conn.query(
    `SELECT ro.id, ro.recipe_id, ro.overhead_cost_id, ro.estimated_monthly_production,
            oc.name, oc.amount, oc.period
     FROM recipe_overhead ro
     JOIN overhead_costs oc ON oc.id = ro.overhead_cost_id
     WHERE ro.recipe_id = ?`,
    [recipeId]
  );
  return rows;
}

export async function bulkInsert(conn, recipeId, items) {
  if (items.length === 0) return 0;
  const values = items.map((it) => [recipeId, it.overhead_cost_id, it.estimated_monthly_production]);
  const [result] = await conn.query(
    `INSERT INTO recipe_overhead (recipe_id, overhead_cost_id, estimated_monthly_production) VALUES ?`,
    [values]
  );
  return result.affectedRows;
}

export async function deleteByRecipe(conn, recipeId) {
  const [result] = await conn.query(
    `DELETE FROM recipe_overhead WHERE recipe_id = ?`,
    [recipeId]
  );
  return result.affectedRows;
}

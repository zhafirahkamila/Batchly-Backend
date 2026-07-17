// Row shape returned by listByRecipe: joins ingredients so callers can compute
// line_cost without a second query.
export async function listByRecipe(conn, recipeId) {
  const [rows] = await conn.query(
    `SELECT ri.id, ri.recipe_id, ri.ingredient_id, ri.qty_used, ri.unit,
            i.name, i.category, i.purchase_unit, i.price_per_base_unit
     FROM recipe_ingredients ri
     JOIN ingredients i ON i.id = ri.ingredient_id
     WHERE ri.recipe_id = ?`,
    [recipeId]
  );
  return rows;
}

export async function bulkInsert(conn, recipeId, items) {
  if (items.length === 0) return 0;
  const values = items.map((it) => [recipeId, it.ingredient_id, it.qty_used, it.unit]);
  const [result] = await conn.query(
    `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, qty_used, unit) VALUES ?`,
    [values]
  );
  return result.affectedRows;
}

export async function deleteByRecipe(conn, recipeId) {
  const [result] = await conn.query(
    `DELETE FROM recipe_ingredients WHERE recipe_id = ?`,
    [recipeId]
  );
  return result.affectedRows;
}

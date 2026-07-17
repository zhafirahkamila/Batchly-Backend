export async function listByUser(conn, userId) {
  const [rows] = await conn.query(
    `SELECT id, user_id, name, yield_qty, yield_unit, created_at, updated_at
     FROM recipes WHERE user_id = ? ORDER BY name ASC`,
    [userId]
  );
  return rows;
}

export async function findByIdForUser(conn, id, userId) {
  const [rows] = await conn.query(
    `SELECT id, user_id, name, yield_qty, yield_unit, created_at, updated_at
     FROM recipes WHERE id = ? AND user_id = ? LIMIT 1`,
    [id, userId]
  );
  return rows[0];
}

export async function create(conn, userId, { name, yield_qty, yield_unit }) {
  const [result] = await conn.query(
    `INSERT INTO recipes (user_id, name, yield_qty, yield_unit) VALUES (?, ?, ?, ?)`,
    [userId, name, yield_qty, yield_unit]
  );
  return result.insertId;
}

export async function update(conn, id, userId, { name, yield_qty, yield_unit }) {
  const [result] = await conn.query(
    `UPDATE recipes SET name = ?, yield_qty = ?, yield_unit = ?
     WHERE id = ? AND user_id = ?`,
    [name, yield_qty, yield_unit, id, userId]
  );
  return result.affectedRows;
}

export async function remove(conn, id, userId) {
  const [result] = await conn.query(
    `DELETE FROM recipes WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  return result.affectedRows;
}

// The most-recent updated_at across the recipe row and the ingredients it uses.
// Used to compute the pricing.stale flag.
export async function latestChangeTimestamp(conn, recipeId) {
  const [rows] = await conn.query(
    `SELECT GREATEST(
              r.updated_at,
              COALESCE(MAX(i.updated_at), r.updated_at)
            ) AS latest
     FROM recipes r
     LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.id
     LEFT JOIN ingredients i ON i.id = ri.ingredient_id
     WHERE r.id = ?
     GROUP BY r.updated_at`,
    [recipeId]
  );
  return rows[0]?.latest || null;
}

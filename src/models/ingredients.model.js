export async function listByUser(conn, userId) {
  const [rows] = await conn.query(
    `SELECT id, user_id, name, purchase_price, purchase_qty, purchase_unit,
            price_per_base_unit, category, created_at, updated_at
     FROM ingredients WHERE user_id = ? ORDER BY name ASC`,
    [userId]
  );
  return rows;
}

export async function findByIdForUser(conn, id, userId) {
  const [rows] = await conn.query(
    `SELECT id, user_id, name, purchase_price, purchase_qty, purchase_unit,
            price_per_base_unit, category, created_at, updated_at
     FROM ingredients WHERE id = ? AND user_id = ? LIMIT 1`,
    [id, userId]
  );
  return rows[0];
}

// Returns the subset of ingredient IDs (from the given list) that belong to userId.
// Used to validate ownership before writing recipe_ingredients rows.
export async function findIdsForUser(conn, ids, userId) {
  if (ids.length === 0) return [];
  const [rows] = await conn.query(
    `SELECT id, purchase_unit FROM ingredients WHERE user_id = ? AND id IN (?)`,
    [userId, ids]
  );
  return rows;
}

export async function create(conn, userId, data) {
  const [result] = await conn.query(
    `INSERT INTO ingredients
       (user_id, name, purchase_price, purchase_qty, purchase_unit, price_per_base_unit, category)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      data.name,
      data.purchase_price,
      data.purchase_qty,
      data.purchase_unit,
      data.price_per_base_unit,
      data.category,
    ]
  );
  return result.insertId;
}

export async function update(conn, id, userId, data) {
  const [result] = await conn.query(
    `UPDATE ingredients
       SET name = ?, purchase_price = ?, purchase_qty = ?, purchase_unit = ?,
           price_per_base_unit = ?, category = ?
     WHERE id = ? AND user_id = ?`,
    [
      data.name,
      data.purchase_price,
      data.purchase_qty,
      data.purchase_unit,
      data.price_per_base_unit,
      data.category,
      id,
      userId,
    ]
  );
  return result.affectedRows;
}

export async function remove(conn, id, userId) {
  const [result] = await conn.query(
    `DELETE FROM ingredients WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  return result.affectedRows;
}

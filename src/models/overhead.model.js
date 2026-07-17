export async function listByUser(conn, userId) {
  const [rows] = await conn.query(
    `SELECT id, user_id, name, amount, period, created_at
     FROM overhead_costs WHERE user_id = ? ORDER BY name ASC`,
    [userId]
  );
  return rows;
}

export async function findByIdForUser(conn, id, userId) {
  const [rows] = await conn.query(
    `SELECT id, user_id, name, amount, period, created_at
     FROM overhead_costs WHERE id = ? AND user_id = ? LIMIT 1`,
    [id, userId]
  );
  return rows[0];
}

// Returns the subset of overhead cost rows (from the given id list) that belong to userId.
export async function findByIdsForUser(conn, ids, userId) {
  if (ids.length === 0) return [];
  const [rows] = await conn.query(
    `SELECT id, name, amount, period FROM overhead_costs
     WHERE user_id = ? AND id IN (?)`,
    [userId, ids]
  );
  return rows;
}

export async function create(conn, userId, { name, amount, period }) {
  const [result] = await conn.query(
    `INSERT INTO overhead_costs (user_id, name, amount, period) VALUES (?, ?, ?, ?)`,
    [userId, name, amount, period]
  );
  return result.insertId;
}

export async function update(conn, id, userId, { name, amount, period }) {
  const [result] = await conn.query(
    `UPDATE overhead_costs SET name = ?, amount = ?, period = ?
     WHERE id = ? AND user_id = ?`,
    [name, amount, period, id, userId]
  );
  return result.affectedRows;
}

export async function remove(conn, id, userId) {
  const [result] = await conn.query(
    `DELETE FROM overhead_costs WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  return result.affectedRows;
}

// users model — SELECT lists deliberately omit password_hash on find-by-id
// to prevent hash leakage into any controller response.

const PUBLIC_FIELDS = 'id, name, email, business_name, is_premium, created_at';

export async function findByEmail(conn, email) {
  const [rows] = await conn.query(
    `SELECT id, name, email, password_hash, business_name, is_premium, created_at
     FROM users WHERE email = ? LIMIT 1`,
    [email]
  );
  return rows[0];
}

export async function findById(conn, id) {
  const [rows] = await conn.query(
    `SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0];
}

export async function create(conn, { name, email, password_hash, business_name }) {
  const [result] = await conn.query(
    `INSERT INTO users (name, email, password_hash, business_name)
     VALUES (?, ?, ?, ?)`,
    [name, email, password_hash, business_name]
  );
  return result.insertId;
}

export async function updateProfile(conn, id, { name, business_name }) {
  const [result] = await conn.query(
    `UPDATE users SET name = ?, business_name = ? WHERE id = ?`,
    [name, business_name, id]
  );
  return result.affectedRows;
}

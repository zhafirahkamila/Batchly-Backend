import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// MySQL error codes we tolerate on re-run (make db:init idempotent).
const IGNORABLE_ERRNOS = new Set([
  1050, // ER_TABLE_EXISTS_ERROR
  1061, // ER_DUP_KEYNAME
  1826, // ER_FK_DUP_NAME
]);

async function main() {
  const {
    DB_HOST = 'localhost',
    DB_PORT = '3306',
    DB_USER = 'root',
    DB_PASSWORD = '',
    DB_NAME = 'batchly',
  } = process.env;

  const serverConn = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
  });

  await serverConn.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  console.log(`[db:init] database "${DB_NAME}" ready`);
  await serverConn.end();

  const dbConn = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    multipleStatements: true,
  });

  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  const raw = await fs.readFile(schemaPath, 'utf8');

  // Strip line comments, split on `;`, drop empty statements.
  const statements = raw
    .split('\n')
    .filter((line) => !/^\s*--/.test(line))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    try {
      await dbConn.query(stmt);
    } catch (err) {
      if (IGNORABLE_ERRNOS.has(err.errno)) {
        console.log(`[db:init] skipping (${err.code}): ${stmt.slice(0, 60)}...`);
        continue;
      }
      throw err;
    }
  }

  console.log(`[db:init] schema applied (${statements.length} statements)`);
  await dbConn.end();
}

main().catch((err) => {
  console.error('[db:init] failed:', err.message);
  process.exit(1);
});

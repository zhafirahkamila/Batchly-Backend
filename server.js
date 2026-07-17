import 'dotenv/config';
import app from './src/app.js';
import { pool } from './src/config/db.js';

const port = Number(process.env.PORT) || 3000;

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('[db] connection ok');
  } catch (err) {
    console.error('[db] failed to connect:', err.message);
    process.exit(1);
  }

  app.listen(port, () => {
    console.log(`[server] listening on http://localhost:${port}`);
  });
}

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

start();

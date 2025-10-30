import oracledb from 'oracledb';
import dotenv from 'dotenv';
dotenv.config();

let pool;

export async function initPool() {
  if (pool) return pool;
  pool = await oracledb.createPool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECT_STRING,
    poolMin: 1,
    poolMax: 10,
    poolIncrement: 1,
  });
  return pool;
}

export async function getConnection() {
  if (!pool) await initPool();
  return pool.getConnection();
}

export async function closePool() {
  if (pool) {
    await pool.close(10);
    pool = null;
  }
}

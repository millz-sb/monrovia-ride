import fs from 'fs';
import path from 'path';
import { newDb } from 'pg-mem';
import bcrypt from 'bcryptjs';

// Setup in-memory PostgreSQL instance
const memDb = newDb();

// Register any custom functions needed
memDb.public.registerFunction({
  name: 'current_database',
  implementation: () => 'monrovia_ride',
});

// Create pg-compatible adapter pool
const { Pool } = memDb.adapters.createPg();
export const pool = new Pool();

let isInitialized = false;

export async function initDatabase() {
  if (isInitialized) return;

  try {
    const schemaPath = path.resolve(process.cwd(), 'database', 'schema.sql');
    const seedPath = path.resolve(process.cwd(), 'database', 'seed.sql');

    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
      await pool.query(schemaSql);
      console.log('✅ PostgreSQL Schema initialized successfully');
    }

    if (fs.existsSync(seedPath)) {
      const seedSql = fs.readFileSync(seedPath, 'utf-8');
      
      // Update seed password hashes with real bcrypt hash for "Password123!"
      const realPasswordHash = await bcrypt.hash('Password123!', 10);
      const customizedSeedSql = seedSql.replace(/\$2a\$10\$bYg6O9Hq8Yy7iJjE5sYq2uJ3gP9oT1l3vW5sZ7aB9cD1eF3gH5iJu/g, realPasswordHash);
      
      await pool.query(customizedSeedSql);
      console.log('✅ Seed data inserted successfully for Monrovia Ride');
    }

    isInitialized = true;
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

/**
 * Execute parameterized query
 */
export async function query(text: string, params?: any[]) {
  if (!isInitialized) {
    await initDatabase();
  }
  return pool.query(text, params);
}

/**
 * Atomic transaction wrapper
 */
export async function transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
  if (!isInitialized) {
    await initDatabase();
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

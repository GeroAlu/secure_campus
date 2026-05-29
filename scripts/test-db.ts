import 'dotenv/config';
import pool from '../lib/db';

async function testConnection() {
  try {
    const res = await pool.query('SELECT COUNT(*) FROM public.users;');
    console.log('Successfully connected to DB.');
    console.log('Total users in database:', res.rows[0].count);
    
    const users = await pool.query('SELECT id, clerk_id, email, first_name, last_name, role FROM public.users LIMIT 10;');
    console.log('Sample users in DB:');
    console.table(users.rows);
  } catch (error) {
    console.error('Error connecting to DB:', error);
  } finally {
    await pool.end();
  }
}

testConnection();

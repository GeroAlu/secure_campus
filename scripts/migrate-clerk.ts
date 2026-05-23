import 'dotenv/config';
import pool from '../lib/db';
import { clerkClient } from '@clerk/nextjs/server';

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is not set in the environment variables.');
    process.exit(1);
  }

  console.log('--- Initializing database schema ---');
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS public.users (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      clerk_id VARCHAR(255) UNIQUE,
      first_name VARCHAR(255),
      last_name VARCHAR(255),
      email VARCHAR(255) UNIQUE NOT NULL,
      role VARCHAR(50) DEFAULT 'Estudiante',
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );
  `;

  try {
    await pool.query(createTableQuery);
    console.log('Schema created or already exists.');
  } catch (error) {
    console.error('Error creating schema:', error);
    process.exit(1);
  }

  console.log('--- Fetching users from Clerk ---');
  let clerkUsers;
  try {
    const client = await clerkClient();
    const usersReq = await client.users.getUserList({ limit: 500 });
    clerkUsers = usersReq.data;
    console.log(`Found ${clerkUsers.length} users in Clerk.`);
  } catch (error) {
    console.error('Error fetching from Clerk:', error);
    process.exit(1);
  }

  console.log('--- Migrating users to Supabase ---');
  let inserted = 0;
  for (const user of clerkUsers) {
    const clerkId = user.id;
    const email = user.emailAddresses[0]?.emailAddress || '';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    const role = (user.publicMetadata?.role as string) || 'Estudiante';
    
    if (!email) {
      console.warn(`Skipping user ${clerkId} because they have no email.`);
      continue;
    }

    try {
      await pool.query(
        `INSERT INTO public.users (clerk_id, first_name, last_name, email, role) 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (email) DO UPDATE SET 
           clerk_id = EXCLUDED.clerk_id,
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           role = EXCLUDED.role;`,
        [clerkId, firstName, lastName, email, role]
      );
      inserted++;
    } catch (error) {
      console.error(`Error inserting user ${email}:`, error);
    }
  }

  console.log(`Migration complete. Upserted ${inserted} users.`);
  process.exit(0);
}

migrate();

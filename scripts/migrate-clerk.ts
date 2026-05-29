import 'dotenv/config';
import pool, { getEncryptionKey } from '../lib/db';
import { clerkClient } from '@clerk/nextjs/server';

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is not set in the environment variables.');
    process.exit(1);
  }

  console.log('--- Enabling pgcrypto extension ---');
  await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

  console.log('--- Enabling pgaudit extension ---');
  await pool.query('CREATE EXTENSION IF NOT EXISTS pgaudit');
  await pool.query(`ALTER ROLE postgres SET pgaudit.log = 'write'`);

  console.log('--- Initializing database schema ---');
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS public.users (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      clerk_id BYTEA,
      clerk_id_hash TEXT UNIQUE,
      first_name VARCHAR(255),
      last_name VARCHAR(255),
      email BYTEA NOT NULL,
      email_hash TEXT UNIQUE NOT NULL,
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

  const key = getEncryptionKey();

  console.log('--- Migrating existing data to encrypted format ---');
  try {
    const migrateResult = await pool.query(
      `UPDATE public.users SET
         clerk_id = pgp_sym_encrypt(clerk_id::text, $1::text),
         clerk_id_hash = encode(digest(clerk_id::text, 'sha256'), 'hex'),
         email = pgp_sym_encrypt(email::text, $1::text),
         email_hash = encode(digest(email::text, 'sha256'), 'hex')
       WHERE email_hash IS NULL`,
      [key]
    );
    console.log(`Migrated ${migrateResult.rowCount} existing rows.`);
  } catch (error) {
    console.error('Error migrating existing data:', error);
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

    if (!user.publicMetadata?.role) {
      try {
        const client = await clerkClient();
        await client.users.updateUserMetadata(clerkId, {
          publicMetadata: {
            role: 'Estudiante'
          }
        });
        console.log(`Updated Clerk metadata for ${email} to Estudiante.`);
      } catch (metadataError) {
        console.error(`Error updating Clerk metadata for ${email}:`, metadataError);
      }
    }

    try {
      await pool.query(
        `INSERT INTO public.users (clerk_id, clerk_id_hash, first_name, last_name, email, email_hash, role) 
         VALUES (
           pgp_sym_encrypt($1::text, $6::text),
           encode(digest($1::text, 'sha256'), 'hex'),
           $2, $3,
           pgp_sym_encrypt($4::text, $6::text),
           encode(digest($4::text, 'sha256'), 'hex'),
           $5
         )
         ON CONFLICT (email_hash) DO UPDATE SET 
           clerk_id = pgp_sym_encrypt($1::text, $6::text),
           clerk_id_hash = encode(digest($1::text, 'sha256'), 'hex'),
           first_name = $2,
           last_name = $3,
           email = pgp_sym_encrypt($4::text, $6::text),
           email_hash = encode(digest($4::text, 'sha256'), 'hex'),
           role = $5;`,
        [clerkId, firstName, lastName, email, role, key]
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

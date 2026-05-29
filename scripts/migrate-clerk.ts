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
  await pool.query(`ALTER DATABASE postgres SET pgaudit.log = 'write'`);

  const key = getEncryptionKey();

  console.log('--- Initializing database schema ---');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.users (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      clerk_id BYTEA,
      clerk_id_hash TEXT,
      first_name VARCHAR(255),
      last_name VARCHAR(255),
      email BYTEA NOT NULL,
      email_hash TEXT,
      role VARCHAR(50) DEFAULT 'Estudiante',
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );
  `);
  console.log('Table ensured.');

  console.log('--- Migrating existing schema if needed ---');
  // Add hash columns if table existed before this migration
  await pool.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS clerk_id_hash TEXT`);
  await pool.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_hash TEXT`);

  // Convert VARCHAR columns to BYTEA if they haven't been converted yet
  const { rows: clerkCol } = await pool.query(
    `SELECT data_type FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'clerk_id'`
  );
  if (clerkCol[0]?.data_type === 'character varying') {
    console.log('Converting clerk_id VARCHAR → BYTEA...');
    await pool.query(
      `ALTER TABLE public.users ALTER COLUMN clerk_id TYPE BYTEA
       USING pgp_sym_encrypt(coalesce(clerk_id, '')::text, '${key}')`
    );
  }

  const { rows: emailCol } = await pool.query(
    `SELECT data_type FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'email'`
  );
  if (emailCol[0]?.data_type === 'character varying') {
    console.log('Converting email VARCHAR → BYTEA...');
    await pool.query(
      `ALTER TABLE public.users ALTER COLUMN email TYPE BYTEA
       USING pgp_sym_encrypt(email::text, '${key}')`
    );
  }

  console.log('--- Backfilling hashes for existing rows ---');
  const migrateResult = await pool.query(
    `UPDATE public.users SET
       clerk_id_hash = encode(digest(coalesce(pgp_sym_decrypt(clerk_id, $1::text), ''), 'sha256'), 'hex'),
       email_hash = encode(digest(pgp_sym_decrypt(email, $1::text), 'sha256'), 'hex')
     WHERE email_hash IS NULL`,
    [key]
  );
  console.log(`Backfilled hashes for ${migrateResult.rowCount} rows.`);

  console.log('--- Enforcing constraints ---');
  await pool.query(`ALTER TABLE public.users ALTER COLUMN email_hash SET NOT NULL`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS users_email_hash_unique ON public.users(email_hash)`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS users_clerk_id_hash_unique ON public.users(clerk_id_hash) WHERE clerk_id_hash IS NOT NULL`);

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

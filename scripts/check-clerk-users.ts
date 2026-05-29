import 'dotenv/config';
import pool from '../lib/db';
import { clerkClient } from '@clerk/nextjs/server';

async function checkDiscrepancies() {
  try {
    // 1. Fetch users from Supabase
    const dbRes = await pool.query('SELECT clerk_id, email, first_name, last_name FROM public.users;');
    const dbUsers = dbRes.rows;
    const dbClerkIds = new Set(dbUsers.map(u => u.clerk_id));
    const dbEmails = new Set(dbUsers.map(u => u.email));

    console.log(`Supabase has ${dbUsers.length} users.`);

    // 2. Fetch users from Clerk
    const client = await clerkClient();
    const clerkUsersReq = await client.users.getUserList({ limit: 500 });
    const clerkUsers = clerkUsersReq.data;

    console.log(`Clerk has ${clerkUsers.length} users.`);

    console.log('\nUsers in Clerk but not in Supabase (by Clerk ID):');
    let count = 0;
    for (const u of clerkUsers) {
      if (!dbClerkIds.has(u.id)) {
        const email = u.emailAddresses[0]?.emailAddress || 'No email';
        console.log(`- Clerk ID: ${u.id}, Name: ${u.firstName} ${u.lastName}, Email: ${email}`);
        count++;
      }
    }
    if (count === 0) {
      console.log('None found.');
    }

  } catch (error) {
    console.error('Error checking discrepancies:', error);
  } finally {
    await pool.end();
  }
}

checkDiscrepancies();

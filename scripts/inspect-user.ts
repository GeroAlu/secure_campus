import 'dotenv/config';
import { clerkClient } from '@clerk/nextjs/server';

async function inspectUser() {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser('user_3ENTI13PQW78FU1GrrUyy2AyySr');
    console.log('Clerk User Metadata:');
    console.log(JSON.stringify(user, null, 2));
  } catch (error) {
    console.error('Error fetching user:', error);
  }
}

inspectUser();

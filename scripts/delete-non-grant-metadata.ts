import { db } from '../src/db/index.js';
import { metadata, user } from '../src/db/schema.js';
import { eq, sql, and, not } from 'drizzle-orm';

async function deleteNonGrantMetadata() {
  try {
    console.log('Finding user ID for username "grant"...');

    // Find the user ID for username "grant"
    const grantUser = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.username, 'grant'))
      .limit(1);

    if (grantUser.length === 0) {
      console.log('No user found with username "grant"');
      console.log('Checking all users...');
      const allUsers = await db.select().from(user);
      console.log('All users:', allUsers);
      return;
    }

    const grantUserId = grantUser[0].id;
    console.log(`Found grant's user ID: ${grantUserId}`);

    // Count metadata entries not created by grant
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(metadata)
      .where(
        and(
          not(eq(metadata.createdBy, grantUserId)),
          not(eq(metadata.createdBy, 'anon'))
        )
      );

    const nonGrantCount = Number(countResult[0].count);
    console.log(`Found ${nonGrantCount} metadata entries NOT created by grant (excluding anon)`);

    // Count anon metadata
    const anonCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(metadata)
      .where(eq(metadata.createdBy, 'anon'));

    const anonCount = Number(anonCountResult[0].count);
    console.log(`Found ${anonCount} metadata entries created by anon`);

    // Count grant's metadata
    const grantCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(metadata)
      .where(eq(metadata.createdBy, grantUserId));

    const grantCount = Number(grantCountResult[0].count);
    console.log(`Found ${grantCount} metadata entries created by grant`);

    if (nonGrantCount === 0) {
      console.log('No non-grant metadata to delete (excluding anon)');
      return;
    }

    // Delete all metadata NOT created by grant (excluding anon)
    console.log('Deleting metadata not created by grant...');
    const deleteResult = await db
      .delete(metadata)
      .where(
        and(
          not(eq(metadata.createdBy, grantUserId)),
          not(eq(metadata.createdBy, 'anon'))
        )
      );

    console.log(`Successfully deleted ${nonGrantCount} metadata entries`);
    console.log('Remaining metadata:');
    console.log(`  - grant: ${grantCount}`);
    console.log(`  - anon: ${anonCount}`);

  } catch (error) {
    console.error('Error deleting metadata:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

deleteNonGrantMetadata();

import { neon } from '@neondatabase/serverless';

const databaseUrl = 'postgresql://neondb_owner:npg_chTDF35Axdla@ep-nameless-meadow-biyayy82-pooler.c-5.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function cleanSeedData() {
  console.log('Connecting to Neon DB to purge fake seed demo data...');
  const sql = neon(databaseUrl);

  const realUserId = 'ath_1795081531568_lcon';

  // 1. Clean activities comments & kudos
  await sql`DELETE FROM kudos WHERE activity_id IN ('act_1', 'act_2') OR athlete_id != ${realUserId};`;
  await sql`DELETE FROM comments WHERE activity_id IN ('act_1', 'act_2') OR athlete_id != ${realUserId};`;
  await sql`DELETE FROM segment_efforts WHERE activity_id IN ('act_1', 'act_2') OR athlete_id != ${realUserId};`;

  // 2. Clean fake activities
  const deletedActs = await sql`DELETE FROM activities WHERE id IN ('act_1', 'act_2') OR athlete_id != ${realUserId} RETURNING id, title;`;
  console.log('Deleted demo activities:', deletedActs);

  // 3. Reassign routes & segments to real user
  await sql`UPDATE routes SET creator_id = ${realUserId};`;
  await sql`UPDATE segments SET creator_id = ${realUserId};`;

  // 4. Clean saved routes
  await sql`DELETE FROM saved_routes WHERE athlete_id != ${realUserId};`;

  // 5. Clean clubs & challenges
  await sql`UPDATE clubs SET creator_id = ${realUserId};`;
  await sql`DELETE FROM club_members WHERE athlete_id != ${realUserId};`;
  await sql`
    INSERT INTO club_members (club_id, athlete_id, role)
    SELECT id, ${realUserId}, 'OWNER' FROM clubs
    ON CONFLICT (club_id, athlete_id) DO NOTHING;
  `;

  await sql`UPDATE challenges SET creator_id = ${realUserId};`;
  await sql`DELETE FROM challenge_participants WHERE athlete_id != ${realUserId};`;
  await sql`
    INSERT INTO challenge_participants (challenge_id, athlete_id, current_meters, is_completed)
    SELECT id, ${realUserId}, 0, false FROM challenges
    ON CONFLICT (challenge_id, athlete_id) DO NOTHING;
  `;

  // 6. Clean follows, privacy zones, notifications, messages
  await sql`DELETE FROM follows WHERE follower_id != ${realUserId} OR following_id != ${realUserId};`;
  await sql`DELETE FROM privacy_zones WHERE athlete_id != ${realUserId};`;
  await sql`DELETE FROM notifications WHERE recipient_id != ${realUserId} OR actor_id != ${realUserId};`;
  await sql`DELETE FROM direct_messages WHERE sender_id != ${realUserId} OR recipient_id != ${realUserId};`;
  await sql`DELETE FROM beacon_sessions WHERE athlete_id != ${realUserId};`;
  await sql`DELETE FROM gear WHERE athlete_id != ${realUserId};`;
  await sql`DELETE FROM event_rsvps WHERE athlete_id != ${realUserId};`;
  await sql`DELETE FROM group_events WHERE creator_id != ${realUserId};`;

  // 7. Delete fake athletes
  const deletedAthletes = await sql`
    DELETE FROM athletes WHERE id != ${realUserId} RETURNING id, display_name, email;
  `;
  console.log('Deleted fake athletes:', deletedAthletes);

  // Verify remaining data
  const remainingAthletes = await sql`SELECT id, display_name, email FROM athletes;`;
  const remainingActivities = await sql`SELECT id, athlete_id, title FROM activities;`;
  console.log('REMAINING REAL ATHLETES:', remainingAthletes);
  console.log('REMAINING REAL ACTIVITIES:', remainingActivities);

  console.log('Cleanup finished successfully! Only real user data remains.');
}

cleanSeedData().catch((err) => {
  console.error('Cleanup error:', err);
  process.exit(1);
});


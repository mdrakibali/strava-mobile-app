import { neon } from '@neondatabase/serverless';
import {
  activities,
  athletes,
  challenges,
  clubs,
  comments,
  directMessages,
  followPairs,
  groupEvents,
  kudos,
  notifications,
} from './seedData.mjs';

const DB_URL =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_chTDF35Axdla@ep-nameless-meadow-biyayy82-pooler.c-5.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DB_URL);

const hashPassword = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'open-strava-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

async function main() {
  console.log('--- 🧹 Wiping Old Database Records ---');
  try {
    await sql`
      TRUNCATE TABLE
        activity_upload_batches,
        activity_uploads,
        kudos,
        comments,
        segment_efforts,
        segments,
        activities,
        club_members,
        clubs,
        challenge_participants,
        challenges,
        event_rsvps,
        group_events,
        saved_routes,
        routes,
        training_goals,
        beacon_sessions,
        direct_messages,
        notifications,
        privacy_zones,
        gear,
        follows,
        athletes
      CASCADE;
    `;
    console.log('✅ All database tables truncated successfully.');
  } catch (err) {
    console.warn('Truncate warning:', err.message);
  }

  console.log('--- 🌱 Seeding Community Data (No Personal Accounts) ---');
  const passwordHash = await hashPassword('Password123!');

  // 1. Seed Athletes
  for (const a of athletes) {
    await sql`
      INSERT INTO athletes (id, username, email, password_hash, display_name, avatar_url, city, country, bio, created_at, updated_at)
      VALUES (${a.id}, ${a.username}, ${a.email}, ${passwordHash}, ${a.displayName}, ${a.avatarUrl}, ${a.city}, ${a.country}, ${a.bio}, NOW(), NOW());
    `;
  }
  console.log(`✅ Seeded ${athletes.length} community athletes.`);

  // 2. Follows
  for (const [f1, f2] of followPairs) {
    await sql`
      INSERT INTO follows (follower_id, following_id, created_at)
      VALUES (${f1}, ${f2}, NOW())
      ON CONFLICT DO NOTHING;
    `;
  }
  console.log(`✅ Seeded ${followPairs.length} mutual follows.`);

  // 3. Activities
  for (const act of activities) {
    await sql`
      INSERT INTO activities (
        id, athlete_id, title, description, sport_type, visibility, start_time,
        distance_meters, moving_time_seconds, elapsed_time_seconds, elevation_gain_meters,
        average_speed_mps, max_speed_mps, calories, raw_polyline, masked_polyline,
        splits, elevation_profile, created_at, updated_at
      )
      VALUES (
        ${act.id}, ${act.athleteId}, ${act.title}, ${act.description}, ${act.sportType},
        ${act.visibility}, NOW() - INTERVAL '2 hours', ${act.distanceMeters}, ${act.movingTimeSeconds},
        ${act.elapsedTimeSeconds}, ${act.elevationGainMeters}, ${act.averageSpeedMps}, ${act.maxSpeedMps},
        ${act.calories}, ${JSON.stringify(act.polyline)}, ${JSON.stringify(act.polyline)},
        ${JSON.stringify(act.splits)}, ${JSON.stringify(act.elevationProfile)}, NOW(), NOW()
      );
    `;
  }
  console.log(`✅ Seeded ${activities.length} activities.`);

  // 4. Kudos & Comments
  for (const k of kudos) {
    await sql`INSERT INTO kudos (id, activity_id, athlete_id, created_at) VALUES (${k.id}, ${k.activityId}, ${k.athleteId}, NOW());`;
  }
  for (const c of comments) {
    await sql`INSERT INTO comments (id, activity_id, athlete_id, content, created_at) VALUES (${c.id}, ${c.activityId}, ${c.athleteId}, ${c.content}, NOW());`;
  }
  console.log('✅ Seeded kudos and comments.');

  // 5. Clubs & Members
  for (const clb of clubs) {
    await sql`
      INSERT INTO clubs (id, name, sport_type, city, country, description, avatar_url, banner_url, creator_id, created_at)
      VALUES (${clb.id}, ${clb.name}, ${clb.sportType}, ${clb.city}, ${clb.country}, ${clb.description}, ${clb.avatarUrl}, ${clb.bannerUrl}, ${clb.creatorId}, NOW());
    `;
    for (const mId of clb.members) {
      const role = mId === clb.creatorId ? 'OWNER' : 'MEMBER';
      await sql`INSERT INTO club_members (club_id, athlete_id, role, joined_at) VALUES (${clb.id}, ${mId}, ${role}, NOW());`;
    }
  }
  console.log(`✅ Seeded ${clubs.length} clubs and members.`);

  // 6. Challenges & Participants
  for (const ch of challenges) {
    await sql`
      INSERT INTO challenges (id, title, description, sport_type, target_meters, badge_url, start_date, end_date, creator_id, created_at)
      VALUES (${ch.id}, ${ch.title}, ${ch.description}, ${ch.sportType}, ${ch.targetMeters}, ${ch.badgeUrl}, ${ch.startDate}, ${ch.endDate}, ${ch.creatorId}, NOW());
    `;
    for (const pId of ch.participants) {
      await sql`
        INSERT INTO challenge_participants (challenge_id, athlete_id, current_meters, is_completed, joined_at)
        VALUES (${ch.id}, ${pId}, 5000.0, false, NOW());
      `;
    }
  }
  console.log(`✅ Seeded ${challenges.length} challenges.`);

  // 7. Group Events & RSVPs
  for (const ev of groupEvents) {
    await sql`
      INSERT INTO group_events (id, title, sport_type, club_id, creator_id, meeting_point, pace_description, distance_meters, event_date, created_at)
      VALUES (${ev.id}, ${ev.title}, ${ev.sportType}, ${ev.clubId}, ${ev.creatorId}, ${ev.meetingPoint}, ${ev.paceDescription}, ${ev.distanceMeters}, ${ev.eventDate}, NOW());
    `;
    for (const rId of ev.rsvps) {
      await sql`INSERT INTO event_rsvps (event_id, athlete_id, status, created_at) VALUES (${ev.id}, ${rId}, 'GOING', NOW());`;
    }
  }
  console.log(`✅ Seeded ${groupEvents.length} group events.`);

  // 8. Direct Messages & Notifications
  for (const dm of directMessages) {
    await sql`
      INSERT INTO direct_messages (id, sender_id, recipient_id, text, is_read, created_at)
      VALUES (${dm.id}, ${dm.senderId}, ${dm.recipientId}, ${dm.text}, false, ${dm.createdAt});
    `;
  }
  for (const n of notifications) {
    await sql`
      INSERT INTO notifications (id, recipient_id, actor_id, action_type, message, is_read, created_at)
      VALUES (${n.id}, ${n.recipientId}, ${n.actorId}, ${n.actionType}, ${n.message}, false, ${n.createdAt});
    `;
  }
  console.log('✅ Seeded direct messages and notifications.');
  console.log('🎉 --- Database successfully seeded with community data! ---');
}

main().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});

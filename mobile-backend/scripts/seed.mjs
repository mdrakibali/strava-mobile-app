import { config } from 'dotenv';
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

// Development athletes (created only when missing). Password for every seed account: Password123!
// tanvir@kinetix.run  nusrat@kinetix.run  farhan@kinetix.run  anika@kinetix.run
// Re-running this script does not duplicate rows. Set SEED_RESET=1 to wipe tables first.

config();
config({ path: '.dev.vars' });

const DB_URL = (process.env.DATABASE_URL || '').replace(/^\uFEFF/, '').replace(/^["'“”]+|["'“”]+$/g, '').trim();
if (!DB_URL) {
  console.error('DATABASE_URL is not set. Add it to mobile-backend/.dev.vars');
  process.exit(1);
}
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
  if (process.env.SEED_RESET === '1') {
  console.log('--- Wiping database records (SEED_RESET=1) ---');
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
    console.log('Tables truncated.');
  } catch (err) {
    console.warn('Truncate warning:', err.message);
  }
  } else {
    console.log('--- Seeding without deleting existing rows (set SEED_RESET=1 to wipe) ---');
  }

  console.log('--- Seeding community data ---');
  const passwordHash = await hashPassword('Password123!');

  // 1. Seed Athletes
  for (const a of athletes) {
    await sql`
      INSERT INTO athletes (id, username, email, password_hash, display_name, avatar_url, city, country, bio, created_at, updated_at)
      VALUES (${a.id}, ${a.username}, ${a.email}, ${passwordHash}, ${a.displayName}, ${a.avatarUrl}, ${a.city}, ${a.country}, ${a.bio}, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
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
      )
      ON CONFLICT (id) DO NOTHING;
    `;
  }
  console.log(`✅ Seeded ${activities.length} activities.`);

  // 4. Kudos & Comments
  for (const k of kudos) {
    await sql`INSERT INTO kudos (id, activity_id, athlete_id, created_at) VALUES (${k.id}, ${k.activityId}, ${k.athleteId}, NOW()) ON CONFLICT (id) DO NOTHING;`;
  }
  for (const c of comments) {
    await sql`INSERT INTO comments (id, activity_id, athlete_id, content, created_at) VALUES (${c.id}, ${c.activityId}, ${c.athleteId}, ${c.content}, NOW()) ON CONFLICT (id) DO NOTHING;`;
  }
  console.log('✅ Seeded kudos and comments.');

  // 5. Clubs & Members
  for (const clb of clubs) {
    await sql`
      INSERT INTO clubs (id, name, sport_type, city, country, description, avatar_url, banner_url, creator_id, created_at)
      VALUES (${clb.id}, ${clb.name}, ${clb.sportType}, ${clb.city}, ${clb.country}, ${clb.description}, ${clb.avatarUrl}, ${clb.bannerUrl}, ${clb.creatorId}, NOW())
      ON CONFLICT (id) DO NOTHING;
    `;
    for (const mId of clb.members) {
      const role = mId === clb.creatorId ? 'OWNER' : 'MEMBER';
      await sql`INSERT INTO club_members (club_id, athlete_id, role, joined_at) VALUES (${clb.id}, ${mId}, ${role}, NOW()) ON CONFLICT DO NOTHING;`;
    }
  }
  console.log(`✅ Seeded ${clubs.length} clubs and members.`);

  // 6. Challenges & Participants
  for (const ch of challenges) {
    await sql`
      INSERT INTO challenges (id, title, description, sport_type, target_meters, badge_url, start_date, end_date, creator_id, created_at)
      VALUES (${ch.id}, ${ch.title}, ${ch.description}, ${ch.sportType}, ${ch.targetMeters}, ${ch.badgeUrl}, ${ch.startDate}, ${ch.endDate}, ${ch.creatorId}, NOW())
      ON CONFLICT (id) DO NOTHING;
    `;
    for (const pId of ch.participants) {
      await sql`
        INSERT INTO challenge_participants (challenge_id, athlete_id, current_meters, is_completed, joined_at)
        VALUES (${ch.id}, ${pId}, 0, false, NOW())
        ON CONFLICT DO NOTHING;
      `;
    }
  }
  console.log(`✅ Seeded ${challenges.length} challenges.`);

  // 7. Group Events & RSVPs
  for (const ev of groupEvents) {
    await sql`
      INSERT INTO group_events (id, title, sport_type, club_id, creator_id, meeting_point, pace_description, distance_meters, event_date, created_at)
      VALUES (${ev.id}, ${ev.title}, ${ev.sportType}, ${ev.clubId}, ${ev.creatorId}, ${ev.meetingPoint}, ${ev.paceDescription}, ${ev.distanceMeters}, ${ev.eventDate}, NOW())
      ON CONFLICT (id) DO NOTHING;
    `;
    for (const rId of ev.rsvps) {
      await sql`INSERT INTO event_rsvps (event_id, athlete_id, status, created_at) VALUES (${ev.id}, ${rId}, 'GOING', NOW()) ON CONFLICT DO NOTHING;`;
    }
  }
  console.log(`✅ Seeded ${groupEvents.length} group events.`);

  // 8. Direct conversations, messages, and notifications
  const chatByPair = new Map();
  for (const dm of directMessages) {
    const [a1, a2] = [dm.senderId, dm.recipientId].sort();
    const id = `chat_${a1}_${a2}`;
    const prev = chatByPair.get(id);
    if (!prev || dm.createdAt > prev.createdAt) chatByPair.set(id, { id, a1, a2, text: dm.text, createdAt: dm.createdAt });
  }
  for (const chat of chatByPair.values()) {
    await sql`
      INSERT INTO chats (id, athlete1_id, athlete2_id, last_message, last_message_at, created_at, updated_at)
      VALUES (${chat.id}, ${chat.a1}, ${chat.a2}, ${chat.text}, ${chat.createdAt}, ${chat.createdAt}, ${chat.createdAt})
      ON CONFLICT (id) DO NOTHING;
    `;
  }
  for (const dm of directMessages) {
    const [a1, a2] = [dm.senderId, dm.recipientId].sort();
    const chatId = `chat_${a1}_${a2}`;
    await sql`
      INSERT INTO direct_messages (id, chat_id, sender_id, recipient_id, text, is_read, created_at)
      VALUES (${dm.id}, ${chatId}, ${dm.senderId}, ${dm.recipientId}, ${dm.text}, false, ${dm.createdAt})
      ON CONFLICT (id) DO NOTHING;
    `;
  }
  for (const n of notifications) {
    await sql`
      INSERT INTO notifications (id, recipient_id, actor_id, action_type, message, is_read, created_at)
      VALUES (${n.id}, ${n.recipientId}, ${n.actorId}, ${n.actionType}, ${n.message}, false, ${n.createdAt})
      ON CONFLICT (id) DO NOTHING;
    `;
  }
  await sql`
    UPDATE challenge_participants AS cp
    SET current_meters = sub.meters,
        is_completed = sub.meters >= c.target_meters
    FROM (
      SELECT cp2.challenge_id, cp2.athlete_id, COALESCE(SUM(a.distance_meters), 0) AS meters
      FROM challenge_participants cp2
      JOIN challenges c2 ON c2.id = cp2.challenge_id
      LEFT JOIN activities a
        ON a.athlete_id = cp2.athlete_id
       AND lower(a.sport_type) = lower(c2.sport_type)
       AND a.start_time >= c2.start_date
       AND a.start_time <= c2.end_date
      GROUP BY cp2.challenge_id, cp2.athlete_id
    ) AS sub
    JOIN challenges c ON c.id = sub.challenge_id
    WHERE cp.challenge_id = sub.challenge_id AND cp.athlete_id = sub.athlete_id
  `;
  console.log('Seeded conversations, messages, notifications, and challenge progress.');
  console.log('🎉 --- Database successfully seeded with community data! ---');
}

main().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});

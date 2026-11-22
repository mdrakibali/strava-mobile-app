import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';
import {
  athletes,
  challenges,
  clubs,
  groupEvents,
} from './seedData.mjs';

// Development seed script: IDs are dynamically generated (UUIDs) at runtime.
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
    console.log('--- Seeding without deleting existing user data (set SEED_RESET=1 to wipe) ---');
  }

  console.log('--- Seeding clean community test data (dynamic auto IDs) ---');
  const passwordHash = await hashPassword('Password123!');
  const athleteMap = new Map(); // username -> id
  const clubMap = new Map(); // name -> id

  // 1. Seed Athletes (IDs auto-created dynamically)
  for (const a of athletes) {
    const existing = await sql`SELECT id FROM athletes WHERE email = ${a.email} OR username = ${a.username} LIMIT 1`;
    let athleteId = existing[0]?.id;
    if (!athleteId) {
      athleteId = `ath_${crypto.randomUUID()}`;
      await sql`
        INSERT INTO athletes (id, username, email, password_hash, display_name, avatar_url, city, country, bio, created_at, updated_at)
        VALUES (${athleteId}, ${a.username}, ${a.email}, ${passwordHash}, ${a.displayName}, ${a.avatarUrl}, ${a.city}, ${a.country}, ${a.bio}, NOW(), NOW())
        ON CONFLICT (email) DO NOTHING;
      `;
    }
    athleteMap.set(a.username, athleteId);
  }
  console.log(`✅ Seeded ${athletes.length} sample athletes with dynamic IDs.`);

  // 2. Clubs & Members (IDs auto-created dynamically)
  for (const clb of clubs) {
    const creatorId = athleteMap.get(clb.creatorUsername) || athleteMap.values().next().value;
    const existing = await sql`SELECT id FROM clubs WHERE name = ${clb.name} LIMIT 1`;
    let clubId = existing[0]?.id;
    if (!clubId) {
      clubId = `clb_${crypto.randomUUID()}`;
      await sql`
        INSERT INTO clubs (id, name, sport_type, city, country, description, avatar_url, banner_url, creator_id, created_at)
        VALUES (${clubId}, ${clb.name}, ${clb.sportType}, ${clb.city}, ${clb.country}, ${clb.description}, ${clb.avatarUrl}, ${clb.bannerUrl}, ${creatorId}, NOW())
        ON CONFLICT (id) DO NOTHING;
      `;
    }
    clubMap.set(clb.name, clubId);

    for (const mUsername of clb.memberUsernames) {
      const mId = athleteMap.get(mUsername);
      if (mId) {
        const role = mId === creatorId ? 'OWNER' : 'MEMBER';
        await sql`INSERT INTO club_members (club_id, athlete_id, role, joined_at) VALUES (${clubId}, ${mId}, ${role}, NOW()) ON CONFLICT DO NOTHING;`;
      }
    }
  }
  console.log(`✅ Seeded ${clubs.length} sample clubs and memberships.`);

  // 3. Challenges & Participants (IDs auto-created dynamically)
  for (const ch of challenges) {
    const creatorId = athleteMap.get(ch.creatorUsername) || athleteMap.values().next().value;
    const existing = await sql`SELECT id FROM challenges WHERE title = ${ch.title} LIMIT 1`;
    let challengeId = existing[0]?.id;
    if (!challengeId) {
      challengeId = `chl_${crypto.randomUUID()}`;
      await sql`
        INSERT INTO challenges (id, title, description, sport_type, target_meters, badge_url, start_date, end_date, creator_id, created_at)
        VALUES (${challengeId}, ${ch.title}, ${ch.description}, ${ch.sportType}, ${ch.targetMeters}, ${ch.badgeUrl}, ${ch.startDate}, ${ch.endDate}, ${creatorId}, NOW())
        ON CONFLICT (id) DO NOTHING;
      `;
    }

    for (const pUsername of ch.participantUsernames) {
      const pId = athleteMap.get(pUsername);
      if (pId) {
        await sql`
          INSERT INTO challenge_participants (challenge_id, athlete_id, current_meters, is_completed, joined_at)
          VALUES (${challengeId}, ${pId}, 0, false, NOW())
          ON CONFLICT DO NOTHING;
        `;
      }
    }
  }
  console.log(`✅ Seeded ${challenges.length} sample challenges.`);

  // 4. Group Events & RSVPs (IDs auto-created dynamically)
  for (const ev of groupEvents) {
    const creatorId = athleteMap.get(ev.creatorUsername) || athleteMap.values().next().value;
    const clubId = clubMap.get(ev.clubName) || null;
    const existing = await sql`SELECT id FROM group_events WHERE title = ${ev.title} LIMIT 1`;
    let eventId = existing[0]?.id;
    if (!eventId) {
      eventId = `evt_${crypto.randomUUID()}`;
      await sql`
        INSERT INTO group_events (id, title, sport_type, club_id, creator_id, meeting_point, pace_description, distance_meters, event_date, created_at)
        VALUES (${eventId}, ${ev.title}, ${ev.sportType}, ${clubId}, ${creatorId}, ${ev.meetingPoint}, ${ev.paceDescription}, ${ev.distanceMeters}, ${ev.eventDate}, NOW())
        ON CONFLICT (id) DO NOTHING;
      `;
    }

    for (const rUsername of ev.rsvpUsernames) {
      const rId = athleteMap.get(rUsername);
      if (rId) {
        await sql`INSERT INTO event_rsvps (event_id, athlete_id, status, created_at) VALUES (${eventId}, ${rId}, 'GOING', NOW()) ON CONFLICT DO NOTHING;`;
      }
    }
  }
  console.log(`✅ Seeded ${groupEvents.length} sample group events.`);
  console.log('🎉 --- Database cleanly seeded with dynamic IDs (no fake activities, kudos, comments, follows, or notifications)! ---');
}

main().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});

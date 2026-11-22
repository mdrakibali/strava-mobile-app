import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';
import {
  athletes,
  challenges,
  clubs,
  groupEvents,
} from './seedData.mjs';

// Development athletes (created only when missing). Password for every seed account: Password123!
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

  console.log('--- Seeding clean community test data ---');
  const passwordHash = await hashPassword('Password123!');

  // 1. Seed Athletes (6 sample users)
  for (const a of athletes) {
    await sql`
      INSERT INTO athletes (id, username, email, password_hash, display_name, avatar_url, city, country, bio, created_at, updated_at)
      VALUES (${a.id}, ${a.username}, ${a.email}, ${passwordHash}, ${a.displayName}, ${a.avatarUrl}, ${a.city}, ${a.country}, ${a.bio}, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `;
  }
  console.log(`✅ Seeded ${athletes.length} sample athletes.`);

  // 2. Clubs & Members (3 clubs)
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
  console.log(`✅ Seeded ${clubs.length} sample clubs and memberships.`);

  // 3. Challenges & Participants (4 challenges)
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
  console.log(`✅ Seeded ${challenges.length} sample challenges.`);

  // 4. Group Events & RSVPs (2 events)
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
  console.log(`✅ Seeded ${groupEvents.length} sample group events.`);
  console.log('🎉 --- Database cleanly seeded (no fake activities, kudos, comments, follows, or notifications)! ---');
}

main().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});

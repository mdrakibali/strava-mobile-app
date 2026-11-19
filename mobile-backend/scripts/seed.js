import { neon } from '@neondatabase/serverless';

const databaseUrl = 'postgresql://neondb_owner:npg_chTDF35Axdla@ep-nameless-meadow-biyayy82-pooler.c-5.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function seed() {
  console.log('Seeding Neon database with initial Open Strava athletes and community data...');
  const sql = neon(databaseUrl);

  // Simple Web-Crypto compatible SHA-256 password hash function for demo
  const hashPassword = async (pwd) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pwd + 'open-strava-salt');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const demoPassHash = await hashPassword('demo123456');

  // 1. Seed Athletes
  const athletesData = [
    {
      id: 'user_current',
      username: 'rakib.runner',
      email: 'athlete@example.com',
      password_hash: demoPassHash,
      display_name: 'Rakib Ahmed',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      city: 'Dhaka',
      country: 'Bangladesh',
      bio: 'Marathon enthusiast & weekend gravel cyclist. Training for sub-3:15.',
      weight_kg: 68.0,
      height_cm: 175.0,
      max_hr: 188,
      resting_hr: 52,
      ftp_watts: 245,
    },
    {
      id: 'ath_1',
      username: 'tanvir.cycles',
      email: 'tanvir@example.com',
      password_hash: demoPassHash,
      display_name: 'Tanvir Hossain',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      city: 'Dhaka',
      country: 'Bangladesh',
      bio: 'Audax 200k finisher | Hatirjheel Peloton lead',
      weight_kg: 72.0,
      height_cm: 178.0,
      max_hr: 182,
      resting_hr: 54,
      ftp_watts: 275,
    },
    {
      id: 'ath_2',
      username: 'elena.trail',
      email: 'elena@example.com',
      password_hash: demoPassHash,
      display_name: 'Elena Rostova',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
      city: 'Chittagong',
      country: 'Bangladesh',
      bio: 'Ultra trail runner & mountain lover 🏃‍♀️⛰️',
      weight_kg: 56.0,
      height_cm: 165.0,
      max_hr: 195,
      resting_hr: 48,
      ftp_watts: 190,
    },
    {
      id: 'ath_3',
      username: 'marcus.vance',
      email: 'marcus@example.com',
      password_hash: demoPassHash,
      display_name: 'Marcus Vance',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
      city: 'Sylhet',
      country: 'Bangladesh',
      bio: 'Pacing 10k @ 4:00/km',
      weight_kg: 65.0,
      height_cm: 172.0,
      max_hr: 185,
      resting_hr: 50,
      ftp_watts: 230,
    },
  ];

  for (const a of athletesData) {
    await sql`
      INSERT INTO athletes (id, username, email, password_hash, display_name, avatar_url, city, country, bio, weight_kg, height_cm, max_hr, resting_hr, ftp_watts)
      VALUES (${a.id}, ${a.username}, ${a.email}, ${a.password_hash}, ${a.display_name}, ${a.avatar_url}, ${a.city}, ${a.country}, ${a.bio}, ${a.weight_kg}, ${a.height_cm}, ${a.max_hr}, ${a.resting_hr}, ${a.ftp_watts})
      ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;
    `;
  }
  console.log('Athletes seeded.');

  // 2. Seed Follows
  await sql`
    INSERT INTO follows (follower_id, following_id)
    VALUES 
      ('user_current', 'ath_1'),
      ('user_current', 'ath_2'),
      ('ath_1', 'user_current'),
      ('ath_3', 'user_current')
    ON CONFLICT DO NOTHING;
  `;
  console.log('Follows graph seeded.');

  // 3. Seed Privacy Zones
  await sql`
    INSERT INTO privacy_zones (id, athlete_id, name, latitude, longitude, radius_meters, is_active)
    VALUES 
      ('pz_1', 'user_current', 'Home (House 12, Banani)', 23.7937, 90.4042, 500, true),
      ('pz_2', 'user_current', 'Office (Gulshan Tech Hub)', 23.7808, 90.4192, 300, true)
    ON CONFLICT DO NOTHING;
  `;
  console.log('Privacy zones seeded.');

  // 4. Seed Clubs
  await sql`
    INSERT INTO clubs (id, name, sport_type, city, country, description, avatar_url, banner_url, is_private, creator_id)
    VALUES 
      ('club_1', 'Sunrise Striders Running Club', 'Run', 'Dhaka', 'Bangladesh', 'Early morning distance running crew conquering 5k, 10k, and marathon intervals.', 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400', 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=1200', false, 'user_current'),
      ('club_2', 'Dhaka Peloton Cycling Club', 'Ride', 'Dhaka', 'Bangladesh', 'Fast-paced pacelines, rolling hills, and Saturday 100k endurance group rides.', 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=400', 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=1200', false, 'ath_1')
    ON CONFLICT DO NOTHING;
  `;

  await sql`
    INSERT INTO club_members (club_id, athlete_id, role)
    VALUES 
      ('club_1', 'user_current', 'OWNER'),
      ('club_1', 'ath_1', 'MEMBER'),
      ('club_1', 'ath_2', 'MEMBER'),
      ('club_2', 'ath_1', 'OWNER'),
      ('club_2', 'user_current', 'MEMBER')
    ON CONFLICT DO NOTHING;
  `;
  console.log('Clubs seeded.');

  // 5. Seed Challenges
  await sql`
    INSERT INTO challenges (id, title, description, sport_type, target_meters, badge_url, start_date, end_date, creator_id)
    VALUES 
      ('ch_1', 'November 100k Running Challenge', 'Run 100 kilometers across the month of November to unlock this exclusive digital finisher trophy.', 'Run', 100000, 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=400', '2026-11-01T00:00:00Z', '2026-11-30T23:59:59Z', 'user_current'),
      ('ch_2', 'Gran Fondo 100km Cycling', 'Complete a single 100 km ride in one continuous effort.', 'Ride', 100000, 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=400', '2026-11-01T00:00:00Z', '2026-11-30T23:59:59Z', 'ath_1')
    ON CONFLICT DO NOTHING;
  `;

  await sql`
    INSERT INTO challenge_participants (challenge_id, athlete_id, current_meters, is_completed)
    VALUES 
      ('ch_1', 'user_current', 76400, false),
      ('ch_1', 'ath_2', 88200, false),
      ('ch_2', 'ath_1', 100000, true)
    ON CONFLICT DO NOTHING;
  `;
  console.log('Challenges seeded.');

  // 6. Seed Sample Initial Activities
  const samplePolyline = [
    { latitude: 23.7745, longitude: 90.4072, altitude: 12 },
    { latitude: 23.7780, longitude: 90.4150, altitude: 15 },
    { latitude: 23.7820, longitude: 90.4220, altitude: 18 },
    { latitude: 23.7790, longitude: 90.4280, altitude: 14 },
    { latitude: 23.7710, longitude: 90.4190, altitude: 11 },
  ];

  await sql`
    INSERT INTO activities (id, athlete_id, title, description, sport_type, visibility, start_time, distance_meters, moving_time_seconds, elapsed_time_seconds, elevation_gain_meters, average_speed_mps, max_speed_mps, average_heart_rate, max_heart_rate, calories, relative_effort_score, gap_formatted, raw_polyline, masked_polyline, splits, elevation_profile)
    VALUES 
      ('act_1', 'user_current', 'Morning Hatirjheel Progression 10k', 'Felt smooth and controlled through km 7. Pushed tempo pace on the bridges.', 'Run', 'PUBLIC', '2026-11-18T06:30:00Z', 10420.0, 3120, 3240, 48, 3.34, 4.45, 156, 178, 710, 68, '4:55 /km', ${JSON.stringify(samplePolyline)}, ${JSON.stringify(samplePolyline)}, ${JSON.stringify([{ splitNumber: 1, distanceKm: 1, paceFormatted: '5:12 /km', elevationDeltaMeters: 4 }])}, ${JSON.stringify([12, 14, 18, 15, 20, 16, 12])}),
      ('act_2', 'ath_1', 'Saturday 60k Purbachal Paceline', 'Cold morning crosswinds but maintained 34 km/h rolling paceline with the club.', 'Ride', 'PUBLIC', '2026-11-17T06:00:00Z', 62400.0, 6840, 7200, 210, 9.12, 12.8, 144, 169, 1450, 92, null, ${JSON.stringify(samplePolyline)}, ${JSON.stringify(samplePolyline)}, null, ${JSON.stringify([10, 15, 25, 30, 22, 15])})
    ON CONFLICT (id) DO NOTHING;
  `;
  console.log('Sample activities seeded.');

  console.log('Database seeding successfully finished!');
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});


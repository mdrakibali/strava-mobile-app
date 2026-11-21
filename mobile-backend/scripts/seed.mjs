import { neon } from '@neondatabase/serverless';

const DB_URL = 'postgresql://neondb_owner:npg_chTDF35Axdla@ep-nameless-meadow-biyayy82-pooler.c-5.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DB_URL);

// Standard password hasher matching backend auth.ts
const hashPassword = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'open-strava-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

async function main() {
  console.log('--- Starting Database Seeding ---');

  const defaultPassword = 'Password123!';
  const passwordHash = await hashPassword(defaultPassword);

  // 1. Seed Athletes
  const athletesToSeed = [
    {
      id: 'ath_seed_tanvir',
      username: 'tanvir_runner',
      email: 'tanvir@kinetix.run',
      displayName: 'Tanvir Ahmed',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
      city: 'Dhaka',
      country: 'Bangladesh',
      bio: 'Marathoner & ultra runner. Training for the Dhaka 25K challenge! 🏃‍♂️',
    },
    {
      id: 'ath_seed_sultana',
      username: 'nusrat_cyclist',
      email: 'nusrat@kinetix.run',
      displayName: 'Nusrat Sultana',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
      city: 'Dhaka',
      country: 'Bangladesh',
      bio: 'Endurance cyclist & weekend trail hiker. Exploring every scenic corner of BD.',
    },
    {
      id: 'ath_seed_farhan',
      username: 'farhan_tri',
      email: 'farhan@kinetix.run',
      displayName: 'Farhan Kabir',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
      city: 'Chittagong',
      country: 'Bangladesh',
      bio: 'Triathlete & trail explorer. High elevation lover.',
    },
    {
      id: 'ath_seed_anika',
      username: 'anika_pace',
      email: 'anika@kinetix.run',
      displayName: 'Anika Tabassum',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      city: 'Dhaka',
      country: 'Bangladesh',
      bio: 'Morning 5K enthusiast, passionate about community fitness and health.',
    },
  ];

  for (const a of athletesToSeed) {
    await sql`
      INSERT INTO athletes (id, username, email, password_hash, display_name, avatar_url, city, country, bio, created_at, updated_at)
      VALUES (${a.id}, ${a.username}, ${a.email}, ${passwordHash}, ${a.displayName}, ${a.avatarUrl}, ${a.city}, ${a.country}, ${a.bio}, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        avatar_url = EXCLUDED.avatar_url,
        city = EXCLUDED.city,
        country = EXCLUDED.country,
        bio = EXCLUDED.bio,
        password_hash = EXCLUDED.password_hash;
    `;
    console.log(`Seeded Athlete: ${a.displayName} (${a.email})`);
  }

  // Current logged in user (Rakib)
  const currentAthleteId = 'ath_7bd5ea92-670e-4cb2-97c8-c81505dfab9d';

  // 2. Mutual Follows
  const followPairs = [
    [currentAthleteId, 'ath_seed_tanvir'],
    ['ath_seed_tanvir', currentAthleteId],
    [currentAthleteId, 'ath_seed_sultana'],
    ['ath_seed_sultana', currentAthleteId],
    ['ath_seed_farhan', currentAthleteId],
    ['ath_seed_anika', currentAthleteId],
  ];

  for (const [f1, f2] of followPairs) {
    await sql`
      INSERT INTO follows (follower_id, following_id, created_at)
      VALUES (${f1}, ${f2}, NOW())
      ON CONFLICT DO NOTHING;
    `;
  }
  console.log('Seeded Follow relationships');

  // 3. Seed Activities with realistic Dhaka Polylines
  const hatirjheelRoute = [
    [90.410, 23.772],
    [90.412, 23.775],
    [90.416, 23.777],
    [90.421, 23.778],
    [90.426, 23.776],
    [90.428, 23.773],
    [90.425, 23.770],
    [90.419, 23.769],
    [90.413, 23.770],
    [90.410, 23.772],
  ];

  const purbachalRoute = [
    [90.420, 23.818],
    [90.435, 23.819],
    [90.455, 23.821],
    [90.480, 23.823],
    [90.510, 23.825],
    [90.535, 23.827],
    [90.510, 23.825],
    [90.480, 23.823],
    [90.455, 23.821],
    [90.420, 23.818],
  ];

  const dhanmondiRoute = [
    [90.375, 23.746],
    [90.377, 23.749],
    [90.380, 23.752],
    [90.381, 23.755],
    [90.377, 23.756],
    [90.373, 23.753],
    [90.371, 23.749],
    [90.375, 23.746],
  ];

  const activitiesToSeed = [
    {
      id: 'act_seed_hatirjheel_run',
      athleteId: 'ath_seed_tanvir',
      title: 'Sunrise Loop around Hatirjheel',
      description: 'Cool breeze, empty bridges and a smooth negative split. Ready for marathon season!',
      sportType: 'Run',
      visibility: 'PUBLIC',
      distanceMeters: 6250.0,
      movingTimeSeconds: 1875,
      elapsedTimeSeconds: 1950,
      elevationGainMeters: 14,
      averageSpeedMps: 3.33,
      maxSpeedMps: 4.25,
      calories: 420,
      polyline: hatirjheelRoute,
      splits: [
        { splitNumber: 1, paceFormatted: '5:05', elevationDeltaMeters: 2 },
        { splitNumber: 2, paceFormatted: '5:00', elevationDeltaMeters: 1 },
        { splitNumber: 3, paceFormatted: '4:58', elevationDeltaMeters: 4 },
        { splitNumber: 4, paceFormatted: '4:55', elevationDeltaMeters: 3 },
        { splitNumber: 5, paceFormatted: '4:50', elevationDeltaMeters: 2 },
        { splitNumber: 6, paceFormatted: '4:45', elevationDeltaMeters: 2 },
      ],
      elevationProfile: [10, 11, 13, 15, 14, 12, 11, 13, 14, 12],
    },
    {
      id: 'act_seed_purbachal_ride',
      athleteId: 'ath_seed_sultana',
      title: '300-Feet Expressway Tempo Ride 🚴‍♀️',
      description: 'Fast rolling pavement on the expressway with the morning peloton. Great headwind training!',
      sportType: 'Ride',
      visibility: 'PUBLIC',
      distanceMeters: 24500.0,
      movingTimeSeconds: 3120,
      elapsedTimeSeconds: 3300,
      elevationGainMeters: 28,
      averageSpeedMps: 7.85,
      maxSpeedMps: 11.2,
      calories: 680,
      polyline: purbachalRoute,
      splits: [
        { splitNumber: 1, paceFormatted: '2:10', elevationDeltaMeters: 5 },
        { splitNumber: 2, paceFormatted: '2:05', elevationDeltaMeters: 8 },
      ],
      elevationProfile: [8, 10, 14, 16, 20, 18, 15, 12, 9, 8],
    },
    {
      id: 'act_seed_dhanmondi_5k',
      athleteId: 'ath_seed_anika',
      title: 'Dhanmondi Lake Community 5K',
      description: 'Lovely morning run by Rabindra Sarobar with friendly fellow runners.',
      sportType: 'Run',
      visibility: 'PUBLIC',
      distanceMeters: 5100.0,
      movingTimeSeconds: 1540,
      elapsedTimeSeconds: 1600,
      elevationGainMeters: 8,
      averageSpeedMps: 3.31,
      maxSpeedMps: 4.10,
      calories: 340,
      polyline: dhanmondiRoute,
      splits: [
        { splitNumber: 1, paceFormatted: '5:02', elevationDeltaMeters: 2 },
        { splitNumber: 2, paceFormatted: '5:00', elevationDeltaMeters: 1 },
        { splitNumber: 3, paceFormatted: '5:05', elevationDeltaMeters: 2 },
        { splitNumber: 4, paceFormatted: '4:58', elevationDeltaMeters: 1 },
        { splitNumber: 5, paceFormatted: '4:50', elevationDeltaMeters: 2 },
      ],
      elevationProfile: [6, 7, 8, 9, 8, 7, 6],
    },
  ];

  for (const act of activitiesToSeed) {
    await sql`
      INSERT INTO activities (
        id, athlete_id, title, description, sport_type, visibility, start_time,
        distance_meters, moving_time_seconds, elapsed_time_seconds, elevation_gain_meters,
        average_speed_mps, max_speed_mps, calories, raw_polyline, masked_polyline,
        splits, elevation_profile, created_at, updated_at
      )
      VALUES (
        ${act.id}, ${act.athleteId}, ${act.title}, ${act.description}, ${act.sportType},
        ${act.visibility}, NOW() - INTERVAL '3 hours', ${act.distanceMeters}, ${act.movingTimeSeconds},
        ${act.elapsedTimeSeconds}, ${act.elevationGainMeters}, ${act.averageSpeedMps}, ${act.maxSpeedMps},
        ${act.calories}, ${JSON.stringify(act.polyline)}, ${JSON.stringify(act.polyline)},
        ${JSON.stringify(act.splits)}, ${JSON.stringify(act.elevationProfile)}, NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        distance_meters = EXCLUDED.distance_meters,
        raw_polyline = EXCLUDED.raw_polyline,
        masked_polyline = EXCLUDED.masked_polyline;
    `;
    console.log(`Seeded Activity: ${act.title}`);
  }

  // 4. Seed Kudos
  const kudosToSeed = [
    { id: 'kd_seed_1', activityId: 'act_seed_hatirjheel_run', athleteId: currentAthleteId },
    { id: 'kd_seed_2', activityId: 'act_seed_hatirjheel_run', athleteId: 'ath_seed_sultana' },
    { id: 'kd_seed_3', activityId: 'act_seed_purbachal_ride', athleteId: currentAthleteId },
    { id: 'kd_seed_4', activityId: 'act_seed_purbachal_ride', athleteId: 'ath_seed_tanvir' },
  ];

  for (const k of kudosToSeed) {
    await sql`
      INSERT INTO kudos (id, activity_id, athlete_id, created_at)
      VALUES (${k.id}, ${k.activityId}, ${k.athleteId}, NOW())
      ON CONFLICT DO NOTHING;
    `;
  }

  // 5. Seed Comments
  const commentsToSeed = [
    {
      id: 'cmt_seed_1',
      activityId: 'act_seed_hatirjheel_run',
      athleteId: 'ath_seed_sultana',
      content: 'Solid pace Tanvir! Hatirjheel in the morning is unbeatable.',
    },
    {
      id: 'cmt_seed_2',
      activityId: 'act_seed_purbachal_ride',
      athleteId: 'ath_seed_tanvir',
      content: 'Massive average speed Nusrat! That expressway surface is so fast.',
    },
  ];

  for (const c of commentsToSeed) {
    await sql`
      INSERT INTO comments (id, activity_id, athlete_id, content, created_at)
      VALUES (${c.id}, ${c.activityId}, ${c.athleteId}, ${c.content}, NOW())
      ON CONFLICT DO NOTHING;
    `;
  }

  // 6. Seed Clubs
  const clubsToSeed = [
    {
      id: 'clb_seed_dhaka_runners',
      name: 'Dhaka Road Runners',
      sportType: 'Run',
      city: 'Dhaka',
      country: 'Bangladesh',
      description: 'Official club for urban runners in Dhaka. Weekly long runs and track workouts.',
      avatarUrl: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=200',
      bannerUrl: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800',
      creatorId: 'ath_seed_tanvir',
    },
    {
      id: 'clb_seed_bd_cyclists',
      name: 'BD Cyclists Network',
      sportType: 'Ride',
      city: 'Dhaka',
      country: 'Bangladesh',
      description: 'The largest cycling brotherhood in Bangladesh. Friday dawn rides & weekend tours.',
      avatarUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=200',
      bannerUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800',
      creatorId: 'ath_seed_sultana',
    },
    {
      id: 'clb_seed_gulshan_trail',
      name: 'Gulshan Fitness & Walking Circle',
      sportType: 'Walk',
      city: 'Dhaka',
      country: 'Bangladesh',
      description: 'Active morning and evening walking group in Gulshan Lake Park and Banani.',
      avatarUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=200',
      bannerUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800',
      creatorId: 'ath_seed_anika',
    },
  ];

  for (const clb of clubsToSeed) {
    await sql`
      INSERT INTO clubs (id, name, sport_type, city, country, description, avatar_url, banner_url, creator_id, created_at)
      VALUES (${clb.id}, ${clb.name}, ${clb.sportType}, ${clb.city}, ${clb.country}, ${clb.description}, ${clb.avatarUrl}, ${clb.bannerUrl}, ${clb.creatorId}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        city = EXCLUDED.city;
    `;
    // Add creator as owner
    await sql`
      INSERT INTO club_members (club_id, athlete_id, role, joined_at)
      VALUES (${clb.id}, ${clb.creatorId}, 'OWNER', NOW())
      ON CONFLICT DO NOTHING;
    `;
    // Add current user as member to one club
    if (clb.id === 'clb_seed_dhaka_runners') {
      await sql`
        INSERT INTO club_members (club_id, athlete_id, role, joined_at)
        VALUES (${clb.id}, ${currentAthleteId}, 'MEMBER', NOW())
        ON CONFLICT DO NOTHING;
      `;
    }
    console.log(`Seeded Club: ${clb.name}`);
  }

  // 7. Seed Challenges
  const challengesToSeed = [
    {
      id: 'chl_seed_may_50k',
      title: 'May 50K Running Challenge',
      description: 'Log 50 kilometers of running this month to earn the exclusive digital Finisher Badge.',
      sportType: 'Run',
      targetMeters: 50000.0,
      badgeUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=200',
      startDate: new Date(Date.now() - 5 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 25 * 86400000).toISOString(),
      creatorId: 'ath_seed_tanvir',
    },
    {
      id: 'chl_seed_century_ride',
      title: 'Weekend 100K Century Ride',
      description: 'Take on 100km on your bicycle over the course of the weekend.',
      sportType: 'Ride',
      targetMeters: 100000.0,
      badgeUrl: 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=200',
      startDate: new Date(Date.now() - 2 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 10 * 86400000).toISOString(),
      creatorId: 'ath_seed_sultana',
    },
    {
      id: 'chl_seed_walk_30k',
      title: 'Step Up: 30K Monthly Walk',
      description: 'Keep your daily streak alive with 30km of walking activity.',
      sportType: 'Walk',
      targetMeters: 30000.0,
      badgeUrl: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=200',
      startDate: new Date(Date.now() - 3 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 18 * 86400000).toISOString(),
      creatorId: 'ath_seed_anika',
    },
  ];

  for (const ch of challengesToSeed) {
    await sql`
      INSERT INTO challenges (id, title, description, sport_type, target_meters, badge_url, start_date, end_date, creator_id, created_at)
      VALUES (${ch.id}, ${ch.title}, ${ch.description}, ${ch.sportType}, ${ch.targetMeters}, ${ch.badgeUrl}, ${ch.startDate}, ${ch.endDate}, ${ch.creatorId}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        target_meters = EXCLUDED.target_meters;
    `;
    console.log(`Seeded Challenge: ${ch.title}`);
  }

  // 8. Seed Group Events
  const eventsToSeed = [
    {
      id: 'evt_seed_hatirjheel_sunrise',
      title: 'Hatirjheel Sunrise 10K Group Run',
      sportType: 'Run',
      clubId: 'clb_seed_dhaka_runners',
      creatorId: 'ath_seed_tanvir',
      meetingPoint: 'Hatirjheel Amphitheatre (Rampura side)',
      paceDescription: '5:30 min/km conversational pace',
      distanceMeters: 10000.0,
      eventDate: new Date(Date.now() + 2 * 86400000).toISOString(),
    },
    {
      id: 'evt_seed_300ft_ride',
      title: 'Friday Morning Purbachal 300-Feet Ride',
      sportType: 'Ride',
      clubId: 'clb_seed_bd_cyclists',
      creatorId: 'ath_seed_sultana',
      meetingPoint: 'Kuril Flyover Roundabout (Underpass)',
      paceDescription: '25-28 km/h rolling group',
      distanceMeters: 30000.0,
      eventDate: new Date(Date.now() + 5 * 86400000).toISOString(),
    },
    {
      id: 'evt_seed_dhanmondi_sunset_walk',
      title: 'Rabindra Sarobar Sunset Walk & Chat',
      sportType: 'Walk',
      clubId: 'clb_seed_gulshan_trail',
      creatorId: 'ath_seed_anika',
      meetingPoint: 'Dhanmondi Lake Bridge 8',
      paceDescription: 'Relaxed 12 min/km pace',
      distanceMeters: 4000.0,
      eventDate: new Date(Date.now() + 3 * 86400000).toISOString(),
    },
  ];

  for (const ev of eventsToSeed) {
    await sql`
      INSERT INTO group_events (id, title, sport_type, club_id, creator_id, meeting_point, pace_description, distance_meters, event_date, created_at)
      VALUES (${ev.id}, ${ev.title}, ${ev.sportType}, ${ev.clubId}, ${ev.creatorId}, ${ev.meetingPoint}, ${ev.paceDescription}, ${ev.distanceMeters}, ${ev.eventDate}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        meeting_point = EXCLUDED.meeting_point;
    `;
    console.log(`Seeded Event: ${ev.title}`);
  }

  // 9. Seed Notifications for current user (Rakib)
  const notifsToSeed = [
    {
      id: 'ntf_seed_1',
      recipientId: currentAthleteId,
      actorId: 'ath_seed_tanvir',
      actionType: 'FOLLOW',
      message: 'Tanvir Ahmed started following you!',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'ntf_seed_2',
      recipientId: currentAthleteId,
      actorId: 'ath_seed_sultana',
      actionType: 'KUDOS',
      message: 'Nusrat Sultana gave kudos to your activity',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 'ntf_seed_3',
      recipientId: currentAthleteId,
      actorId: 'ath_seed_anika',
      actionType: 'COMMENT',
      message: 'Anika Tabassum commented: "Great progress keep going!"',
      createdAt: new Date(Date.now() - 14400000).toISOString(),
    },
  ];

  for (const n of notifsToSeed) {
    await sql`
      INSERT INTO notifications (id, recipient_id, actor_id, action_type, message, is_read, created_at)
      VALUES (${n.id}, ${n.recipientId}, ${n.actorId}, ${n.actionType}, ${n.message}, false, ${n.createdAt})
      ON CONFLICT (id) DO NOTHING;
    `;
  }
  console.log('Seeded Notifications for user');

  console.log('--- Database Seeding Completed Successfully! ---');
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});

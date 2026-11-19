import { neon } from '@neondatabase/serverless';

const databaseUrl =
  'postgresql://neondb_owner:npg_chTDF35Axdla@ep-nameless-meadow-biyayy82-pooler.c-5.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function seedRoutes() {
  console.log('Seeding Real Location Routes around Dhaka (Kuril, Pragati Sarani, Bashundhara, 300 Feet) in Neon PostgreSQL...');
  const sql = neon(databaseUrl);

  const realUserId = 'ath_1795081531568_lcon';

  // 1. Pragati Sarani - Kuril Flyover Loop (Exact area from user screenshot)
  const pragatiPolyline = [
    { latitude: 23.8142, longitude: 90.4215, altitude: 8 },
    { latitude: 23.8175, longitude: 90.4225, altitude: 10 },
    { latitude: 23.8210, longitude: 90.4240, altitude: 14 },
    { latitude: 23.8245, longitude: 90.4255, altitude: 18 },
    { latitude: 23.8220, longitude: 90.4290, altitude: 12 },
    { latitude: 23.8180, longitude: 90.4270, altitude: 9 },
    { latitude: 23.8142, longitude: 90.4215, altitude: 8 },
  ];

  // 2. Bashundhara Residential Area Boulevard Loop
  const bashundharaPolyline = [
    { latitude: 23.8160, longitude: 90.4280, altitude: 9 },
    { latitude: 23.8180, longitude: 90.4320, altitude: 10 },
    { latitude: 23.8220, longitude: 90.4350, altitude: 12 },
    { latitude: 23.8250, longitude: 90.4330, altitude: 11 },
    { latitude: 23.8210, longitude: 90.4285, altitude: 9 },
    { latitude: 23.8160, longitude: 90.4280, altitude: 9 },
  ];

  // 3. 300 Feet Expressway Purbachal Corridor
  const threeHundredFeetPolyline = [
    { latitude: 23.8250, longitude: 90.4260, altitude: 12 },
    { latitude: 23.8320, longitude: 90.4450, altitude: 14 },
    { latitude: 23.8400, longitude: 90.4700, altitude: 16 },
    { latitude: 23.8480, longitude: 90.4950, altitude: 18 },
    { latitude: 23.8550, longitude: 90.5200, altitude: 20 },
  ];

  // 4. Baridhara Diplomatic & Lake Trail
  const baridharaPolyline = [
    { latitude: 23.8010, longitude: 90.4190, altitude: 11 },
    { latitude: 23.8050, longitude: 90.4230, altitude: 12 },
    { latitude: 23.8090, longitude: 90.4210, altitude: 13 },
    { latitude: 23.8060, longitude: 90.4170, altitude: 12 },
    { latitude: 23.8010, longitude: 90.4190, altitude: 11 },
  ];

  // 5. Hatirjheel Full Loop
  const hatirjheelPolyline = [
    { latitude: 23.7745, longitude: 90.4072, altitude: 12 },
    { latitude: 23.7770, longitude: 90.4120, altitude: 14 },
    { latitude: 23.7795, longitude: 90.4180, altitude: 16 },
    { latitude: 23.7820, longitude: 90.4220, altitude: 18 },
    { latitude: 23.7790, longitude: 90.4280, altitude: 14 },
    { latitude: 23.7750, longitude: 90.4230, altitude: 13 },
    { latitude: 23.7710, longitude: 90.4190, altitude: 11 },
    { latitude: 23.7730, longitude: 90.4110, altitude: 12 },
    { latitude: 23.7745, longitude: 90.4072, altitude: 12 },
  ];

  const routesData = [
    {
      id: 'route_pragati_kuril',
      creator_id: realUserId,
      name: 'প্রগতি সরণী - Kuril Flyover Loop',
      description: 'Scenic urban loop running along Pragati Sarani, Kuril interchange, and Afroza Begum Road with wide pedestrian pavements.',
      sport_type: 'Run',
      distance_meters: 6600.0,
      elevation_gain_meters: 21,
      estimated_time_seconds: 2280,
      polyline_points: pragatiPolyline,
      elevation_profile: [8, 10, 14, 18, 12, 9, 8],
      surface_types: { pavedPercent: 95, unpavedPercent: 5 },
      is_public: true,
    },
    {
      id: 'route_bashundhara_loop',
      creator_id: realUserId,
      name: 'Bashundhara R/A Block I & M Trail',
      description: 'Peaceful residential loop with low traffic, tree-lined boulevards, and smooth asphalt.',
      sport_type: 'Run',
      distance_meters: 7200.0,
      elevation_gain_meters: 14,
      estimated_time_seconds: 2460,
      polyline_points: bashundharaPolyline,
      elevation_profile: [9, 10, 12, 11, 9, 9],
      surface_types: { pavedPercent: 100, unpavedPercent: 0 },
      is_public: true,
    },
    {
      id: 'route_300feet_express',
      creator_id: realUserId,
      name: '300 Feet Purbachal Expressway 10k',
      description: 'Fast, flat, straight-line endurance route on Purbachal Expressway. Popular among weekend cyclists and morning runners.',
      sport_type: 'Run',
      distance_meters: 10000.0,
      elevation_gain_meters: 24,
      estimated_time_seconds: 3300,
      polyline_points: threeHundredFeetPolyline,
      elevation_profile: [12, 14, 16, 18, 20],
      surface_types: { pavedPercent: 100, unpavedPercent: 0 },
      is_public: true,
    },
    {
      id: 'route_baridhara_lake',
      creator_id: realUserId,
      name: 'Baridhara Diplomatic & Lake Park Loop',
      description: 'Secure, shaded residential circuit encircling Baridhara Lake and Diplomatic Enclave.',
      sport_type: 'Run',
      distance_meters: 4800.0,
      elevation_gain_meters: 12,
      estimated_time_seconds: 1650,
      polyline_points: baridharaPolyline,
      elevation_profile: [11, 12, 13, 12, 11],
      surface_types: { pavedPercent: 90, unpavedPercent: 10 },
      is_public: true,
    },
    {
      id: 'route_hatirjheel_loop',
      creator_id: realUserId,
      name: 'Hatirjheel Promenade Complete Loop',
      description: 'The iconic 10km lakeside circuit featuring rolling arched bridges and continuous pedestrian pathways.',
      sport_type: 'Run',
      distance_meters: 10420.0,
      elevation_gain_meters: 48,
      estimated_time_seconds: 3420,
      polyline_points: hatirjheelPolyline,
      elevation_profile: [12, 14, 18, 15, 20, 16, 12],
      surface_types: { pavedPercent: 95, unpavedPercent: 5 },
      is_public: true,
    },
  ];

  // Clear older demo routes if any
  await sql`DELETE FROM saved_routes WHERE route_id IN ('route_1', 'route_2', 'route_3');`;
  await sql`DELETE FROM routes WHERE id IN ('route_1', 'route_2', 'route_3');`;

  for (const r of routesData) {
    await sql`
      INSERT INTO routes (id, creator_id, name, description, sport_type, distance_meters, elevation_gain_meters, estimated_time_seconds, polyline_points, elevation_profile, surface_types, is_public)
      VALUES (${r.id}, ${r.creator_id}, ${r.name}, ${r.description}, ${r.sport_type}, ${r.distance_meters}, ${r.elevation_gain_meters}, ${r.estimated_time_seconds}, ${JSON.stringify(r.polyline_points)}, ${JSON.stringify(r.elevation_profile)}, ${JSON.stringify(r.surface_types)}, ${r.is_public})
      ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name, 
        description = EXCLUDED.description,
        polyline_points = EXCLUDED.polyline_points,
        distance_meters = EXCLUDED.distance_meters,
        elevation_gain_meters = EXCLUDED.elevation_gain_meters,
        creator_id = EXCLUDED.creator_id;
    `;
  }
  console.log('Dhaka local routes successfully seeded.');

  // Segments in Kuril / Pragati Sarani / Bashundhara
  const segmentsData = [
    {
      id: 'seg_pragati_sprint',
      name: 'Pragati Sarani Northbound 1k Sprint',
      sport_type: 'Run',
      distance_meters: 1000.0,
      average_grade_percent: 1.2,
      elevation_gain_meters: 5,
      start_latitude: 23.8142,
      start_longitude: 90.4215,
      end_latitude: 23.8210,
      end_longitude: 90.4240,
      polyline_points: [
        { latitude: 23.8142, longitude: 90.4215 },
        { latitude: 23.8175, longitude: 90.4225 },
        { latitude: 23.8210, longitude: 90.4240 },
      ],
      creator_id: realUserId,
    },
    {
      id: 'seg_kuril_ramp',
      name: 'Kuril Flyover Approach Climb',
      sport_type: 'Run',
      distance_meters: 650.0,
      average_grade_percent: 3.8,
      elevation_gain_meters: 11,
      start_latitude: 23.8210,
      start_longitude: 90.4240,
      end_latitude: 23.8245,
      end_longitude: 90.4255,
      polyline_points: [
        { latitude: 23.8210, longitude: 90.4240 },
        { latitude: 23.8245, longitude: 90.4255 },
      ],
      creator_id: realUserId,
    },
  ];

  for (const s of segmentsData) {
    await sql`
      INSERT INTO segments (id, name, sport_type, distance_meters, average_grade_percent, elevation_gain_meters, start_latitude, start_longitude, end_latitude, end_longitude, polyline_points, creator_id)
      VALUES (${s.id}, ${s.name}, ${s.sport_type}, ${s.distance_meters}, ${s.average_grade_percent}, ${s.elevation_gain_meters}, ${s.start_latitude}, ${s.start_longitude}, ${s.end_latitude}, ${s.end_longitude}, ${JSON.stringify(s.polyline_points)}, ${s.creator_id})
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, polyline_points = EXCLUDED.polyline_points;
    `;
  }
  console.log('Dhaka local segments successfully seeded.');
}

seedRoutes().catch((err) => {
  console.error('Seed routes error:', err);
  process.exit(1);
});

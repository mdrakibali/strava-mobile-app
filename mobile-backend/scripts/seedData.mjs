// Seed data for OpenStrava community - completely free of personal test accounts
export const athletes = [
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
    bio: 'Endurance cyclist & weekend trail hiker. Exploring every scenic corner of BD. 🚴‍♀️',
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

export const followPairs = [
  ['ath_seed_tanvir', 'ath_seed_sultana'],
  ['ath_seed_sultana', 'ath_seed_tanvir'],
  ['ath_seed_tanvir', 'ath_seed_farhan'],
  ['ath_seed_farhan', 'ath_seed_tanvir'],
  ['ath_seed_sultana', 'ath_seed_anika'],
  ['ath_seed_anika', 'ath_seed_sultana'],
  ['ath_seed_farhan', 'ath_seed_anika'],
  ['ath_seed_anika', 'ath_seed_farhan'],
];

const hatirjheelRoute = [
  [90.410, 23.772], [90.412, 23.775], [90.416, 23.777], [90.421, 23.778],
  [90.426, 23.776], [90.428, 23.773], [90.425, 23.770], [90.419, 23.769],
  [90.413, 23.770], [90.410, 23.772]
];

const purbachalRoute = [
  [90.420, 23.818], [90.435, 23.819], [90.455, 23.821], [90.480, 23.823],
  [90.510, 23.825], [90.535, 23.827], [90.510, 23.825], [90.480, 23.823],
  [90.455, 23.821], [90.420, 23.818]
];

const gulshanRoute = [
  [90.415, 23.790], [90.418, 23.793], [90.420, 23.795], [90.423, 23.792],
  [90.421, 23.788], [90.417, 23.787], [90.415, 23.790]
];

const dhanmondiRoute = [
  [90.375, 23.746], [90.377, 23.749], [90.380, 23.752], [90.381, 23.755],
  [90.377, 23.756], [90.373, 23.753], [90.371, 23.749], [90.375, 23.746]
];

export const activities = [
  {
    id: 'act_seed_hatirjheel_run',
    athleteId: 'ath_seed_tanvir',
    title: 'Sunrise Loop around Hatirjheel 🌅',
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
    id: 'act_seed_gulshan_tempo',
    athleteId: 'ath_seed_farhan',
    title: 'Gulshan Lake Sunrise Tempo Run 🏃‍♂️',
    description: 'Crisp morning air, controlled heart rate and pushed the final km pace. Feeling fresh!',
    sportType: 'Run',
    visibility: 'PUBLIC',
    distanceMeters: 5200.0,
    movingTimeSeconds: 1680,
    elapsedTimeSeconds: 1740,
    elevationGainMeters: 15,
    averageSpeedMps: 3.10,
    maxSpeedMps: 4.15,
    calories: 360,
    polyline: gulshanRoute,
    splits: [
      { splitNumber: 1, paceFormatted: '5:30', elevationDeltaMeters: 2 },
      { splitNumber: 2, paceFormatted: '5:24', elevationDeltaMeters: 3 },
      { splitNumber: 3, paceFormatted: '5:20', elevationDeltaMeters: 2 },
      { splitNumber: 4, paceFormatted: '5:15', elevationDeltaMeters: 4 },
      { splitNumber: 5, paceFormatted: '5:08', elevationDeltaMeters: 4 },
    ],
    elevationProfile: [8, 9, 11, 14, 15, 12, 10, 8],
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

export const kudos = [
  { id: 'kd_seed_1', activityId: 'act_seed_hatirjheel_run', athleteId: 'ath_seed_sultana' },
  { id: 'kd_seed_2', activityId: 'act_seed_hatirjheel_run', athleteId: 'ath_seed_farhan' },
  { id: 'kd_seed_3', activityId: 'act_seed_purbachal_ride', athleteId: 'ath_seed_tanvir' },
  { id: 'kd_seed_4', activityId: 'act_seed_purbachal_ride', athleteId: 'ath_seed_anika' },
  { id: 'kd_seed_5', activityId: 'act_seed_gulshan_tempo', athleteId: 'ath_seed_tanvir' },
  { id: 'kd_seed_6', activityId: 'act_seed_gulshan_tempo', athleteId: 'ath_seed_sultana' },
  { id: 'kd_seed_7', activityId: 'act_seed_dhanmondi_5k', athleteId: 'ath_seed_farhan' },
];

export const comments = [
  { id: 'cmt_seed_1', activityId: 'act_seed_hatirjheel_run', athleteId: 'ath_seed_sultana', content: 'Great pace Tanvir! Let us do the bridge loop this Friday.' },
  { id: 'cmt_seed_2', activityId: 'act_seed_purbachal_ride', athleteId: 'ath_seed_farhan', content: 'Strong speed on the 300ft expressway! Clean cadence.' },
  { id: 'cmt_seed_3', activityId: 'act_seed_gulshan_tempo', athleteId: 'ath_seed_anika', content: 'Solid morning run Farhan! Keep crushing those goals.' },
];

export const clubs = [
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
    members: ['ath_seed_tanvir', 'ath_seed_farhan', 'ath_seed_anika'],
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
    members: ['ath_seed_sultana', 'ath_seed_tanvir', 'ath_seed_farhan'],
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
    members: ['ath_seed_anika', 'ath_seed_sultana', 'ath_seed_tanvir'],
  },
];

export const challenges = [
  {
    id: 'chl_seed_may_50k',
    title: 'November 50K Running Challenge',
    description: 'Log 50 kilometers of running this month to earn the exclusive digital Finisher Badge.',
    sportType: 'Run',
    targetMeters: 50000.0,
    badgeUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=200',
    startDate: new Date(Date.now() - 5 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 25 * 86400000).toISOString(),
    creatorId: 'ath_seed_tanvir',
    participants: ['ath_seed_tanvir', 'ath_seed_farhan', 'ath_seed_anika'],
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
    participants: ['ath_seed_sultana', 'ath_seed_farhan'],
  },
];

export const groupEvents = [
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
    rsvps: ['ath_seed_tanvir', 'ath_seed_farhan', 'ath_seed_anika'],
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
    rsvps: ['ath_seed_sultana', 'ath_seed_farhan'],
  },
];

export const directMessages = [
  {
    id: 'dm_seed_1',
    senderId: 'ath_seed_tanvir',
    recipientId: 'ath_seed_sultana',
    text: 'Hey Nusrat! Are you leading the Friday Purbachal ride?',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'dm_seed_2',
    senderId: 'ath_seed_sultana',
    recipientId: 'ath_seed_tanvir',
    text: 'Yes Tanvir! Rolling out at 6:00 AM sharp from Kuril. Join in!',
    createdAt: new Date(Date.now() - 3000000).toISOString(),
  },
];

export const notifications = [
  {
    id: 'ntf_seed_1',
    recipientId: 'ath_seed_tanvir',
    actorId: 'ath_seed_sultana',
    actionType: 'KUDOS',
    message: 'Nusrat Sultana gave kudos to your activity',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'ntf_seed_2',
    recipientId: 'ath_seed_sultana',
    actorId: 'ath_seed_farhan',
    actionType: 'COMMENT',
    message: 'Farhan Kabir commented on your ride',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
];

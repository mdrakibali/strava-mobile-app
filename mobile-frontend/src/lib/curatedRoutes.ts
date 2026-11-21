import { LngLat } from './activityView';

export interface CuratedRoute {
  id: string;
  name: string;
  subtitle: string;
  sportType: 'Ride' | 'Run' | 'Walk' | 'Hike';
  distanceMeters: number;
  elevationGainMeters: number;
  estimatedTimeSeconds: number;
  estTimeText: string;
  surfacePercentPaved: number;
  creatorName: string;
  locationName: string;
  description: string;
  polyline: LngLat[];
  photos: string[];
  isSaved?: boolean;
}

/**
 * Road-snapped GPS polylines starting from user's location along Pragati Sarani,
 * Kuril 300-ft Highway, Bashundhara, and Hatirjheel (matching Strava reference screens).
 */
export const CURATED_DHAKA_ROUTES: CuratedRoute[] = [
  {
    id: 'curated-dhaka-1',
    name: 'Pragati Sarani-আলহাজ্জ আবদুর রহমান সড়ক',
    subtitle: 'Moderate • 7.3 km • 10.6 m • 1h 2m',
    sportType: 'Run',
    distanceMeters: 7300,
    elevationGainMeters: 11,
    estimatedTimeSeconds: 3720,
    estTimeText: '1h 2m',
    surfacePercentPaved: 79,
    creatorName: 'Kinetix Community',
    locationName: 'Pragati Sarani – Kuril – Bashundhara',
    description: 'Road-accurate neighborhood loop from Pragati Sarani through Kuril 300ft and Bashundhara Alhaj Abdur Rahman Road.',
    polyline: [
      [90.4255, 23.7800],
      [90.4252, 23.7830],
      [90.4248, 23.7870],
      [90.4245, 23.7910],
      [90.4240, 23.7960],
      [90.4236, 23.8010],
      [90.4232, 23.8060],
      [90.4225, 23.8110],
      [90.4215, 23.8155],
      [90.4225, 23.8170],
      [90.4260, 23.8178],
      [90.4300, 23.8182],
      [90.4340, 23.8185],
      [90.4342, 23.8150],
      [90.4345, 23.8110],
      [90.4348, 23.8070],
      [90.4350, 23.8035],
      [90.4320, 23.8038],
      [90.4280, 23.8042],
      [90.4235, 23.8045],
      [90.4238, 23.7990],
      [90.4242, 23.7940],
      [90.4246, 23.7890],
      [90.4250, 23.7840],
      [90.4255, 23.7800],
    ],
    photos: [
      'https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?w=800&q=80',
      'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&q=80',
    ],
  },
  {
    id: 'curated-dhaka-2',
    name: 'প্রগতি সরণী-Afroza Begum Road-কুড়িল',
    subtitle: 'Moderate • 7.2 km • 8.4 m • 1h 4m',
    sportType: 'Run',
    distanceMeters: 7200,
    elevationGainMeters: 8,
    estimatedTimeSeconds: 3840,
    estTimeText: '1h 4m',
    surfacePercentPaved: 84,
    creatorName: 'Dhaka Community Runners',
    locationName: 'Pragati Sarani – Afroza Begum Road',
    description: 'Popular loop route connecting Pragati Sarani, Madani Avenue, Afroza Begum Road and Kuril.',
    polyline: [
      [90.4255, 23.7800],
      [90.4252, 23.7840],
      [90.4248, 23.7890],
      [90.4244, 23.7940],
      [90.4240, 23.7960],
      [90.4290, 23.7962],
      [90.4340, 23.7965],
      [90.4370, 23.7968],
      [90.4372, 23.8020],
      [90.4375, 23.8070],
      [90.4378, 23.8120],
      [90.4380, 23.8160],
      [90.4330, 23.8165],
      [90.4280, 23.8160],
      [90.4220, 23.8155],
      [90.4228, 23.8090],
      [90.4234, 23.8020],
      [90.4240, 23.7950],
      [90.4248, 23.7880],
      [90.4255, 23.7800],
    ],
    photos: [
      'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80',
      'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&q=80',
    ],
  },
  {
    id: 'curated-dhaka-3',
    name: 'হাতিরঝিল লেক ওয়াটারফ্রন্ট এক্সপ্রেস লুপ',
    subtitle: 'Moderate • 8.5 km • 12 m • 50m',
    sportType: 'Run',
    distanceMeters: 8500,
    elevationGainMeters: 12,
    estimatedTimeSeconds: 3000,
    estTimeText: '50m',
    surfacePercentPaved: 98,
    creatorName: 'Dhaka Runners Guild',
    locationName: 'Hatirjheel Promenade, Dhaka',
    description: 'Scenic waterfront loop around Hatirjheel with dedicated running path, bridges, and lakeside scenery.',
    polyline: [
      [90.4255, 23.7750],
      [90.4235, 23.7710],
      [90.4195, 23.7708],
      [90.4168, 23.7718],
      [90.4140, 23.7726],
      [90.4112, 23.7733],
      [90.4085, 23.7739],
      [90.4060, 23.7744],
      [90.4035, 23.7742],
      [90.4010, 23.7730],
      [90.3988, 23.7705],
      [90.3975, 23.7675],
      [90.3980, 23.7645],
      [90.3995, 23.7628],
      [90.4025, 23.7620],
      [90.4055, 23.7618],
      [90.4088, 23.7615],
      [90.4120, 23.7612],
      [90.4148, 23.7610],
      [90.4175, 23.7615],
      [90.4205, 23.7628],
      [90.4230, 23.7642],
      [90.4255, 23.7750],
    ],
    photos: [
      'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=800&q=80',
    ],
  },
  {
    id: 'curated-dhaka-4',
    name: '৩০০ ফিট এক্সপ্রেসওয়ে হাই স্পিড করিডোর (300ft Expressway)',
    subtitle: 'Moderate • 16.5 km • 15 m • 45m',
    sportType: 'Ride',
    distanceMeters: 16500,
    elevationGainMeters: 15,
    estimatedTimeSeconds: 2700,
    estTimeText: '45m',
    surfacePercentPaved: 100,
    creatorName: 'TeamBDC Cycling Club',
    locationName: 'Kuril – 300ft Purbachal Expressway',
    description: 'Wide paved expressway connecting Kuril Flyover with Purbachal. Ideal for group cycling and intervals.',
    polyline: [
      [90.4215, 23.8155],
      [90.4250, 23.8180],
      [90.4320, 23.8188],
      [90.4410, 23.8195],
      [90.4500, 23.8202],
      [90.4600, 23.8210],
      [90.4700, 23.8218],
      [90.4800, 23.8225],
      [90.4700, 23.8218],
      [90.4600, 23.8210],
      [90.4500, 23.8202],
      [90.4410, 23.8195],
      [90.4320, 23.8188],
      [90.4250, 23.8180],
      [90.4215, 23.8155],
    ],
    photos: [
      'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&q=80',
    ],
  },
];

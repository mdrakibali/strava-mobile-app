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
 * High-density GPS polylines snapped to Dhaka's actual road network (ADR-04).
 * Covers Pragati Sarani, Hatirjheel Loop, Kuril 300-ft highway, and Gulshan/Banani.
 */
export const CURATED_DHAKA_ROUTES: CuratedRoute[] = [
  {
    id: 'curated-dhaka-1',
    name: 'হাতিরঝিল সানরাইজ পেরিমিটার লুপ (Hatirjheel Waterfront Loop)',
    subtitle: 'Run • From your location • Dhaka Metropolitan',
    sportType: 'Run',
    distanceMeters: 8500,
    elevationGainMeters: 12,
    estimatedTimeSeconds: 2700,
    estTimeText: '40m – 55m',
    surfacePercentPaved: 98,
    creatorName: 'Kinetix Athletics',
    locationName: 'Hatirjheel, Dhaka',
    description: 'Scenic continuous paved waterfront loop around Hatirjheel with dedicated running track and waterfront views.',
    polyline: [
      [90.4265, 23.7680],
      [90.4248, 23.7688],
      [90.4225, 23.7695],
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
      [90.4252, 23.7660],
      [90.4265, 23.7680],
    ],
    photos: [
      'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=800&q=80',
      'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&q=80',
    ],
  },
  {
    id: 'curated-dhaka-2',
    name: 'বীর উত্তম এ. কে. খন্দকার সড়ক-প্রগতি সরণী-কুড়িল ফ্লাইওভার',
    subtitle: 'Ride • From your location • Dhaka Metropolitan',
    sportType: 'Ride',
    distanceMeters: 26230,
    elevationGainMeters: 26,
    estimatedTimeSeconds: 4860,
    estTimeText: '1h 15m – 1h 30m',
    surfacePercentPaved: 94,
    creatorName: 'TeamBDC Cycling',
    locationName: 'North Badda – Kuril – Purbachal',
    description: 'Premier cycling corridor along Pragati Sarani connecting North Badda, Notun Bazar, Kuril Flyover and 300ft Express highway.',
    polyline: [
      [90.4246, 23.7850],
      [90.4244, 23.7880],
      [90.4241, 23.7915],
      [90.4238, 23.7950],
      [90.4234, 23.7985],
      [90.4230, 23.8020],
      [90.4225, 23.8060],
      [90.4220, 23.8095],
      [90.4215, 23.8130],
      [90.4210, 23.8165],
      [90.4235, 23.8175],
      [90.4280, 23.8182],
      [90.4340, 23.8188],
      [90.4410, 23.8192],
      [90.4485, 23.8198],
      [90.4560, 23.8205],
      [90.4630, 23.8210],
      [90.4680, 23.8212],
      [90.4675, 23.8185],
      [90.4600, 23.8180],
      [90.4510, 23.8175],
      [90.4420, 23.8168],
      [90.4350, 23.8160],
      [90.4285, 23.8155],
      [90.4240, 23.8150],
      [90.4210, 23.8145],
      [90.4218, 23.8090],
      [90.4225, 23.8020],
      [90.4235, 23.7950],
      [90.4241, 23.7885],
      [90.4246, 23.7850],
    ],
    photos: [
      'https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?w=800&q=80',
      'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&q=80',
    ],
  },
  {
    id: 'curated-dhaka-3',
    name: 'গুলশান এভিনিউ-কামাল আতাতুর্ক-বনানী রোড ১১ লুপ',
    subtitle: 'Ride • 1.2 km away • Gulshan-Banani Diplomatic Zone',
    sportType: 'Ride',
    distanceMeters: 14200,
    elevationGainMeters: 18,
    estimatedTimeSeconds: 2700,
    estTimeText: '40m – 50m',
    surfacePercentPaved: 99,
    creatorName: 'Dhaka City Cyclists',
    locationName: 'Gulshan & Banani, Dhaka',
    description: 'Smooth asphalt loop across Gulshan Avenue, Kamal Ataturk Boulevard and Banani Road 11.',
    polyline: [
      [90.4172, 23.7785],
      [90.4170, 23.7820],
      [90.4168, 23.7860],
      [90.4165, 23.7895],
      [90.4162, 23.7930],
      [90.4135, 23.7932],
      [90.4095, 23.7935],
      [90.4055, 23.7938],
      [90.4025, 23.7940],
      [90.4022, 23.7905],
      [90.4020, 23.7865],
      [90.4028, 23.7825],
      [90.4050, 23.7800],
      [90.4090, 23.7788],
      [90.4135, 23.7782],
      [90.4172, 23.7785],
    ],
    photos: [
      'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&q=80',
    ],
  },
  {
    id: 'curated-dhaka-4',
    name: 'রমনা পার্ক ও চন্দ্রিমা উদ্যান মর্নিং ট্রেইল (Ramna & Chandrima)',
    subtitle: 'Walk • Central Dhaka • Historic Green Park',
    sportType: 'Walk',
    distanceMeters: 5200,
    elevationGainMeters: 8,
    estimatedTimeSeconds: 3600,
    estTimeText: '50m – 1h 05m',
    surfacePercentPaved: 85,
    creatorName: 'Morning Walkers Guild',
    locationName: 'Ramna Park, Dhaka',
    description: 'Tranquil paved tree-canopy loop around Ramna lake and historic green gardens.',
    polyline: [
      [90.3995, 23.7380],
      [90.4010, 23.7395],
      [90.4025, 23.7410],
      [90.4032, 23.7430],
      [90.4028, 23.7450],
      [90.4012, 23.7460],
      [90.3990, 23.7455],
      [90.3975, 23.7440],
      [90.3970, 23.7415],
      [90.3980, 23.7395],
      [90.3995, 23.7380],
    ],
    photos: [
      'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80',
    ],
  },
];

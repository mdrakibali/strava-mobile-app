import { SportType } from './index';

export interface TrainingGoal {
  id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: 'km' | 'hours' | 'm_elev';
  period: 'WEEKLY' | 'MONTHLY' | 'ANNUAL';
  sportType: SportType;
}

export interface TrainingPlanWorkout {
  day: string;
  title: string;
  distanceKm: number;
  durationMinutes: number;
  description: string;
  isCompleted: boolean;
}

export interface TrainingPlan {
  id: string;
  title: string;
  durationWeeks: number;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  sportType: SportType;
  description: string;
  weeklyWorkouts: TrainingPlanWorkout[];
}

export interface FitnessFatiguePoint {
  date: string;
  fitnessCtl: number; // Chronic Training Load (42-day)
  fatigueAtl: number; // Acute Training Load (7-day)
  formTsb: number;    // Training Stress Balance (Fitness - Fatigue)
}

export interface RacePrediction {
  distanceLabel: '5K' | '10K' | 'Half Marathon' | 'Marathon';
  predictedTimeFormatted: string;
  predictedPaceFormatted: string;
  confidenceScorePercent: number;
}

export interface PrivacyZoneItem {
  id: string;
  name: string;
  addressSnippet: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}


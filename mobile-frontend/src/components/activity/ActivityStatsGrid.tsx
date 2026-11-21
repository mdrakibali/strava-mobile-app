import React from 'react';
import { View } from 'react-native';
import { MetricTile } from '../../design';
import { ActivityView, avgSpeedOf } from '../../lib/activityView';
import { estimateCalories } from '../../lib/calories';
import {
  formatCalories,
  formatClock,
  formatDistance,
  formatElevation,
  formatPace,
  formatSpeed,
} from '../../lib/format';
import { sportConfig } from '../../lib/sports';

interface Props {
  activity: ActivityView;
}

export const ActivityStatsGrid: React.FC<Props> = ({ activity }) => {
  const sport = sportConfig(activity.sportType);
  const avgSpeed = avgSpeedOf(activity);
  const calories =
    activity.calories ??
    estimateCalories(activity.sportType, activity.distanceMeters, activity.movingTimeSeconds);

  const stats: { label: string; value: string }[] = [
    { label: 'Distance', value: formatDistance(activity.distanceMeters) },
    { label: 'Moving time', value: formatClock(activity.movingTimeSeconds) },
    sport.primaryMetric === 'speed'
      ? { label: 'Avg speed', value: formatSpeed(avgSpeed) }
      : { label: 'Avg pace', value: formatPace(activity.distanceMeters, activity.movingTimeSeconds) },
    { label: 'Elevation gain', value: formatElevation(activity.elevationGainMeters) },
    { label: 'Elapsed time', value: formatClock(activity.elapsedTimeSeconds) },
    { label: 'Calories (est.)', value: formatCalories(calories) },
  ];

  if (sport.primaryMetric === 'speed' && activity.maxSpeedMps) {
    stats.push({ label: 'Max speed', value: formatSpeed(activity.maxSpeedMps) });
  }

  return (
    <View className="flex-row flex-wrap mt-4 border-y border-gray-100 py-2">
      {stats.map((s) => (
        <View key={s.label} className="w-1/2 py-3">
          <MetricTile label={s.label} value={s.value} size="L" align="center" />
        </View>
      ))}
    </View>
  );
};

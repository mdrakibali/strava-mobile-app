import React from 'react';
import { View } from 'react-native';
import { AppText, Chip, ChipRow, MetricRow, MetricTile } from '../../design';
import { formatDuration, formatElevation, kmValue } from '../../lib/format';
import { MVP_SPORTS } from '../../lib/sports';

interface ProgressProps {
  sportFilter: string;
  setSportFilter: (s: string) => void;
  sportsPresent: typeof MVP_SPORTS;
  progress: {
    week: { meters: number; seconds: number; elev: number };
    weeks: { start: number; meters: number; seconds: number; elev: number }[];
    weekComplete: boolean;
    windowComplete: boolean;
  };
  maxWeek: number;
  totals: {
    ytd: {
      count: number;
      distanceMeters: number;
      movingTimeSeconds: number;
      elevationGainMeters: number;
    };
    all: {
      count: number;
      distanceMeters: number;
      movingTimeSeconds: number;
      elevationGainMeters: number;
    };
  } | null;
  recentLimit: number;
}

export const ProfileProgressTab: React.FC<ProgressProps> = ({
  sportFilter,
  setSportFilter,
  sportsPresent,
  progress,
  maxWeek,
  totals,
  recentLimit,
}) => {
  return (
    <View className="bg-white m-4 p-4 rounded-2xl border border-gray-100 shadow-sm">
      <ChipRow>
        <Chip
          label="All sports"
          selected={sportFilter === 'All'}
          onPress={() => setSportFilter('All')}
        />
        {sportsPresent.map((s) => (
          <Chip
            key={s.id}
            label={s.label}
            icon={s.icon}
            selected={sportFilter === s.id}
            onPress={() => setSportFilter(s.id)}
          />
        ))}
      </ChipRow>
      <AppText variant="title2" className="mt-6">
        This week
      </AppText>
      <MetricRow className="mt-3">
        <MetricTile label="Distance" value={kmValue(progress.week.meters)} unit="km" size="L" />
        <MetricTile label="Time" value={formatDuration(progress.week.seconds)} size="L" />
        <MetricTile label="Elev gain" value={formatElevation(progress.week.elev)} size="L" />
      </MetricRow>
      {!progress.weekComplete ? (
        <AppText variant="caption" color="inkTertiary" className="mt-2">
          Includes only the {recentLimit} most recent activities.
        </AppText>
      ) : null}

      <AppText variant="title3" className="mt-6">
        Past 12 weeks · distance
      </AppText>
      <View
        className="h-24 flex-row items-end mt-4"
        accessible
        accessibilityLabel="Weekly distance for the past 12 weeks"
      >
        {progress.weeks.map((w, i) => (
          <View key={w.start} className="flex-1 h-full justify-end px-0.5">
            <View
              style={{
                height: `${Math.max(w.meters > 0 ? 6 : 2, (w.meters / maxWeek) * 100)}%`,
              }}
              className={`rounded-t-sm ${i === 11 ? 'bg-[#FC4C02]' : 'bg-gray-300'}`}
            />
          </View>
        ))}
      </View>
      <View className="flex-row items-center justify-between mt-1">
        <AppText variant="caption" color="inkTertiary">
          {new Date(progress.weeks[0].start).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </AppText>
        <AppText variant="caption" color="inkTertiary">
          This week
        </AppText>
      </View>
      {!progress.windowComplete ? (
        <AppText variant="caption" color="inkTertiary" className="mt-2">
          Older weeks may be incomplete — only the {recentLimit} most recent activities are loaded.
        </AppText>
      ) : null}
      {totals ? (
        <View className="mt-6">
          <AppText variant="title3">This year</AppText>
          <MetricRow className="mt-2">
            <MetricTile label="Activities" value={String(totals.ytd.count)} />
            <MetricTile label="Distance" value={kmValue(totals.ytd.distanceMeters)} unit="km" />
            <MetricTile label="Time" value={formatDuration(totals.ytd.movingTimeSeconds)} />
            <MetricTile label="Elev gain" value={formatElevation(totals.ytd.elevationGainMeters)} />
          </MetricRow>
          <AppText variant="title3" className="mt-4">
            All time
          </AppText>
          <MetricRow className="mt-2">
            <MetricTile label="Activities" value={String(totals.all.count)} />
            <MetricTile label="Distance" value={kmValue(totals.all.distanceMeters)} unit="km" />
            <MetricTile label="Time" value={formatDuration(totals.all.movingTimeSeconds)} />
            <MetricTile label="Elev gain" value={formatElevation(totals.all.elevationGainMeters)} />
          </MetricRow>
        </View>
      ) : null}
    </View>
  );
};

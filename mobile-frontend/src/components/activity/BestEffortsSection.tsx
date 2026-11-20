import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { useApp } from '../../context/AppContext';
import { BestEffortItem } from '../../types';

interface BestEffortsSectionProps {
  title?: string;
  limit?: number;
}

export const BestEffortsSection: React.FC<BestEffortsSectionProps> = ({
  title = 'Best Efforts & Personal Records',
  limit,
}) => {
  const { activities, currentUser } = useApp();

  const userRuns = activities.filter(
    (a) => a.sportType === 'Run' && (a.athlete?.id === currentUser?.id || !a.athlete?.id)
  );

  // Scan user's real runs to find all-time best efforts
  const benchmarks = [
    { label: '400m', meters: 400 },
    { label: '1k', meters: 1000 },
    { label: '1 Mile', meters: 1609 },
    { label: '5k', meters: 5000 },
    { label: '10k', meters: 10000 },
    { label: 'Half Marathon', meters: 21097 },
  ];

  const computedBestEfforts: BestEffortItem[] = [];

  benchmarks.forEach((bench) => {
    // Find all runs that completed at least this distance
    const qualifyingRuns = userRuns.filter((r) => r.distanceMeters >= bench.meters);
    if (qualifyingRuns.length === 0) return;

    // Estimate elapsed time for the benchmark distance based on the run's average pace
    let bestTimeSecs = Infinity;
    let bestRunDate = '';

    qualifyingRuns.forEach((run) => {
      const paceSecondsPerMeter = run.movingTimeSeconds / run.distanceMeters;
      const estimatedTime = Math.round(paceSecondsPerMeter * bench.meters);

      if (estimatedTime < bestTimeSecs) {
        bestTimeSecs = estimatedTime;
        bestRunDate = new Date(run.startTime).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
    });

    if (bestTimeSecs !== Infinity) {
      const mins = Math.floor(bestTimeSecs / 60);
      const secs = bestTimeSecs % 60;
      const hours = Math.floor(mins / 60);
      const remainMins = mins % 60;

      const timeFormatted =
        hours > 0
          ? `${hours}:${String(remainMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
          : `${mins}:${String(secs).padStart(2, '0')}`;

      const paceSecsPerKm = Math.round(bestTimeSecs / (bench.meters / 1000));
      const paceM = Math.floor(paceSecsPerKm / 60);
      const paceS = paceSecsPerKm % 60;
      const paceFormatted = `${paceM}:${String(paceS).padStart(2, '0')} /km`;

      computedBestEfforts.push({
        id: `pr_${bench.label.toLowerCase().replace(' ', '_')}`,
        distanceLabel: bench.label,
        timeFormatted,
        paceFormatted,
        dateAchieved: bestRunDate,
        isRecentPr: true,
      });
    }
  });

  const items = limit ? computedBestEfforts.slice(0, limit) : computedBestEfforts;

  return (
    <View className="bg-white mt-3 p-5 border-y border-gray-100">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Ionicons name="ribbon-outline" size={18} color="#FC4C02" />
          <Text className="text-xs font-black text-gray-500 uppercase tracking-wider ml-1.5">
            {title}
          </Text>
        </View>
        <Text className="text-[11px] font-black text-[#FC4C02]">All-Time PRs</Text>
      </View>

      {items.length === 0 ? (
        <View className="py-4 px-2 items-center">
          <Ionicons name="trophy-outline" size={32} color="#D1D5DB" />
          <Text className="text-xs font-bold text-gray-700 mt-2 text-center">
            No Personal Records Recorded Yet
          </Text>
          <Text className="text-[11px] text-gray-400 text-center mt-0.5">
            Record outdoor runs of 1k, 5k, or 10k to automatically unlock your all-time PR medals!
          </Text>
        </View>
      ) : (
        <View className="space-y-2">
          {items.map((item) => (
            <View
              key={item.id}
              className="flex-row items-center justify-between p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100 mb-2">
              <View className="flex-row items-center">
                <View className="w-9 h-9 rounded-full bg-amber-50 items-center justify-center mr-3 border border-amber-200">
                  <Ionicons name="trophy" size={16} color="#D97706" />
                </View>
                <View>
                  <Text className="text-xs font-black text-gray-900">{item.distanceLabel}</Text>
                  <Text className="text-[10px] text-gray-400">{item.dateAchieved}</Text>
                </View>
              </View>

              <View className="items-end">
                <View className="flex-row items-center">
                  <Text className="text-sm font-black text-gray-900 mr-1.5">
                    {item.timeFormatted}
                  </Text>
                  {item.isRecentPr && (
                    <View className="bg-amber-100 px-2 py-0.5 rounded-md">
                      <Text className="text-[9px] font-black text-amber-800">PR</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

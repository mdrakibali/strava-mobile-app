import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { saveLastSport } from '../../components/record/SportSheet';
import { useApp } from '../../context/AppContext';
import { formatDuration, kmValue } from '../../lib/format';
import { api } from '../../services/api';
import { isRecordingActive, useRecording } from '../../tracking/useRecording';
import { SportType } from '../../types';

interface SportCardItem {
  id: SportType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  subtitle: string;
}

const WORKOUT_SPORTS: SportCardItem[] = [
  { id: 'Workout', label: 'Workout', icon: 'fitness', subtitle: 'Indoor gym, strength & crossfit timer' },
  { id: 'Ride', label: 'Ride', icon: 'bicycle', subtitle: 'GPS · Speed, distance & elevation' },
  { id: 'Run', label: 'Run', icon: 'footsteps', subtitle: 'GPS · Pace, distance & elevation' },
  { id: 'Walk', label: 'Walk', icon: 'walk', subtitle: 'GPS · Distance, steps & pace' },
];

type Totals = Record<string, { count: number; distance: number; moving: number }>;

export default function WorkoutTab() {
  const router = useRouter();
  const { currentUser } = useApp();
  const rec = useRecording();
  const active = isRecordingActive(rec);
  const [totals, setTotals] = useState<Totals | null>(null);

  useFocusEffect(
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    useCallback(() => {
      if (!currentUser?.id) return;
      let cancelled = false;
      api.athletes.stats(currentUser.id).then(
        (s) => {
          if (cancelled || !s?.bySport) return;
          const t: Totals = {};
          for (const b of s.bySport) {
            t[b.sportType] = {
              count: b.yearToDate?.count || 0,
              distance: b.yearToDate?.distanceMeters || 0,
              moving: b.yearToDate?.movingTimeSeconds || 0,
            };
          }
          setTotals(t);
        },
        () => !cancelled && setTotals(null)
      );
      return () => {
        cancelled = true;
      };
    }, [currentUser?.id])
  );

  const startSport = (sport: SportType) => {
    saveLastSport(sport);
    router.push({
      pathname: '/record',
      params: { sport, autoStart: 'true' },
    });
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Light Mode Top Header */}
      <View style={{ backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }} className="px-5 pt-3 pb-3 flex-row items-center justify-between">
        <Text className="text-3xl font-black text-gray-900 tracking-tight">Workout</Text>
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/history/[athleteId]', params: { athleteId: currentUser.id } })}
          accessibilityLabel="Activity History"
          className="p-2.5 rounded-full bg-gray-100 active:bg-gray-200">
          <Ionicons name="time-outline" size={22} color="#374151" />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 120, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}>
          {active ? (
            <TouchableOpacity
              onPress={() => router.push('/record')}
              activeOpacity={0.8}
              className="mb-4 p-4 rounded-3xl bg-orange-50 border-2 border-[#FC4C02] flex-row items-center justify-between shadow-sm">
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full bg-[#FC4C02] items-center justify-center mr-3">
                  <Ionicons name="radio-button-on" size={20} color="#FFFFFF" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-black text-gray-900">Workout in progress</Text>
                  <Text className="text-xs font-bold text-[#FC4C02] mt-0.5">{rec.sport} · Active (tap to return)</Text>
                </View>
              </View>
              <View className="bg-[#FC4C02] px-3.5 py-1.5 rounded-full">
                <Text className="text-white text-xs font-black">Return</Text>
              </View>
            </TouchableOpacity>
          ) : null}

          {/* Clean Sports Cards: Workout, Ride, Run, Walk */}
          {WORKOUT_SPORTS.map((s) => {
            const t = totals?.[s.id];
            return (
              <View
                key={s.id}
                className="bg-white rounded-3xl p-5 mb-4 border border-gray-200 shadow-sm">
                <TouchableOpacity
                  onPress={() => startSport(s.id)}
                  activeOpacity={0.7}
                  className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center flex-1">
                    <View className="w-12 h-12 rounded-2xl bg-orange-50 items-center justify-center mr-3.5 border border-orange-200">
                      <Ionicons name={s.icon} size={24} color="#FC4C02" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-2xl font-black text-gray-900">{s.label}</Text>
                      <Text className="text-xs font-semibold text-gray-500 mt-0.5">
                        {t && t.count > 0
                          ? `This year: ${t.count} · ${kmValue(t.distance)} km · ${formatDuration(t.moving)}`
                          : s.subtitle}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                {/* Big Solid Orange Start Button */}
                <TouchableOpacity
                  onPress={() => startSport(s.id)}
                  activeOpacity={0.85}
                  className="w-full py-4 bg-[#FC4C02] rounded-full flex-row items-center justify-center shadow-md active:bg-[#E03A00]">
                  <Ionicons name="play" size={18} color="#FFFFFF" />
                  <Text className="text-white font-black text-base ml-2">Start</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

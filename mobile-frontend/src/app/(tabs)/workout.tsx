import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { saveLastSport } from '../../components/record/SportSheet';
import { useApp } from '../../context/AppContext';
import { formatClock, formatDuration, kmValue } from '../../lib/format';
import { MVP_SPORTS, sportConfig } from '../../lib/sports';
import { PLACE_LABEL, useNearbyPlaces } from '../../lib/useNearbyPlaces';
import { api } from '../../services/api';
import { syncWorker } from '../../tracking/sync';
import { isRecordingActive, timerSeconds, useNow, usePendingUploads, useRecording } from '../../tracking/useRecording';
import { SportType } from '../../types';

type Totals = Record<string, { count: number; distance: number; moving: number }>;

/**
 * Workout tab (reference: strava-screen/workout-tab.png).
 * Clean NativeWind Tailwind styling matching Strava's Workout tab.
 */
export default function WorkoutTab() {
  const router = useRouter();
  const { currentUser } = useApp();
  const rec = useRecording();
  const active = isRecordingActive(rec);
  const now = useNow(active && rec.lifecycle.status === 'recording');
  const pending = usePendingUploads();
  const [totals, setTotals] = useState<Totals | null>(null);
  const [placeSport, setPlaceSport] = useState<SportType>('Run');
  const nearby = useNearbyPlaces(placeSport);

  // This year's totals per sport, from the server
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      api.athletes.stats(currentUser.id).then(
        (s) => {
          if (cancelled) return;
          const t: Totals = {};
          for (const b of s.bySport) {
            t[b.sportType] = {
              count: b.yearToDate.count,
              distance: b.yearToDate.distanceMeters,
              moving: b.yearToDate.movingTimeSeconds,
            };
          }
          setTotals(t);
        },
        () => !cancelled && setTotals(null)
      );
      return () => {
        cancelled = true;
      };
    }, [currentUser.id])
  );

  const start = (sport: SportType) => {
    saveLastSport(sport);
    router.push({ pathname: '/record', params: { sport } });
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#F7F7F8]">
      {/* Top Header */}
      <View className="px-5 pt-3 pb-2 bg-white border-b border-gray-100">
        <Text className="text-3xl font-black text-gray-900 tracking-tight">Workout</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Active Recording Banner */}
        {active ? (
          <Pressable
            onPress={() => router.push('/record')}
            className={`flex-row items-center bg-white p-4 rounded-2xl mb-4 border ${
              rec.lifecycle.status === 'paused' ? 'border-amber-400 bg-amber-50/50' : 'border-[#FC4C02]'
            } shadow-sm`}>
            <Ionicons
              name={rec.lifecycle.status === 'paused' ? 'pause-circle' : 'radio-button-on'}
              size={28}
              color="#FC4C02"
            />
            <View className="flex-1 ml-3">
              <Text className="text-base font-bold text-gray-900">
                {rec.lifecycle.pauseReason === 'interrupted'
                  ? 'Recording interrupted'
                  : rec.lifecycle.status === 'paused'
                    ? `${sportConfig(rec.sport).label} paused`
                    : `${sportConfig(rec.sport).label} in progress`}
              </Text>
              <Text className="text-xs font-semibold text-gray-500 mt-0.5">
                {formatClock(timerSeconds(rec, now))} · {kmValue(rec.distanceM)} km · Tap to return
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </Pressable>
        ) : null}

        {/* Pending Uploads Banner */}
        {pending.length > 0 ? (
          <Pressable
            onPress={() => syncWorker.kick(true)}
            className="flex-row items-center bg-white p-4 rounded-2xl mb-4 border border-gray-200 shadow-sm">
            <Ionicons name="cloud-upload-outline" size={24} color="#1F2937" />
            <View className="flex-1 ml-3">
              <Text className="text-sm font-bold text-gray-900">
                {pending.length} {pending.length === 1 ? 'activity' : 'activities'} waiting to upload
              </Text>
              <Text className="text-xs text-gray-500 mt-0.5">Tap to retry upload now</Text>
            </View>
          </Pressable>
        ) : null}

        {/* Primary Sports Cards (Strava Reference workout-tab.png) */}
        {MVP_SPORTS.map((s) => {
          const t = totals?.[s.id];
          return (
            <View key={s.id} className="bg-white rounded-3xl p-5 mb-4 border border-gray-200/70 shadow-xs">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-xl bg-orange-50 items-center justify-center mr-3">
                    <Ionicons name={s.icon} size={22} color="#FC4C02" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xl font-black text-gray-900">{s.label}</Text>
                    <Text className="text-xs font-medium text-gray-500 mt-0.5">
                      {t && t.count > 0
                        ? `This year: ${t.count} · ${kmValue(t.distance)} km · ${formatDuration(t.moving)}`
                        : s.primaryMetric === 'speed'
                          ? 'GPS · Speed, distance, elevation'
                          : 'GPS · Pace, distance, elevation'}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
              </View>

              <TouchableOpacity
                onPress={() => start(s.id)}
                disabled={active}
                activeOpacity={0.85}
                className="w-full py-3.5 bg-[#FC4C02] rounded-full flex-row items-center justify-center active:bg-[#E34402]">
                <Ionicons name="play" size={18} color="#FFFFFF" />
                <Text className="text-white font-black text-sm ml-2">Start</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* More Sports Outline Button */}
        <TouchableOpacity
          onPress={() => start('Workout')}
          activeOpacity={0.7}
          className="w-full py-3.5 bg-white border border-[#FC4C02] rounded-full items-center justify-center my-2 shadow-2xs">
          <Text className="text-[#FC4C02] font-black text-sm">More sports</Text>
        </TouchableOpacity>

        {/* Places near you */}
        <View className="mt-6 mb-2">
          <Text className="text-lg font-black text-gray-900 mb-3">Places near you</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-3">
            {MVP_SPORTS.map((s) => (
              <TouchableOpacity
                key={s.id}
                onPress={() => setPlaceSport(s.id)}
                className={`flex-row items-center px-4 py-2 rounded-full mr-2.5 ${
                  placeSport === s.id ? 'bg-[#FC4C02]' : 'bg-white border border-gray-200'
                }`}>
                <Ionicons
                  name={s.icon}
                  size={14}
                  color={placeSport === s.id ? '#FFFFFF' : '#4B5563'}
                  className="mr-1.5"
                />
                <Text className={`text-xs font-bold ${placeSport === s.id ? 'text-white' : 'text-gray-700'}`}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs mb-4">
            {nearby.state.status === 'ready' ? (
              nearby.state.places.length === 0 ? (
                <Text className="text-xs text-gray-500 py-2">
                  No {sportConfig(placeSport).label.toLowerCase()} places are mapped in OpenStreetMap within 5 km.
                </Text>
              ) : (
                <>
                  {nearby.state.places.slice(0, 3).map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() =>
                        router.navigate({
                          pathname: '/maps',
                          params: { source: 'nearby', sport: placeSport, place: p.id },
                        })
                      }
                      className="flex-row items-center py-3 border-b border-gray-100 last:border-b-0">
                      <View className="w-8 h-8 rounded-full bg-orange-100 items-center justify-center mr-3">
                        <Ionicons
                          name={(PLACE_LABEL[p.category]?.icon ?? 'location-outline') as any}
                          size={16}
                          color="#FC4C02"
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>
                          {p.name}
                        </Text>
                        <Text className="text-xs text-gray-500 mt-0.5">
                          {PLACE_LABEL[p.category]?.label ?? 'Place'} ·{' '}
                          {p.distanceM < 1000 ? `${p.distanceM} m` : `${kmValue(p.distanceM)} km`} away
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                    </TouchableOpacity>
                  ))}
                  <Text className="text-[10px] text-gray-400 mt-2">{nearby.state.attribution}</Text>
                </>
              )
            ) : nearby.state.status === 'permission_denied' ? (
              <View className="py-2">
                <Text className="text-xs text-gray-600 mb-2">Allow location to discover workout places near you.</Text>
                <TouchableOpacity
                  onPress={nearby.retry}
                  className="px-4 py-2 bg-[#FC4C02] rounded-xl self-start">
                  <Text className="text-xs font-bold text-white">Allow location</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text className="text-xs text-gray-500 py-2">Finding nearby places…</Text>
            )}
          </View>
        </View>

        {/* Activity History Button */}
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/history/[athleteId]', params: { athleteId: currentUser.id } })}
          activeOpacity={0.8}
          className="w-full py-4 bg-white border border-gray-300 rounded-2xl flex-row items-center justify-center shadow-xs">
          <Ionicons name="time-outline" size={18} color="#1F2937" />
          <Text className="text-sm font-bold text-gray-900 ml-2">Activity History</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { saveLastSport } from '../../components/record/SportSheet';
import { useApp } from '../../context/AppContext';
import { formatDuration, kmValue } from '../../lib/format';
import { sportConfig } from '../../lib/sports';
import { api } from '../../services/api';
import { isRecordingActive, useRecording } from '../../tracking/useRecording';
import { SportType } from '../../types';

type Totals = Record<string, { count: number; distance: number; moving: number }>;

interface SportItem {
  id: SportType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  category: 'foot' | 'cycle' | 'other';
}

const ALL_SPORTS: SportItem[] = [
  { id: 'Run', label: 'Run', icon: 'footsteps-outline', category: 'foot' },
  { id: 'Trail Run', label: 'Trail Run', icon: 'trending-up-outline', category: 'foot' },
  { id: 'Walk', label: 'Walk', icon: 'walk-outline', category: 'foot' },
  { id: 'Hike', label: 'Hike', icon: 'trail-sign-outline', category: 'foot' },
  { id: 'Ride', label: 'Ride', icon: 'bicycle-outline', category: 'cycle' },
  { id: 'Gravel Ride', label: 'Gravel Ride', icon: 'bicycle-outline', category: 'cycle' },
  { id: 'Mountain Bike', label: 'Mountain Bike', icon: 'bicycle-outline', category: 'cycle' },
  { id: 'E-Bike Ride', label: 'E-Bike Ride', icon: 'flash-outline', category: 'cycle' },
  { id: 'Yoga', label: 'Yoga', icon: 'body-outline', category: 'other' },
  { id: 'Workout', label: 'Workout', icon: 'fitness-outline', category: 'other' },
  { id: 'Swim', label: 'Swim', icon: 'water-outline', category: 'other' },
];

const TOP_SPORTS: SportItem[] = [
  { id: 'Yoga', label: 'Yoga', icon: 'body-outline', category: 'other' },
  { id: 'Run', label: 'Run', icon: 'footsteps-outline', category: 'foot' },
  { id: 'Ride', label: 'Ride', icon: 'bicycle-outline', category: 'cycle' },
  { id: 'Walk', label: 'Walk', icon: 'walk-outline', category: 'foot' },
  { id: 'Hike', label: 'Hike', icon: 'trail-sign-outline', category: 'foot' },
];

export default function WorkoutTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser } = useApp();
  const rec = useRecording();
  const active = isRecordingActive(rec);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [showSportModal, setShowSportModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // If a workout is already in progress, navigate directly to the recorder screen.
  useFocusEffect(
    useCallback(() => {
      if (active) {
        router.replace('/record');
      }
    }, [active, router])
  );

  // Fetch yearly totals for sports stats
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
    setShowSportModal(false);
    router.push({ pathname: '/record', params: { sport } });
  };

  const filteredSports = useMemo(() => {
    if (!searchQuery.trim()) return ALL_SPORTS;
    const q = searchQuery.toLowerCase().trim();
    return ALL_SPORTS.filter((s) => s.label.toLowerCase().includes(q));
  }, [searchQuery]);

  const footSports = filteredSports.filter((s) => s.category === 'foot');
  const cycleSports = filteredSports.filter((s) => s.category === 'cycle');
  const otherSports = filteredSports.filter((s) => s.category === 'other');

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#121212]">
      {/* Top Header */}
      <View className="px-5 pt-3 pb-3 bg-[#121212] border-b border-[#27272A] flex-row items-center justify-between">
        <Text className="text-3xl font-black text-white tracking-tight">Workout</Text>
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/history/[athleteId]', params: { athleteId: currentUser.id } })}
          accessibilityLabel="Activity History"
          className="p-2 rounded-full bg-[#1E1E1E]">
          <Ionicons name="time-outline" size={22} color="#D1D5DB" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Top 3 Featured Sports (Yoga, Run, Ride - Strava Reference) */}
        {TOP_SPORTS.slice(0, 3).map((s) => {
          const t = totals?.[s.id];
          return (
            <View key={s.id} className="bg-[#1C1C1E] rounded-3xl p-5 mb-4 border border-[#2C2C2E] shadow-sm">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center flex-1">
                  <View className="w-11 h-11 rounded-2xl bg-[#2A2A2D] items-center justify-center mr-3.5">
                    <Ionicons name={s.icon} size={22} color="#FC4C02" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xl font-black text-white">{s.label}</Text>
                    <Text className="text-xs font-medium text-gray-400 mt-0.5">
                      {t && t.count > 0
                        ? `This year: ${t.count} · ${kmValue(t.distance)} km · ${formatDuration(t.moving)}`
                        : sportConfig(s.id).primaryMetric === 'speed'
                          ? 'GPS · Speed, distance, elevation'
                          : 'GPS · Pace, distance, elevation'}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6B7280" />
              </View>

              <TouchableOpacity
                onPress={() => start(s.id)}
                activeOpacity={0.85}
                className="w-full py-3.5 bg-[#FC4C02] rounded-full flex-row items-center justify-center active:bg-[#E34402]">
                <Ionicons name="play" size={18} color="#FFFFFF" />
                <Text className="text-white font-black text-sm ml-2">Start</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* More Sports Button (Opens Filter by Sport Sheet) */}
        <TouchableOpacity
          onPress={() => setShowSportModal(true)}
          activeOpacity={0.7}
          className="w-full py-4 bg-[#1C1C1E] border border-[#FC4C02]/80 rounded-full items-center justify-center my-3 shadow-xs active:bg-[#27272A]">
          <Text className="text-[#FC4C02] font-black text-sm">More sports</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Filter by Sport Modal (Strava Reference Image 5) */}
      <Modal
        visible={showSportModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSportModal(false)}>
        <View className="flex-1 justify-end bg-black/60">
          <Pressable className="flex-1" onPress={() => setShowSportModal(false)} />
          <View
            style={{ paddingBottom: Math.max(insets.bottom, 16) + 16, maxHeight: '85%' }}
            className="bg-[#1C1C1E] rounded-t-3xl pt-3 px-5 border-t border-[#2C2C2E]">
            {/* Sheet Handle */}
            <View className="self-center w-10 h-1 rounded-full bg-[#3F3F46] mb-3" />

            {/* Header */}
            <View className="flex-row items-center justify-between pb-3">
              <Text className="text-xl font-bold text-white">Filter by Sport</Text>
              <TouchableOpacity onPress={() => setShowSportModal(false)} className="p-1">
                <Ionicons name="close" size={24} color="#D1D5DB" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View className="flex-row items-center bg-[#2A2A2D] rounded-2xl px-4 py-2.5 mb-5">
              <Ionicons name="search" size={20} color="#9CA3AF" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search"
                placeholderTextColor="#9CA3AF"
                className="flex-1 text-white text-base ml-2.5"
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Your Top Sports */}
              {!searchQuery ? (
                <View className="mb-6">
                  <Text className="text-sm font-bold text-white mb-3">Your Top Sports</Text>
                  <View className="flex-row justify-between">
                    {TOP_SPORTS.map((s) => (
                      <TouchableOpacity
                        key={s.id}
                        onPress={() => start(s.id)}
                        className="items-center">
                        <View className="w-13 h-13 rounded-full bg-[#2A2A2D] items-center justify-center mb-1.5 active:bg-[#FC4C02]">
                          <Ionicons name={s.icon} size={22} color="#FFFFFF" />
                        </View>
                        <Text className="text-xs font-medium text-gray-300">{s.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : null}

              {/* Foot Sports */}
              {footSports.length > 0 ? (
                <View className="mb-5">
                  <Text className="text-sm font-bold text-white mb-2">Foot Sports</Text>
                  {footSports.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => start(s.id)}
                      className="flex-row items-center py-3 border-b border-[#2A2A2D]">
                      <Ionicons name={s.icon} size={22} color="#D1D5DB" className="mr-3" />
                      <Text className="text-base text-gray-200 ml-3">{s.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              {/* Cycle Sports */}
              {cycleSports.length > 0 ? (
                <View className="mb-5">
                  <Text className="text-sm font-bold text-white mb-2">Cycle Sports</Text>
                  {cycleSports.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => start(s.id)}
                      className="flex-row items-center py-3 border-b border-[#2A2A2D]">
                      <Ionicons name={s.icon} size={22} color="#D1D5DB" className="mr-3" />
                      <Text className="text-base text-gray-200 ml-3">{s.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              {/* Other Sports */}
              {otherSports.length > 0 ? (
                <View className="mb-5">
                  <Text className="text-sm font-bold text-white mb-2">Other Sports</Text>
                  {otherSports.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => start(s.id)}
                      className="flex-row items-center py-3 border-b border-[#2A2A2D]">
                      <Ionicons name={s.icon} size={22} color="#D1D5DB" className="mr-3" />
                      <Text className="text-base text-gray-200 ml-3">{s.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

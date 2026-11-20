import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
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
  { id: 'Workout', label: 'Workout', icon: 'water-outline', category: 'other' },
  { id: 'Run', label: 'Run', icon: 'footsteps-outline', category: 'foot' },
  { id: 'Ride', label: 'Ride', icon: 'bicycle-outline', category: 'cycle' },
  { id: 'Trail Run', label: 'Trail Run', icon: 'trending-up-outline', category: 'foot' },
  { id: 'Walk', label: 'Walk', icon: 'walk-outline', category: 'foot' },
  { id: 'Hike', label: 'Hike', icon: 'trail-sign-outline', category: 'foot' },
  { id: 'Yoga', label: 'Yoga', icon: 'body-outline', category: 'other' },
  { id: 'Swim', label: 'Swim', icon: 'water-outline', category: 'other' },
];

const FEATURED_SPORTS: SportItem[] = [
  { id: 'Workout', label: 'Workout', icon: 'water-outline', category: 'other' },
  { id: 'Run', label: 'Run', icon: 'footsteps-outline', category: 'foot' },
  { id: 'Ride', label: 'Ride', icon: 'bicycle-outline', category: 'cycle' },
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

  useFocusEffect(
    useCallback(() => {
      if (active) router.replace('/record');
    }, [active, router])
  );

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
      return () => { cancelled = true; };
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

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#F9FAFB]">
      {/* Light Mode Top Header */}
      <View className="px-5 pt-3 pb-3 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <Text className="text-3xl font-black text-gray-900 tracking-tight">Workout</Text>
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/history/[athleteId]', params: { athleteId: currentUser.id } })}
          accessibilityLabel="Activity History"
          className="p-2.5 rounded-full bg-gray-100">
          <Ionicons name="time-outline" size={22} color="#374151" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Top 3 Featured Sports (Workout, Run, Ride - Exact Strava Reference) */}
        {FEATURED_SPORTS.map((s) => {
          const t = totals?.[s.id];
          return (
            <View key={s.id} className="bg-white rounded-3xl p-5 mb-4 border border-gray-200/80 shadow-xs">
              <TouchableOpacity
                onPress={() => start(s.id)}
                activeOpacity={0.7}
                className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center flex-1">
                  <View className="w-12 h-12 rounded-2xl bg-orange-50 items-center justify-center mr-3.5 border border-orange-100">
                    <Ionicons name={s.icon} size={24} color="#FC4C02" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-2xl font-black text-gray-900">{s.label}</Text>
                    <Text className="text-xs font-semibold text-gray-500 mt-0.5">
                      {t && t.count > 0
                        ? `This year: ${t.count} · ${kmValue(t.distance)} km · ${formatDuration(t.moving)}`
                        : sportConfig(s.id).primaryMetric === 'speed'
                          ? 'GPS · Speed, distance, elevation'
                          : 'GPS · Pace, distance, elevation'}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={22} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Big Solid Orange Pill Button with Play Icon */}
              <TouchableOpacity
                onPress={() => start(s.id)}
                activeOpacity={0.85}
                className="w-full py-4 bg-[#FC4C02] rounded-full flex-row items-center justify-center shadow-md active:bg-[#E03A00]">
                <Ionicons name="play" size={18} color="#FFFFFF" />
                <Text className="text-white font-black text-base ml-2">Start</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* More Sports Outline Button */}
        <TouchableOpacity
          onPress={() => setShowSportModal(true)}
          activeOpacity={0.7}
          className="w-full py-4 bg-white border-2 border-[#FC4C02] rounded-full items-center justify-center my-2 shadow-xs active:bg-orange-50">
          <Text className="text-[#FC4C02] font-black text-base">More sports</Text>
        </TouchableOpacity>

        {/* Strength Intro Series Section (Exact Strava Reference) */}
        <View className="mt-6 mb-4">
          <TouchableOpacity activeOpacity={0.7} className="flex-row items-center justify-between mb-1.5">
            <View className="flex-row items-center">
              <View className="w-6 h-6 rounded-md bg-orange-100 items-center justify-center mr-2">
                <Ionicons name="flash" size={14} color="#FC4C02" />
              </View>
              <Text className="text-lg font-black text-gray-900">Strength intro series</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>
          <Text className="text-xs font-medium text-gray-500 mb-3.5 leading-4">
            Build the foundations of strength training across 4 easy-to-follow workouts, gaining confidence and momentum with every session.
          </Text>

          {/* Featured Video / Workout Card */}
          <View className="bg-white rounded-3xl overflow-hidden border border-gray-200/80 shadow-xs">
            <View className="h-44 bg-stone-100 relative items-center justify-center">
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80' }}
                className="w-full h-full"
                resizeMode="cover"
              />
              <View className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 items-center justify-center">
                <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
              </View>
            </View>
            <View className="p-4">
              <Text className="text-base font-black text-gray-900">Foundational Core & Strength</Text>
              <Text className="text-xs text-gray-500 mt-1">20 min · All levels · Coach Sarah</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Filter by Sport Modal (Light Mode) */}
      <Modal visible={showSportModal} animationType="slide" transparent onRequestClose={() => setShowSportModal(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <Pressable className="flex-1" onPress={() => setShowSportModal(false)} />
          <View
            style={{ paddingBottom: Math.max(insets.bottom, 16) + 16, maxHeight: '85%' }}
            className="bg-white rounded-t-3xl pt-3 px-5 border-t border-gray-200 shadow-2xl">
            <View className="self-center w-10 h-1.5 rounded-full bg-gray-300 mb-3" />
            <View className="flex-row items-center justify-between pb-3">
              <Text className="text-xl font-black text-gray-900">Filter by Sport</Text>
              <TouchableOpacity onPress={() => setShowSportModal(false)} className="p-1">
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center bg-gray-100 rounded-2xl px-4 py-2.5 mb-5">
              <Ionicons name="search" size={20} color="#9CA3AF" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search"
                placeholderTextColor="#9CA3AF"
                className="flex-1 text-gray-900 text-base ml-2.5"
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="mb-4">
                <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">All Sports</Text>
                {filteredSports.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => start(s.id)}
                    className="flex-row items-center py-3.5 border-b border-gray-100">
                    <View className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center mr-3">
                      <Ionicons name={s.icon} size={20} color="#374151" />
                    </View>
                    <Text className="text-base font-bold text-gray-800">{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

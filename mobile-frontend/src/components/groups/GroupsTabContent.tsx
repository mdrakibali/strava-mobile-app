import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, TouchableOpacity, View } from 'react-native';
import { Avatar } from '../../design';
import { formatEventWhen, kmValue } from '../../lib/format';
import { sportConfig } from '../../lib/sports';

export function GroupsTabContent({
  tab,
  data,
  status,
  onRefresh,
  bySport,
  create,
  joinChallenge,
  joinClub,
  rsvp,
}: any) {
  const router = useRouter();

  if (status === 'loading') {
    return (
      <View className="py-8 items-center justify-center">
        <Text className="text-xs font-semibold text-gray-400">Loading {tab}…</Text>
      </View>
    );
  }

  if (status === 'error' || !data) {
    return (
      <View className="py-12 items-center justify-center bg-white rounded-3xl p-6 border border-gray-200">
        <Text className="text-sm font-bold text-gray-700 text-center mb-3">Couldn’t load groups.</Text>
        <TouchableOpacity onPress={onRefresh} className="px-5 py-2.5 bg-[#FC4C02] rounded-full">
          <Text className="text-xs font-bold text-white">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (tab === 'challenges') {
    const list = bySport(data.challenges);
    if (list.length === 0) {
      return (
        <View className="bg-white rounded-3xl p-6 items-center border border-gray-200 shadow-sm">
          <Ionicons name="trophy-outline" size={40} color="#9CA3AF" />
          <Text className="text-base font-bold text-gray-800 mt-2">No Challenges Yet</Text>
          <Text className="text-xs text-gray-500 mt-1 mb-4 text-center">Create a challenge and invite athletes to join.</Text>
          <TouchableOpacity onPress={() => router.push(create.challenges)} className="px-5 py-2.5 bg-[#FC4C02] rounded-full shadow-md">
            <Text className="text-xs font-bold text-white">+ Create Challenge</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <>
        {list.map((c: any) => {
          const pct = c.targetMeters > 0 ? Math.min(1, c.currentMeters / c.targetMeters) : 0;
          return (
            <Pressable key={c.id} onPress={() => router.push(`/challenge/${c.id}`)} className="bg-white rounded-2xl p-4 mb-3 border border-gray-200 shadow-sm">
              <View className="flex-row items-center mb-2">
                <View className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 items-center justify-center mr-3">
                  <Ionicons name={sportConfig(c.sportType).icon} size={22} color="#D97706" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-black text-gray-900">{c.title}</Text>
                  <Text className="text-xs text-gray-500 mt-0.5">{kmValue(c.targetMeters)} km {sportConfig(c.sportType).label.toLowerCase()} · {c.daysRemaining} days left</Text>
                </View>
              </View>
              {c.isJoined ? (
                <View className="mt-2">
                  <View className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <View style={{ width: `${pct * 100}%` }} className="h-full bg-[#FC4C02] rounded-full" />
                  </View>
                  <Text className="text-[11px] font-semibold text-gray-500 mt-1">{c.isCompleted ? 'Completed 🎉' : `${kmValue(c.currentMeters)} of ${kmValue(c.targetMeters)} km`}</Text>
                </View>
              ) : null}
              <TouchableOpacity onPress={() => joinChallenge(c)} className={`w-full py-2.5 rounded-full mt-3 items-center justify-center ${c.isJoined ? 'bg-gray-100' : 'bg-[#FC4C02]'}`}>
                <Text className={`text-xs font-black ${c.isJoined ? 'text-gray-700' : 'text-white'}`}>{c.isJoined ? 'Joined' : 'Join'}</Text>
              </TouchableOpacity>
            </Pressable>
          );
        })}
      </>
    );
  }

  if (tab === 'clubs') {
    const list = bySport(data.clubs);
    if (list.length === 0) {
      return (
        <View className="bg-white rounded-3xl p-6 items-center border border-gray-200 shadow-sm">
          <Ionicons name="people-outline" size={40} color="#9CA3AF" />
          <Text className="text-base font-bold text-gray-800 mt-2">No Clubs Yet</Text>
          <Text className="text-xs text-gray-500 mt-1 mb-4 text-center">Start a club for your running or cycling group.</Text>
          <TouchableOpacity onPress={() => router.push(create.clubs)} className="px-5 py-2.5 bg-[#FC4C02] rounded-full shadow-md">
            <Text className="text-xs font-bold text-white">+ Create Club</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <>
        {list.map((c: any) => (
          <Pressable key={c.id} onPress={() => router.push(`/club/${c.id}`)} className="bg-white rounded-2xl p-4 mb-3 border border-gray-200 shadow-sm flex-row items-center">
            <Avatar uri={c.avatarUrl} name={c.name} size={48} />
            <View className="flex-1 ml-3.5">
              <Text className="text-sm font-bold text-gray-900">{c.name}</Text>
              <Text className="text-xs text-gray-500 mt-0.5">{sportConfig(c.sportType).label} · {c.memberCount} members{c.city ? ` · ${c.city}` : ''}</Text>
            </View>
            <TouchableOpacity onPress={() => joinClub(c)} className={`px-4 py-2 rounded-full ${c.isMember ? 'bg-gray-100' : 'bg-[#FC4C02]'}`}>
              <Text className={`text-xs font-bold ${c.isMember ? 'text-gray-700' : 'text-white'}`}>{c.isMember ? 'Joined' : 'Join'}</Text>
            </TouchableOpacity>
          </Pressable>
        ))}
      </>
    );
  }

  const list = bySport(data.events);
  if (list.length === 0) {
    return (
      <View className="bg-white rounded-3xl p-6 items-center border border-gray-200 shadow-sm">
        <Ionicons name="calendar-outline" size={40} color="#9CA3AF" />
        <Text className="text-base font-bold text-gray-800 mt-2">No Upcoming Events</Text>
        <Text className="text-xs text-gray-500 mt-1 mb-4 text-center">Plan a group run or ride.</Text>
        <TouchableOpacity onPress={() => router.push(create.events)} className="px-5 py-2.5 bg-[#FC4C02] rounded-full shadow-md">
          <Text className="text-xs font-bold text-white">+ Create Event</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <>
      {list.map((e: any) => (
        <Pressable key={e.id} onPress={() => router.push(`/event/${e.id}`)} className="bg-white rounded-2xl p-4 mb-3 border border-gray-200 shadow-sm">
          <Text className="text-xs font-bold text-[#FC4C02]">{formatEventWhen(e.eventDate)}</Text>
          <Text className="text-base font-black text-gray-900 mt-1">{e.title}</Text>
          <Text className="text-xs text-gray-500 mt-0.5">{e.clubName ? `${e.clubName} · ` : ''}{sportConfig(e.sportType).label}{e.distanceMeters ? ` · ${kmValue(e.distanceMeters)} km` : ''}</Text>
          <View className="flex-row items-center mt-2 pt-2 border-t border-gray-100">
            <Ionicons name="location-outline" size={14} color="#6B7280" />
            <Text className="text-xs text-gray-600 ml-1 flex-1" numberOfLines={1}>{e.meetingPoint}</Text>
            <Text className="text-xs font-medium text-gray-500">{e.attendeesCount} going</Text>
          </View>
          <TouchableOpacity onPress={() => rsvp(e)} className={`w-full py-2.5 rounded-full mt-3 items-center justify-center ${e.rsvpStatus === 'GOING' ? 'bg-gray-100' : 'bg-[#FC4C02]'}`}>
            <Text className={`text-xs font-black ${e.rsvpStatus === 'GOING' ? 'text-gray-700' : 'text-white'}`}>{e.rsvpStatus === 'GOING' ? 'Going ✓' : 'RSVP'}</Text>
          </TouchableOpacity>
        </Pressable>
      ))}
    </>
  );
}


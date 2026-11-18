import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteMapPreview } from '../../components/common/RouteMapPreview';
import { StatBox } from '../../components/common/StatBox';
import { MOCK_ATHLETES, MOCK_EVENTS } from '../../mock/data';

export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const event = MOCK_EVENTS.find((e) => e.id === id) || MOCK_EVENTS[0];
  const [rsvpStatus, setRsvpStatus] = useState<'GOING' | 'MAYBE' | 'DECLINED'>(event.rsvpStatus || 'GOING');
  const [attendeeCount, setAttendeeCount] = useState(event.attendeesCount);

  const handleRsvp = (status: 'GOING' | 'MAYBE' | 'DECLINED') => {
    if (rsvpStatus !== 'GOING' && status === 'GOING') {
      setAttendeeCount((prev) => prev + 1);
    } else if (rsvpStatus === 'GOING' && status !== 'GOING') {
      setAttendeeCount((prev) => prev - 1);
    }
    setRsvpStatus(status);
  };

  const distKm = (event.distanceMeters / 1000).toFixed(0);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900 flex-1 text-center mx-2" numberOfLines={1}>
          {event.title}
        </Text>
        <TouchableOpacity onPress={() => alert('Event shared!')} className="p-1">
          <Ionicons name="share-social-outline" size={22} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-28">
        {/* Event Header Banner */}
        <View className="p-4 bg-white border-b border-gray-200">
          <View className="flex-row items-center mb-2">
            <View className="bg-orange-50 px-2.5 py-1 rounded-md mr-2">
              <Text className="text-xs font-bold text-[#FC4C02]">{event.sportType}</Text>
            </View>
            <Text className="text-xs font-semibold text-gray-500">
              Hosted by <Text className="font-bold text-gray-900">{event.clubName}</Text>
            </Text>
          </View>

          <Text className="text-xl font-black text-gray-900 mb-2 leading-6">{event.title}</Text>

          {/* Time & Location Box */}
          <View className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 space-y-2 mt-2">
            <View className="flex-row items-center mb-1.5">
              <Ionicons name="calendar" size={16} color="#FC4C02" />
              <Text className="text-xs font-bold text-gray-900 ml-2">
                {event.dateFormatted} at {event.timeFormatted}
              </Text>
            </View>
            <View className="flex-row items-center mb-1.5">
              <Ionicons name="location" size={16} color="#FC4C02" />
              <Text className="text-xs font-bold text-gray-900 ml-2">{event.meetingPoint}</Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="speedometer" size={16} color="#FC4C02" />
              <Text className="text-xs font-bold text-gray-900 ml-2">{event.paceDescription}</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View className="flex-row justify-between bg-white px-4 py-3 border-b border-gray-200">
          <StatBox label="Route Distance" value={`${distKm} km`} />
          <StatBox label="Target Pace" value="5:30 /km" />
          <StatBox label="Confirmed Athletes" value={`${attendeeCount}`} />
        </View>

        {/* Route Preview */}
        <View className="bg-white p-4 border-b border-gray-200 mt-3">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-sm font-black text-gray-900">Official Group Route</Text>
            <TouchableOpacity onPress={() => router.push('/routes/route_1')}>
              <Text className="text-xs font-bold text-[#FC4C02]">Inspect Route →</Text>
            </TouchableOpacity>
          </View>
          <RouteMapPreview height={180} />
        </View>

        {/* Attendees List */}
        <View className="bg-white p-4 border-b border-gray-200 mt-3">
          <Text className="text-sm font-black text-gray-900 mb-3">
            Attending Athletes ({attendeeCount})
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {MOCK_ATHLETES.map((athlete) => (
              <TouchableOpacity
                key={athlete.id}
                onPress={() => router.push(`/athlete/${athlete.id}`)}
                className="items-center mr-3 mb-2">
                <Image source={{ uri: athlete.avatarUrl }} className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200" />
                <Text className="text-[10px] font-bold text-gray-700 mt-1" numberOfLines={1}>
                  {athlete.displayName.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Sticky RSVP Controls */}
      <View className="absolute bottom-0 left-0 right-0 bg-white p-4 border-t border-gray-200 flex-row justify-between">
        <TouchableOpacity
          onPress={() => handleRsvp('GOING')}
          className={`flex-1 py-3.5 rounded-2xl items-center mr-2 shadow-sm ${
            rsvpStatus === 'GOING' ? 'bg-[#FC4C02]' : 'bg-gray-100'
          }`}>
          <Text className={`text-xs font-black ${rsvpStatus === 'GOING' ? 'text-white' : 'text-gray-700'}`}>
            ✓ I'm Going
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleRsvp('MAYBE')}
          className={`flex-1 py-3.5 rounded-2xl items-center mx-1 ${
            rsvpStatus === 'MAYBE' ? 'bg-[#FC4C02]' : 'bg-gray-100'
          }`}>
          <Text className={`text-xs font-black ${rsvpStatus === 'MAYBE' ? 'text-white' : 'text-gray-700'}`}>
            ? Maybe
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleRsvp('DECLINED')}
          className={`flex-1 py-3.5 rounded-2xl items-center ml-2 ${
            rsvpStatus === 'DECLINED' ? 'bg-[#FC4C02]' : 'bg-gray-100'
          }`}>
          <Text className={`text-xs font-black ${rsvpStatus === 'DECLINED' ? 'text-white' : 'text-gray-700'}`}>
            ✕ Can't Go
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}


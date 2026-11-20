import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteMapPreview } from '../../components/common/RouteMapPreview';
import { StatBox } from '../../components/common/StatBox';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';

export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { events } = useApp();
  const localEvent = events.find((e) => e.id === id);
  const [serverEvent, setServerEvent] = useState<any>(null);
  const [attendees, setAttendees] = useState<any[]>([]);

  const event = serverEvent || localEvent || {
    id: id || 'ev_1',
    title: 'Community Group Event',
    clubName: 'City Striders',
    sportType: 'Run',
    dateFormatted: 'Sat, Nov 22',
    timeFormatted: '06:30 AM',
    meetingPoint: 'Hatirjheel Gate 3',
    distanceMeters: 10000,
    attendeesCount: 12,
    rsvpStatus: 'GOING',
    paceDescription: '5:30 /km conversational pace',
  };

  const [rsvpStatus, setRsvpStatus] = useState<'GOING' | 'MAYBE' | 'DECLINED'>('GOING');
  const [attendeeCount, setAttendeeCount] = useState(event.attendeesCount || 1);

  useEffect(() => {
    if (!id) return;
    api.events.get(id).then((res) => {
      if (res?.event) setServerEvent(res.event);
      if (res?.attendees) setAttendees(res.attendees);
    }).catch(() => null);
  }, [id]);

  const handleRsvp = async (status: 'GOING' | 'MAYBE' | 'DECLINED') => {
    if (rsvpStatus !== 'GOING' && status === 'GOING') {
      setAttendeeCount((prev: number) => prev + 1);
    } else if (rsvpStatus === 'GOING' && status !== 'GOING') {
      setAttendeeCount((prev: number) => Math.max(0, prev - 1));
    }
    setRsvpStatus(status);
    if (id) {
      api.events.rsvp(id, status).catch(() => null);
    }
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
            {attendees.map((attendee) => (
              <TouchableOpacity
                key={attendee.id || attendee.athleteId}
                onPress={() => router.push(`/athlete/${attendee.id || attendee.athleteId}`)}
                className="items-center mr-3 mb-2">
                <Image
                  source={{
                    uri:
                      attendee.avatarUrl ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
                  }}
                  className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200"
                />
                <Text className="text-[10px] font-bold text-gray-700 mt-1" numberOfLines={1}>
                  {(attendee.displayName || attendee.name || 'Athlete').split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
            {attendees.length === 0 && (
              <Text className="text-xs text-gray-400 py-2">
                Be the first athlete to RSVP for this event!
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Sticky RSVP Controls */}
      <View className="absolute bottom-0 left-0 right-0 bg-white p-4 border-t border-gray-200 flex-row justify-between">
        <TouchableOpacity
          onPress={() => handleRsvp('GOING')}
          className={`flex-1 py-3.5 rounded-2xl flex-row items-center justify-center mr-2 shadow-sm ${
            rsvpStatus === 'GOING' ? 'bg-[#FC4C02]' : 'bg-gray-100'
          }`}>
          <Ionicons
            name="checkmark"
            size={14}
            color={rsvpStatus === 'GOING' ? '#ffffff' : '#374151'}
          />
          <Text className={`text-xs font-black ml-1 ${rsvpStatus === 'GOING' ? 'text-white' : 'text-gray-700'}`}>
            Going
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleRsvp('MAYBE')}
          className={`flex-1 py-3.5 rounded-2xl flex-row items-center justify-center mx-1 ${
            rsvpStatus === 'MAYBE' ? 'bg-[#FC4C02]' : 'bg-gray-100'
          }`}>
          <Ionicons
            name="help-circle-outline"
            size={14}
            color={rsvpStatus === 'MAYBE' ? '#ffffff' : '#374151'}
          />
          <Text className={`text-xs font-black ml-1 ${rsvpStatus === 'MAYBE' ? 'text-white' : 'text-gray-700'}`}>
            Maybe
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleRsvp('DECLINED')}
          className={`flex-1 py-3.5 rounded-2xl flex-row items-center justify-center ml-2 ${
            rsvpStatus === 'DECLINED' ? 'bg-[#FC4C02]' : 'bg-gray-100'
          }`}>
          <Ionicons
            name="close"
            size={14}
            color={rsvpStatus === 'DECLINED' ? '#ffffff' : '#374151'}
          />
          <Text className={`text-xs font-black ml-1 ${rsvpStatus === 'DECLINED' ? 'text-white' : 'text-gray-700'}`}>
            Can&apos;t Go
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}


import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { GroupEvent } from '../../types';

interface EventsListProps {
  events: GroupEvent[];
  onToggleRsvp: (eventId: string, status: 'GOING' | 'MAYBE' | 'DECLINED') => void;
}

export const EventsList: React.FC<EventsListProps> = ({ events, onToggleRsvp }) => {
  const router = useRouter();

  return (
    <View className="space-y-3">
      {events.map((event) => {
        const isGoing = event.rsvpStatus === 'GOING';

        return (
          <TouchableOpacity
            key={event.id}
            activeOpacity={0.85}
            onPress={() => router.push(`/event/${event.id}`)}
            className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-3">
            <View className="flex-row justify-between items-start mb-2">
              <View className="bg-orange-50 px-2 py-0.5 rounded-md">
                <Text className="text-[10px] font-bold text-[#FC4C02]">{event.sportType}</Text>
              </View>
              <Text className="text-xs font-bold text-gray-500">
                👥 {event.attendeesCount} Going
              </Text>
            </View>

            <Text className="text-base font-black text-gray-900 mb-1 leading-5">
              {event.title}
            </Text>
            <Text className="text-xs font-semibold text-gray-500 mb-2">
              Hosted by {event.clubName}
            </Text>

            <View className="bg-gray-50 p-2.5 rounded-xl space-y-1 mb-3 border border-gray-100">
              <View className="flex-row items-center mb-1">
                <Ionicons name="calendar-outline" size={13} color="#6B7280" />
                <Text className="text-xs text-gray-700 ml-1.5 font-medium">
                  {event.dateFormatted} · {event.timeFormatted}
                </Text>
              </View>
              <View className="flex-row items-center mb-1">
                <Ionicons name="location-outline" size={13} color="#6B7280" />
                <Text className="text-xs text-gray-700 ml-1.5 font-medium" numberOfLines={1}>
                  {event.meetingPoint}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="speedometer-outline" size={13} color="#6B7280" />
                <Text className="text-xs text-gray-700 ml-1.5 font-medium">
                  {event.paceDescription}
                </Text>
              </View>
            </View>

            <View className="flex-row justify-between items-center pt-2 border-t border-gray-100">
              <Text className="text-xs font-bold text-gray-800">
                {(event.distanceMeters / 1000).toFixed(0)} km Route Planned
              </Text>
              <TouchableOpacity
                onPress={() => onToggleRsvp(event.id, isGoing ? 'DECLINED' : 'GOING')}
                className={`px-4 py-1.5 rounded-full ${
                  isGoing ? 'bg-gray-100' : 'bg-[#FC4C02]'
                }`}>
                <Text
                  className={`text-xs font-bold ${
                    isGoing ? 'text-gray-700' : 'text-white'
                  }`}>
                  {isGoing ? '✓ You Are Going' : 'RSVP Going'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        onPress={() => router.push('/event/create')}
        className="w-full py-3.5 bg-orange-50 border border-orange-200 rounded-xl items-center justify-center flex-row">
        <Ionicons name="calendar-outline" size={18} color="#FC4C02" />
        <Text className="text-sm font-bold text-[#FC4C02] ml-1.5">Host a Group Workout / Event</Text>
      </TouchableOpacity>
    </View>
  );
};

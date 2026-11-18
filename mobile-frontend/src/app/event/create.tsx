import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CreateEventScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [sportType, setSportType] = useState('Run');
  const [date, setDate] = useState('Saturday, Nov 29');
  const [time, setTime] = useState('06:30 AM');
  const [meetingPoint, setMeetingPoint] = useState('Police Plaza Promenade, Gulshan 1');
  const [paceDescription, setPaceDescription] = useState('5:30 - 6:00 /km conversational pace');
  const [distanceKm, setDistanceKm] = useState('12');

  const handleCreate = () => {
    if (!title.trim()) {
      alert('Please enter an event title');
      return;
    }
    alert(`Event "${title}" published to your club!`);
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-white justify-between p-6">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color="#111827" />
          </TouchableOpacity>
          <Text className="text-base font-black text-gray-900">Host Group Workout</Text>
          <TouchableOpacity onPress={handleCreate}>
            <Text className="text-sm font-black text-[#FC4C02]">Publish</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-2xl font-black text-gray-900 mb-2">Plan a Group Meetup 📅</Text>
        <Text className="text-xs text-gray-500 mb-6">
          Rally your club or friends for an organized group run, social cycling spin, or weekend trail adventure.
        </Text>

        <View className="space-y-4 mb-6">
          <View>
            <Text className="text-xs font-bold text-gray-600 mb-1">Event Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Saturday Morning Aerobic Long Run"
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900"
            />
          </View>

          <View>
            <Text className="text-xs font-bold text-gray-600 mb-1">Sport Type</Text>
            <View className="flex-row gap-2">
              {['Run', 'Ride', 'Trail Run', 'Hike'].map((sport) => (
                <TouchableOpacity
                  key={sport}
                  onPress={() => setSportType(sport)}
                  className={`px-4 py-2 rounded-xl border ${
                    sportType === sport
                      ? 'border-[#FC4C02] bg-[#FC4C02]'
                      : 'border-gray-200 bg-gray-50'
                  }`}>
                  <Text className={`text-xs font-bold ${sportType === sport ? 'text-white' : 'text-gray-700'}`}>
                    {sport}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="flex-row space-x-3">
            <View className="flex-1 mr-2">
              <Text className="text-xs font-bold text-gray-600 mb-1">Date</Text>
              <TextInput
                value={date}
                onChangeText={setDate}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900"
              />
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-xs font-bold text-gray-600 mb-1">Time</Text>
              <TextInput
                value={time}
                onChangeText={setTime}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900"
              />
            </View>
          </View>

          <View>
            <Text className="text-xs font-bold text-gray-600 mb-1">Meeting Location</Text>
            <TextInput
              value={meetingPoint}
              onChangeText={setMeetingPoint}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900"
            />
          </View>

          <View className="flex-row space-x-3">
            <View className="w-32 mr-2">
              <Text className="text-xs font-bold text-gray-600 mb-1">Distance (km)</Text>
              <TextInput
                value={distanceKm}
                onChangeText={setDistanceKm}
                keyboardType="numeric"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900"
              />
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-xs font-bold text-gray-600 mb-1">Target Pace / Effort</Text>
              <TextInput
                value={paceDescription}
                onChangeText={setPaceDescription}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900"
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        onPress={handleCreate}
        className="w-full py-4 bg-[#FC4C02] rounded-2xl items-center shadow-md">
        <Text className="text-base font-black text-white">Create Group Event</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

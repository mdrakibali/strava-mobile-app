import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GpsSettingsScreen() {
  const router = useRouter();
  const [accuracyMode, setAccuracyMode] = useState<'High' | 'Balanced' | 'BatterySaver'>('High');
  const [autoPause, setAutoPause] = useState(true);
  const [voiceCues, setVoiceCues] = useState(true);
  const [cueInterval, setCueInterval] = useState<'1km' | '2km' | '5km'>('1km');

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900 ml-3">GPS & Audio Cues 🛰️</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="p-4" contentContainerClassName="pb-24">
        {/* GPS Accuracy Mode */}
        <Text className="text-xs font-bold text-gray-500 uppercase mb-2">GPS Location Sampling</Text>
        <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 space-y-3">
          {[
            { id: 'High', title: 'High Precision (1s)', desc: 'Highest accuracy for segment matching and pace. Best for track & sprints.' },
            { id: 'Balanced', title: 'Balanced (3s)', desc: 'Optimal balance of track fidelity and battery life for long endurance rides.' },
            { id: 'BatterySaver', title: 'Battery Saver (5s)', desc: 'Extended battery life for ultra-marathons and multi-day hikes.' },
          ].map((mode) => {
            const isSelected = accuracyMode === mode.id;
            return (
              <TouchableOpacity
                key={mode.id}
                onPress={() => setAccuracyMode(mode.id as any)}
                className={`p-3 rounded-xl border mb-2 ${
                  isSelected ? 'border-[#FC4C02] bg-orange-50/50' : 'border-gray-200 bg-white'
                }`}>
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-xs font-black text-gray-900">{mode.title}</Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={18} color="#FC4C02" />}
                </View>
                <Text className="text-[11px] text-gray-500 leading-4">{mode.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Auto-Pause */}
        <Text className="text-xs font-bold text-gray-500 uppercase mb-2">Smart Pause</Text>
        <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-sm font-bold text-gray-900">Auto-Pause When Stopped</Text>
              <Text className="text-xs text-gray-500">Automatically stops timer at red lights (&lt;1.8 km/h).</Text>
            </View>
            <TouchableOpacity
              onPress={() => setAutoPause(!autoPause)}
              className={`w-12 h-7 rounded-full justify-center px-1 ${
                autoPause ? 'bg-[#FC4C02]' : 'bg-gray-300'
              }`}>
              <View className={`w-5 h-5 rounded-full bg-white shadow-sm ${autoPause ? 'self-end' : 'self-start'}`} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Audio Split Voice Cues */}
        <Text className="text-xs font-bold text-gray-500 uppercase mb-2">Voice Feedback</Text>
        <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1 mr-3">
              <Text className="text-sm font-bold text-gray-900">Spoken Split Announcements</Text>
              <Text className="text-xs text-gray-500">Reads pace, distance, and split time over headphones.</Text>
            </View>
            <TouchableOpacity
              onPress={() => setVoiceCues(!voiceCues)}
              className={`w-12 h-7 rounded-full justify-center px-1 ${
                voiceCues ? 'bg-[#FC4C02]' : 'bg-gray-300'
              }`}>
              <View className={`w-5 h-5 rounded-full bg-white shadow-sm ${voiceCues ? 'self-end' : 'self-start'}`} />
            </TouchableOpacity>
          </View>

          {voiceCues && (
            <View className="pt-3 border-t border-gray-100">
              <Text className="text-xs font-bold text-gray-600 mb-2">Announcement Frequency</Text>
              <View className="flex-row space-x-2">
                {(['1km', '2km', '5km'] as const).map((interval) => (
                  <TouchableOpacity
                    key={interval}
                    onPress={() => setCueInterval(interval)}
                    className={`flex-1 py-2 items-center rounded-xl border mr-2 ${
                      cueInterval === interval ? 'border-[#FC4C02] bg-[#FC4C02]' : 'border-gray-200 bg-gray-50'
                    }`}>
                    <Text className={`text-xs font-bold ${cueInterval === interval ? 'text-white' : 'text-gray-700'}`}>
                      Every {interval}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

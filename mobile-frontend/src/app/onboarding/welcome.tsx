import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, ImageBackground, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SLOGANS = [
  'Track your active life in one place.',
  'Record every route, sprint, and climb.',
  'Analyze heart rate, cadence, and GAP.',
  'Share workouts with real athletes.',
];

export default function WelcomeScreen() {
  const router = useRouter();
  const [slideIndex, setSlideIndex] = useState(0);

  const handleNextSlide = () => {
    if (slideIndex < SLOGANS.length - 1) {
      setSlideIndex(slideIndex + 1);
    } else {
      router.push('/onboarding/sport-preferences');
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Top Hero Section: Photo with Brand and Mockup */}
      <View className="flex-[1.3] relative overflow-hidden">
        <ImageBackground
          source={{
            uri: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=1200&auto=format&fit=crop&q=80',
          }}
          className="w-full h-full justify-between pt-12 items-center"
          resizeMode="cover">
          {/* Subtle Dark Gradient Overlay */}
          <View className="absolute inset-0 bg-black/25" />

          {/* Bold Brand Wordmark */}
          <Text className="text-3xl font-black text-white tracking-widest z-10 drop-shadow-md">
            STRAVA
          </Text>

          {/* Floating Device Mockup Card — Exact Strava Reference */}
          <View className="w-[82%] bg-white rounded-3xl p-3 shadow-2xl border-4 border-white/60 mb-[-32px] z-20">
            {/* Mock Header */}
            <View className="flex-row items-center justify-between mb-2 px-1">
              <Text className="text-[11px] font-bold text-gray-400">Close</Text>
              <Text className="text-xs font-black text-gray-900">Run</Text>
              <Ionicons name="settings-outline" size={14} color="#6B7280" />
            </View>

            {/* Mock Vector Map with Trail & Waypoints */}
            <View className="h-28 bg-[#D8EED8] rounded-2xl overflow-hidden relative border border-green-200">
              {/* Lake */}
              <View className="absolute right-0 top-6 w-24 h-16 bg-[#BAE6FD] rounded-l-full" />
              {/* Trail Polyline */}
              <View className="absolute inset-0 items-center justify-center">
                <View className="w-36 h-16 border-2 border-dashed border-[#15803D] rounded-full rotate-12" />
              </View>
              {/* Waypoints */}
              <View className="absolute top-4 left-6 w-3 h-3 rounded-full bg-blue-500 border border-white" />
              <View className="absolute bottom-6 right-10 w-3 h-3 rounded-full bg-blue-500 border border-white" />
              <View className="absolute top-8 right-14 w-2 h-2 rounded-full bg-green-700" />
            </View>

            {/* Mock "Choose a Sport" Bottom Sheet */}
            <View className="bg-white rounded-2xl pt-2 px-1">
              <View className="w-6 h-1 bg-gray-200 rounded-full self-center mb-1.5" />
              <Text className="text-[11px] font-black text-gray-900 mb-1.5">Choose a Sport</Text>
              <Text className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Your Top Sports
              </Text>
              <View className="flex-row justify-around mb-1.5">
                <View className="items-center">
                  <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                    <Ionicons name="bicycle-outline" size={16} color="#374151" />
                  </View>
                  <Text className="text-[9px] font-semibold text-gray-700 mt-0.5">Ride</Text>
                </View>
                <View className="items-center">
                  <View className="w-8 h-8 rounded-full bg-orange-50 border border-[#FC4C02] items-center justify-center">
                    <Ionicons name="fitness" size={16} color="#FC4C02" />
                  </View>
                  <Text className="text-[9px] font-black text-[#FC4C02] mt-0.5">Run</Text>
                </View>
                <View className="items-center">
                  <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                    <Ionicons name="trail-sign-outline" size={16} color="#374151" />
                  </View>
                  <Text className="text-[9px] font-semibold text-gray-700 mt-0.5">Hike</Text>
                </View>
                <View className="items-center">
                  <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                    <Ionicons name="snow-outline" size={16} color="#374151" />
                  </View>
                  <Text className="text-[9px] font-semibold text-gray-700 mt-0.5">Ski</Text>
                </View>
              </View>

              {/* Water Sports Category */}
              <Text className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Water Sports
              </Text>
              <View className="px-1 space-y-1">
                <View className="flex-row items-center py-0.5 border-b border-gray-100">
                  <Ionicons name="water-outline" size={12} color="#374151" />
                  <Text className="text-[9px] font-semibold text-gray-700 ml-2">Swim</Text>
                </View>
                <View className="flex-row items-center py-0.5">
                  <Ionicons name="boat-outline" size={12} color="#374151" />
                  <Text className="text-[9px] font-semibold text-gray-700 ml-2">Surf</Text>
                </View>
              </View>
            </View>
          </View>
        </ImageBackground>
      </View>

      {/* Bottom Action Section: Pure Clean White */}
      <SafeAreaView className="flex-1 bg-white justify-between px-6 pt-12 pb-6 z-10">
        <View className="items-center mt-2">
          {/* Main Headline */}
          <Text className="text-2xl font-black text-gray-900 text-center mb-4 leading-7">
            {SLOGANS[slideIndex]}
          </Text>

          {/* 4-Dots Pager Indicator */}
          <View className="flex-row items-center space-x-1.5">
            {SLOGANS.map((_, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setSlideIndex(i)}
                className={`h-2 rounded-full mx-0.5 transition-all ${
                  i === slideIndex ? 'w-6 bg-[#FC4C02]' : 'w-2 bg-gray-300'
                }`}
              />
            ))}
          </View>
        </View>

        {/* Buttons */}
        <View className="space-y-3 mb-2">
          <TouchableOpacity
            onPress={() => router.push('/onboarding/sport-preferences')}
            activeOpacity={0.85}
            className="w-full py-4 bg-[#FC4C02] rounded-full items-center justify-center shadow-lg">
            <Text className="text-base font-black text-white tracking-wide">
              Join for free
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/auth/login')}
            activeOpacity={0.7}
            className="w-full py-2.5 items-center justify-center">
            <Text className="text-sm font-bold text-[#FC4C02]">
              Log in
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SLIDES = [
  {
    icon: 'flame-outline' as const,
    title: 'Track Every Mile & Effort',
    description: 'Accurate background GPS tracking for 40+ sports with instant pace, cadence, and Grade Adjusted Pace.',
  },
  {
    icon: 'map-outline' as const,
    title: 'Discover & Build Routes',
    description: 'Explore popular local routes, generate instant loop tracks, and conquer segment leaderboards.',
  },
  {
    icon: 'people-outline' as const,
    title: 'Connect With Real Athletes',
    description: 'Give Kudos, exchange banter in comments, join community clubs, and crush monthly challenges.',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      router.push('/onboarding/sport-preferences');
    }
  };

  const slide = SLIDES[currentSlide];

  return (
    <SafeAreaView className="flex-1 bg-white justify-between p-6">
      <View className="flex-row justify-between items-center">
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-lg bg-[#FC4C02] items-center justify-center mr-2">
            <Ionicons name="fitness" size={20} color="#FFFFFF" />
          </View>
          <Text className="text-lg font-black text-gray-900 tracking-wider">OPEN STRAVA</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/onboarding/sport-preferences')}>
          <Text className="text-xs font-bold text-gray-400">Skip</Text>
        </TouchableOpacity>
      </View>

      <View className="items-center px-4">
        <View className="w-24 h-24 rounded-3xl bg-orange-50 items-center justify-center mb-8 border border-orange-100">
          <Ionicons name={slide.icon} size={48} color="#FC4C02" />
        </View>

        <Text className="text-2xl font-black text-gray-900 text-center mb-3">
          {slide.title}
        </Text>
        <Text className="text-sm text-gray-500 text-center leading-6 max-w-xs">
          {slide.description}
        </Text>

        {/* Indicators */}
        <View className="flex-row justify-center space-x-2 mt-8">
          {SLIDES.map((_, i) => (
            <View
              key={i}
              className={`h-2 rounded-full mx-1 ${
                i === currentSlide ? 'w-8 bg-[#FC4C02]' : 'w-2 bg-gray-200'
              }`}
            />
          ))}
        </View>
      </View>

      <View className="space-y-3">
        <TouchableOpacity
          onPress={handleNext}
          className="w-full py-4 bg-[#FC4C02] rounded-2xl items-center shadow-md">
          <Text className="text-base font-black text-white">
            {currentSlide === SLIDES.length - 1 ? 'Get Started' : 'Continue'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/auth/login')}
          className="w-full py-3.5 items-center">
          <Text className="text-xs font-bold text-gray-500">
            Already have an account? <Text className="text-[#FC4C02]">Log In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

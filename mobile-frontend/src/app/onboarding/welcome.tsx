import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ImageBackground,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const SLIDES = [
  {
    title: 'Track your active life in one place.',
    subtitle: 'Record runs, rides, hikes and workouts with GPS precision and community support.',
    icon: 'fitness',
  },
  {
    title: 'Explore trails and heatmaps anywhere.',
    subtitle: 'Access personal and global heatmaps with 3D terrain perspective, 100% unlocked.',
    icon: 'map',
  },
  {
    title: 'Advanced pro athlete analytics.',
    subtitle: 'Fitness & Freshness, Grade Adjusted Pace (GAP), Relative Effort, and segment records.',
    icon: 'stats-chart',
  },
  {
    title: 'Community challenges and clubs.',
    subtitle: 'Join monthly elevation challenges or create unlimited custom group competitions.',
    icon: 'trophy',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [slideIndex, setSlideIndex] = useState(0);

  const handleNext = () => {
    if (slideIndex < SLIDES.length - 1) {
      setSlideIndex(slideIndex + 1);
    } else {
      router.push('/onboarding/sport-preferences');
    }
  };

  return (
    <View className="flex-1 bg-black">
      {/* Background Hero Image */}
      <ImageBackground
        source={{
          uri: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=1200&auto=format&fit=crop&q=80',
        }}
        className="flex-1 justify-between"
        resizeMode="cover">
        {/* Dark Vignette Overlay for Crisp Readability */}
        <View className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/90" />

        <SafeAreaView edges={['top']} className="px-6 pt-4 items-center z-20">
          <Text className="text-3xl font-black text-white tracking-widest font-sans">
            STRAVA
          </Text>
        </SafeAreaView>

        {/* Carousel Content */}
        <View
          style={{ paddingBottom: Math.max(insets.bottom, 20) }}
          className="px-6 z-20">
          {/* Active Feature Icon Pill */}
          <View className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md items-center justify-center mb-4 border border-white/20">
            <Ionicons name={SLIDES[slideIndex].icon as any} size={24} color="#FC4C02" />
          </View>

          {/* Slogan Title */}
          <Text className="text-3xl font-black text-white leading-9 mb-3">
            {SLIDES[slideIndex].title}
          </Text>

          {/* Subtitle */}
          <Text className="text-sm text-gray-200 leading-5 mb-6 font-medium">
            {SLIDES[slideIndex].subtitle}
          </Text>

          {/* Dot Indicators */}
          <View className="flex-row items-center mb-8">
            {SLIDES.map((_, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setSlideIndex(i)}
                className={`h-2 rounded-full mr-2 transition-all ${
                  i === slideIndex ? 'w-8 bg-[#FC4C02]' : 'w-2 bg-white/40'
                }`}
              />
            ))}
          </View>

          {/* Action Buttons */}
          <View className="space-y-3">
            <TouchableOpacity
              onPress={() => router.push('/onboarding/sport-preferences')}
              activeOpacity={0.85}
              className="w-full py-4 bg-[#FC4C02] rounded-full items-center justify-center shadow-xl mb-3">
              <Text className="text-base font-black text-white tracking-wide">
                Get Started
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/auth/login')}
              activeOpacity={0.7}
              className="w-full py-3.5 bg-white/10 rounded-full items-center justify-center border border-white/20">
              <Text className="text-sm font-bold text-white">
                Log In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

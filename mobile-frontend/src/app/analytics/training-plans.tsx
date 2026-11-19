import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrainingPlan } from '../../types';

const OFFICIAL_TRAINING_PLANS: TrainingPlan[] = [
  {
    id: 'plan_sub20_5k',
    title: 'Sub-20 Min 5K Speed Accelerator',
    durationWeeks: 8,
    level: 'Intermediate',
    sportType: 'Run',
    description:
      'Structured intervals, threshold tempo runs, and aerobic capacity work to break the 20-minute barrier.',
    weeklyWorkouts: [
      {
        day: 'Mon',
        title: 'Easy Recovery Run',
        distanceKm: 6,
        durationMinutes: 35,
        description: 'Zone 2 conversational effort.',
        isCompleted: true,
      },
      {
        day: 'Tue',
        title: 'Track Intervals: 6x800m',
        distanceKm: 8,
        durationMinutes: 42,
        description: 'Pace: 3:50/km with 200m jog recovery.',
        isCompleted: true,
      },
      {
        day: 'Thu',
        title: 'Lactate Threshold Tempo',
        distanceKm: 8,
        durationMinutes: 38,
        description: '20 min continuous at 4:05/km.',
        isCompleted: false,
      },
      {
        day: 'Sat',
        title: 'Aerobic Long Run',
        distanceKm: 14,
        durationMinutes: 75,
        description: 'Negative split last 3 km.',
        isCompleted: false,
      },
    ],
  },
  {
    id: 'plan_first_hm',
    title: 'First Half Marathon Finisher',
    durationWeeks: 12,
    level: 'Beginner',
    sportType: 'Run',
    description:
      'Gradual progressive mileage builder to cross the 21.1 km finish line with confidence.',
    weeklyWorkouts: [
      {
        day: 'Tue',
        title: 'Easy Base Aerobic',
        distanceKm: 5,
        durationMinutes: 32,
        description: 'Steady conversational pace.',
        isCompleted: true,
      },
      {
        day: 'Thu',
        title: 'Strides & Speed Play',
        distanceKm: 6,
        durationMinutes: 36,
        description: '6x100m fast strides after 4k.',
        isCompleted: false,
      },
      {
        day: 'Sun',
        title: 'Sunday Long Progression',
        distanceKm: 12,
        durationMinutes: 72,
        description: 'Consistent aerobic endurance.',
        isCompleted: false,
      },
    ],
  },
  {
    id: 'plan_century_ride',
    title: '100km Gran Fondo Cycling Builder',
    durationWeeks: 10,
    level: 'Intermediate',
    sportType: 'Ride',
    description:
      'Climbing repeats, cadence drills, and weekend endurance distance for cycling sportives.',
    weeklyWorkouts: [
      {
        day: 'Wed',
        title: 'Sweet Spot Over-Unders',
        distanceKm: 25,
        durationMinutes: 55,
        description: '3x10 min sweet spot intervals at 88-92% FTP.',
        isCompleted: false,
      },
      {
        day: 'Sat',
        title: 'Endurance Climbing Route',
        distanceKm: 50,
        durationMinutes: 120,
        description: 'Sustained tempo with 600m total elevation gain.',
        isCompleted: false,
      },
    ],
  },
];

export default function TrainingPlansScreen() {
  const router = useRouter();
  const [plans, setPlans] = useState<TrainingPlan[]>(OFFICIAL_TRAINING_PLANS);
  const [selectedPlanId, setSelectedPlanId] = useState(OFFICIAL_TRAINING_PLANS[0].id);

  // Load user saved completion state from storage
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('@openstrava_training_plans');
        if (saved) {
          setPlans(JSON.parse(saved));
        }
      } catch (err) {
        console.warn('Failed to load training plan progress:', err);
      }
    })();
  }, []);

  const activePlan = plans.find((p) => p.id === selectedPlanId) || plans[0];

  const toggleWorkout = async (day: string) => {
    const updated = plans.map((plan) =>
      plan.id === activePlan.id
        ? {
            ...plan,
            weeklyWorkouts: plan.weeklyWorkouts.map((w) =>
              w.day === day ? { ...w, isCompleted: !w.isCompleted } : w
            ),
          }
        : plan
    );
    setPlans(updated);
    try {
      await AsyncStorage.setItem('@openstrava_training_plans', JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to persist training plan update:', err);
    }
  };

  const handleStartPlan = () => {
    Alert.alert(
      'Plan Activated',
      `You are now enrolled in the ${activePlan.title}. Workout reminders will be aligned with your calendar.`
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900">Training Plans</Text>
        <View className="w-6" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="p-4"
        contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Plans Carousel / Selector */}
        <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          Available Structured Plans
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          {plans.map((plan) => {
            const isSelected = plan.id === selectedPlanId;
            return (
              <TouchableOpacity
                key={plan.id}
                onPress={() => setSelectedPlanId(plan.id)}
                className={`p-4 rounded-3xl mr-3 border w-64 ${
                  isSelected ? 'border-[#FC4C02] bg-white shadow-sm' : 'border-gray-200 bg-gray-50'
                }`}>
                <View className="flex-row items-center justify-between mb-2">
                  <View className="bg-orange-50 px-2.5 py-0.5 rounded-full">
                    <Text className="text-[10px] font-black text-[#FC4C02]">{plan.level}</Text>
                  </View>
                  <Text className="text-[10px] text-gray-400 font-bold">
                    {plan.durationWeeks} Weeks
                  </Text>
                </View>
                <Text className="text-sm font-black text-gray-900 mb-1" numberOfLines={2}>
                  {plan.title}
                </Text>
                <Text className="text-[11px] text-gray-500 leading-4" numberOfLines={2}>
                  {plan.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Current Week Schedule */}
        <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs mb-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-sm font-black text-gray-900">Week 1 Scheduled Workouts</Text>
            <Text className="text-xs font-bold text-[#FC4C02]">{activePlan.sportType}</Text>
          </View>

          {activePlan.weeklyWorkouts.map((workout) => (
            <TouchableOpacity
              key={workout.day}
              onPress={() => toggleWorkout(workout.day)}
              className="flex-row items-start justify-between py-3 border-b border-gray-50">
              <View className="flex-row items-start flex-1 mr-3">
                <View
                  className={`w-9 h-7 rounded-md items-center justify-center mr-2.5 ${
                    workout.isCompleted ? 'bg-emerald-100' : 'bg-orange-100'
                  }`}>
                  <Text
                    className={`text-[10px] font-black ${
                      workout.isCompleted ? 'text-emerald-700' : 'text-[#FC4C02]'
                    }`}>
                    {workout.day}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text
                    className={`text-xs font-black ${
                      workout.isCompleted ? 'line-through text-gray-400' : 'text-gray-900'
                    }`}>
                    {workout.title}
                  </Text>
                  <Text className="text-[10px] text-gray-500">{workout.description}</Text>
                  <Text className="text-[10px] font-bold text-gray-400 mt-0.5">
                    {workout.distanceKm} km · {workout.durationMinutes} mins
                  </Text>
                </View>
              </View>
              <Ionicons
                name={workout.isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={workout.isCompleted ? '#10B981' : '#D1D5DB'}
              />
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            onPress={handleStartPlan}
            className="w-full py-3.5 bg-[#FC4C02] rounded-2xl items-center mt-4 active:bg-[#E03A00]">
            <Text className="text-xs font-black text-white">Enroll in this Training Plan</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

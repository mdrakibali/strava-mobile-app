import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MOCK_PLANS } from '../../mock/data';

export default function TrainingPlansScreen() {
  const router = useRouter();
  const [plans, setPlans] = useState(MOCK_PLANS);
  const [selectedPlanId, setSelectedPlanId] = useState(MOCK_PLANS[0].id);

  const activePlan = plans.find((p) => p.id === selectedPlanId) || plans[0];

  const toggleWorkout = (day: string) => {
    setPlans((prev) =>
      prev.map((plan) =>
        plan.id === activePlan.id
          ? {
              ...plan,
              weeklyWorkouts: plan.weeklyWorkouts.map((w) =>
                w.day === day ? { ...w, isCompleted: !w.isCompleted } : w
              ),
            }
          : plan
      )
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900">Training Plans 🏃‍♂️</Text>
        <View className="w-6" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="p-4" contentContainerClassName="pb-24">
        {/* Plans Carousel / Selector */}
        <Text className="text-xs font-semibold text-gray-500 mb-2">Available Structured Plans</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          {plans.map((plan) => {
            const isSelected = plan.id === selectedPlanId;
            return (
              <TouchableOpacity
                key={plan.id}
                onPress={() => setSelectedPlanId(plan.id)}
                className={`p-4 rounded-2xl mr-3 border w-64 ${
                  isSelected ? 'border-[#FC4C02] bg-white shadow-sm' : 'border-gray-200 bg-gray-50'
                }`}>
                <View className="flex-row items-center justify-between mb-2">
                  <View className="bg-orange-50 px-2 py-0.5 rounded">
                    <Text className="text-[10px] font-black text-[#FC4C02]">{plan.level}</Text>
                  </View>
                  <Text className="text-[10px] text-gray-400 font-bold">{plan.durationWeeks} Weeks</Text>
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
        <View className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-4">
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
                    className={`text-xs font-bold ${
                      workout.isCompleted ? 'line-through text-gray-400' : 'text-gray-900'
                    }`}>
                    {workout.title} ({workout.distanceKm} km)
                  </Text>
                  <Text className="text-[10px] text-gray-500 mt-0.5">{workout.description}</Text>
                </View>
              </View>

              <View
                className={`w-5 h-5 rounded-md items-center justify-center border ${
                  workout.isCompleted
                    ? 'border-emerald-500 bg-emerald-500'
                    : 'border-gray-300 bg-white'
                }`}>
                {workout.isCompleted && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


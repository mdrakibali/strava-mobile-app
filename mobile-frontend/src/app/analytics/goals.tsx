import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MOCK_GOALS } from '../../mock/data';

export default function GoalsScreen() {
  const router = useRouter();
  const [goals, setGoals] = useState(MOCK_GOALS);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTarget, setNewTarget] = useState('50');

  const handleAddGoal = () => {
    if (!newTitle.trim()) {
      alert('Please enter a goal title');
      return;
    }
    const targetNum = parseFloat(newTarget) || 50;
    setGoals((prev) => [
      ...prev,
      {
        id: `goal_${Date.now()}`,
        title: newTitle,
        targetValue: targetNum,
        currentValue: 0,
        unit: 'km',
        period: 'WEEKLY',
        sportType: 'Run',
      },
    ]);
    setIsAdding(false);
    setNewTitle('');
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900">Training Goals 🎯</Text>
        <TouchableOpacity onPress={() => setIsAdding(!isAdding)} className="p-1">
          <Ionicons name={isAdding ? 'close' : 'add'} size={24} color="#FC4C02" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="p-4" contentContainerClassName="pb-24">
        {isAdding && (
          <View className="bg-white p-4 rounded-2xl border border-orange-200 shadow-sm mb-4">
            <Text className="text-sm font-black text-gray-900 mb-2">Set New Fitness Target</Text>
            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="e.g. Weekly Long Run Mileage"
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-900 mb-3"
            />
            <View className="flex-row items-center space-x-2 mb-3">
              <TextInput
                value={newTarget}
                onChangeText={setNewTarget}
                keyboardType="numeric"
                className="w-24 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs text-gray-900"
              />
              <Text className="text-xs font-bold text-gray-600">Kilometers / week</Text>
            </View>
            <TouchableOpacity
              onPress={handleAddGoal}
              className="w-full py-3 bg-[#FC4C02] rounded-xl items-center">
              <Text className="text-xs font-bold text-white">Save Target</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text className="text-xs font-semibold text-gray-500 mb-3">Active Performance Targets</Text>

        {goals.map((goal) => {
          const percent = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));

          return (
            <View key={goal.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-3">
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-sm font-black text-gray-900">{goal.title}</Text>
                <View className="bg-orange-50 px-2 py-0.5 rounded-md">
                  <Text className="text-[10px] font-black text-[#FC4C02]">{goal.period}</Text>
                </View>
              </View>

              <Text className="text-xs text-gray-500 mb-3">
                {goal.currentValue} / {goal.targetValue} {goal.unit === 'm_elev' ? 'm climbed' : goal.unit}
              </Text>

              {/* Progress Bar */}
              <View className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                <View style={{ width: `${percent}%` }} className="h-full bg-[#FC4C02] rounded-full" />
              </View>

              <View className="flex-row justify-between items-center">
                <Text className="text-[10px] font-semibold text-gray-400">
                  {percent >= 100 ? '🎉 Target Achieved!' : `${(goal.targetValue - goal.currentValue).toFixed(1)} ${goal.unit} remaining`}
                </Text>
                <Text className="text-xs font-black text-gray-900">{percent}%</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}


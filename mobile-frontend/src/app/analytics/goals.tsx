import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { TrainingGoal } from '../../types';

export default function GoalsScreen() {
  const router = useRouter();
  const { activities } = useApp();
  const [goals, setGoals] = useState<TrainingGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTarget, setNewTarget] = useState('50');
  const [newPeriod, setNewPeriod] = useState<'WEEKLY' | 'MONTHLY' | 'ANNUAL'>('WEEKLY');
  const [saving, setSaving] = useState(false);

  // Load goals from API
  const fetchGoals = async () => {
    try {
      setLoading(true);
      const res = await api.goals.list();
      if (res?.goals) {
        // Calculate dynamic current progress for each goal from real activities
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const computedGoals = res.goals.map((g: any) => {
          let currentVal = 0;
          if (g.period === 'WEEKLY') {
            const thisWeekActivities = activities.filter(
              (a) => new Date(a.startTime).getTime() >= startOfWeek.getTime()
            );
            currentVal = thisWeekActivities.reduce(
              (acc, a) => acc + a.distanceMeters / 1000,
              0
            );
          } else {
            currentVal = activities.reduce(
              (acc, a) => acc + a.distanceMeters / 1000,
              0
            );
          }
          return {
            ...g,
            currentValue: Math.round(currentVal * 10) / 10,
          };
        });
        setGoals(computedGoals);
      }
    } catch (err) {
      console.warn('Failed to load goals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [activities]);

  const handleAddGoal = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Required', 'Please enter a goal title');
      return;
    }
    const targetNum = parseFloat(newTarget) || 50;
    try {
      setSaving(true);
      await api.goals.create({
        title: newTitle.trim(),
        targetValue: targetNum,
        unit: 'km',
        period: newPeriod,
        sportType: 'Run',
      });
      setIsAdding(false);
      setNewTitle('');
      await fetchGoals();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save goal');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGoal = (goalId: string) => {
    Alert.alert('Delete Goal', 'Are you sure you want to delete this target?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.goals.delete(goalId);
            setGoals((prev) => prev.filter((g) => g.id !== goalId));
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete goal');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900">Training Goals</Text>
        <TouchableOpacity onPress={() => setIsAdding(!isAdding)} className="p-1">
          <Ionicons name={isAdding ? 'close' : 'add'} size={24} color="#FC4C02" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="p-4"
        contentContainerStyle={{ paddingBottom: 110 }}>
        {isAdding && (
          <View className="bg-white p-5 rounded-3xl border border-orange-200 shadow-sm mb-4">
            <Text className="text-sm font-black text-gray-900 mb-3">Set New Fitness Target</Text>
            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="e.g. Weekly Long Run Mileage"
              placeholderTextColor="#9CA3AF"
              className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 mb-3"
            />
            <View className="flex-row items-center space-x-2 mb-4">
              <TextInput
                value={newTarget}
                onChangeText={setNewTarget}
                keyboardType="numeric"
                className="w-24 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm font-bold text-gray-900 mr-2"
              />
              <Text className="text-xs font-bold text-gray-600">Kilometers / week</Text>
            </View>

            <View className="flex-row mb-4">
              {(['WEEKLY', 'MONTHLY', 'ANNUAL'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setNewPeriod(p)}
                  className={`px-3 py-1.5 rounded-full mr-2 border ${
                    newPeriod === p ? 'bg-[#FC4C02] border-[#FC4C02]' : 'bg-gray-100 border-gray-200'
                  }`}>
                  <Text className={`text-xs font-bold ${newPeriod === p ? 'text-white' : 'text-gray-700'}`}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              disabled={saving}
              onPress={handleAddGoal}
              className="w-full py-3.5 bg-[#FC4C02] rounded-2xl items-center active:bg-[#E03A00]">
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text className="text-sm font-black text-white">Save Target</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <Text className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">
          Active Performance Targets
        </Text>

        {loading ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator color="#FC4C02" size="large" />
          </View>
        ) : goals.length === 0 ? (
          <View className="bg-white rounded-3xl p-8 items-center justify-center border border-gray-100 shadow-xs my-4">
            <Ionicons name="trophy-outline" size={48} color="#D1D5DB" />
            <Text className="text-base font-black text-gray-800 mt-3 text-center">
              No Goals Set Yet
            </Text>
            <Text className="text-xs text-gray-500 text-center mt-1 mb-5">
              Set weekly or monthly distance targets to track your endurance consistency.
            </Text>
            <TouchableOpacity
              onPress={() => setIsAdding(true)}
              className="px-5 py-2.5 bg-[#FC4C02] rounded-full">
              <Text className="text-xs font-bold text-white">+ Create Your First Goal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          goals.map((goal) => {
            const percent = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));

            return (
              <View
                key={goal.id}
                className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs mb-3">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-base font-black text-gray-900">{goal.title}</Text>
                  <View className="flex-row items-center">
                    <View className="bg-orange-50 px-2 py-0.5 rounded-md mr-2">
                      <Text className="text-[10px] font-black text-[#FC4C02]">{goal.period}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteGoal(goal.id)} className="p-1">
                      <Ionicons name="trash-outline" size={16} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text className="text-xs font-medium text-gray-500 mb-3">
                  {goal.currentValue} / {goal.targetValue} {goal.unit === 'm_elev' ? 'm climbed' : goal.unit}
                </Text>

                {/* Progress Bar */}
                <View className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <View
                    style={{ width: `${percent}%` }}
                    className={`h-full rounded-full ${percent >= 100 ? 'bg-green-500' : 'bg-[#FC4C02]'}`}
                  />
                </View>

                <View className="flex-row justify-between items-center">
                  <Text className="text-[11px] font-semibold text-gray-400">
                    {percent >= 100
                      ? 'Target Achieved! 🏆'
                      : `${(goal.targetValue - goal.currentValue).toFixed(1)} ${goal.unit} remaining`}
                  </Text>
                  <Text className="text-xs font-black text-gray-900">{percent}%</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

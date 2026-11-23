import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoalCard } from '../../components/analytics/GoalCard';
import { NewGoalForm } from '../../components/analytics/NewGoalForm';
import { useCreateGoal, useDeleteGoal, useGoals } from '../../hooks/useGoals';

export default function GoalsScreen() {
  const router = useRouter();
  const { data: goals = [], isLoading, isRefetching, refetch } = useGoals();
  const createGoal = useCreateGoal();
  const deleteGoal = useDeleteGoal();

  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTarget, setNewTarget] = useState('50');
  const [newPeriod, setNewPeriod] = useState<'WEEKLY' | 'MONTHLY' | 'ANNUAL'>('WEEKLY');

  const handleAddGoal = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Required', 'Please enter a goal title');
      return;
    }
    const targetNum = parseFloat(newTarget) || 50;
    try {
      await createGoal.mutateAsync({
        title: newTitle.trim(),
        targetValue: targetNum,
        unit: 'km',
        period: newPeriod,
        sportType: 'Run',
      });
      setIsAdding(false);
      setNewTitle('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save goal');
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
            await deleteGoal.mutateAsync(goalId);
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
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetch();
            }}
            tintColor="#FC4C02"
          />
        }
      >
        {isAdding && (
          <NewGoalForm
            title={newTitle}
            onTitleChange={setNewTitle}
            target={newTarget}
            onTargetChange={setNewTarget}
            period={newPeriod}
            onPeriodChange={setNewPeriod}
            saving={createGoal.isPending}
            onSubmit={handleAddGoal}
          />
        )}

        <Text className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">
          Active Performance Targets
        </Text>

        {isLoading ? (
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
              className="px-5 py-2.5 bg-[#FC4C02] rounded-full"
            >
              <Text className="text-xs font-bold text-white">+ Create Your First Goal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          goals.map((goal) => <GoalCard key={goal.id} goal={goal} onDelete={handleDeleteGoal} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

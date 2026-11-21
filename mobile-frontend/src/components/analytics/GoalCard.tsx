import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { TrainingGoal } from '../../types';

interface Props {
  goal: TrainingGoal;
  onDelete: (id: string) => void;
}

export const GoalCard: React.FC<Props> = ({ goal, onDelete }) => {
  const percent = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));

  return (
    <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs mb-3">
      <View className="flex-row justify-between items-center mb-1">
        <Text className="text-base font-black text-gray-900">{goal.title}</Text>
        <View className="flex-row items-center">
          <View className="bg-orange-50 px-2 py-0.5 rounded-md mr-2">
            <Text className="text-[10px] font-black text-[#FC4C02]">{goal.period}</Text>
          </View>
          <TouchableOpacity onPress={() => onDelete(goal.id)} className="p-1">
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
};


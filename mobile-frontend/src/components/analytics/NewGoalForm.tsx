import React from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Props {
  title: string;
  onTitleChange: (v: string) => void;
  target: string;
  onTargetChange: (v: string) => void;
  period: 'WEEKLY' | 'MONTHLY' | 'ANNUAL';
  onPeriodChange: (p: 'WEEKLY' | 'MONTHLY' | 'ANNUAL') => void;
  saving: boolean;
  onSubmit: () => void;
}

export const NewGoalForm: React.FC<Props> = ({
  title,
  onTitleChange,
  target,
  onTargetChange,
  period,
  onPeriodChange,
  saving,
  onSubmit,
}) => {
  return (
    <View className="bg-white p-5 rounded-3xl border border-orange-200 shadow-sm mb-4">
      <Text className="text-sm font-black text-gray-900 mb-3">Set New Fitness Target</Text>
      <TextInput
        value={title}
        onChangeText={onTitleChange}
        placeholder="e.g. Weekly Long Run Mileage"
        placeholderTextColor="#9CA3AF"
        className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 mb-3"
      />
      <View className="flex-row items-center space-x-2 mb-4">
        <TextInput
          value={target}
          onChangeText={onTargetChange}
          keyboardType="numeric"
          className="w-24 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm font-bold text-gray-900 mr-2"
        />
        <Text className="text-xs font-bold text-gray-600">Kilometers / week</Text>
      </View>

      <View className="flex-row mb-4">
        {(['WEEKLY', 'MONTHLY', 'ANNUAL'] as const).map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => onPeriodChange(p)}
            className={`px-3 py-1.5 rounded-full mr-2 border ${
              period === p ? 'bg-[#FC4C02] border-[#FC4C02]' : 'bg-gray-100 border-gray-200'
            }`}>
            <Text className={`text-xs font-bold ${period === p ? 'text-white' : 'text-gray-700'}`}>
              {p}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        disabled={saving}
        onPress={onSubmit}
        className="w-full py-3.5 bg-[#FC4C02] rounded-2xl items-center active:bg-[#E03A00]">
        {saving ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text className="text-sm font-black text-white">Save Target</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

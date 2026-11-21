import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ReportScreen() {
  const router = useRouter();
  const [reason, setReason] = useState('Harassment or Bullying');
  const [details, setDetails] = useState('');

  const REASONS = [
    'Harassment or Bullying',
    'Spam or Scam Content',
    'Dangerous or Inaccurate GPS Activity (e.g. driving logged as running)',
    'Hate Speech or Inappropriate Imagery',
  ];

  const handleSubmit = () => {
    alert('Thank you for keeping Kinetix safe. Our moderation team will review this report.');
    router.back();
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FFFFFF' }} className="justify-between p-6">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color="#111827" />
          </TouchableOpacity>
          <Text className="text-base font-black text-gray-900">Report to Moderation</Text>
          <View className="w-6" />
        </View>

        <Text className="text-2xl font-black text-gray-900 mb-2">Safety Report</Text>
        <Text className="text-xs text-gray-500 mb-6 leading-4">
          Kinetix is committed to a positive, authentic, and safe athletic environment. Reports are evaluated strictly against community guidelines.
        </Text>

        <Text className="text-xs font-bold text-gray-600 mb-2">Primary Reason</Text>
        <View className="space-y-2 mb-4">
          {REASONS.map((r) => {
            const isSelected = reason === r;
            return (
              <TouchableOpacity
                key={r}
                onPress={() => setReason(r)}
                className={`p-3.5 rounded-xl border mb-2 flex-row items-center justify-between ${
                  isSelected ? 'border-[#FC4C02] bg-orange-50/50' : 'border-gray-200 bg-white'
                }`}>
                <Text className="text-xs font-bold text-gray-900 flex-1 mr-2">{r}</Text>
                {isSelected && <Ionicons name="checkmark-circle" size={18} color="#FC4C02" />}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text className="text-xs font-bold text-gray-600 mb-1">Additional Context (Optional)</Text>
        <TextInput
          value={details}
          onChangeText={setDetails}
          placeholder="Provide any additional details or timestamp references..."
          multiline
          numberOfLines={4}
          className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-900 h-24 mb-6"
        />
      </ScrollView>

      <TouchableOpacity
        onPress={handleSubmit}
        className="w-full py-4 bg-red-600 rounded-2xl items-center shadow-md">
        <Text className="text-base font-black text-white">Submit Report</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}


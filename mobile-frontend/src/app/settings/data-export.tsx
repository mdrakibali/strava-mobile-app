import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DataExportScreen() {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = (format: string) => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      alert(`Export complete! Your ${format} file package has been generated.`);
    }, 1200);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900 ml-3">Data Portability & Export 💾</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="p-4" contentContainerClassName="pb-24">
        <View className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-4">
          <Text className="text-sm font-black text-gray-900 mb-1">Your Fitness Data Belongs to You</Text>
          <Text className="text-xs text-gray-500 leading-5">
            Export all your GPS trackpoints, heart rate streams, splits, and elevation data in open, standard formats with zero lock-in.
          </Text>
        </View>

        {/* Options */}
        <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 space-y-3">
          <TouchableOpacity
            onPress={() => handleExport('GPX XML')}
            disabled={isExporting}
            className="p-4 rounded-xl border border-gray-200 bg-gray-50 mb-3 flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-10 h-10 rounded-xl bg-orange-100 items-center justify-center mr-3">
                <Ionicons name="document-text-outline" size={22} color="#FC4C02" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-gray-900">Download GPX Tracks</Text>
                <Text className="text-xs text-gray-400">Standard XML format compatible with Garmin & Google Earth.</Text>
              </View>
            </View>
            <Ionicons name="download-outline" size={20} color="#FC4C02" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleExport('Garmin FIT')}
            disabled={isExporting}
            className="p-4 rounded-xl border border-gray-200 bg-gray-50 mb-3 flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-10 h-10 rounded-xl bg-blue-100 items-center justify-center mr-3">
                <Ionicons name="hardware-chip-outline" size={22} color="#2563EB" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-gray-900">Download FIT Binaries</Text>
                <Text className="text-xs text-gray-400">High-density compact format including sensor wattage & cadence.</Text>
              </View>
            </View>
            <Ionicons name="download-outline" size={20} color="#2563EB" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleExport('Complete ZIP Archive')}
            disabled={isExporting}
            className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-10 h-10 rounded-xl bg-purple-100 items-center justify-center mr-3">
                <Ionicons name="archive-outline" size={22} color="#9333EA" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-gray-900">Full Account Archive (ZIP)</Text>
                <Text className="text-xs text-gray-400">Every activity, comment, photo, and kudos record.</Text>
              </View>
            </View>
            <Ionicons name="download-outline" size={20} color="#9333EA" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


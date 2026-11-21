import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ElevationChart } from '../../components/common/ElevationChart';
import { RouteMapPreview } from '../../components/common/RouteMapPreview';
import { StatBox } from '../../components/common/StatBox';

export default function ImportGpxScreen() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSimulatePick = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setSelectedFile('morning_intervals_garmin_forerunner.fit');
      setIsProcessing(false);
    }, 800);
  };

  const handleImportSave = () => {
    alert('Activity successfully imported and analyzed with Grade Adjusted Pace!');
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900 ml-3">Import Activity File</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="p-4" contentContainerClassName="pb-24">
        {!selectedFile ? (
          <View className="bg-white p-8 rounded-2xl border-2 border-dashed border-gray-300 items-center justify-center my-6 shadow-sm">
            <View className="w-16 h-16 rounded-full bg-orange-50 items-center justify-center mb-4">
              <Ionicons name="cloud-upload" size={32} color="#FC4C02" />
            </View>
            <Text className="text-base font-black text-gray-900 text-center mb-1">
              Select GPX, TCX, or FIT File
            </Text>
            <Text className="text-xs text-gray-400 text-center mb-6 max-w-xs leading-4">
              Upload activities recorded on Garmin, Wahoo, Polar, Suunto, or Apple Watch.
            </Text>
            <TouchableOpacity
              onPress={handleSimulatePick}
              disabled={isProcessing}
              className="bg-[#FC4C02] px-6 py-3 rounded-2xl shadow-sm">
              <Text className="text-xs font-bold text-white">
                {isProcessing ? 'Analyzing Trackpoints...' : 'Browse Device Files'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="space-y-4">
            {/* File Selected Badge */}
            <View className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 flex-row items-center justify-between mb-4">
              <View className="flex-row items-center flex-1 mr-2">
                <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                <View className="ml-2 flex-1">
                  <Text className="text-xs font-bold text-emerald-900" numberOfLines={1}>{selectedFile}</Text>
                  <Text className="text-[10px] text-emerald-700">1,480 GPS trackpoints & HR stream parsed</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedFile(null)}>
                <Text className="text-xs font-bold text-red-600">Remove</Text>
              </TouchableOpacity>
            </View>

            {/* Parsed Metrics */}
            <View className="flex-row justify-between bg-white p-3 rounded-2xl border border-gray-100 shadow-sm mb-4">
              <StatBox label="Distance" value="10.4 km" />
              <StatBox label="Duration" value="48:20" />
              <StatBox label="Avg HR" value="162 bpm" />
            </View>

            {/* Trackpoint Map Preview */}
            <View className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-4">
              <Text className="text-xs font-black text-gray-900 mb-2">Parsed Spatial Geometry</Text>
              <RouteMapPreview height={180} />
            </View>

            {/* Elevation Profile */}
            <View className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-4">
              <Text className="text-xs font-black text-gray-900 mb-2">Parsed Elevation Profile</Text>
              <ElevationChart />
            </View>

            <TouchableOpacity
              onPress={handleImportSave}
              className="w-full py-4 bg-[#FC4C02] rounded-2xl items-center shadow-md">
              <Text className="text-base font-black text-white">Save to My Activities</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}


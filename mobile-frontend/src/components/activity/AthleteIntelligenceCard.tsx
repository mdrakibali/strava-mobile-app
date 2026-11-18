import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface AthleteIntelligenceCardProps {
  activityTitle: string;
  sportType: string;
}

export const AthleteIntelligenceCard: React.FC<AthleteIntelligenceCardProps> = ({
  activityTitle,
  sportType,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <View className="bg-white mt-3 p-4 border-y border-gray-200">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <View className="w-6 h-6 rounded-lg bg-orange-100 items-center justify-center mr-2">
            <Ionicons name="sparkles" size={13} color="#FC4C02" />
          </View>
          <Text className="text-xs font-black text-gray-900 uppercase tracking-wider">
            Athlete Intelligence
          </Text>
        </View>
        <View className="bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
          <Text className="text-[9px] font-bold text-[#FC4C02]">AI ANALYSIS</Text>
        </View>
      </View>

      {/* Primary Key Takeaway */}
      <Text className="text-xs font-bold text-gray-900 leading-5 mb-2">
        Strong aerobic efficiency: Pace on rolling sections was 12 sec/km faster than your 8-week average for {sportType.toLowerCase()} sessions.
      </Text>

      {/* Expandable Details */}
      {isExpanded && (
        <View className="space-y-2.5 pt-2 border-t border-gray-100 mt-1">
          <View className="bg-gray-50 p-3 rounded-xl border border-gray-100 mb-2">
            <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Pacing & Lactate Threshold
            </Text>
            <Text className="text-xs text-gray-700 leading-4">
              Splits remained consistent within 4 seconds between km 3 and 7, demonstrating solid lactate clearance while maintaining target cadence of 174 spm.
            </Text>
          </View>

          <View className="bg-gray-50 p-3 rounded-xl border border-gray-100 mb-2">
            <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Cardiac Drift & Zone Distribution
            </Text>
            <Text className="text-xs text-gray-700 leading-4">
              Heart rate stayed within Zone 3 (156 bpm avg) for 78% of the moving duration, indicating high cardiovascular conditioning with low cardiac drift.
            </Text>
          </View>

          <View className="bg-orange-50/60 p-3 rounded-xl border border-orange-100">
            <Text className="text-[10px] font-bold text-[#FC4C02] uppercase tracking-wider mb-1">
              Recovery Advice
            </Text>
            <Text className="text-xs text-gray-800 leading-4">
              Estimated recovery time: 24–30 hours. Recommended next workout: low-intensity Zone 1 active recovery or mobility work.
            </Text>
          </View>
        </View>
      )}

      {/* Expand / Collapse Button */}
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        className="flex-row items-center justify-center pt-2 mt-1">
        <Text className="text-xs font-bold text-[#FC4C02] mr-1">
          {isExpanded ? 'Show Less' : 'Read Full AI Analysis'}
        </Text>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={12}
          color="#FC4C02"
        />
      </TouchableOpacity>
    </View>
  );
};


import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ElevationChart } from '../../components/common/ElevationChart';
import { RouteMapPreview } from '../../components/common/RouteMapPreview';
import { StatBox } from '../../components/common/StatBox';
import { useApp } from '../../context/AppContext';

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { activities, toggleKudos, addComment } = useApp();

  const [commentInput, setCommentInput] = useState('');

  const activity = activities.find((act) => act.id === id) || activities[0];

  const handlePostComment = () => {
    if (commentInput.trim()) {
      addComment(activity.id, commentInput);
      setCommentInput('');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Top Header */}
      <View className="flex-row justify-between items-center bg-white px-3 py-2 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        <View className="items-center">
          <Text className="text-sm font-bold text-gray-900">{activity.athlete.displayName}</Text>
          <Text className="text-xs text-gray-500 mt-0.5">
            {activity.sportType} · {activity.distanceFormatted}
          </Text>
        </View>

        <TouchableOpacity className="p-1">
          <Ionicons name="share-social-outline" size={22} color="#111827" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 80 }}>
          {/* Title & Description */}
          <View className="bg-white p-4 border-b border-gray-200">
            <Text className="text-xl font-black text-gray-900 mb-1">{activity.title}</Text>
            {activity.description && (
              <Text className="text-sm text-gray-600 leading-5">{activity.description}</Text>
            )}
          </View>

          {/* Map Preview */}
          <View className="p-3 bg-white">
            <RouteMapPreview points={activity.routePoints} height={210} />
          </View>

          {/* Primary Stats Grid */}
          <View className="bg-white mt-2 p-4 border-y border-gray-200">
            <View className="flex-row justify-between">
              <StatBox label="Distance" value={activity.distanceFormatted} />
              <StatBox label="Avg Pace" value={activity.paceFormatted} />
              <StatBox label="Moving Time" value={activity.movingTimeFormatted} />
            </View>

            <View className="flex-row justify-between mt-3">
              <StatBox label="Elevation" value={activity.elevationFormatted} />
              <StatBox
                label="GAP"
                value={activity.gapFormatted || activity.paceFormatted}
                highlight
                highlightColor="#FC4C02"
              />
              <StatBox
                label="Relative Effort"
                value={`${activity.relativeEffortScore || 45}`}
                highlight
                highlightColor="#D97706"
              />
            </View>
          </View>

          {/* Elevation Profile Chart */}
          <View className="bg-white mt-2 p-4 border-y border-gray-200">
            <ElevationChart elevations={activity.elevationProfile} height={100} />
          </View>

          {/* Physiological Metrics (HR & Calories) */}
          <View className="bg-white mt-2 p-4 border-y border-gray-200">
            <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Heart Rate & Intensity
            </Text>
            <View className="flex-row justify-between">
              <View className="flex-row items-center">
                <Ionicons name="heart" size={20} color="#EF4444" />
                <View className="ml-2">
                  <Text className="text-sm font-black text-gray-900">
                    {activity.averageHeartRate || 154} bpm
                  </Text>
                  <Text className="text-[10px] text-gray-400">Avg Heart Rate</Text>
                </View>
              </View>

              <View className="flex-row items-center">
                <Ionicons name="pulse" size={20} color="#F59E0B" />
                <View className="ml-2">
                  <Text className="text-sm font-black text-gray-900">
                    {activity.maxHeartRate || 178} bpm
                  </Text>
                  <Text className="text-[10px] text-gray-400">Max Heart Rate</Text>
                </View>
              </View>

              <View className="flex-row items-center">
                <Ionicons name="flame" size={20} color="#FC4C02" />
                <View className="ml-2">
                  <Text className="text-sm font-black text-gray-900">
                    {activity.calories || 680}
                  </Text>
                  <Text className="text-[10px] text-gray-400">Calories</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Splits Table (if available) */}
          {activity.splits && activity.splits.length > 0 && (
            <View className="bg-white mt-2 p-4 border-y border-gray-200">
              <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                Kilometer Splits
              </Text>
              <View className="flex-row border-b border-gray-200 pb-1.5 mb-1">
                <Text className="flex-[0.8] text-[10px] font-bold text-gray-400">KM</Text>
                <Text className="flex-[1.2] text-[10px] font-bold text-gray-400">PACE</Text>
                <Text className="flex-[1.2] text-[10px] font-bold text-gray-400">ELEV</Text>
                <Text className="flex-[1.2] text-[10px] font-bold text-gray-400">AVG HR</Text>
              </View>

              {activity.splits.map((s) => (
                <View key={s.splitNumber} className="flex-row py-1.5 border-b border-gray-100">
                  <Text className="flex-[0.8] text-xs font-bold text-gray-900">{s.splitNumber}</Text>
                  <Text className="flex-[1.2] text-xs text-gray-900">{s.paceFormatted}</Text>
                  <Text className="flex-[1.2] text-xs text-gray-900">
                    {s.elevationDeltaMeters > 0 ? `+${s.elevationDeltaMeters}m` : `${s.elevationDeltaMeters}m`}
                  </Text>
                  <Text className="flex-[1.2] text-xs text-gray-900">
                    {s.averageHeartRate ? `${s.averageHeartRate} bpm` : '--'}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Social Interactions Section */}
          <View className="bg-white mt-2 p-4 border-y border-gray-200">
            <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
              <TouchableOpacity
                className="flex-row items-center gap-1.5"
                onPress={() => toggleKudos(activity.id)}
                activeOpacity={0.75}>
                <Ionicons
                  name={activity.hasKudos ? 'thumbs-up' : 'thumbs-up-outline'}
                  size={20}
                  color={activity.hasKudos ? '#FC4C02' : '#4B5563'}
                />
                <Text
                  className={`text-sm ${
                    activity.hasKudos ? 'text-[#FC4C02] font-bold' : 'text-gray-600 font-medium'
                  }`}>
                  {activity.kudosCount} Kudos
                </Text>
              </TouchableOpacity>

              <Text className="text-xs text-gray-400">{activity.commentsCount} Comments</Text>
            </View>

            {/* Comments Thread */}
            <View className="mt-3 gap-3">
              {activity.comments && activity.comments.length > 0 ? (
                activity.comments.map((c) => (
                  <View key={c.id} className="flex-row gap-3">
                    <Image source={{ uri: c.athlete.avatarUrl }} className="w-8 h-8 rounded-full bg-gray-100" />
                    <View className="flex-1">
                      <View className="flex-row justify-between items-center mb-0.5">
                        <Text className="text-xs font-bold text-gray-900">{c.athlete.displayName}</Text>
                        <Text className="text-[10px] text-gray-400">{c.createdAt}</Text>
                      </View>
                      <Text className="text-xs text-gray-600 leading-4">{c.content}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text className="text-xs text-gray-400 italic text-center py-3">
                  No comments yet. Be the first to cheer!
                </Text>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Comment Posting Input Bar */}
        <View className="flex-row items-center bg-white px-3 py-2 border-t border-gray-200 gap-2">
          <TextInput
            className="flex-1 h-10 bg-gray-100 rounded-full px-4 text-sm text-gray-900"
            placeholder="Write a cheer or comment..."
            placeholderTextColor="#9CA3AF"
            value={commentInput}
            onChangeText={setCommentInput}
          />
          <TouchableOpacity
            className={`w-9 h-9 rounded-full bg-[#FC4C02] items-center justify-center ${
              !commentInput.trim() ? 'opacity-50' : ''
            }`}
            onPress={handlePostComment}
            disabled={!commentInput.trim()}>
            <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

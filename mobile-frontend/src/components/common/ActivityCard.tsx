import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { Activity, SportType } from '../../types';
import { RouteMapPreview } from './RouteMapPreview';
import { ShareModal } from './ShareModal';
import { StatBox } from './StatBox';

interface ActivityCardProps {
  activity: Activity;
}

const getSportIcon = (sport: SportType): keyof typeof Ionicons.glyphMap => {
  switch (sport) {
    case 'Ride':
    case 'Gravel Ride':
    case 'Mountain Bike':
    case 'Virtual Ride':
      return 'bicycle-outline';
    case 'Hike':
    case 'Walk':
      return 'walk-outline';
    case 'Trail Run':
    case 'Run':
      return 'fitness-outline';
    default:
      return 'speedometer-outline';
  }
};

export const ActivityCard: React.FC<ActivityCardProps> = ({ activity }) => {
  const router = useRouter();
  const { toggleKudos } = useApp();
  const [showShareModal, setShowShareModal] = useState(false);

  const handleCardPress = () => {
    router.push({
      pathname: '/activity/[id]',
      params: { id: activity.id },
    });
  };

  const handleAthletePress = () => {
    router.push(`/athlete/${activity.athlete.id}`);
  };

  return (
    <View className="bg-white rounded-xl p-4 mb-3 border border-gray-200">
      {/* Header: Athlete info & Sport */}
      <View className="flex-row justify-between items-center mb-3">
        <TouchableOpacity
          onPress={handleAthletePress}
          className="flex-row items-center flex-1 mr-2"
          activeOpacity={0.8}>
          <Image
            source={{ uri: activity.athlete.avatarUrl }}
            className="w-11 h-11 rounded-full mr-3 bg-gray-100"
          />
          <View className="justify-center flex-1">
            <Text className="text-base font-bold text-gray-900" numberOfLines={1}>
              {activity.athlete.displayName}
            </Text>
            <View className="flex-row items-center mt-0.5">
              <Ionicons
                name={getSportIcon(activity.sportType)}
                size={13}
                color="#FC4C02"
              />
              <Text className="text-xs text-gray-400">
                {' '}
                {activity.sportType} · {activity.athlete.city || 'Athletic Track'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity className="p-1">
          <Ionicons name="ellipsis-horizontal" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Title & Description */}
      <TouchableOpacity onPress={handleCardPress} activeOpacity={0.8}>
        <Text className="text-lg font-black text-gray-900 mb-1">
          {activity.title}
        </Text>
        {activity.description && (
          <Text className="text-xs text-gray-600 mb-3 leading-5" numberOfLines={2}>
            {activity.description}
          </Text>
        )}
      </TouchableOpacity>

      {/* Metrics Grid — Clean Strava-style Typography */}
      <TouchableOpacity
        className="flex-row justify-between py-2.5 mb-3 border-y border-gray-100"
        onPress={handleCardPress}
        activeOpacity={0.8}>
        <View>
          <Text className="text-[10px] uppercase font-bold text-gray-400">Distance</Text>
          <Text className="text-xl font-black text-gray-900">{activity.distanceFormatted}</Text>
        </View>

        <View>
          <Text className="text-[10px] uppercase font-bold text-gray-400">Pace</Text>
          <Text className="text-xl font-black text-gray-900">{activity.paceFormatted}</Text>
        </View>

        <View>
          <Text className="text-[10px] uppercase font-bold text-gray-400">Time</Text>
          <Text className="text-xl font-black text-gray-900">{activity.movingTimeFormatted}</Text>
        </View>

        <View>
          <Text className="text-[10px] uppercase font-bold text-gray-400">Elev</Text>
          <Text className="text-xl font-black text-gray-900">{activity.elevationFormatted}</Text>
        </View>
      </TouchableOpacity>

      {/* Advanced Algorithmic Parity Badges (GAP & Relative Effort) */}
      {(activity.gapFormatted || activity.relativeEffortScore) && (
        <View className="flex-row gap-2 mb-3">
          {activity.gapFormatted && (
            <View className="flex-row items-center bg-primary-light px-2.5 py-1 rounded-full gap-1">
              <Ionicons name="trending-up-outline" size={13} color="#FC4C02" />
              <Text className="text-xs font-semibold text-[#FC4C02]">
                GAP {activity.gapFormatted}
              </Text>
            </View>
          )}

          {activity.relativeEffortScore && (
            <View className="flex-row items-center bg-amber-100 px-2.5 py-1 rounded-full gap-1">
              <Ionicons name="flash-outline" size={13} color="#D97706" />
              <Text className="text-xs font-semibold text-amber-800">
                {activity.relativeEffortScore} Relative Effort
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Visual Media (Photos or Route Polyline Map) */}
      <TouchableOpacity
        className="mb-3 rounded-xl overflow-hidden"
        onPress={handleCardPress}
        activeOpacity={0.9}>
        {activity.photos && activity.photos.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {activity.photos.map((photo, index) => (
              <Image
                key={index}
                source={{ uri: photo }}
                className="w-[280px] h-[190px] rounded-xl mr-2 bg-gray-100"
              />
            ))}
          </ScrollView>
        ) : (
          <RouteMapPreview points={activity.routePoints} height={190} />
        )}
      </TouchableOpacity>

      {/* Social Actions (Kudos, Comments, Share) */}
      <View className="flex-row justify-around border-t border-gray-100 pt-3">
        <TouchableOpacity
          className="flex-row items-center gap-1.5 py-1 px-2"
          onPress={() => toggleKudos(activity.id)}
          activeOpacity={0.7}>
          <Ionicons
            name={activity.hasKudos ? 'thumbs-up' : 'thumbs-up-outline'}
            size={18}
            color={activity.hasKudos ? '#FC4C02' : '#4B5563'}
          />
          <Text
            className={`text-xs font-medium ${
              activity.hasKudos ? 'text-[#FC4C02] font-bold' : 'text-gray-600'
            }`}>
            {activity.kudosCount > 0 ? `${activity.kudosCount} Kudos` : 'Kudos'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row items-center gap-1.5 py-1 px-2"
          onPress={handleCardPress}
          activeOpacity={0.7}>
          <Ionicons name="chatbubble-outline" size={17} color="#4B5563" />
          <Text className="text-xs font-medium text-gray-600">
            {activity.commentsCount > 0 ? `${activity.commentsCount} Comments` : 'Comment'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowShareModal(true)}
          className="flex-row items-center gap-1.5 py-1 px-2"
          activeOpacity={0.7}>
          <Ionicons name="share-social-outline" size={18} color="#4B5563" />
          <Text className="text-xs font-medium text-gray-600">Share</Text>
        </TouchableOpacity>
      </View>

      {/* Share Modal */}
      <ShareModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        activityTitle={activity.title}
      />

      {/* Mini Comment Preview */}
      {activity.comments && activity.comments.length > 0 && (
        <TouchableOpacity
          className="mt-2 pt-2 border-t border-gray-100"
          onPress={handleCardPress}
          activeOpacity={0.8}>
          <Text className="text-xs font-bold text-gray-900">
            {activity.comments[0].athlete.displayName}:{' '}
            <Text className="font-normal text-gray-600">
              {activity.comments[0].content}
            </Text>
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

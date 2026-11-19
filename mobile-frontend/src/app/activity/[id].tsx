import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import { ActivitySplitsTable } from '../../components/activity/ActivitySplitsTable';
import { AthleteIntelligenceCard } from '../../components/activity/AthleteIntelligenceCard';
import { HeartRateIntensityCard } from '../../components/activity/HeartRateIntensityCard';
import { MatchedSegmentsSection } from '../../components/activity/MatchedSegmentsSection';
import { ElevationChart } from '../../components/common/ElevationChart';
import { ShareModal } from '../../components/common/ShareModal';
import { StatBox } from '../../components/common/StatBox';
import { StravaMapView } from '../../components/map/StravaMapView';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { activities, toggleKudos, addComment } = useApp();
  const [commentInput, setCommentInput] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [serverActivity, setServerActivity] = useState<any>(null);

  const localActivity = activities.find((act) => act.id === id);
  const activity = serverActivity || localActivity || activities[0];

  useEffect(() => {
    let isMounted = true;
    if (!id) return;

    const fetchDetail = async () => {
      try {
        const res = await api.activities.get(id);
        if (isMounted && res?.activity) {
          const item = res.activity;
          const distKm = (Number(item.distanceMeters) / 1000).toFixed(2);
          const mins = Math.floor(item.movingTimeSeconds / 60);
          const secs = item.movingTimeSeconds % 60;
          const timeFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
          const paceSeconds =
            item.distanceMeters > 0
              ? Math.round(item.movingTimeSeconds / (item.distanceMeters / 1000))
              : 300;
          const paceMin = Math.floor(paceSeconds / 60);
          const paceSec = paceSeconds % 60;
          const paceFormatted =
            item.sportType === 'Ride'
              ? `${((item.averageSpeedMps || 0) * 3.6).toFixed(1)} km/h`
              : `${paceMin}:${paceSec < 10 ? '0' : ''}${paceSec} /km`;

          setServerActivity({
            id: item.id,
            athlete: {
              id: item.athlete?.id || 'ath_1',
              displayName: item.athlete?.displayName || 'Athlete',
              username: item.athlete?.username || 'athlete',
              avatarUrl: item.athlete?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
              city: item.athlete?.city || 'Dhaka',
              country: 'Bangladesh',
              followersCount: 0,
              followingCount: 0,
              isFollowing: false,
            },
            title: item.title,
            description: item.description || '',
            sportType: item.sportType,
            visibility: item.visibility,
            startTime: item.startTime,
            distanceMeters: Number(item.distanceMeters),
            movingTimeSeconds: item.movingTimeSeconds,
            elapsedTimeSeconds: item.elapsedTimeSeconds,
            elevationGainMeters: item.elevationGainMeters,
            averageSpeedMps: item.averageSpeedMps || 3.0,
            maxSpeedMps: item.maxSpeedMps || 4.5,
            averageHeartRate: item.averageHeartRate || 150,
            maxHeartRate: 175,
            distanceFormatted: `${distKm} km`,
            movingTimeFormatted: timeFormatted,
            paceFormatted,
            elevationFormatted: `${item.elevationGainMeters} m`,
            gapFormatted: item.gapFormatted || paceFormatted,
            relativeEffortScore: item.relativeEffortScore || 45,
            kudosCount: item.kudosCount || 0,
            hasKudos: item.hasKudos || false,
            commentsCount: item.commentsCount || 0,
            comments: item.comments || [],
            routePoints: item.polyline || [],
            photos: item.photos,
            splits: item.splits,
            elevationProfile: item.elevationProfile,
          });
        }
      } catch (err) {
        console.warn('Failed to fetch activity detail:', err);
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (!activity) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Text className="text-xs text-gray-400">Activity not found</Text>
      </SafeAreaView>
    );
  }

  const handlePostComment = () => {
    if (commentInput.trim()) {
      addComment(activity.id, commentInput);
      setCommentInput('');
    }
  };

  const routeCoords = activity.routePoints?.map(
    (p: any) => [p.longitude, p.latitude] as [number, number]
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Top Header */}
      <View className="flex-row justify-between items-center bg-white px-4 py-3 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push(`/athlete/${activity.athlete.id}`)}
          className="items-center">
          <Text className="text-sm font-black text-gray-900">{activity.athlete.displayName}</Text>
          <Text className="text-[11px] text-[#FC4C02] font-bold">
            {activity.sportType} · {activity.distanceFormatted}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowShareModal(true)} className="p-1">
          <Ionicons name="share-social-outline" size={22} color="#111827" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerClassName="pb-24">
          {/* Title & Caption */}
          <View className="bg-white p-4 border-b border-gray-200">
            <Text className="text-xl font-black text-gray-900 mb-1">{activity.title}</Text>
            {activity.description && (
              <Text className="text-xs text-gray-600 leading-4">{activity.description}</Text>
            )}

            {/* Weather & Gear Pills */}
            <View className="flex-row flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
              <View className="bg-orange-50 px-2.5 py-1 rounded-full flex-row items-center border border-orange-100">
                <Ionicons name="sunny-outline" size={13} color="#FC4C02" />
                <Text className="text-[10px] font-bold text-[#FC4C02] ml-1">24°C · Wind 8 km/h NW</Text>
              </View>
              <View className="bg-gray-100 px-2.5 py-1 rounded-full flex-row items-center">
                <Ionicons name="footsteps-outline" size={13} color="#4B5563" />
                <Text className="text-[10px] font-bold text-gray-700 ml-1">Nike Vaporfly 3 (342 km)</Text>
              </View>
            </View>
          </View>

          {/* Real Full-Featured Map View */}
          <View className="h-56 w-full border-b border-gray-200">
            <StravaMapView
              routeCoordinates={routeCoords}
              showControls={false}
              showUserLocation={false}
              className="w-full h-full"
            />
          </View>

          {/* Athlete Intelligence (AI Coaching & Insights) */}
          <AthleteIntelligenceCard
            activityTitle={activity.title}
            sportType={activity.sportType}
          />

          {/* Primary Performance Metrics */}
          <View className="bg-white p-4 border-b border-gray-200">
            <View className="flex-row justify-between mb-3">
              <StatBox label="Distance" value={activity.distanceFormatted} />
              <StatBox label="Avg Pace" value={activity.paceFormatted} />
              <StatBox label="Moving Time" value={activity.movingTimeFormatted} />
            </View>

            <View className="flex-row justify-between pt-3 border-t border-gray-100">
              <StatBox label="Elevation Gain" value={activity.elevationFormatted} />
              <StatBox
                label="Grade Adjusted (GAP)"
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

          {/* Elevation Profile Area Chart */}
          <View className="bg-white mt-3 p-4 border-y border-gray-200">
            <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Elevation Profile
            </Text>
            <ElevationChart elevations={activity.elevationProfile} height={110} />
          </View>

          {/* Heart Rate Intensity Distribution */}
          <HeartRateIntensityCard
            averageHeartRate={activity.averageHeartRate}
            maxHeartRate={activity.maxHeartRate}
            calories={activity.calories}
          />

          {/* 1km Splits Table */}
          <ActivitySplitsTable splits={activity.splits || []} />

          {/* Matched Segments & Leaderboards */}
          <MatchedSegmentsSection />

          {/* Social Kudos & Comments */}
          <View className="bg-white mt-3 p-4 border-y border-gray-200">
            <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
              <TouchableOpacity
                onPress={() => toggleKudos(activity.id)}
                className="flex-row items-center">
                <Ionicons
                  name={activity.hasKudos ? 'thumbs-up' : 'thumbs-up-outline'}
                  size={20}
                  color={activity.hasKudos ? '#FC4C02' : '#4B5563'}
                />
                <Text className={`text-sm ml-1.5 ${activity.hasKudos ? 'text-[#FC4C02] font-black' : 'text-gray-700 font-bold'}`}>
                  {activity.kudosCount} Kudos
                </Text>
              </TouchableOpacity>
              <Text className="text-xs text-gray-400">{activity.commentsCount} Comments</Text>
            </View>

            {/* Comments Stream */}
            <View className="mt-3 space-y-3">
              {activity.comments && activity.comments.length > 0 ? (
                activity.comments.map((c: any) => (
                  <View key={c.id} className="flex-row space-x-2.5 mb-2">
                    <Image source={{ uri: c.athlete.avatarUrl }} className="w-8 h-8 rounded-full bg-gray-100 mr-2" />
                    <View className="flex-1 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                      <View className="flex-row justify-between items-center mb-0.5">
                        <Text className="text-xs font-black text-gray-900">{c.athlete.displayName}</Text>
                        <Text className="text-[10px] text-gray-400">{c.createdAt}</Text>
                      </View>
                      <Text className="text-xs text-gray-700 leading-4">{c.content}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text className="text-xs text-gray-400 italic text-center py-2">
                  No comments yet. Be the first to cheer!
                </Text>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Comment Posting Input Bar */}
        <View className="flex-row items-center bg-white px-4 py-2.5 border-t border-gray-200">
          <TextInput
            className="flex-1 h-10 bg-gray-100 rounded-full px-4 text-xs text-gray-900 mr-2"
            placeholder="Write a comment or cheer..."
            placeholderTextColor="#9CA3AF"
            value={commentInput}
            onChangeText={setCommentInput}
          />
          <TouchableOpacity
            onPress={handlePostComment}
            disabled={!commentInput.trim()}
            className={`w-9 h-9 rounded-full bg-[#FC4C02] items-center justify-center ${
              !commentInput.trim() ? 'opacity-40' : ''
            }`}>
            <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ShareModal
          visible={showShareModal}
          onClose={() => setShowShareModal(false)}
          activityTitle={activity.title}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivitySplitsTable } from '../../components/activity/ActivitySplitsTable';
import { HeartRateIntensityCard } from '../../components/activity/HeartRateIntensityCard';
import { MatchedSegmentsSection } from '../../components/activity/MatchedSegmentsSection';
import { ElevationChart } from '../../components/common/ElevationChart';
import { ShareModal } from '../../components/common/ShareModal';
import { StravaMapView } from '../../components/map/StravaMapView';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { activities, toggleKudos, addComment, currentUser } = useApp();
  const [commentInput, setCommentInput] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [serverActivity, setServerActivity] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);

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
              id: item.athlete?.id || item.athleteId || 'ath_athlete',
              displayName: item.athlete?.displayName || 'Athlete',
              username: item.athlete?.username || 'athlete',
              avatarUrl:
                item.athlete?.avatarUrl ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
              city: item.athlete?.city || 'Manhattan',
              country: item.athlete?.country || 'USA',
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
            elevationGainMeters: item.elevationGainMeters || 0,
            averageSpeedMps: item.averageSpeedMps || 3.0,
            maxSpeedMps: item.maxSpeedMps || 4.5,
            averageHeartRate: item.averageHeartRate || 0,
            maxHeartRate: 175,
            calories: item.calories || Math.round((Number(item.distanceMeters) / 1000) * 65),
            distanceFormatted: `${distKm} km`,
            movingTimeFormatted: timeFormatted,
            paceFormatted,
            elevationFormatted: `${item.elevationGainMeters || 0} m`,
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

  const routeCoords: [number, number][] = (activity.routePoints || []).map(
    (p: any) => (Array.isArray(p) ? p : [p.longitude, p.latitude]) as [number, number]
  );

  const formattedDate = new Date(activity.startTime || Date.now()).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Top Header Bar */}
      <View className="flex-row justify-between items-center bg-white px-4 py-3 border-b border-gray-100 z-30">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="chevron-back" size={28} color="#111827" />
        </TouchableOpacity>

        <Text className="text-base font-black text-gray-900" numberOfLines={1}>
          {activity.title}
        </Text>

        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => setShowShareModal(true)} className="p-1">
            <Ionicons name="bookmark-outline" size={22} color="#111827" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowShareModal(true)} className="p-1">
            <Ionicons name="ellipsis-horizontal" size={22} color="#111827" />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1 bg-gray-50"
          contentContainerStyle={{ paddingBottom: 110 }}>
          {/* Interactive Map View with Route */}
          <View className="h-72 w-full bg-gray-100 relative">
            <StravaMapView
              routeCoordinates={routeCoords}
              showControls={false}
              showUserLocation={false}
              mode="view-route"
              autoFitRoute={true}
              className="w-full h-full"
            />
            {/* Flyover Replay Button on bottom right of map (Screenshot 2) */}
            <TouchableOpacity
              onPress={() =>
                alert('3D Aerial Flyover: Replays your GPS effort with realistic elevation curves.')
              }
              className="absolute bottom-4 right-4 w-12 h-12 bg-white rounded-full items-center justify-center shadow-lg border border-gray-200 active:scale-95">
              <Ionicons name="play" size={22} color="#111827" style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          </View>

          {/* Activity Information Card (Matching Screenshot 2) */}
          <View className="bg-white px-5 pt-5 pb-6 border-b border-gray-100">
            {/* Athlete Profile Header */}
            <View className="flex-row items-center justify-between mb-4">
              <TouchableOpacity
                onPress={() => router.push(`/athlete/${activity.athlete.id}`)}
                className="flex-row items-center flex-1 mr-3">
                <Image
                  source={{ uri: activity.athlete.avatarUrl }}
                  className="w-12 h-12 rounded-full mr-3 bg-gray-100 border border-gray-200"
                />
                <View>
                  <Text className="text-base font-black text-gray-900">
                    {activity.athlete.displayName}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    {formattedDate} · {activity.athlete.city || 'Athletic Course'}
                  </Text>
                </View>
              </TouchableOpacity>

              {activity.athlete.id !== currentUser.id && (
                <TouchableOpacity
                  onPress={() => setIsFollowing(!isFollowing)}
                  className={`px-5 py-2 rounded-full ${
                    isFollowing ? 'bg-gray-100' : 'bg-[#FC4C02]'
                  }`}>
                  <Text
                    className={`text-xs font-black ${
                      isFollowing ? 'text-gray-700' : 'text-white'
                    }`}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Title & Description */}
            <Text className="text-2xl font-black text-gray-900 mb-1">{activity.title}</Text>
            {activity.description ? (
              <Text className="text-sm text-gray-600 mb-4 leading-relaxed">
                {activity.description}
              </Text>
            ) : null}

            {/* 6-Grid Performance Telemetry (Exact Screenshot 2 Match) */}
            <View className="border-t border-b border-gray-100 py-4 my-2">
              {/* Row 1 */}
              <View className="flex-row justify-between mb-4">
                <View className="w-[48%]">
                  <Text className="text-[11px] font-bold text-gray-400 uppercase">Distance</Text>
                  <Text className="text-2xl font-black text-gray-900 mt-0.5">
                    {activity.distanceFormatted}
                  </Text>
                </View>
                <View className="w-[48%]">
                  <Text className="text-[11px] font-bold text-gray-400 uppercase">Avg Pace</Text>
                  <Text className="text-2xl font-black text-gray-900 mt-0.5">
                    {activity.paceFormatted}
                  </Text>
                </View>
              </View>

              {/* Row 2 */}
              <View className="flex-row justify-between mb-4">
                <View className="w-[48%]">
                  <Text className="text-[11px] font-bold text-gray-400 uppercase">Moving Time</Text>
                  <Text className="text-2xl font-black text-gray-900 mt-0.5">
                    {activity.movingTimeFormatted}
                  </Text>
                </View>
                <View className="w-[48%]">
                  <Text className="text-[11px] font-bold text-gray-400 uppercase">
                    Elevation Gain
                  </Text>
                  <Text className="text-2xl font-black text-gray-900 mt-0.5">
                    {activity.elevationFormatted}
                  </Text>
                </View>
              </View>

              {/* Row 3 */}
              <View className="flex-row justify-between">
                <View className="w-[48%]">
                  <Text className="text-[11px] font-bold text-gray-400 uppercase">Calories</Text>
                  <Text className="text-2xl font-black text-gray-900 mt-0.5">
                    {activity.calories ? `${activity.calories.toLocaleString()} Cal` : '— —'}
                  </Text>
                </View>
                <View className="w-[48%]">
                  <Text className="text-[11px] font-bold text-gray-400 uppercase">
                    Avg Heart Rate
                  </Text>
                  <Text className="text-2xl font-black text-gray-900 mt-0.5">
                    {activity.averageHeartRate > 0 ? `${activity.averageHeartRate} bpm` : '— —'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Social Kudos & Comments Counter */}
            <View className="flex-row justify-between items-center pt-3 border-t border-gray-100 mt-2">
              <Text className="text-xs text-gray-500 font-medium">
                {activity.kudosCount > 0 ? `${activity.kudosCount} gave kudos` : 'No kudos yet'}
              </Text>
              <Text className="text-xs text-gray-500 font-medium">
                {activity.commentsCount > 0
                  ? `${activity.commentsCount} comments`
                  : '0 comments'}
              </Text>
            </View>

            {/* Action Bar (Thumbs up, Comment, Share) */}
            <View className="flex-row justify-around border-t border-gray-100 pt-3 mt-3">
              <TouchableOpacity
                onPress={() => toggleKudos(activity.id)}
                className="flex-row items-center px-4 py-1"
                activeOpacity={0.7}>
                <Ionicons
                  name={activity.hasKudos ? 'thumbs-up' : 'thumbs-up-outline'}
                  size={22}
                  color={activity.hasKudos ? '#FC4C02' : '#111827'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => null}
                className="flex-row items-center px-4 py-1"
                activeOpacity={0.7}>
                <Ionicons name="chatbubble-outline" size={21} color="#111827" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowShareModal(true)}
                className="flex-row items-center px-4 py-1"
                activeOpacity={0.7}>
                <Ionicons name="share-social-outline" size={22} color="#111827" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Elevation Profile Area Chart */}
          <View className="bg-white mt-3 p-5 border-y border-gray-100">
            <Text className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">
              Elevation Profile
            </Text>
            <ElevationChart elevations={activity.elevationProfile} height={120} />
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

          {/* Comments Stream */}
          <View className="bg-white mt-3 p-5 border-y border-gray-100">
            <Text className="text-sm font-black text-gray-900 mb-3">
              Comments ({activity.commentsCount || 0})
            </Text>

            <View className="space-y-3">
              {activity.comments && activity.comments.length > 0 ? (
                activity.comments.map((c: any) => (
                  <View key={c.id} className="flex-row space-x-2.5 mb-3">
                    <Image
                      source={{ uri: c.athlete.avatarUrl }}
                      className="w-8 h-8 rounded-full bg-gray-100 mr-2.5"
                    />
                    <View className="flex-1 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                      <View className="flex-row justify-between items-center mb-1">
                        <Text className="text-xs font-black text-gray-900">
                          {c.athlete.displayName}
                        </Text>
                        <Text className="text-[10px] text-gray-400">{c.createdAt}</Text>
                      </View>
                      <Text className="text-xs text-gray-700 leading-relaxed">{c.content}</Text>
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
        <View className="flex-row items-center bg-white px-4 py-3 border-t border-gray-200">
          <TextInput
            className="flex-1 h-11 bg-gray-100 rounded-full px-4 text-xs text-gray-900 mr-2.5"
            placeholder="Write a comment or cheer..."
            placeholderTextColor="#9CA3AF"
            value={commentInput}
            onChangeText={setCommentInput}
          />
          <TouchableOpacity
            onPress={handlePostComment}
            className="w-10 h-10 bg-[#FC4C02] rounded-full items-center justify-center active:bg-[#E03A00]">
            <Ionicons name="send" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <ShareModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        activityTitle={activity.title}
      />
    </SafeAreaView>
  );
}

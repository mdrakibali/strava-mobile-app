import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatBox } from '../../components/common/StatBox';
import { useApp } from '../../context/AppContext';
import { groupStore, useChallenge } from '../../lib/groupStore';
import { shareChallenge } from '../../lib/share';
import { api } from '../../services/api';

export default function ChallengeDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [serverChallenge, setServerChallenge] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const liveChallenge = useChallenge(id ?? '', serverChallenge);
  const challenge = liveChallenge && serverChallenge ? { ...serverChallenge, ...liveChallenge } : (liveChallenge ?? serverChallenge);

  useFocusEffect(
    useCallback(() => {
    let isMounted = true;
    if (!id) return;

    const fetchChallenge = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const res = await api.challenges.get(id);
        if (isMounted && res) {
          if (res.challenge) {
            const challengeData = {
              id: res.challenge.id,
              title: res.challenge.title,
              description: res.challenge.description || '',
              sportType: res.challenge.sportType,
              targetMeters: res.challenge.targetMeters,
              badgeUrl: res.challenge.badgeUrl,
              participantsCount: res.challenge.participantsCount || 0,
              isJoined: Boolean(res.challenge.isJoined),
              currentMeters: res.challenge.userProgress ? res.challenge.userProgress.currentMeters : 0,
              isCompleted: res.challenge.userProgress ? res.challenge.userProgress.isCompleted : false,
              daysRemaining: Number(res.challenge.daysRemaining) || 0,
              creatorId: res.challenge.creatorId ?? null,
            };
            setServerChallenge(challengeData);
            groupStore.seedChallenges([challengeData]);
          }
          if (res.leaderboard) {
            setLeaderboard(res.leaderboard);
          }
        }
      } catch (err: any) {
        console.warn('Failed to load challenge detail from API:', err);
        if (isMounted) setLoadError(err?.message ?? 'Could not load this challenge.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchChallenge();
    return () => {
      isMounted = false;
    };
    // reloadNonce only re-triggers the fetch (Retry button)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, reloadNonce])
  );

  if (!challenge) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
        {loadError ? (
          <>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>Couldn’t load this challenge</Text>
            <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>{loadError}</Text>
            <TouchableOpacity onPress={() => setReloadNonce((n) => n + 1)} className="mt-3 px-5 py-2.5">
              <Text style={{ color: '#FC4C02', fontWeight: '700' }}>Retry</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color="#FC4C02" />
            <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>Loading challenge...</Text>
          </>
        )}
      </SafeAreaView>
    );
  }

  const targetKm = (Number(challenge.targetMeters) || 0) / 1000;
  const currentKm = (Number(challenge.currentMeters) || 0) / 1000;
  const progressPercent = targetKm > 0 ? Math.min(100, Math.round((currentKm / targetKm) * 100)) : 0;

  const handleToggleJoin = async () => {
    if (joining || !challenge) return;
    const want = !challenge.isJoined;
    setJoining(true);
    try {
      await groupStore.joinChallenge(challenge.id, want, challenge);
    } catch (e: any) {
      Alert.alert('Couldn’t update challenge', e?.message ?? 'Please try again.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }} className="flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900 flex-1 text-center mx-2" numberOfLines={1}>
          {challenge.title}
        </Text>
        <View className="flex-row items-center">
          {challenge.creatorId && challenge.creatorId === currentUser?.id ? (
            <TouchableOpacity
              onPress={() =>
                Alert.alert('Delete this challenge?', 'Participants will lose access. This cannot be undone.', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await api.challenges.remove(challenge.id);
                        groupStore.remove(challenge.id);
                        router.replace('/(tabs)/groups');
                      } catch (e: any) {
                        Alert.alert('Couldn’t delete the challenge', e?.message ?? 'Please try again.');
                      }
                    },
                  },
                ])
              }
              className="p-1 mr-2">
              <Ionicons name="trash-outline" size={20} color="#DC2626" />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={() => shareChallenge(challenge.id, challenge.title).catch(() => {})} className="p-1">
            <Ionicons name="share-social-outline" size={22} color="#111827" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}>
          {/* Badge & Title */}
          <View className="bg-white p-6 items-center border-b border-gray-200">
            <Image
              source={{ uri: challenge.badgeUrl || undefined }}
              className="w-28 h-28 rounded-full border-4 border-orange-100 bg-orange-50 mb-3"
            />
            <Text className="text-xl font-black text-gray-900 text-center mb-1">{challenge.title}</Text>
            <View className="flex-row items-center mb-3">
              <Ionicons name="time-outline" size={13} color="#EA580C" />
              <Text className="text-xs font-semibold text-orange-600 ml-1">
                {challenge.daysRemaining} days remaining
              </Text>
            </View>
            <Text className="text-xs text-gray-600 text-center max-w-sm leading-5">
              {challenge.description}
            </Text>
          </View>

          {/* Challenge Progress */}
          <View className="bg-white p-4 border-b border-gray-200 mt-3">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-sm font-black text-gray-900">Your Progress</Text>
              <Text className="text-xs font-black text-[#FC4C02]">{progressPercent}%</Text>
            </View>
            <View className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
              <View className="h-full bg-[#FC4C02] rounded-full" style={{ width: `${progressPercent}%` }} />
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs font-bold text-gray-700">{currentKm.toFixed(1)} km completed</Text>
              <Text className="text-xs font-semibold text-gray-400">Target: {targetKm.toFixed(0)} km</Text>
            </View>
          </View>

          {/* Challenge Stats */}
          <View className="flex-row justify-between bg-white px-4 py-3 border-b border-gray-200 mt-3">
            <StatBox label="Sport" value={challenge.sportType} />
            <StatBox label="Participants" value={`${challenge.participantsCount || 0}`} />
            <StatBox label="Reward" value="Digital Trophy" />
          </View>

          {/* Rules & Eligibility */}
          <View className="bg-white p-4 border-b border-gray-200 mt-3 space-y-2">
            <Text className="text-sm font-black text-gray-900 mb-2">Official Challenge Rules</Text>
            <View className="flex-row items-center mb-1">
              <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
              <Text className="text-xs text-gray-700 ml-2">Qualifying activities: GPS-verified {challenge.sportType}.</Text>
            </View>
            <View className="flex-row items-center mb-1">
              <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
              <Text className="text-xs text-gray-700 ml-2">Virtual and manual entries do not count toward milestone progress.</Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
              <Text className="text-xs text-gray-700 ml-2">Digital achievement trophy automatically unlocks upon completion.</Text>
            </View>
          </View>

          {/* Participant Leaderboard */}
          <View className="bg-white p-4 border-b border-gray-200 mt-3">
            <Text className="text-sm font-black text-gray-900 mb-3">Participant Leaderboard</Text>

            {isLoading ? (
              <View className="py-6 items-center">
                <ActivityIndicator size="small" color="#FC4C02" />
                <Text className="text-xs text-gray-400 mt-2">Loading leaderboard...</Text>
              </View>
            ) : leaderboard.length === 0 ? (
              <View className="py-6 items-center">
                <Text className="text-xs text-gray-400 italic">No participants yet. Join and be #1!</Text>
              </View>
            ) : (
              leaderboard.map((item, index) => {
                const dist = (Number(item.currentMeters || 0) / 1000).toFixed(1);
                const isYou = item.athleteId === currentUser?.id;

                return (
                  <View
                    key={item.athleteId || index}
                    className={`flex-row items-center justify-between py-2.5 border-b border-gray-100 ${
                      isYou ? 'bg-orange-50/50 px-2 rounded-xl' : ''
                    }`}>
                    <View className="flex-row items-center flex-1 mr-3">
                      <Text className="text-xs font-black text-gray-400 w-6">#{index + 1}</Text>
                      <Image
                        source={{ uri: item.avatarUrl || undefined }}
                        className="w-9 h-9 rounded-full mr-2.5 bg-gray-100"
                      />
                      <View className="flex-1">
                        <Text className={`text-xs font-bold ${isYou ? 'text-[#FC4C02]' : 'text-gray-900'}`}>
                          {item.displayName} {isYou ? '(You)' : ''}
                        </Text>
                        <Text className="text-[10px] text-gray-400">@{item.username || 'athlete'}</Text>
                      </View>
                    </View>
                    <Text className="text-xs font-black text-[#FC4C02] font-mono">
                      {dist} km
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </View>

      {/* Action Footer */}
      <View style={{ backgroundColor: '#FFFFFF', padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
        <TouchableOpacity
          onPress={handleToggleJoin}
          disabled={joining}
          activeOpacity={0.85}
          style={{
            width: '100%',
            paddingVertical: 14,
            borderRadius: 16,
            alignItems: 'center',
            backgroundColor: challenge.isJoined ? '#FFFFFF' : '#FC4C02',
            borderWidth: challenge.isJoined ? 1 : 0,
            borderColor: '#D1D5DB',
          }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: challenge.isJoined ? '#111827' : '#FFFFFF' }}>
            {challenge.isJoined ? 'Leave Challenge' : 'Join Challenge Now'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
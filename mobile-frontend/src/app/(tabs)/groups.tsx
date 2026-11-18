import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  FlatList,
  Image,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { Challenge, Club, GroupEvent } from '../../types';

export default function GroupsScreen() {
  const {
    clubs,
    challenges,
    events,
    toggleJoinClub,
    toggleJoinChallenge,
    toggleRsvp,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'CLUBS' | 'CHALLENGES' | 'EVENTS'>('CLUBS');

  // Render Club Item
  const renderClubItem = ({ item }: { item: Club }) => (
    <View className="bg-white rounded-xl mb-3 border border-gray-200 overflow-hidden">
      <Image source={{ uri: item.bannerUrl }} className="w-full h-28 bg-gray-100" />
      <View className="p-4">
        <View className="flex-row items-center -mt-8 mb-2">
          <Image
            source={{ uri: item.avatarUrl }}
            className="w-14 h-14 rounded-full border-2 border-white bg-gray-100 mr-3"
          />
          <View className="flex-1 pt-4">
            <Text className="text-base font-bold text-gray-900">{item.name}</Text>
            <Text className="text-xs text-gray-500 mt-0.5">
              {item.sportType} · {item.city} · {item.memberCount} Athletes
            </Text>
          </View>
        </View>

        <Text className="text-xs text-gray-600 leading-5 mb-3">{item.description}</Text>

        <View className="flex-row justify-between items-center border-t border-gray-100 pt-2.5">
          <View>
            <Text className="text-[10px] text-gray-400 uppercase">Weekly Volume</Text>
            <Text className="text-xs font-bold text-gray-900 mt-0.5">
              {(item.weeklyDistanceMeters / 1000).toLocaleString()} km
            </Text>
          </View>
          <View>
            <Text className="text-[10px] text-gray-400 uppercase">Activities</Text>
            <Text className="text-xs font-bold text-gray-900 mt-0.5">
              {item.weeklyActivitiesCount} logged
            </Text>
          </View>
          <TouchableOpacity
            className={`px-3.5 py-1.5 rounded-lg border ${
              item.isMember
                ? 'bg-gray-100 border-gray-200'
                : 'bg-[#FC4C02] border-[#FC4C02]'
            }`}
            onPress={() => toggleJoinClub(item.id)}>
            <Text
              className={`text-xs font-bold ${
                item.isMember ? 'text-gray-600' : 'text-white'
              }`}>
              {item.isMember ? 'Joined ✓' : 'Join Club'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Render Challenge Item
  const renderChallengeItem = ({ item }: { item: Challenge }) => {
    const progressPercent = Math.min(100, Math.round((item.currentMeters / item.targetMeters) * 100));

    return (
      <View className="bg-white rounded-xl mb-3 border border-gray-200 overflow-hidden">
        <View className="flex-row items-center p-4 pb-1">
          <Image source={{ uri: item.badgeUrl }} className="w-12 h-12 rounded-full mr-3 bg-gray-100" />
          <View className="flex-1">
            <Text className="text-base font-bold text-gray-900">{item.title}</Text>
            <Text className="text-xs text-gray-500 mt-0.5">
              {item.sportType} · {item.daysRemaining} days remaining
            </Text>
          </View>
        </View>

        <Text className="text-xs text-gray-600 px-4 leading-5 mb-3">{item.description}</Text>

        {/* Progress Bar */}
        <View className="px-4 mb-3">
          <View className="flex-row justify-between mb-1">
            <Text className="text-xs font-semibold text-gray-600">
              {(item.currentMeters / 1000).toFixed(1)} / {(item.targetMeters / 1000).toFixed(0)} km
            </Text>
            <Text className="text-xs font-black text-[#FC4C02]">{progressPercent}%</Text>
          </View>
          <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <View
              className={`h-full rounded-full ${item.isCompleted ? 'bg-emerald-500' : 'bg-[#FC4C02]'}`}
              style={{ width: `${progressPercent}%` }}
            />
          </View>
        </View>

        <View className="px-4 pb-4 items-end">
          {item.isCompleted ? (
            <View className="flex-row items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-full">
              <Ionicons name="trophy" size={16} color="#059669" />
              <Text className="text-xs font-bold text-emerald-700">Trophy Awarded!</Text>
            </View>
          ) : (
            <TouchableOpacity
              className={`px-3.5 py-1.5 rounded-lg border ${
                item.isJoined
                  ? 'bg-gray-100 border-gray-200'
                  : 'bg-[#FC4C02] border-[#FC4C02]'
              }`}
              onPress={() => toggleJoinChallenge(item.id)}>
              <Text
                className={`text-xs font-bold ${
                  item.isJoined ? 'text-gray-600' : 'text-white'
                }`}>
                {item.isJoined ? 'Participating' : 'Join Challenge'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Render Group Event Item
  const renderEventItem = ({ item }: { item: GroupEvent }) => (
    <View className="bg-white rounded-xl mb-3 border border-gray-200 overflow-hidden">
      <View className="flex-row p-4 pb-2">
        <View className="bg-[#FFF2EB] p-2 rounded-lg items-center justify-center min-w-[64px] mr-3">
          <Text className="text-xs font-black text-[#FC4C02]">{item.dateFormatted.split(',')[0]}</Text>
          <Text className="text-[10px] text-[#E34402] mt-0.5">{item.timeFormatted}</Text>
        </View>
        <View className="flex-1 justify-center">
          <Text className="text-base font-bold text-gray-900">{item.title}</Text>
          <Text className="text-xs text-gray-500 mt-0.5">{item.clubName}</Text>
        </View>
      </View>

      <View className="px-4 pb-3 gap-1.5">
        <View className="flex-row items-center gap-2">
          <Ionicons name="location-outline" size={15} color="#4B5563" />
          <Text className="text-xs text-gray-600">{item.meetingPoint}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Ionicons name="speedometer-outline" size={15} color="#4B5563" />
          <Text className="text-xs text-gray-600">
            {(item.distanceMeters / 1000).toFixed(0)} km · {item.paceDescription}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Ionicons name="people-outline" size={15} color="#4B5563" />
          <Text className="text-xs text-gray-600">{item.attendeesCount} athletes attending</Text>
        </View>
      </View>

      {/* RSVP Action Buttons */}
      <View className="flex-row gap-2 px-4 pb-4">
        <TouchableOpacity
          className={`flex-1 py-2 items-center rounded-lg border ${
            item.rsvpStatus === 'GOING'
              ? 'bg-[#FC4C02] border-[#FC4C02]'
              : 'bg-gray-50 border-gray-200'
          }`}
          onPress={() => toggleRsvp(item.id, 'GOING')}>
          <Text
            className={`text-xs font-bold ${
              item.rsvpStatus === 'GOING' ? 'text-white' : 'text-gray-600'
            }`}>
            {item.rsvpStatus === 'GOING' ? 'Going ✓' : 'I\'m Going'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-1 py-2 items-center rounded-lg border ${
            item.rsvpStatus === 'MAYBE'
              ? 'bg-[#FC4C02] border-[#FC4C02]'
              : 'bg-gray-50 border-gray-200'
          }`}
          onPress={() => toggleRsvp(item.id, 'MAYBE')}>
          <Text
            className={`text-xs font-bold ${
              item.rsvpStatus === 'MAYBE' ? 'text-white' : 'text-gray-600'
            }`}>
            Maybe
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="bg-white px-4 pt-3 pb-2 border-b border-gray-200">
        <Text className="text-xl font-black text-gray-900 mb-3">Clubs & Community</Text>

        {/* Tab Switcher */}
        <View className="flex-row bg-gray-100 rounded-lg p-1">
          <TouchableOpacity
            className={`flex-1 py-1.5 items-center rounded-md ${
              activeTab === 'CLUBS' ? 'bg-white shadow-sm' : ''
            }`}
            onPress={() => setActiveTab('CLUBS')}>
            <Text
              className={`text-xs font-semibold ${
                activeTab === 'CLUBS' ? 'text-[#FC4C02]' : 'text-gray-600'
              }`}>
              Clubs ({clubs.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 py-1.5 items-center rounded-md ${
              activeTab === 'CHALLENGES' ? 'bg-white shadow-sm' : ''
            }`}
            onPress={() => setActiveTab('CHALLENGES')}>
            <Text
              className={`text-xs font-semibold ${
                activeTab === 'CHALLENGES' ? 'text-[#FC4C02]' : 'text-gray-600'
              }`}>
              Challenges ({challenges.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 py-1.5 items-center rounded-md ${
              activeTab === 'EVENTS' ? 'bg-white shadow-sm' : ''
            }`}
            onPress={() => setActiveTab('EVENTS')}>
            <Text
              className={`text-xs font-semibold ${
                activeTab === 'EVENTS' ? 'text-[#FC4C02]' : 'text-gray-600'
              }`}>
              Events ({events.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'CLUBS' && (
        <FlatList
          data={clubs}
          keyExtractor={(item) => item.id}
          renderItem={renderClubItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
        />
      )}

      {activeTab === 'CHALLENGES' && (
        <FlatList
          data={challenges}
          keyExtractor={(item) => item.id}
          renderItem={renderChallengeItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
        />
      )}

      {activeTab === 'EVENTS' && (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderEventItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
        />
      )}
    </SafeAreaView>
  );
}

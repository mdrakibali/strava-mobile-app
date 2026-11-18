import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components/common/Header';
import { ChallengesList } from '../../components/groups/ChallengesList';
import { ClubsList } from '../../components/groups/ClubsList';
import { EventsList } from '../../components/groups/EventsList';
import { useApp } from '../../context/AppContext';

export default function GroupsScreen() {
  const { clubs, challenges, events, toggleJoinClub, toggleJoinChallenge, toggleRsvp } = useApp();
  const [activeTab, setActiveTab] = useState<'clubs' | 'challenges' | 'events'>('clubs');

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Header title="Community & Clubs" />

      {/* 3 Tab Navigation Pills */}
      <View className="flex-row bg-white px-4 py-2.5 border-b border-gray-200">
        <TouchableOpacity
          onPress={() => setActiveTab('clubs')}
          className={`flex-1 py-2 items-center rounded-xl mx-1 ${
            activeTab === 'clubs' ? 'bg-[#FC4C02]' : 'bg-gray-100'
          }`}>
          <Text
            className={`text-xs font-black ${
              activeTab === 'clubs' ? 'text-white' : 'text-gray-700'
            }`}>
            Clubs ({clubs.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('challenges')}
          className={`flex-1 py-2 items-center rounded-xl mx-1 ${
            activeTab === 'challenges' ? 'bg-[#FC4C02]' : 'bg-gray-100'
          }`}>
          <Text
            className={`text-xs font-black ${
              activeTab === 'challenges' ? 'text-white' : 'text-gray-700'
            }`}>
            Challenges ({challenges.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('events')}
          className={`flex-1 py-2 items-center rounded-xl mx-1 ${
            activeTab === 'events' ? 'bg-[#FC4C02]' : 'bg-gray-100'
          }`}>
          <Text
            className={`text-xs font-black ${
              activeTab === 'events' ? 'text-white' : 'text-gray-700'
            }`}>
            Group Events ({events.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 px-4 pt-4"
        contentContainerClassName="pb-24">
        {activeTab === 'clubs' && (
          <ClubsList clubs={clubs} onToggleJoin={toggleJoinClub} />
        )}

        {activeTab === 'challenges' && (
          <ChallengesList challenges={challenges} onToggleJoin={toggleJoinChallenge} />
        )}

        {activeTab === 'events' && (
          <EventsList events={events} onToggleRsvp={toggleRsvp} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

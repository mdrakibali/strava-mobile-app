import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SportPickerModal } from '../components/record/SportPickerModal';
import { useApp } from '../context/AppContext';
import { SportType } from '../types';

export default function SaveActivityScreen() {
  const router = useRouter();
  const { activeRecording, saveNewActivity } = useApp();

  const [title, setTitle] = useState(`${activeRecording.sportType || 'Workout'}`);
  const [description, setDescription] = useState('');
  const [sport, setSport] = useState<SportType>(activeRecording.sportType || 'Workout');
  const [showSportPicker, setShowSportPicker] = useState(false);
  const [activityTag, setActivityTag] = useState<string>('Normal');
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [perceivedExertion, setPerceivedExertion] = useState<string>('Moderate');
  const [showExertionPicker, setShowExertionPicker] = useState(false);
  const [privateNotes, setPrivateNotes] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'FOLLOWERS_ONLY' | 'ONLY_ME'>('PUBLIC');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveNewActivity(title, description, visibility);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Could not save workout to database');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-1 mr-3">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-xl font-black text-gray-900">Save Activity</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        className="px-4"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 110 }}>
        {/* Title Input */}
        <View className="bg-white border border-gray-200 rounded-2xl px-4 py-3.5 mb-3 shadow-xs">
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Title your activity"
            placeholderTextColor="#9CA3AF"
            className="text-base font-semibold text-gray-900"
          />
        </View>

        {/* Description Input */}
        <View className="bg-white border border-gray-200 rounded-2xl px-4 py-3.5 mb-3 h-28 shadow-xs">
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="How'd it go? Share more about your activity and use @ to tag someone."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            className="text-sm text-gray-900 h-full"
            textAlignVertical="top"
          />
        </View>

        {/* Sport Picker Dropdown */}
        <TouchableOpacity
          onPress={() => setShowSportPicker(true)}
          className="flex-row items-center justify-between bg-white border border-gray-200 rounded-2xl px-4 py-4 mb-4 shadow-xs">
          <View className="flex-row items-center">
            <Ionicons name="fitness-outline" size={20} color="#111827" />
            <Text className="text-base font-bold text-gray-900 ml-3">{sport}</Text>
          </View>
          <Ionicons name="chevron-down" size={18} color="#6B7280" />
        </TouchableOpacity>

        {/* Add Photos/Videos Dashed Box */}
        <TouchableOpacity
          onPress={() => Alert.alert('Photos & Media', 'Photos are synced directly to your cloud workout gallery.')}
          className="w-full py-8 border-2 border-dashed border-[#FC4C02]/60 rounded-3xl items-center justify-center mb-6 bg-orange-50/20">
          <Ionicons name="image-outline" size={32} color="#FC4C02" />
          <Text className="text-sm font-black text-[#FC4C02] mt-2 tracking-wide">
            Add Photos/Videos
          </Text>
        </TouchableOpacity>

        {/* Section: Details */}
        <Text className="text-xl font-black text-gray-900 mb-3">Details</Text>

        {/* Activity Tag */}
        <TouchableOpacity
          onPress={() => setShowTagPicker(!showTagPicker)}
          className="flex-row items-center justify-between bg-white border border-gray-200 rounded-2xl px-4 py-4 mb-3 shadow-xs">
          <View className="flex-row items-center">
            <Ionicons name="pricetag-outline" size={18} color="#6B7280" />
            <Text className="text-sm font-bold text-gray-800 ml-3">
              Activity Tag: <Text className="font-semibold text-gray-500">{activityTag}</Text>
            </Text>
          </View>
          <Ionicons name="chevron-down" size={18} color="#6B7280" />
        </TouchableOpacity>

        {showTagPicker && (
          <View className="flex-row flex-wrap mb-3 pl-2">
            {['Normal', 'Race', 'Long Run', 'Workout', 'Commute'].map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => {
                  setActivityTag(t);
                  setShowTagPicker(false);
                }}
                className={`px-3 py-1.5 rounded-full mr-2 mb-2 border ${
                  activityTag === t
                    ? 'bg-[#FC4C02] border-[#FC4C02]'
                    : 'bg-gray-100 border-gray-200'
                }`}>
                <Text
                  className={`text-xs font-bold ${
                    activityTag === t ? 'text-white' : 'text-gray-700'
                  }`}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* How did that activity feel? */}
        <TouchableOpacity
          onPress={() => setShowExertionPicker(!showExertionPicker)}
          className="flex-row items-center justify-between bg-white border border-gray-200 rounded-2xl px-4 py-4 mb-3 shadow-xs">
          <View className="flex-row items-center">
            <Ionicons name="speedometer-outline" size={18} color="#6B7280" />
            <Text className="text-sm font-bold text-gray-800 ml-3">
              How did that activity feel?{' '}
              <Text className="font-semibold text-gray-500">{perceivedExertion}</Text>
            </Text>
          </View>
          <Ionicons name="chevron-down" size={18} color="#6B7280" />
        </TouchableOpacity>

        {showExertionPicker && (
          <View className="flex-row flex-wrap mb-3 pl-2">
            {[
              { label: 'Easy (1-3)', val: 'Easy' },
              { label: 'Moderate (4-6)', val: 'Moderate' },
              { label: 'Hard (7-8)', val: 'Hard' },
              { label: 'Max Effort (9-10)', val: 'Max Effort' },
            ].map((e) => (
              <TouchableOpacity
                key={e.val}
                onPress={() => {
                  setPerceivedExertion(e.val);
                  setShowExertionPicker(false);
                }}
                className={`px-3 py-1.5 rounded-full mr-2 mb-2 border ${
                  perceivedExertion === e.val
                    ? 'bg-[#FC4C02] border-[#FC4C02]'
                    : 'bg-gray-100 border-gray-200'
                }`}>
                <Text
                  className={`text-xs font-bold ${
                    perceivedExertion === e.val ? 'text-white' : 'text-gray-700'
                  }`}>
                  {e.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Private Notes Input */}
        <View className="flex-row items-start bg-white border border-gray-200 rounded-2xl px-4 py-3.5 mb-6 shadow-xs">
          <Ionicons name="lock-closed-outline" size={18} color="#6B7280" className="mt-1 mr-2" />
          <TextInput
            value={privateNotes}
            onChangeText={setPrivateNotes}
            placeholder="Jot down private notes here. Only you can see these."
            placeholderTextColor="#9CA3AF"
            multiline
            className="flex-1 text-sm text-gray-900 h-16 ml-1"
            textAlignVertical="top"
          />
        </View>

        {/* Section: Visibility */}
        <Text className="text-xl font-black text-gray-900 mb-3">Visibility</Text>
        <View className="bg-gray-50 border border-gray-200 rounded-2xl p-2 mb-8">
          {(
            [
              { id: 'PUBLIC', label: 'Everyone', desc: 'Visible to all athletes and leaderboards' },
              { id: 'FOLLOWERS_ONLY', label: 'Followers Only', desc: 'Only approved followers' },
              { id: 'ONLY_ME', label: 'Only You', desc: 'Hidden private log entry' },
            ] as const
          ).map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => setVisibility(item.id)}
              className={`p-3 rounded-xl flex-row items-center justify-between ${
                visibility === item.id ? 'bg-white shadow-xs' : ''
              }`}>
              <View>
                <Text className="text-sm font-bold text-gray-900">{item.label}</Text>
                <Text className="text-xs text-gray-400">{item.desc}</Text>
              </View>
              {visibility === item.id && (
                <Ionicons name="checkmark-circle" size={20} color="#FC4C02" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Full-Width Black Save Activity Button */}
        <TouchableOpacity
          disabled={isSaving}
          onPress={handleSave}
          className="w-full py-4 bg-black rounded-full items-center justify-center shadow-lg active:opacity-80">
          <Text className="text-base font-black text-white">Save Activity</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Sport Picker Modal */}
      <SportPickerModal
        visible={showSportPicker}
        selectedSport={sport}
        onSelectSport={(s: SportType) => {
          setSport(s);
          setShowSportPicker(false);
        }}
        onClose={() => setShowSportPicker(false)}
      />
    </SafeAreaView>
  );
}

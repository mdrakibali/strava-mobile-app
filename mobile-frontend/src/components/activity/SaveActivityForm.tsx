import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { RoutePreview } from '../map/RoutePreview';
import {
  MetricRow,
  MetricTile,
  SectionTitle,
  SelectField,
  TextField,
} from '../../design';
import { VISIBILITY_LABEL } from './FeedCard';
import { formatDuration, formatElevation, kmValue } from '../../lib/format';
import { SportConfig } from '../../lib/sports';
import { ActivityVisibility } from '../../types';

interface SaveActivityFormProps {
  distanceM: number;
  movingS: number;
  elevGainM: number | null;
  second: { label: string; value: string; unit?: string };
  route: [number, number][];
  title: string;
  onTitleChange: (text: string) => void;
  description: string;
  onDescriptionChange: (text: string) => void;
  sportConfig: SportConfig;
  onOpenSportSheet: () => void;
  visibility: ActivityVisibility;
  onOpenVisibilitySheet: () => void;
  saving: boolean;
  onDiscard: () => void;
}

export function SaveActivityForm({
  distanceM,
  movingS,
  elevGainM,
  second,
  route,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  sportConfig: cfg,
  onOpenSportSheet,
  visibility,
  onOpenVisibilitySheet,
  saving,
  onDiscard,
}: SaveActivityFormProps) {
  return (
    <>
      {/* Top Metric Row */}
      <View className="p-4 bg-gray-50 rounded-2xl mb-4 border border-gray-100">
        <MetricRow>
          <MetricTile label="Distance" value={kmValue(distanceM)} unit="km" />
          <MetricTile label="Moving time" value={formatDuration(movingS)} />
          <MetricTile
            label={second.label}
            value={second.value}
            unit={second.value === '–' ? undefined : second.unit}
          />
          <MetricTile label="Elev gain" value={formatElevation(elevGainM)} />
        </MetricRow>
      </View>

      {/* Route Map Preview */}
      {route.length > 0 ? (
        <View className="mb-4">
          <RoutePreview route={route} height={160} rounded />
        </View>
      ) : null}

      {/* Title Input */}
      <TextField
        value={title}
        onChangeText={onTitleChange}
        placeholder="Title your activity"
        accessibilityLabel="Activity title"
        maxLength={100}
        returnKeyType="next"
      />
      <View className="h-4" />

      {/* Description Input */}
      <TextField
        value={description}
        onChangeText={onDescriptionChange}
        placeholder="How did it go? Share more about your activity."
        accessibilityLabel="Description"
        multiline
        maxLength={2000}
      />
      <View className="h-4" />

      {/* Sport Selector */}
      <SelectField
        value={cfg.label}
        icon={cfg.icon}
        onPress={onOpenSportSheet}
        accessibilityLabel="Sport"
      />

      {/* Photos Dashed Box */}
      <Pressable
        onPress={() =>
          Alert.alert(
            'Photos & Videos',
            'Photo and video upload will be enabled in the upcoming cloud storage release.'
          )
        }
        className="mt-4 border-2 border-dashed border-[#FC4C02] rounded-2xl py-5 items-center justify-center bg-orange-50/50 active:bg-orange-100/50">
        <Ionicons name="image-outline" size={28} color="#FC4C02" />
        <Text className="text-sm font-bold text-[#FC4C02] mt-1">Add Photos/Videos</Text>
      </Pressable>

      {/* Visibility Section */}
      <SectionTitle title="Visibility" className="mt-6" />
      <Text className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
        Who can view
      </Text>
      <SelectField
        value={VISIBILITY_LABEL[visibility].label}
        icon={VISIBILITY_LABEL[visibility].icon}
        onPress={onOpenVisibilitySheet}
        accessibilityLabel="Who can view"
      />

      {/* Discard Activity Button */}
      <Pressable
        onPress={onDiscard}
        disabled={saving}
        className="self-center mt-7 py-3 px-6 rounded-full bg-red-50 border border-red-200 active:bg-red-100">
        <Text className="text-red-600 font-bold text-sm">Discard Activity</Text>
      </Pressable>
    </>
  );
}


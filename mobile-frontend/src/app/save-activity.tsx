import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../constants/theme';
import { useApp } from '../context/AppContext';

export default function SaveActivityScreen() {
  const router = useRouter();
  const { activeRecording, saveNewActivity } = useApp();

  const defaultTitle = `${activeRecording.sportType} Workout`;
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'FOLLOWERS_ONLY' | 'ONLY_ME'>('PUBLIC');
  const [applyPrivacyZone, setApplyPrivacyZone] = useState(true);

  const handleSave = () => {
    saveNewActivity(title, description, visibility);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Save Activity</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveHeaderBtn}>
          <Text style={styles.saveHeaderText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Workout Quick Summary */}
        <View style={styles.summaryBanner}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>DISTANCE</Text>
            <Text style={styles.summaryValue}>
              {(activeRecording.distanceMeters / 1000).toFixed(2)} km
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>TIME</Text>
            <Text style={styles.summaryValue}>
              {Math.floor(activeRecording.movingSeconds / 60)}m {activeRecording.movingSeconds % 60}s
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>ELEVATION</Text>
            <Text style={styles.summaryValue}>+{activeRecording.elevationGainMeters} m</Text>
          </View>
        </View>

        {/* Title & Description Fields */}
        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>ACTIVITY TITLE</Text>
          <TextInput
            style={styles.textInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Give your activity a title..."
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>DESCRIPTION</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="How did it feel? What was the weather like? (optional)"
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Visibility Selector */}
        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>WHO CAN SEE THIS?</Text>
          <View style={styles.visibilityOptions}>
            {(
              [
                { id: 'PUBLIC', label: 'Everyone', desc: 'Visible on feeds & leaderboards' },
                { id: 'FOLLOWERS_ONLY', label: 'Followers Only', desc: 'Hidden from public leaderboards' },
                { id: 'ONLY_ME', label: 'Only You', desc: 'Private personal training log' },
              ] as const
            ).map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.visOption, visibility === opt.id && styles.visOptionActive]}
                onPress={() => setVisibility(opt.id)}>
                <View style={styles.visTextRow}>
                  <Text style={[styles.visTitle, visibility === opt.id && styles.visTitleActive]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.visDesc}>{opt.desc}</Text>
                </View>
                {visibility === opt.id && (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Privacy Zone Masking Toggle */}
        <View style={styles.switchRow}>
          <View style={styles.switchMeta}>
            <Text style={styles.switchTitle}>Apply Privacy Zone Masking</Text>
            <Text style={styles.switchSub}>
              Clips the first and last 500m of the GPS track around your home/office.
            </Text>
          </View>
          <Switch
            value={applyPrivacyZone}
            onValueChange={setApplyPrivacyZone}
            trackColor={{ false: Colors.border, true: Colors.primary }}
          />
        </View>

        {/* Big Save Button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
          <Text style={styles.saveBtnText}>SAVE & POST TO FEED</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  saveHeaderBtn: {
    padding: Spacing.xs,
  },
  saveHeaderText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
  },
  summaryBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: Typography.fontWeight.bold,
  },
  summaryValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.heavy,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  fieldLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  visibilityOptions: {
    gap: Spacing.sm,
  },
  visOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
  },
  visOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  visTextRow: {
    flex: 1,
  },
  visTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  visTitleActive: {
    color: Colors.primaryDark,
  },
  visDesc: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  switchMeta: {
    flex: 1,
    marginRight: Spacing.md,
  },
  switchTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  switchSub: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    height: 54,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    marginTop: Spacing.md,
  },
  saveBtnText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.heavy,
    color: Colors.textInverse,
    letterSpacing: 0.8,
  },
});


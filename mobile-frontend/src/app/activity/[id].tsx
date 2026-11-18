import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ElevationChart } from '../../components/common/ElevationChart';
import { RouteMapPreview } from '../../components/common/RouteMapPreview';
import { StatBox } from '../../components/common/StatBox';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/theme';
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
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerAthlete}>{activity.athlete.displayName}</Text>
          <Text style={styles.headerSport}>
            {activity.sportType} · {activity.distanceFormatted}
          </Text>
        </View>

        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="share-social-outline" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {/* Title & Description */}
          <View style={styles.titleSection}>
            <Text style={styles.activityTitle}>{activity.title}</Text>
            {activity.description && (
              <Text style={styles.activityDesc}>{activity.description}</Text>
            )}
          </View>

          {/* Map Preview */}
          <View style={styles.mapBox}>
            <RouteMapPreview points={activity.routePoints} height={210} />
          </View>

          {/* Primary Stats Grid */}
          <View style={styles.statsCard}>
            <View style={styles.statsRow}>
              <StatBox label="Distance" value={activity.distanceFormatted} />
              <StatBox label="Avg Pace" value={activity.paceFormatted} />
              <StatBox label="Moving Time" value={activity.movingTimeFormatted} />
            </View>

            <View style={[styles.statsRow, { marginTop: Spacing.md }]}>
              <StatBox label="Elevation" value={activity.elevationFormatted} />
              <StatBox
                label="GAP"
                value={activity.gapFormatted || activity.paceFormatted}
                highlight
                highlightColor={Colors.primary}
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
          <View style={styles.chartCard}>
            <ElevationChart elevations={activity.elevationProfile} height={100} />
          </View>

          {/* Physiological Metrics (HR & Calories) */}
          <View style={styles.metricsCard}>
            <Text style={styles.cardHeader}>Heart Rate & Intensity</Text>
            <View style={styles.hrMetricsRow}>
              <View style={styles.hrBox}>
                <Ionicons name="heart" size={20} color={Colors.heartRate} />
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.metricVal}>{activity.averageHeartRate || 154} bpm</Text>
                  <Text style={styles.metricSub}>Avg Heart Rate</Text>
                </View>
              </View>

              <View style={styles.hrBox}>
                <Ionicons name="pulse" size={20} color="#F59E0B" />
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.metricVal}>{activity.maxHeartRate || 178} bpm</Text>
                  <Text style={styles.metricSub}>Max Heart Rate</Text>
                </View>
              </View>

              <View style={styles.hrBox}>
                <Ionicons name="flame" size={20} color={Colors.primary} />
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.metricVal}>{activity.calories || 680}</Text>
                  <Text style={styles.metricSub}>Calories</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Splits Table (if available) */}
          {activity.splits && activity.splits.length > 0 && (
            <View style={styles.splitsCard}>
              <Text style={styles.cardHeader}>Kilometer Splits</Text>
              <View style={styles.splitTableHeader}>
                <Text style={[styles.splitColHeader, { flex: 0.8 }]}>KM</Text>
                <Text style={[styles.splitColHeader, { flex: 1.2 }]}>PACE</Text>
                <Text style={[styles.splitColHeader, { flex: 1.2 }]}>ELEV</Text>
                <Text style={[styles.splitColHeader, { flex: 1.2 }]}>AVG HR</Text>
              </View>

              {activity.splits.map((s) => (
                <View key={s.splitNumber} style={styles.splitTableRow}>
                  <Text style={[styles.splitCell, { flex: 0.8, fontWeight: '700' }]}>
                    {s.splitNumber}
                  </Text>
                  <Text style={[styles.splitCell, { flex: 1.2 }]}>{s.paceFormatted}</Text>
                  <Text style={[styles.splitCell, { flex: 1.2 }]}>
                    {s.elevationDeltaMeters > 0 ? `+${s.elevationDeltaMeters}m` : `${s.elevationDeltaMeters}m`}
                  </Text>
                  <Text style={[styles.splitCell, { flex: 1.2 }]}>
                    {s.averageHeartRate ? `${s.averageHeartRate} bpm` : '--'}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Social Interactions Section */}
          <View style={styles.socialSection}>
            <View style={styles.socialHeaderRow}>
              <TouchableOpacity
                style={styles.kudosBtn}
                onPress={() => toggleKudos(activity.id)}
                activeOpacity={0.75}>
                <Ionicons
                  name={activity.hasKudos ? 'thumbs-up' : 'thumbs-up-outline'}
                  size={20}
                  color={activity.hasKudos ? Colors.primary : Colors.textSecondary}
                />
                <Text
                  style={[
                    styles.kudosBtnText,
                    activity.hasKudos && { color: Colors.primary, fontWeight: '700' },
                  ]}>
                  {activity.kudosCount} Kudos
                </Text>
              </TouchableOpacity>

              <Text style={styles.commentCountText}>
                {activity.commentsCount} Comments
              </Text>
            </View>

            {/* Comments Thread */}
            <View style={styles.commentsList}>
              {activity.comments && activity.comments.length > 0 ? (
                activity.comments.map((c) => (
                  <View key={c.id} style={styles.commentItem}>
                    <Image source={{ uri: c.athlete.avatarUrl }} style={styles.commentAvatar} />
                    <View style={styles.commentContent}>
                      <View style={styles.commentAuthorRow}>
                        <Text style={styles.commentAuthorName}>{c.athlete.displayName}</Text>
                        <Text style={styles.commentTime}>{c.createdAt}</Text>
                      </View>
                      <Text style={styles.commentBody}>{c.content}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.noCommentsText}>No comments yet. Be the first to cheer!</Text>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Comment Posting Input Bar */}
        <View style={styles.commentInputBar}>
          <TextInput
            style={styles.commentInputField}
            placeholder="Write a cheer or comment..."
            placeholderTextColor={Colors.textMuted}
            value={commentInput}
            onChangeText={setCommentInput}
          />
          <TouchableOpacity
            style={[styles.postBtn, !commentInput.trim() && { opacity: 0.5 }]}
            onPress={handlePostComment}
            disabled={!commentInput.trim()}>
            <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  iconBtn: {
    padding: Spacing.xs,
  },
  headerTitleBox: {
    alignItems: 'center',
  },
  headerAthlete: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  headerSport: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  titleSection: {
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  activityTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.heavy,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  activityDesc: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  mapBox: {
    padding: Spacing.md,
    backgroundColor: Colors.background,
  },
  statsCard: {
    backgroundColor: Colors.background,
    marginTop: Spacing.sm,
    padding: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chartCard: {
    backgroundColor: Colors.background,
    marginTop: Spacing.sm,
    padding: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  metricsCard: {
    backgroundColor: Colors.background,
    marginTop: Spacing.sm,
    padding: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  cardHeader: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hrMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hrBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricVal: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.heavy,
    color: Colors.textPrimary,
  },
  metricSub: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  splitsCard: {
    backgroundColor: Colors.background,
    marginTop: Spacing.sm,
    padding: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  splitTableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  splitColHeader: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textMuted,
  },
  splitTableRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  splitCell: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textPrimary,
  },
  socialSection: {
    backgroundColor: Colors.background,
    marginTop: Spacing.sm,
    padding: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  socialHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  kudosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  kudosBtnText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
  },
  commentCountText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
  commentsList: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  commentItem: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
  },
  commentContent: {
    flex: 1,
  },
  commentAuthorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  commentAuthorName: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  commentTime: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  commentBody: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  noCommentsText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  commentInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  commentInputField: {
    flex: 1,
    height: 40,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  postBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});


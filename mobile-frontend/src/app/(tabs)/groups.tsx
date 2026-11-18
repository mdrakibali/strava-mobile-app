import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/theme';
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
    <View style={styles.card}>
      <Image source={{ uri: item.bannerUrl }} style={styles.clubBanner} />
      <View style={styles.clubContent}>
        <View style={styles.clubHeader}>
          <Image source={{ uri: item.avatarUrl }} style={styles.clubAvatar} />
          <View style={styles.clubMeta}>
            <Text style={styles.clubTitle}>{item.name}</Text>
            <Text style={styles.clubSub}>
              {item.sportType} · {item.city} · {item.memberCount} Athletes
            </Text>
          </View>
        </View>

        <Text style={styles.clubDescription}>{item.description}</Text>

        <View style={styles.clubStatsRow}>
          <View>
            <Text style={styles.statLabel}>Weekly Volume</Text>
            <Text style={styles.statValue}>{(item.weeklyDistanceMeters / 1000).toLocaleString()} km</Text>
          </View>
          <View>
            <Text style={styles.statLabel}>Activities</Text>
            <Text style={styles.statValue}>{item.weeklyActivitiesCount} logged</Text>
          </View>
          <TouchableOpacity
            style={[styles.actionButton, item.isMember && styles.actionButtonActive]}
            onPress={() => toggleJoinClub(item.id)}>
            <Text style={[styles.actionButtonText, item.isMember && styles.actionButtonTextActive]}>
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
      <View style={styles.card}>
        <View style={styles.challengeHeader}>
          <Image source={{ uri: item.badgeUrl }} style={styles.challengeBadge} />
          <View style={styles.challengeMeta}>
            <Text style={styles.challengeTitle}>{item.title}</Text>
            <Text style={styles.challengeSub}>
              {item.sportType} · {item.daysRemaining} days remaining
            </Text>
          </View>
        </View>

        <Text style={styles.challengeDescription}>{item.description}</Text>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>
              {(item.currentMeters / 1000).toFixed(1)} / {(item.targetMeters / 1000).toFixed(0)} km
            </Text>
            <Text style={styles.progressPercent}>{progressPercent}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progressPercent}%` },
                item.isCompleted && { backgroundColor: Colors.success },
              ]}
            />
          </View>
        </View>

        <View style={styles.challengeFooter}>
          {item.isCompleted ? (
            <View style={styles.completedBadge}>
              <Ionicons name="trophy" size={16} color="#059669" />
              <Text style={styles.completedText}>Trophy Awarded!</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, item.isJoined && styles.actionButtonActive]}
              onPress={() => toggleJoinChallenge(item.id)}>
              <Text style={[styles.actionButtonText, item.isJoined && styles.actionButtonTextActive]}>
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
    <View style={styles.card}>
      <View style={styles.eventHeader}>
        <View style={styles.eventDateBox}>
          <Text style={styles.eventDateDay}>{item.dateFormatted.split(',')[0]}</Text>
          <Text style={styles.eventDateTime}>{item.timeFormatted}</Text>
        </View>
        <View style={styles.eventMeta}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <Text style={styles.eventClub}>{item.clubName}</Text>
        </View>
      </View>

      <View style={styles.eventDetailsBox}>
        <View style={styles.eventDetailRow}>
          <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.eventDetailText}>{item.meetingPoint}</Text>
        </View>
        <View style={styles.eventDetailRow}>
          <Ionicons name="speedometer-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.eventDetailText}>
            {(item.distanceMeters / 1000).toFixed(0)} km · {item.paceDescription}
          </Text>
        </View>
        <View style={styles.eventDetailRow}>
          <Ionicons name="people-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.eventDetailText}>{item.attendeesCount} athletes attending</Text>
        </View>
      </View>

      {/* RSVP Action Buttons */}
      <View style={styles.rsvpRow}>
        <TouchableOpacity
          style={[styles.rsvpBtn, item.rsvpStatus === 'GOING' && styles.rsvpBtnActive]}
          onPress={() => toggleRsvp(item.id, 'GOING')}>
          <Text style={[styles.rsvpText, item.rsvpStatus === 'GOING' && styles.rsvpTextActive]}>
            {item.rsvpStatus === 'GOING' ? 'Going ✓' : 'I\'m Going'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.rsvpBtn, item.rsvpStatus === 'MAYBE' && styles.rsvpBtnActive]}
          onPress={() => toggleRsvp(item.id, 'MAYBE')}>
          <Text style={[styles.rsvpText, item.rsvpStatus === 'MAYBE' && styles.rsvpTextActive]}>
            Maybe
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Clubs & Community</Text>

        {/* Tab Switcher */}
        <View style={styles.segmentControl}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'CLUBS' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('CLUBS')}>
            <Text style={[styles.segmentText, activeTab === 'CLUBS' && styles.segmentTextActive]}>
              Clubs ({clubs.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'CHALLENGES' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('CHALLENGES')}>
            <Text style={[styles.segmentText, activeTab === 'CHALLENGES' && styles.segmentTextActive]}>
              Challenges ({challenges.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'EVENTS' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('EVENTS')}>
            <Text style={[styles.segmentText, activeTab === 'EVENTS' && styles.segmentTextActive]}>
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
          contentContainerStyle={styles.listContent}
        />
      )}

      {activeTab === 'CHALLENGES' && (
        <FlatList
          data={challenges}
          keyExtractor={(item) => item.id}
          renderItem={renderChallengeItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      {activeTab === 'EVENTS' && (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderEventItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.heavy,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  segmentControl: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  segmentBtnActive: {
    backgroundColor: Colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: Colors.primary,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  clubBanner: {
    width: '100%',
    height: 110,
    backgroundColor: Colors.surface,
  },
  clubContent: {
    padding: Spacing.lg,
  },
  clubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -32,
    marginBottom: Spacing.sm,
  },
  clubAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 3,
    borderColor: Colors.background,
    backgroundColor: Colors.surface,
    marginRight: Spacing.md,
  },
  clubMeta: {
    flex: 1,
    paddingTop: 18,
  },
  clubTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  clubSub: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  clubDescription: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  clubStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.sm,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginTop: 1,
  },
  actionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.sm,
  },
  actionButtonActive: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButtonText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
  },
  actionButtonTextActive: {
    color: Colors.textSecondary,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  challengeBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: Spacing.md,
    backgroundColor: Colors.surface,
  },
  challengeMeta: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  challengeSub: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  challengeDescription: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.lg,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  progressContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
  },
  progressPercent: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.heavy,
    color: Colors.primary,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  challengeFooter: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    alignItems: 'flex-end',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  completedText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: '#059669',
  },
  eventHeader: {
    flexDirection: 'row',
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  eventDateBox: {
    backgroundColor: Colors.primaryLight,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
    marginRight: Spacing.md,
  },
  eventDateDay: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.heavy,
    color: Colors.primary,
  },
  eventDateTime: {
    fontSize: 10,
    color: Colors.primaryDark,
    marginTop: 2,
  },
  eventMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  eventTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  eventClub: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  eventDetailsBox: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: 6,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventDetailText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  rsvpRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  rsvpBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rsvpBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  rsvpText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textSecondary,
  },
  rsvpTextActive: {
    color: Colors.textInverse,
  },
});

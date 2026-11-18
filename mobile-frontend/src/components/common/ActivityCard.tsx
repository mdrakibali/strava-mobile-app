import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { Activity, SportType } from '../../types';
import { RouteMapPreview } from './RouteMapPreview';
import { StatBox } from './StatBox';

interface ActivityCardProps {
  activity: Activity;
}

const getSportIcon = (sport: SportType): keyof typeof Ionicons.glyphMap => {
  switch (sport) {
    case 'Ride':
    case 'Gravel Ride':
    case 'Mountain Bike':
    case 'Virtual Ride':
      return 'bicycle-outline';
    case 'Hike':
    case 'Walk':
      return 'walk-outline';
    case 'Trail Run':
    case 'Run':
      return 'fitness-outline';
    default:
      return 'speedometer-outline';
  }
};

export const ActivityCard: React.FC<ActivityCardProps> = ({ activity }) => {
  const router = useRouter();
  const { toggleKudos } = useApp();

  const handleCardPress = () => {
    router.push({
      pathname: '/activity/[id]',
      params: { id: activity.id },
    });
  };

  return (
    <View style={styles.card}>
      {/* Header: Athlete info & Sport */}
      <View style={styles.header}>
        <View style={styles.athleteRow}>
          <Image
            source={{ uri: activity.athlete.avatarUrl }}
            style={styles.avatar}
          />
          <View style={styles.athleteMeta}>
            <Text style={styles.athleteName}>{activity.athlete.displayName}</Text>
            <View style={styles.subMeta}>
              <Ionicons
                name={getSportIcon(activity.sportType)}
                size={13}
                color={Colors.primary}
              />
              <Text style={styles.timeAgo}>
                {' '}
                {activity.sportType} · {activity.athlete.city || 'Athletic Track'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Title & Description */}
      <TouchableOpacity onPress={handleCardPress} activeOpacity={0.8}>
        <Text style={styles.title}>{activity.title}</Text>
        {activity.description && (
          <Text style={styles.description} numberOfLines={2}>
            {activity.description}
          </Text>
        )}
      </TouchableOpacity>

      {/* Metrics Row */}
      <TouchableOpacity
        style={styles.statsContainer}
        onPress={handleCardPress}
        activeOpacity={0.8}>
        <StatBox label="Distance" value={activity.distanceFormatted} />
        <StatBox label="Pace / Speed" value={activity.paceFormatted} />
        <StatBox label="Time" value={activity.movingTimeFormatted} />
        <StatBox label="Elev Gain" value={activity.elevationFormatted} />
      </TouchableOpacity>

      {/* Advanced Algorithmic Parity Badges (GAP & Relative Effort) */}
      {(activity.gapFormatted || activity.relativeEffortScore) && (
        <View style={styles.badgesContainer}>
          {activity.gapFormatted && (
            <View style={styles.badge}>
              <Ionicons name="trending-up-outline" size={13} color={Colors.primary} />
              <Text style={styles.badgeText}>GAP {activity.gapFormatted}</Text>
            </View>
          )}

          {activity.relativeEffortScore && (
            <View style={[styles.badge, styles.relativeEffortBadge]}>
              <Ionicons name="flash-outline" size={13} color="#D97706" />
              <Text style={[styles.badgeText, { color: '#B45309' }]}>
                {activity.relativeEffortScore} Relative Effort
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Visual Media (Photos or Route Polyline Map) */}
      <TouchableOpacity
        style={styles.mediaContainer}
        onPress={handleCardPress}
        activeOpacity={0.9}>
        {activity.photos && activity.photos.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
            {activity.photos.map((photo, index) => (
              <Image key={index} source={{ uri: photo }} style={styles.photo} />
            ))}
          </ScrollView>
        ) : (
          <RouteMapPreview points={activity.routePoints} height={190} />
        )}
      </TouchableOpacity>

      {/* Social Actions (Kudos, Comments, Share) */}
      <View style={styles.socialBar}>
        <TouchableOpacity
          style={styles.socialAction}
          onPress={() => toggleKudos(activity.id)}
          activeOpacity={0.7}>
          <Ionicons
            name={activity.hasKudos ? 'thumbs-up' : 'thumbs-up-outline'}
            size={18}
            color={activity.hasKudos ? Colors.primary : Colors.textSecondary}
          />
          <Text
            style={[
              styles.socialActionText,
              activity.hasKudos && { color: Colors.primary, fontWeight: '700' },
            ]}>
            {activity.kudosCount > 0 ? `${activity.kudosCount} Kudos` : 'Kudos'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.socialAction}
          onPress={handleCardPress}
          activeOpacity={0.7}>
          <Ionicons name="chatbubble-outline" size={17} color={Colors.textSecondary} />
          <Text style={styles.socialActionText}>
            {activity.commentsCount > 0 ? `${activity.commentsCount} Comments` : 'Comment'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.socialAction} activeOpacity={0.7}>
          <Ionicons name="share-social-outline" size={18} color={Colors.textSecondary} />
          <Text style={styles.socialActionText}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Mini Comment Preview */}
      {activity.comments && activity.comments.length > 0 && (
        <TouchableOpacity
          style={styles.commentSnippet}
          onPress={handleCardPress}
          activeOpacity={0.8}>
          <Text style={styles.commentAuthor}>
            {activity.comments[0].athlete.displayName}:{' '}
            <Text style={styles.commentText}>{activity.comments[0].content}</Text>
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  athleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: Spacing.md,
    backgroundColor: Colors.surface,
  },
  athleteMeta: {
    justifyContent: 'center',
  },
  athleteName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  subMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  timeAgo: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
  moreButton: {
    padding: Spacing.xs,
  },
  title: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.heavy,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  description: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  relativeEffortBadge: {
    backgroundColor: '#FEF3C7',
  },
  badgeText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  mediaContainer: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  photoScroll: {
    flexDirection: 'row',
  },
  photo: {
    width: 290,
    height: 190,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  socialBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.md,
  },
  socialAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
  },
  socialActionText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  commentSnippet: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderLight,
  },
  commentAuthor: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  commentText: {
    fontWeight: Typography.fontWeight.normal,
    color: Colors.textSecondary,
  },
});


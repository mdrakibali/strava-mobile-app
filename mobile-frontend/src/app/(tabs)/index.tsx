import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ActivityCard } from '../../components/common/ActivityCard';
import { Header } from '../../components/common/Header';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/theme';
import { useApp } from '../../context/AppContext';

export default function FeedScreen() {
  const { activities } = useApp();
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'FOLLOWING' | 'CLUBS'>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  };

  const filteredActivities = activities.filter((act) => {
    if (selectedFilter === 'FOLLOWING') {
      return act.athlete.isFollowing || act.athlete.id === 'user_current';
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      <Header />

      {/* Filter Chips Bar */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'ALL' && styles.filterChipActive]}
            onPress={() => setSelectedFilter('ALL')}
            activeOpacity={0.7}>
            <Text style={[styles.filterChipText, selectedFilter === 'ALL' && styles.filterChipTextActive]}>
              All Activities
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'FOLLOWING' && styles.filterChipActive]}
            onPress={() => setSelectedFilter('FOLLOWING')}
            activeOpacity={0.7}>
            <Text style={[styles.filterChipText, selectedFilter === 'FOLLOWING' && styles.filterChipTextActive]}>
              Following
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'CLUBS' && styles.filterChipActive]}
            onPress={() => setSelectedFilter('CLUBS')}
            activeOpacity={0.7}>
            <Text style={[styles.filterChipText, selectedFilter === 'CLUBS' && styles.filterChipTextActive]}>
              My Clubs
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Activity Feed FlatList */}
      <FlatList
        data={filteredActivities}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ActivityCard activity={item} />}
        contentContainerStyle={styles.feedContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
        ListHeaderComponent={
          <View style={styles.weeklyBanner}>
            <View style={styles.bannerLeft}>
              <View style={styles.bannerIcon}>
                <Ionicons name="flame" size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.bannerTitle}>Weekly Volume</Text>
                <Text style={styles.bannerSubtitle}>18.6 km logged · 2 runs completed</Text>
              </View>
            </View>
            <View style={styles.bannerBadge}>
              <Text style={styles.bannerBadgeText}>+14% vs last week</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="fitness-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No activities found</Text>
            <Text style={styles.emptySubtitle}>Follow more athletes or record your first workout!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  filterBar: {
    backgroundColor: Colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    paddingVertical: Spacing.sm,
  },
  filterScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.textInverse,
  },
  feedContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  weeklyBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  bannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  bannerSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  bannerBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  bannerBadgeText: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
    color: '#059669',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

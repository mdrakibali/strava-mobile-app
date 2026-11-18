import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteMapPreview } from '../../components/common/RouteMapPreview';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { Segment } from '../../types';

export default function MapsScreen() {
  const { segments } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState<'ALL' | 'Run' | 'Ride'>('ALL');

  const filteredSegments = segments.filter((seg) => {
    const matchesSport = selectedSport === 'ALL' || seg.sportType === selectedSport;
    const matchesSearch = seg.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSport && matchesSearch;
  });

  const renderSegmentItem = ({ item }: { item: Segment }) => (
    <View style={styles.segmentCard}>
      <View style={styles.segmentHeader}>
        <View style={styles.segmentMeta}>
          <Text style={styles.segmentName}>{item.name}</Text>
          <Text style={styles.segmentDetails}>
            {item.sportType} · {(item.distanceMeters / 1000).toFixed(2)} km · Avg {item.averageGradePercent}% grade · +{item.elevationGainMeters}m
          </Text>
        </View>
        <View style={styles.rankBadge}>
          <Ionicons name="trophy" size={14} color={Colors.gold} />
          <Text style={styles.rankText}>#{item.rank || 1}</Text>
        </View>
      </View>

      <RouteMapPreview points={item.polylinePoints} height={120} />

      <View style={styles.leaderboardPreview}>
        <View style={styles.komBlock}>
          <Text style={styles.komLabel}>👑 KOM Crown</Text>
          <Text style={styles.komValue}>
            {item.komAthleteName} · <Text style={{ fontWeight: '700' }}>{item.komTimeFormatted}</Text>
          </Text>
        </View>

        {item.userPrTimeFormatted && (
          <View style={styles.prBlock}>
            <Text style={styles.prLabel}>Your PR</Text>
            <Text style={styles.prValue}>{item.userPrTimeFormatted}</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Search & Filter Bar */}
      <View style={styles.searchHeader}>
        <Text style={styles.screenTitle}>Maps & Segments</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
          <TextInput
            placeholder="Search segments, routes, climbs..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Sport Type Filters */}
        <View style={styles.sportFilterRow}>
          {(['ALL', 'Run', 'Ride'] as const).map((sport) => (
            <TouchableOpacity
              key={sport}
              style={[styles.sportChip, selectedSport === sport && styles.sportChipActive]}
              onPress={() => setSelectedSport(sport)}>
              <Text style={[styles.sportChipText, selectedSport === sport && styles.sportChipTextActive]}>
                {sport === 'ALL' ? 'All Sports' : sport === 'Run' ? '🏃 Running' : '🚴 Cycling'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Segments List */}
      <FlatList
        data={filteredSegments}
        keyExtractor={(item) => item.id}
        renderItem={renderSegmentItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.heroRouteCard}>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitle}>Discover Popular Routes</Text>
              <Text style={styles.heroSubtitle}>
                Community-curated routes with verified road quality and elevation profiles.
              </Text>
              <TouchableOpacity style={styles.ctaButton} activeOpacity={0.8}>
                <Ionicons name="navigate-outline" size={16} color={Colors.textInverse} />
                <Text style={styles.ctaButtonText}>Create Custom Route</Text>
              </TouchableOpacity>
            </View>
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
  searchHeader: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  screenTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.heavy,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    height: 42,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  sportFilterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  sportChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sportChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  sportChipText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
  },
  sportChipTextActive: {
    color: Colors.textInverse,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  heroRouteCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  heroTextContainer: {
    gap: Spacing.xs,
  },
  heroTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  heroSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  ctaButtonText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
  },
  segmentCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  segmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  segmentMeta: {
    flex: 1,
  },
  segmentName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  segmentDetails: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  rankText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: '#92400E',
  },
  leaderboardPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: 4,
  },
  komBlock: {
    flex: 1,
  },
  komLabel: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textSecondary,
    marginBottom: 1,
  },
  komValue: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textPrimary,
  },
  prBlock: {
    alignItems: 'flex-end',
  },
  prLabel: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textSecondary,
    marginBottom: 1,
  },
  prValue: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
});


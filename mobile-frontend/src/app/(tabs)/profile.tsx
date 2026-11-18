import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/theme';
import { useApp } from '../../context/AppContext';

export default function ProfileScreen() {
  const { currentUser, activities } = useApp();
  const [beaconEnabled, setBeaconEnabled] = useState(true);
  const [privacyZoneActive, setPrivacyZoneActive] = useState(true);

  // Compute total user stats
  const totalKm = activities
    .reduce((acc, curr) => acc + curr.distanceMeters / 1000, 0)
    .toFixed(1);
  const totalElev = activities.reduce((acc, curr) => acc + curr.elevationGainMeters, 0);
  const totalHours = Math.round(
    activities.reduce((acc, curr) => acc + curr.movingTimeSeconds / 3600, 0)
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.topRow}>
            <Image source={{ uri: currentUser.avatarUrl }} style={styles.avatar} />
            <TouchableOpacity style={styles.settingsBtn}>
              <Ionicons name="settings-outline" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.displayName}>{currentUser.displayName}</Text>
          <Text style={styles.username}>@{currentUser.username}</Text>
          <Text style={styles.location}>
            📍 {currentUser.city}, {currentUser.country}
          </Text>

          {currentUser.bio && <Text style={styles.bio}>{currentUser.bio}</Text>}

          {/* Followers / Following counts */}
          <View style={styles.socialCounts}>
            <View style={styles.countItem}>
              <Text style={styles.countNumber}>{currentUser.followingCount}</Text>
              <Text style={styles.countLabel}>Following</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.countItem}>
              <Text style={styles.countNumber}>{currentUser.followersCount}</Text>
              <Text style={styles.countLabel}>Followers</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.countItem}>
              <Text style={styles.countNumber}>{activities.length}</Text>
              <Text style={styles.countLabel}>Activities</Text>
            </View>
          </View>
        </View>

        {/* 4-Week Volume Summary */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Last 4 Weeks</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total Distance</Text>
              <Text style={styles.statValue}>{totalKm} km</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Moving Time</Text>
              <Text style={styles.statValue}>{totalHours}h 45m</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Elev Gain</Text>
              <Text style={styles.statValue}>+{totalElev} m</Text>
            </View>
          </View>
        </View>

        {/* Trophy Case (KOMs, Medals, Badges) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Trophy Case</Text>
            <Text style={styles.seeAllText}>3 Unlocked</Text>
          </View>
          <View style={styles.trophyRow}>
            <View style={styles.trophyItem}>
              <View style={[styles.trophyIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="trophy" size={24} color="#D97706" />
              </View>
              <Text style={styles.trophyName}>👑 KOM Crown</Text>
              <Text style={styles.trophySub}>Lakeside Dash</Text>
            </View>

            <View style={styles.trophyItem}>
              <View style={[styles.trophyIcon, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="ribbon" size={24} color="#059669" />
              </View>
              <Text style={styles.trophyName}>10k PR Medal</Text>
              <Text style={styles.trophySub}>44:12</Text>
            </View>

            <View style={styles.trophyItem}>
              <View style={[styles.trophyIcon, { backgroundColor: Colors.primaryLight }]}>
                <Ionicons name="medal" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.trophyName}>Nov Elevation</Text>
              <Text style={styles.trophySub}>2,000m Climb</Text>
            </View>
          </View>
        </View>

        {/* Gear & Shoes Mileage Tracker */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Gear & Shoe Mileage</Text>
          <View style={styles.gearItem}>
            <View style={styles.gearIconBox}>
              <Ionicons name="footsteps-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.gearMeta}>
              <Text style={styles.gearName}>Nike Air Zoom Pegasus 41</Text>
              <Text style={styles.gearSub}>Daily Road Trainer · 242.8 / 600 km</Text>
              <View style={styles.gearProgressBg}>
                <View style={[styles.gearProgressFill, { width: '40%' }]} />
              </View>
            </View>
          </View>

          <View style={styles.gearItem}>
            <View style={styles.gearIconBox}>
              <Ionicons name="bicycle-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.gearMeta}>
              <Text style={styles.gearName}>Specialized Allez Sprint Road</Text>
              <Text style={styles.gearSub}>Road Bike · 1,280 km logged</Text>
              <View style={styles.gearProgressBg}>
                <View style={[styles.gearProgressFill, { width: '65%' }]} />
              </View>
            </View>
          </View>
        </View>

        {/* Privacy & Safety Settings */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Privacy & Safety Controls</Text>

          <View style={styles.toggleRow}>
            <View style={styles.toggleMeta}>
              <Text style={styles.toggleTitle}>Privacy Zones (Start/End Masking)</Text>
              <Text style={styles.toggleSub}>
                Hides your GPS track within a 500m radius of your Home address.
              </Text>
            </View>
            <Switch
              value={privacyZoneActive}
              onValueChange={setPrivacyZoneActive}
              trackColor={{ false: Colors.border, true: Colors.primary }}
            />
          </View>

          <View style={[styles.toggleRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.borderLight, paddingTop: Spacing.md }]}>
            <View style={styles.toggleMeta}>
              <Text style={styles.toggleTitle}>Beacon Live Safety Tracking</Text>
              <Text style={styles.toggleSub}>
                Broadcasts your live GPS & battery to emergency contacts during workouts.
              </Text>
            </View>
            <Switch
              value={beaconEnabled}
              onValueChange={setBeaconEnabled}
              trackColor={{ false: Colors.border, true: Colors.primary }}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  profileHeader: {
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  settingsBtn: {
    padding: Spacing.xs,
  },
  displayName: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.heavy,
    color: Colors.textPrimary,
  },
  username: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: 4,
  },
  location: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  bio: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  socialCounts: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.md,
  },
  countItem: {
    alignItems: 'center',
  },
  countNumber: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.heavy,
    color: Colors.textPrimary,
  },
  countLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: '80%',
    backgroundColor: Colors.border,
    alignSelf: 'center',
  },
  sectionCard: {
    backgroundColor: Colors.background,
    marginTop: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  seeAllText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  statValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.heavy,
    color: Colors.textPrimary,
  },
  trophyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trophyItem: {
    flex: 1,
    alignItems: 'center',
  },
  trophyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  trophyName: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  trophySub: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 1,
  },
  gearItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  gearIconBox: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  gearMeta: {
    flex: 1,
  },
  gearName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  gearSub: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
    marginBottom: 4,
  },
  gearProgressBg: {
    height: 4,
    backgroundColor: Colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  gearProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  toggleMeta: {
    flex: 1,
    marginRight: Spacing.md,
  },
  toggleTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  toggleSub: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
});


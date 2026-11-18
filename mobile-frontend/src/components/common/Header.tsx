import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Spacing, Typography } from '../../constants/theme';
import { useApp } from '../../context/AppContext';

interface HeaderProps {
  title?: string;
  showSearch?: boolean;
  showNotifications?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'OPEN STRAVA',
  showSearch = true,
  showNotifications = true,
}) => {
  const router = useRouter();
  const { unreadNotificationCount } = useApp();

  return (
    <View style={styles.container}>
      <View style={styles.leftContainer}>
        <Text style={styles.logo}>{title}</Text>
      </View>

      <View style={styles.rightContainer}>
        {showSearch && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/search')}
            activeOpacity={0.7}
            accessibilityLabel="Search Athletes">
            <Ionicons name="search-outline" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        )}

        {showNotifications && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/notifications')}
            activeOpacity={0.7}
            accessibilityLabel="Notifications">
            <Ionicons name="notifications-outline" size={22} color={Colors.textPrimary} />
            {unreadNotificationCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 54,
    backgroundColor: Colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.heavy,
    color: Colors.primary,
    letterSpacing: 1.2,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: Colors.textInverse,
    fontSize: 9,
    fontWeight: Typography.fontWeight.bold,
  },
});


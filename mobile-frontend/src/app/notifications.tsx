import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { NotificationItem } from '../types';

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useApp();

  const getNotificationIcon = (type: NotificationItem['actionType']) => {
    switch (type) {
      case 'KUDOS':
        return <Ionicons name="thumbs-up" size={16} color={Colors.primary} />;
      case 'COMMENT':
        return <Ionicons name="chatbubble" size={16} color="#3B82F6" />;
      case 'FOLLOW':
        return <Ionicons name="person-add" size={16} color="#10B981" />;
      case 'CHALLENGE_WON':
        return <Ionicons name="trophy" size={16} color="#F59E0B" />;
      default:
        return <Ionicons name="notifications" size={16} color={Colors.primary} />;
    }
  };

  const handleNotificationPress = (item: NotificationItem) => {
    markNotificationAsRead(item.id);
    if (item.targetActivityId) {
      router.push({
        pathname: '/activity/[id]',
        params: { id: item.targetActivityId },
      });
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.isRead && styles.unreadCard]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.75}>
      <View style={styles.avatarBox}>
        <Image source={{ uri: item.actor.avatarUrl }} style={styles.avatar} />
        <View style={styles.typeBadge}>{getNotificationIcon(item.actionType)}</View>
      </View>

      <View style={styles.contentBox}>
        <Text style={styles.messageText}>
          <Text style={styles.actorName}>{item.actor.displayName} </Text>
          {item.message}
        </Text>
        <Text style={styles.timeText}>{item.timeAgo}</Text>
      </View>

      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={markAllNotificationsAsRead} style={styles.markReadBtn}>
          <Text style={styles.markReadText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySub}>No new notifications right now.</Text>
          </View>
        }
      />
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
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
  markReadBtn: {
    padding: Spacing.xs,
  },
  markReadText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  listContent: {
    paddingVertical: Spacing.sm,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.background,
  },
  unreadCard: {
    backgroundColor: Colors.primaryLight,
  },
  avatarBox: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
  },
  typeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Colors.background,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.background,
  },
  contentBox: {
    flex: 1,
  },
  messageText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  actorName: {
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  timeText: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: Spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.xs,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  emptySub: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
});


import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FEATURES } from '../config/features';
import { useApp } from '../context/AppContext';
import { AppBar, AppText, Avatar, Button, color, Divider, EmptyState, space } from '../design';
import { toAthleteSummary } from '../lib/activityView';
import { NotificationItem } from '../types';

const TYPE_ICON: Record<string, { name: keyof typeof Ionicons.glyphMap; tint: string }> = {
  KUDOS: { name: 'thumbs-up', tint: color.brand },
  COMMENT: { name: 'chatbubble', tint: color.info },
  FOLLOW: { name: 'person-add', tint: color.success },
};

/** Notifications (reference: ScreensDesign 374860). */
export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead, unreadNotificationCount } = useApp();

  const open = (item: NotificationItem) => {
    markNotificationAsRead(item.id);
    if (item.actionType === 'FOLLOW' && item.actor?.id) {
      router.push({ pathname: '/athlete/[id]', params: { id: item.actor.id } });
    } else if (item.targetActivityId) {
      router.push({ pathname: '/activity/[id]', params: { id: item.targetActivityId } });
    } else if (item.actionType === 'MESSAGE' && FEATURES.groups && item.actor?.id) {
      router.push({ pathname: '/messages/[id]', params: { id: item.actor.id } });
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <AppBar
        title="Notifications"
        right={
          unreadNotificationCount > 0 ? (
            <Button label="Mark all read" variant="ghost" size="sm" onPress={markAllNotificationsAsRead} />
          ) : undefined
        }
      />
      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        ItemSeparatorComponent={() => <Divider inset={space.gutter + 48 + space.md} />}
        contentContainerStyle={notifications.length === 0 ? { flexGrow: 1 } : undefined}
        ListEmptyComponent={
          <EmptyState icon="notifications-outline" title="You’re all caught up" body="Kudos, comments and new followers will show up here." />
        }
        renderItem={({ item }) => {
          const actor = toAthleteSummary(item.actor);
          const icon = TYPE_ICON[item.actionType] ?? { name: 'notifications' as const, tint: color.inkSecondary };
          // Backend messages start with the actor's username ("rakib gave you kudos…"); show the
          // display name in bold instead of repeating it.
          const prefix = actor.username ? `${actor.username} ` : '';
          const message = prefix && item.message.startsWith(prefix) ? item.message.slice(prefix.length) : item.message;
          return (
            <Pressable
              onPress={() => open(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item.isRead ? '' : 'Unread. '}${actor.displayName} ${message}`}
              style={({ pressed }) => [styles.row, !item.isRead && styles.unread, pressed && { backgroundColor: color.canvas }]}>
              <View>
                <Avatar uri={actor.avatarUrl} name={actor.displayName} size={48} />
                <View style={styles.typeBadge}>
                  <Ionicons name={icon.name} size={12} color={icon.tint} />
                </View>
              </View>
              <View style={{ flex: 1, marginLeft: space.md }}>
                <AppText variant="body">
                  <AppText variant="bodyStrong">{actor.displayName} </AppText>
                  {message}
                </AppText>
                <AppText variant="caption" color="inkTertiary" style={{ marginTop: 2 }}>
                  {item.timeAgo}
                </AppText>
              </View>
              {!item.isRead ? <View style={styles.dot} /> : null}
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.gutter, paddingVertical: space.md },
  unread: { backgroundColor: color.brandSoft },
  typeBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: color.border,
  },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.brand, marginLeft: space.sm },
});

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FEATURES } from '../config/features';
import { useApp } from '../context/AppContext';
import { AppBar, AppText, Avatar, Button, color, Divider, EmptyState, space } from '../design';
import { toAthleteSummary } from '../lib/activityView';
import { NotificationItem } from '../types';
import { realtimeWs } from '../services/websocket';

const TYPE_ICON: Record<string, { name: keyof typeof Ionicons.glyphMap; tint: string }> = {
  KUDOS: { name: 'thumbs-up', tint: '#FC4C02' },
  COMMENT: { name: 'chatbubble', tint: '#3B82F6' },
  FOLLOW: { name: 'person-add', tint: '#10B981' },
};

/** Notifications (reference: ScreensDesign 374860). */
export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead, unreadNotificationCount, refreshNotifications } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshNotifications?.();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      refreshNotifications?.();
    }, [refreshNotifications])
  );

  useEffect(() => {
    const unsub = realtimeWs.addListener('notification', () => {
      refreshNotifications?.();
    });
    return () => unsub();
  }, [refreshNotifications]);

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
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FC4C02" />}
        ItemSeparatorComponent={() => <Divider inset={space.gutter + 48 + space.md} />}
        contentContainerStyle={notifications.length === 0 ? { flexGrow: 1 } : undefined}
        ListEmptyComponent={
          <EmptyState icon="notifications-outline" title="You’re all caught up" body="Kudos, comments and new followers will show up here." />
        }
        renderItem={({ item }) => {
          const actor = toAthleteSummary(item.actor);
          const icon = TYPE_ICON[item.actionType] ?? { name: 'notifications' as const, tint: '#6B7280' };
          // Backend messages start with the actor's username ("rakib gave you kudos…"); show the
          // display name in bold instead of repeating it.
          const prefix = actor.username ? `${actor.username} ` : '';
          const message = prefix && item.message.startsWith(prefix) ? item.message.slice(prefix.length) : item.message;
          return (
            <Pressable
              onPress={() => open(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item.isRead ? '' : 'Unread. '}${actor.displayName} ${message}`}
              className={`flex-row items-center px-4 py-3 ${!item.isRead ? 'bg-[#FFF9F6]' : ''} active:bg-gray-50`}>
              <View>
                <Avatar uri={actor.avatarUrl} name={actor.displayName} size={48} />
                <View className="absolute -right-0.5 -bottom-0.5 w-5.5 h-5.5 rounded-full bg-white items-center justify-center border border-gray-100">
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
              {!item.isRead ? <View className="w-2.5 h-2.5 rounded-full bg-[#FC4C02] ml-2" /> : null}
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

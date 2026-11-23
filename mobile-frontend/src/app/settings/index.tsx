import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { AppBar, AppText, Avatar, Button, Divider, space } from '../../design';
import { toAthleteSummary } from '../../lib/activityView';

const Row = ({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={title}
    className="flex-row items-center px-4 min-h-[60px] active:bg-gray-50"
  >
    <Ionicons name={icon} size={22} color="#1F2937" />
    <View style={{ flex: 1, marginLeft: space.lg }}>
      <AppText variant="title3">{title}</AppText>
      {subtitle ? (
        <AppText variant="caption" color="inkTertiary">
          {subtitle}
        </AppText>
      ) : null}
    </View>
    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
  </Pressable>
);

/**
 * Settings. Only entries backed by real behaviour are listed. GPS, notification, blocked users,
 * data export, GPX import and units screens were local-state or alert-only (UI/UX audit X-5) and
 * are hidden until implemented.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const { currentUser, logout } = useApp();
  const me = toAthleteSummary(currentUser);

  const onLogout = () =>
    Alert.alert('Log out?', 'You can sign back in at any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/auth/login');
        },
      },
    ]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <AppBar title="Settings" />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex-row items-center p-4">
          <Avatar uri={me.avatarUrl} name={me.displayName} size={48} />
          <View style={{ flex: 1, marginLeft: space.md }}>
            <AppText variant="title3">{me.displayName}</AppText>
            {currentUser.username ? (
              <AppText variant="caption" color="inkTertiary">
                @{currentUser.username}
              </AppText>
            ) : null}
          </View>
        </View>

        <Text className="text-xs font-semibold uppercase text-gray-500 mt-6 mb-2 ml-1 tracking-wider">
          Account
        </Text>
        <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <Row
            icon="person-outline"
            title="Edit profile"
            subtitle="Name, location, bio"
            onPress={() => router.push('/settings/profile-edit')}
          />
        </View>

        <Text className="text-xs font-semibold uppercase text-gray-500 mt-6 mb-2 ml-1 tracking-wider">
          Privacy
        </Text>
        <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <Row
            icon="shield-checkmark-outline"
            title="Privacy zones"
            subtitle="Hide your route near places like home"
            onPress={() => router.push('/settings/privacy')}
          />
          <Row
            icon="navigate-outline"
            title="Recording & GPS"
            subtitle="Permissions, background recording, battery"
            onPress={() => router.push('/settings/gps')}
          />
          <Divider inset={space.lg + 22 + space.lg} />
          <View className="flex-row items-center px-4 min-h-[60px]">
            <Ionicons name="eye-outline" size={22} color="#1F2937" />
            <AppText variant="label" color="inkSecondary" style={{ flex: 1, marginLeft: space.lg }}>
              Choose who can see each activity when you save it.
            </AppText>
          </View>
        </View>

        <Button
          label="Log out"
          variant="outline"
          fullWidth
          onPress={onLogout}
          style={{ marginTop: space.xxl }}
        />
        <AppText
          variant="caption"
          color="inkTertiary"
          align="center"
          style={{ marginTop: space.lg }}
        >
          Version {Constants.expoConfig?.version ?? '–'}
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

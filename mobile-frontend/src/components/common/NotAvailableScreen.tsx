import { useRouter } from 'expo-router';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar, color, EmptyState } from '../../design';

/**
 * Honest placeholder for analytics features that have no real data source yet. These screens used
 * to display hard-coded sample numbers as if they were the athlete's own; that is never acceptable.
 */
export const NotAvailableScreen: React.FC<{ title: string; reason: string }> = ({ title, reason }) => {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-white">
      <AppBar title={title} />
      <EmptyState icon="construct-outline" title={`${title} isn’t available yet`} body={reason} primary={{ label: 'Go back', onPress: () => router.back() }} />
    </SafeAreaView>
  );
};

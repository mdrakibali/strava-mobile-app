import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { View } from 'react-native';

/**
 * The Record tab never shows its own page: pressing the tab opens /record (see (tabs)/_layout).
 * This screen only exists as the tab's route; if it is reached directly (deep link / restore),
 * forward to the recorder.
 */
export default function RecordTabRedirect() {
  const router = useRouter();
  useFocusEffect(
    useCallback(() => {
      router.navigate('/');
      router.push('/record');
    }, [router])
  );
  return <View className="flex-1 bg-white" />;
}

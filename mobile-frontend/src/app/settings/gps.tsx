import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Linking, PermissionsAndroid, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar, AppText, Button, SectionTitle, space } from '../../design';

type Check = 'ok' | 'problem' | 'unknown';

/**
 * Recording & GPS: live status of everything background recording depends on, with the actions
 * that fix each problem (docs/STRAVA_BACKGROUND_TRACKING.md). Nothing here is decorative.
 */
export default function RecordingSettingsScreen() {
  const [location, setLocation] = useState<Check>('unknown');
  const [services, setServices] = useState<Check>('unknown');
  const [notifications, setNotifications] = useState<Check>('unknown');

  const refresh = useCallback(async () => {
    const perm = await Location.getForegroundPermissionsAsync().catch(() => null);
    setLocation(perm?.granted ? 'ok' : 'problem');
    setServices((await Location.hasServicesEnabledAsync().catch(() => false)) ? 'ok' : 'problem');
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      const granted = await PermissionsAndroid.check('android.permission.POST_NOTIFICATIONS').catch(
        () => false
      );
      setNotifications(granted ? 'ok' : 'problem');
    } else setNotifications('ok');
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const requestLocation = async () => {
    const res = await Location.requestForegroundPermissionsAsync().catch(() => null);
    if (!res?.granted && res && !res.canAskAgain) Linking.openSettings();
    refresh();
  };
  const requestNotifications = async () => {
    const res = await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS').catch(
      () => null
    );
    if (res === 'never_ask_again') Linking.openSettings();
    refresh();
  };
  const openBattery = () =>
    Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS').catch(() =>
      Linking.openSettings()
    );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <AppBar title="Recording & GPS" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 64 }}>
        <StatusRow
          title="Location permission"
          ok={location}
          okText="Allowed while using the app — enough for screen-off recording."
          problemText="Needed to record. Recording uses a foreground service, so “Allow all the time” is not required."
          action={
            location === 'problem'
              ? { label: 'Allow location', onPress: requestLocation }
              : undefined
          }
        />
        <StatusRow
          title="Device location"
          ok={services}
          okText="On."
          problemText="Location is turned off on this phone."
          action={
            services === 'problem'
              ? { label: 'Open settings', onPress: () => Linking.openSettings() }
              : undefined
          }
        />
        <StatusRow
          title="Recording notification"
          ok={notifications}
          okText="Shown while recording so you can return to the activity."
          problemText="Android hides the recording notification. Recording still works, but allow it so you can see GPS is on."
          action={
            notifications === 'problem'
              ? { label: 'Allow notifications', onPress: requestNotifications }
              : undefined
          }
        />

        <SectionTitle title="Battery optimisation" style={{ marginTop: space.xl }} />
        <AppText variant="body" color="inkSecondary">
          Some phones stop apps in the background to save battery, which can end a recording early.
          If a recording was interrupted, set this app to “Unrestricted” / “Not optimised”.
        </AppText>
        <Button
          label="Open battery settings"
          variant="outline"
          fullWidth
          onPress={openBattery}
          style={{ marginTop: space.md }}
        />

        <SectionTitle title="Good to know" style={{ marginTop: space.xl }} />
        <AppText variant="body" color="inkSecondary">
          • Force-stopping the app from Android settings ends any recording — no app can record
          after that.{'\n'}• If a recording is interrupted, open the app: you can resume or finish
          it, and nothing recorded is lost.{'\n'}• Activities are saved on the phone first and
          upload automatically when you are online.
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const StatusRow: React.FC<{
  title: string;
  ok: Check;
  okText: string;
  problemText: string;
  action?: { label: string; onPress: () => void };
}> = ({ title, ok, okText, problemText, action }) => (
  <View
    className={`bg-white rounded-2xl p-4 mb-3 border shadow-sm ${ok === 'problem' ? 'border-red-500' : 'border-gray-100'}`}
  >
    <View className="flex-row items-center">
      <View
        className={`w-2.5 h-2.5 rounded-full ${ok === 'ok' ? 'bg-green-600' : ok === 'problem' ? 'bg-red-600' : 'bg-gray-400'}`}
      />
      <AppText variant="bodyStrong" style={{ marginLeft: space.sm }}>
        {title}
      </AppText>
    </View>
    <AppText variant="label" color="inkSecondary" style={{ marginTop: space.xs }}>
      {ok === 'unknown' ? 'Checking…' : ok === 'ok' ? okText : problemText}
    </AppText>
    {action ? (
      <Button
        label={action.label}
        size="sm"
        onPress={action.onPress}
        style={{ marginTop: space.md, alignSelf: 'flex-start' }}
      />
    ) : null}
  </View>
);

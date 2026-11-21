import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AppBar,
  AppText,
  Button,
  Chip,
  ChipRow,
  color,
  Divider,
  ErrorState,
  IconButton,
  LoadingState,
  radius,
  space,
  TextField,
} from '../../design';
import { api } from '../../services/api';

const RADII = [200, 500, 1000];

/**
 * Privacy zones (real API). Previously every new zone was saved at hard-coded Dhaka coordinates
 * regardless of where the user was, and the screen contained a non-functional Beacon section.
 * Zones are now created at the device's current location.
 *
 * Note: masking is applied server-side at upload time only (technical audit PRIV-07), so a new
 * zone does not change activities that were already uploaded.
 */
export default function PrivacyZonesScreen() {
  const [zones, setZones] = useState<any[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [name, setName] = useState('');
  const [radiusM, setRadiusM] = useState(500);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let cancelled = false;
    api.privacyZones.list().then(
      (res) => {
        if (cancelled) return;
        setZones(res?.privacyZones ?? []);
        setStatus('ready');
      },
      () => !cancelled && setStatus('error')
    );
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const onAdd = async () => {
    setAdding(true);
    setAddError(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') throw new Error('Location permission is needed to place the zone where you are.');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if ((pos.coords.accuracy ?? 999) > 100) throw new Error('Your location is too imprecise right now. Try again outdoors.');
      const res = await api.privacyZones.create({
        name: name.trim() || 'Privacy zone',
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        radiusMeters: radiusM,
      });
      if (res?.privacyZone) setZones((prev) => [...prev, res.privacyZone]);
      setName('');
    } catch (e: any) {
      setAddError(e?.message || 'Couldn’t create the zone.');
    } finally {
      setAdding(false);
    }
  };

  const onDelete = (zone: any) =>
    Alert.alert('Delete privacy zone?', `“${zone.name}” will no longer hide your route in new uploads.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.privacyZones.delete(zone.id);
            setZones((prev) => prev.filter((z) => z.id !== zone.id));
          } catch (e: any) {
            Alert.alert('Couldn’t delete', e?.message || 'Try again.');
          }
        },
      },
    ]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <AppBar title="Privacy zones" />
      {status === 'loading' ? (
        <LoadingState />
      ) : status === 'error' ? (
        <ErrorState
          onRetry={() => {
            setStatus('loading');
            setReloadKey((k) => k + 1);
          }}
        />
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          <AppText variant="body" color="inkSecondary">
            Parts of your route inside a privacy zone are hidden from other athletes on activities you upload
            from now on.
          </AppText>

          <View className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-4">
            {zones.length === 0 ? (
              <AppText variant="body" color="inkSecondary" style={{ padding: space.lg }}>
                No privacy zones yet.
              </AppText>
            ) : (
              zones.map((z, i) => (
                <View key={z.id}>
                  {i > 0 ? <Divider inset={space.lg} /> : null}
                  <View className="flex-row items-center pl-4 pr-2 min-h-[64px]">
                    <Ionicons name="shield-checkmark" size={22} color={color.success} />
                    <View style={{ flex: 1, marginLeft: space.md }}>
                      <AppText variant="title3">{z.name}</AppText>
                      <AppText variant="caption" color="inkTertiary">{z.radiusMeters} m radius</AppText>
                    </View>
                    <IconButton icon="trash-outline" iconColor={color.danger} accessibilityLabel={`Delete ${z.name}`} onPress={() => onDelete(z)} />
                  </View>
                </View>
              ))
            )}
          </View>

          <AppText variant="title2" style={{ marginTop: space.xxl, marginBottom: space.md }}>
            Add a zone where you are now
          </AppText>
          <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Home" maxLength={50} />
          <AppText variant="label" color="inkSecondary" style={{ marginTop: space.lg, marginBottom: space.sm }}>
            Radius
          </AppText>
          <ChipRow>
            {RADII.map((r) => (
              <Chip key={r} label={`${r} m`} selected={radiusM === r} onPress={() => setRadiusM(r)} />
            ))}
          </ChipRow>
          {addError ? (
            <View style={{ marginTop: space.lg }}>
              <ErrorState compact message={addError} />
            </View>
          ) : null}
          <Button label="Add zone at my location" icon="locate" fullWidth loading={adding} onPress={onAdd} style={{ marginTop: space.xl }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

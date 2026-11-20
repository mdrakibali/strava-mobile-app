import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapView } from '../../components/map/MapView';
import { AppBar, AppText, Button, Chip, ChipRow, color, elevation, radius, space, TextField } from '../../design';
import { LngLat } from '../../lib/activityView';
import { formatDuration, kmValue } from '../../lib/format';
import { MVP_SPORTS } from '../../lib/sports';
import { api } from '../../services/api';
import { haversineM } from '../../tracking/shared';
import { SportType } from '../../types';

const TYPICAL_SPEED: Record<string, number> = { Run: 2.8, Walk: 1.3, Hike: 1.1, Ride: 5.5 };

/**
 * Route builder: tap the map to add points (straight segments between taps). Starts at the
 * athlete's real location; there is no pre-filled route and no invented elevation. The server
 * recomputes the distance from the points on save.
 */
export default function RouteBuilderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [points, setPoints] = useState<LngLat[]>([]);
  const [name, setName] = useState('');
  const [sport, setSport] = useState<SportType>('Run');
  const [me, setMe] = useState<LngLat | null>(null);
  const [locState, setLocState] = useState<'locating' | 'ok' | 'denied'>('locating');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const perm = await Location.requestForegroundPermissionsAsync().catch(() => null);
      if (cancelled) return;
      if (!perm?.granted) return setLocState('denied');
      const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
      if (cancelled) return;
      if (fix) setMe([fix.coords.longitude, fix.coords.latitude]);
      setLocState('ok');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const distance = useMemo(() => {
    let d = 0;
    for (let i = 1; i < points.length; i++) d += haversineM(points[i - 1][1], points[i - 1][0], points[i][1], points[i][0]);
    return d;
  }, [points]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.routes.create({
        name: name.trim(),
        sportType: sport,
        distanceMeters: Math.round(distance),
        polylinePoints: points.map(([lng, lat]) => ({ latitude: lat, longitude: lng })),
      });
      router.replace({ pathname: '/routes/[id]', params: { id: res.route.id } });
    } catch (e: any) {
      Alert.alert('Couldn’t save the route', e?.message ?? 'Please try again.');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      <AppBar title="Create Route" />
      <View style={{ flex: 1 }}>
        <MapView
          mode="route"
          route={points}
          userPosition={me}
          showUserLocation
          frameKey={me ? 'me' : 'none'}
          focus={me && points.length === 0 ? { center: me, zoom: 15 } : null}
          onMapPress={(p) => setPoints((prev) => [...prev, p])}
        />
        <View className="absolute top-4 left-4 right-4 bg-white rounded-xl p-3 shadow-lg border border-gray-100" pointerEvents="none">
          <AppText variant="bodyStrong">{kmValue(distance)} km</AppText>
          <AppText variant="label" color="inkSecondary">
            {points.length < 2
              ? locState === 'denied'
                ? 'Location off — pan to your area, then tap to add points'
                : 'Tap the map to add points'
              : `≈ ${formatDuration(distance / TYPICAL_SPEED[sport])} est. · straight segments between taps`}
          </AppText>
        </View>
      </View>
      <View style={{ paddingBottom: insets.bottom + 12 }} className="p-4 gap-2 bg-white rounded-t-3xl shadow-xl border-t border-gray-100">
        <View className="flex-row items-center">
          <Button label="Undo" icon="arrow-undo" variant="outline" size="sm" disabled={!points.length} onPress={() => setPoints((p) => p.slice(0, -1))} />
          <Button label="Clear" variant="ghost" size="sm" disabled={!points.length} onPress={() => setPoints([])} style={{ marginLeft: space.sm }} />
        </View>
        <ChipRow>
          {MVP_SPORTS.map((s) => (
            <Chip key={s.id} label={s.label} icon={s.icon} selected={sport === s.id} onPress={() => setSport(s.id)} />
          ))}
        </ChipRow>
        <TextField value={name} onChangeText={setName} placeholder="Route name" accessibilityLabel="Route name" maxLength={120} />
        <Button
          label="Save route"
          variant="dark"
          size="lg"
          fullWidth
          loading={saving}
          disabled={points.length < 2 || distance < 50 || !name.trim()}
          onPress={save}
          style={{ marginTop: space.md }}
        />
      </View>
    </SafeAreaView>
  );
}

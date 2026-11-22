import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapView } from '../../components/map/MapView';
import { AppBar, AppText, Button, Chip, ChipRow, space, TextField } from '../../design';
import { LngLat } from '../../lib/activityView';
import { formatDuration, kmValue } from '../../lib/format';
import { MVP_SPORTS } from '../../lib/sports';
import { api } from '../../services/api';
import { haversineM } from '../../tracking/shared';
import { SportType } from '../../types';

const TYPICAL_SPEED: Record<string, number> = { Run: 2.8, Walk: 1.3, Hike: 1.1, Ride: 5.5 };

interface SegmentData {
  geometry: LngLat[];
  distanceM: number;
  elevationGainM: number;
  elevationProfile?: number[];
}

export default function RouteBuilderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [waypoints, setWaypoints] = useState<LngLat[]>([]);
  const [segments, setSegments] = useState<SegmentData[]>([]);
  const [name, setName] = useState('');
  const [sport, setSport] = useState<SportType>('Run');
  const [me, setMe] = useState<LngLat | null>(null);
  const [locState, setLocState] = useState<'locating' | 'ok' | 'denied'>('locating');
  const [saving, setSaving] = useState(false);
  const [snapping, setSnapping] = useState(false);

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

  // Compute full points polyline from all snapped segments
  const points = React.useMemo<LngLat[]>(() => {
    if (segments.length === 0) return waypoints;
    const combined: LngLat[] = [];
    segments.forEach((seg, i) => {
      if (i === 0) {
        combined.push(...seg.geometry);
      } else {
        // Skip duplicate connecting point
        combined.push(...seg.geometry.slice(1));
      }
    });
    return combined;
  }, [segments, waypoints]);

  const totalDistance = React.useMemo(() => {
    if (segments.length > 0) {
      return segments.reduce((sum, s) => sum + s.distanceM, 0);
    }
    let d = 0;
    for (let i = 1; i < waypoints.length; i++) {
      d += haversineM(waypoints[i - 1][1], waypoints[i - 1][0], waypoints[i][1], waypoints[i][0]);
    }
    return d;
  }, [segments, waypoints]);

  const totalElevationGain = React.useMemo(() => {
    return segments.reduce((sum, s) => sum + s.elevationGainM, 0);
  }, [segments]);

  const fullElevationProfile = React.useMemo(() => {
    const list: number[] = [];
    segments.forEach((s) => {
      if (s.elevationProfile && s.elevationProfile.length) {
        list.push(...s.elevationProfile);
      }
    });
    return list.length > 1 ? list : undefined;
  }, [segments]);

  const handleMapPress = async (p: LngLat) => {
    if (waypoints.length === 0) {
      setWaypoints([p]);
      return;
    }

    const last = waypoints[waypoints.length - 1];
    setSnapping(true);

    try {
      // Query Valhalla routing engine for real geometry along OpenStreetMap ways
      const plan = await api.routing.plan(
        sport,
        { lat: last[1], lng: last[0] },
        { lat: p[1], lng: p[0] }
      );

      const route = plan.routes[0];
      if (route && route.geometry && route.geometry.length > 1) {
        setWaypoints((prev) => [...prev, p]);
        setSegments((prev) => [
          ...prev,
          {
            geometry: route.geometry,
            distanceM: route.distanceM,
            elevationGainM: route.elevationGainM ?? 0,
            elevationProfile: route.elevationProfile ? route.elevationProfile.map((pt) => pt[1]) : undefined,
          },
        ]);
      } else {
        // Fallback to straight segment if no mapped way exists
        const d = haversineM(last[1], last[0], p[1], p[0]);
        setWaypoints((prev) => [...prev, p]);
        setSegments((prev) => [
          ...prev,
          {
            geometry: [last, p],
            distanceM: d,
            elevationGainM: 0,
          },
        ]);
      }
    } catch {
      // Off-road or offline fallback: connect directly without fabricating fake roads
      const d = haversineM(last[1], last[0], p[1], p[0]);
      setWaypoints((prev) => [...prev, p]);
      setSegments((prev) => [
        ...prev,
        {
          geometry: [last, p],
          distanceM: d,
          elevationGainM: 0,
        },
      ]);
    } finally {
      setSnapping(false);
    }
  };

  const handleUndo = () => {
    if (waypoints.length <= 1) {
      setWaypoints([]);
      setSegments([]);
      return;
    }
    setWaypoints((prev) => prev.slice(0, -1));
    setSegments((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setWaypoints([]);
    setSegments([]);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.routes.create({
        name: name.trim(),
        sportType: sport,
        distanceMeters: Math.round(totalDistance),
        elevationGainMeters: Math.round(totalElevationGain),
        elevationProfile: fullElevationProfile,
        polylinePoints: points.map(([lng, lat]) => ({ latitude: lat, longitude: lng })),
      });
      router.replace({ pathname: '/routes/[id]', params: { id: res.route.id } });
    } catch (e: any) {
      Alert.alert('Couldn’t save the route', e?.message ?? 'Please try again.');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#18181B' }}>
      <AppBar title="Create Route" />
      <View style={{ flex: 1 }}>
        <MapView
          mode="route"
          route={points}
          userPosition={me}
          showUserLocation
          frameKey={me ? 'me' : 'none'}
          focus={me && points.length === 0 ? { center: me, zoom: 15 } : null}
          onMapPress={handleMapPress}
          styleKey="dark_topo"
        />

        {/* Floating Route Info Banner */}
        <View
          className="absolute top-4 left-4 right-4 bg-gray-900/90 rounded-2xl p-3.5 shadow-xl border border-gray-700"
          pointerEvents="none">
          <View className="flex-row items-center justify-between">
            <View>
              <AppText className="text-white text-lg font-black">{kmValue(totalDistance)} km</AppText>
              {totalElevationGain > 0 ? (
                <AppText className="text-emerald-400 text-xs font-bold">
                  +{Math.round(totalElevationGain)} m elevation gain
                </AppText>
              ) : null}
            </View>
            {snapping ? (
              <View className="flex-row items-center bg-gray-800 px-3 py-1.5 rounded-full border border-gray-600">
                <ActivityIndicator size="small" color="#FC4C02" />
                <AppText className="text-gray-300 text-xs font-semibold ml-2">Snapping to OSM…</AppText>
              </View>
            ) : null}
          </View>
          <AppText className="text-gray-400 text-xs mt-1">
            {waypoints.length < 2
              ? locState === 'denied'
                ? 'Location off — pan to your area, then tap to add waypoints'
                : 'Tap the map to add waypoints. Snaps along real roads and trails.'
              : `≈ ${formatDuration(totalDistance / TYPICAL_SPEED[sport])} est. · ${waypoints.length} waypoints snapped`}
          </AppText>
        </View>
      </View>

      {/* Bottom Controls Sheet */}
      <View
        style={{ paddingBottom: insets.bottom + 12 }}
        className="p-4 gap-2 bg-gray-900 rounded-t-3xl shadow-2xl border-t border-gray-800">
        <View className="flex-row items-center justify-between mb-1">
          <View className="flex-row items-center">
            <Button
              label="Undo"
              icon="arrow-undo"
              variant="outline"
              size="sm"
              disabled={!waypoints.length || snapping}
              onPress={handleUndo}
            />
            <Button
              label="Clear"
              variant="ghost"
              size="sm"
              disabled={!waypoints.length || snapping}
              onPress={handleClear}
              style={{ marginLeft: space.sm }}
            />
          </View>
          <View className="px-3 py-1 rounded-full bg-gray-800 border border-gray-700">
            <AppText className="text-gray-400 text-xs font-bold">Dark Topo</AppText>
          </View>
        </View>

        <ChipRow>
          {MVP_SPORTS.map((s) => (
            <Chip
              key={s.id}
              label={s.label}
              icon={s.icon}
              selected={sport === s.id}
              onPress={() => setSport(s.id)}
            />
          ))}
        </ChipRow>

        <TextField
          value={name}
          onChangeText={setName}
          placeholder="Route name (e.g. Park Morning Loop)"
          accessibilityLabel="Route name"
          maxLength={120}
        />

        <Button
          label="Save route"
          variant="primary"
          size="lg"
          fullWidth
          loading={saving}
          disabled={points.length < 2 || totalDistance < 50 || !name.trim() || snapping}
          onPress={save}
          style={{ marginTop: space.md }}
        />
      </View>
    </SafeAreaView>
  );
}

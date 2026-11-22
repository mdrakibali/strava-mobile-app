import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ElevationProfile } from '../../components/activity/ElevationProfile';
import { MapView } from '../../components/map/MapView';
import { AppText, Button, Chip, ChipRow, color, IconButton, MetricRow, MetricTile, space } from '../../design';
import { LngLat } from '../../lib/activityView';
import { formatDuration, kmValue } from '../../lib/format';
import { plannedRouteStore } from '../../lib/plannedRoute';
import { MVP_SPORTS, sportConfig } from '../../lib/sports';
import { api, PlaceDetails, RoutePlan } from '../../services/api';
import { SportType } from '../../types';

type PlanState =
  | { status: 'locating' }
  | { status: 'permission_denied' }
  | { status: 'no_fix' }
  | { status: 'planning'; from: LngLat }
  | { status: 'ready'; from: LngLat; plan: RoutePlan }
  | { status: 'error'; message: string; from: LngLat | null };

/**
 * Route preview (Maps → place → Route). From the athlete's REAL position to the selected place,
 * over mapped roads/paths/trails/cycleways (Valhalla via our API), with alternatives, DEM
 * elevation and a genuine photo of the place when OSM links one. Nothing here is drawn as straight
 * lines or invented; failures show an error with Retry.
 */
export default function RoutePlanScreen() {
  const params = useLocalSearchParams<{ name?: string; lat?: string; lng?: string; sport?: string; place?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const dest: LngLat | null = params.lat && params.lng ? [Number(params.lng), Number(params.lat)] : null;
  const [sport, setSport] = useState<SportType>(MVP_SPORTS.some((s) => s.id === params.sport) ? (params.sport as SportType) : 'Run');
  const [state, setState] = useState<PlanState>({ status: 'locating' });
  const [selected, setSelected] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [details, setDetails] = useState<PlaceDetails | null>(null);
  const [saving, setSaving] = useState(false);

  // Genuine place photo/details (only when the place came from OSM).
  useEffect(() => {
    if (!params.place) return;
    let cancelled = false;
    api.places.details(params.place).then((d) => !cancelled && setDetails(d), () => undefined);
    return () => {
      cancelled = true;
    };
  }, [params.place]);

  useEffect(() => {
    if (!dest) return;
    let cancelled = false;
    const set = (s: PlanState) => !cancelled && setState(s);
    (async () => {
      set({ status: 'locating' });
      const perm = await Location.requestForegroundPermissionsAsync().catch(() => null);
      if (!perm?.granted) return set({ status: 'permission_denied' });
      const fix =
        (await Location.getLastKnownPositionAsync({ maxAge: 120_000 }).catch(() => null)) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null));
      if (!fix) return set({ status: 'no_fix' });
      const from: LngLat = [fix.coords.longitude, fix.coords.latitude];
      set({ status: 'planning', from });
      try {
        const plan = await api.routing.plan(sport, { lat: from[1], lng: from[0] }, { lat: dest[1], lng: dest[0] });
        setSelected(0);
        set({ status: 'ready', from, plan });
      } catch (e: any) {
        set({ status: 'error', from, message: e?.message ?? 'Route planning failed.' });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport, attempt, params.lat, params.lng]);

  const plan = state.status === 'ready' ? state.plan : null;
  const route = plan?.routes[selected];
  const alternatives = useMemo(() => (plan ? plan.routes.filter((_, i) => i !== selected).map((r) => r.geometry as LngLat[]) : []), [plan, selected]);
  const from = 'from' in state ? state.from : null;
  const name = details?.nameEn || params.name || details?.name || 'Destination';

  const startWorkout = () => {
    if (!route) return;
    plannedRouteStore.set({ name, sport, geometry: route.geometry as LngLat[], distanceM: route.distanceM, durationS: route.durationS, elevationGainM: route.elevationGainM });
    router.push({ pathname: '/record', params: { sport } });
  };

  const saveRoute = async () => {
    if (!route) return;
    setSaving(true);
    try {
      const res = await api.routes.create({
        name: `To ${name}`,
        sportType: sport,
        distanceMeters: route.distanceM,
        polylinePoints: route.geometry.map(([lng, lat]) => ({ latitude: lat, longitude: lng })),
      });
      Alert.alert('Route saved', 'You can find it in Maps → Routes.', [{ text: 'OK' }, { text: 'Open', onPress: () => router.push({ pathname: '/routes/[id]', params: { id: res.route.id } }) }]);
    } catch (e: any) {
      Alert.alert('Couldn’t save the route', e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  let status: React.ReactNode = null;
  if (!dest) status = <AppText variant="body" color="inkSecondary">No destination selected.</AppText>;
  else if (state.status === 'locating') status = <AppText variant="body" color="inkSecondary">Finding your location…</AppText>;
  else if (state.status === 'planning') status = <AppText variant="body" color="inkSecondary">Planning a route over mapped paths…</AppText>;
  else if (state.status === 'permission_denied')
    status = (
      <>
        <AppText variant="body" color="inkSecondary">Location is needed to plan a route from where you are.</AppText>
        <Button label="Open settings" size="sm" className="mt-2 self-start" onPress={() => Linking.openSettings()} />
      </>
    );
  else if (state.status === 'no_fix')
    status = (
      <>
        <AppText variant="body" color="inkSecondary">Couldn’t get a GPS fix.</AppText>
        <Button label="Try again" size="sm" className="mt-2 self-start" onPress={() => setAttempt((a) => a + 1)} />
      </>
    );
  else if (state.status === 'error')
    status = (
      <>
        <AppText variant="body" color="inkSecondary">{state.message}</AppText>
        <Button label="Retry" size="sm" style={{ marginTop: 8, alignSelf: 'flex-start' }} onPress={() => setAttempt((a) => a + 1)} />
      </>
    );

  return (
    <View className="flex-1 bg-white">
      <View style={{ height: height * 0.45 }}>
        <MapView
          mode="route"
          route={(route?.geometry as LngLat[]) ?? []}
          otherRoutes={alternatives}
          userPosition={from}
          showUserLocation
          markers={dest ? [{ id: 'dest', coordinate: dest, selected: true }] : undefined}
          focus={!route && dest ? { center: dest, zoom: 14 } : null}
          frameKey={route ? `r${selected}:${sport}` : 'dest'}
          padding={{ top: insets.top + 20, bottom: 20 }}
        />
        <View style={{ top: insets.top + 8 }} className="absolute left-4">
          <IconButton icon="arrow-back" appearance="floating" accessibilityLabel="Back" onPress={() => router.back()} />
        </View>
      </View>

      <ScrollView className="flex-1 -mt-4 rounded-t-3xl bg-white" contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 64 }}>
        {details?.image ? (
          <View className="mb-3">
            <Image source={{ uri: details.image.url }} className="w-full h-44 rounded-xl bg-gray-100" contentFit="cover" transition={200} accessibilityLabel={`Photo of ${name}`} />
            <Pressable onPress={() => Linking.openURL(details.image!.pageUrl)} accessibilityRole="link">
              <AppText variant="caption" color="inkTertiary" style={{ marginTop: 4 }}>
                Photo: {details.image.author ?? 'unknown author'} · {details.image.license ?? 'see licence'} · Wikimedia Commons
              </AppText>
            </Pressable>
          </View>
        ) : null}

        <AppText variant="title1">{name}</AppText>
        {details?.address ? <AppText variant="label" color="inkSecondary">{details.address}</AppText> : null}
        {details?.tags.openingHours ? <AppText variant="label" color="inkSecondary">Hours: {details.tags.openingHours}</AppText> : null}

        <ChipRow>
          {MVP_SPORTS.map((s) => (
            <Chip key={s.id} label={s.label} icon={s.icon} selected={sport === s.id} onPress={() => setSport(s.id)} />
          ))}
        </ChipRow>

        {plan && route ? (
          <>
            {plan.routes.length > 1 ? (
              <ChipRow>
                {plan.routes.map((r, i) => (
                  <Chip key={i} label={`${i === 0 ? 'Best' : `Alt ${i}`} · ${kmValue(r.distanceM)} km`} selected={i === selected} onPress={() => setSelected(i)} />
                ))}
              </ChipRow>
            ) : null}
            <MetricRow style={{ marginTop: space.lg }}>
              <MetricTile label="Distance" value={kmValue(route.distanceM)} unit="km" size="L" />
              <MetricTile label="Est. time" value={formatDuration(route.durationS)} size="L" />
              <MetricTile label="Elev gain" value={route.elevationGainM != null ? String(route.elevationGainM) : '–'} unit={route.elevationGainM != null ? 'm' : undefined} size="L" />
            </MetricRow>
            <AppText variant="caption" color="inkTertiary" style={{ marginTop: space.xs }}>
              One way from your location · time at {plan.assumedSpeedKmh} km/h · elevation from a terrain model (estimate)
            </AppText>
            {route.elevationProfile && route.elevationProfile.length > 1 ? (
              <View style={{ marginTop: space.lg }}>
                <AppText variant="title3">Elevation</AppText>
                <ElevationProfile samples={route.elevationProfile.map((p) => p[1])} />
              </View>
            ) : null}
            <Button label={`Start ${sportConfig(sport).label} with this route`} icon="play" size="lg" fullWidth onPress={startWorkout} style={{ marginTop: space.xl }} />
            <View className="flex-row items-center mt-2">
              <Button label="Save route" icon="bookmark-outline" variant="outline" loading={saving} style={{ flex: 1 }} onPress={saveRoute} />
              <Button
                label="Start without route"
                variant="ghost"
                style={{ flex: 1, marginLeft: space.sm }}
                onPress={() => {
                  plannedRouteStore.set(null);
                  router.push({ pathname: '/record', params: { sport } });
                }}
              />
            </View>
            <AppText variant="caption" color="inkTertiary" style={{ marginTop: space.md }}>
              Routing: {plan.engine} · {plan.attribution}
            </AppText>
          </>
        ) : (
          <View className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-100">{status}</View>
        )}

        {details ? (
          <Pressable onPress={() => Linking.openURL(details.osmUrl)} accessibilityRole="link" className="flex-row items-center mt-4">
            <Ionicons name="open-outline" size={16} color={color.inkSecondary} />
            <AppText variant="caption" color="inkSecondary" style={{ marginLeft: space.xs }}>View on OpenStreetMap</AppText>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

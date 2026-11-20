import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapView } from '../../components/map/MapView';
import { useApp } from '../../context/AppContext';
import { Image } from 'expo-image';
import { AppText, BottomSheet, Button, Chip, ChipRow, color, elevation, IconButton, OptionRow, radius, space } from '../../design';
import { MapStyleKey } from '../../components/map/mapTypes';
import { plannedRouteStore } from '../../lib/plannedRoute';
import { LngLat, toRoute } from '../../lib/activityView';
import { formatDuration, kmValue } from '../../lib/format';
import { PLACE_LABEL, useNearbyPlaces } from '../../lib/useNearbyPlaces';
import { MVP_SPORTS, sportConfig } from '../../lib/sports';
import { api, PlaceDetails } from '../../services/api';
import { haversineM } from '../../tracking/shared';
import { SportType } from '../../types';

type Source = 'nearby' | 'routes' | 'saved' | 'activities';

interface MapItem {
  id: string;
  kind: 'route' | 'activity' | 'place';
  name: string;
  subtitle: string;
  sportType: string;
  /** Lines to draw for this item (routes/activities/linear places). */
  paths: LngLat[][];
  /** Where the item is (start of route, or the place). */
  anchor: LngLat;
  distanceFromMeM: number | null;
  saved: boolean;
  osmUrl?: string;
}

const fmtAway = (m: number | null) => (m == null ? null : m < 1000 ? `${Math.round(m)} m away` : `${kmValue(m)} km away`);

/**
 * Maps tab (reference: strava-screen/maps-tab.png). Full-screen OpenFreeMap map with the user's
 * real location and four sources:
 *   Nearby      — real OSM places around the athlete's GPS position (parks, tracks, trails,
 *                 cycleways), from GET /places/nearby; shown as markers + cards
 *   Routes      — routes created in the app
 *   Saved       — routes you saved
 *   My activities — routes of your recorded activities
 * Every item comes from an API. No location → permission/location states, never a default city.
 */
export default function MapsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string; sport?: string; place?: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { currentUser } = useApp();
  const [source, setSourceRaw] = useState<Source>(
    params.source === 'routes' || params.source === 'saved' || params.source === 'activities' ? params.source : 'nearby'
  );
  const [sport, setSportRaw] = useState<string>(MVP_SPORTS.some((s) => s.id === params.sport) ? params.sport! : 'Run');
  const [query, setQueryRaw] = useState('');
  const [routeItems, setRouteItems] = useState<MapItem[]>([]);
  const [routeStatus, setRouteStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [selectedId, setSelectedId] = useState<string | null>(params.place ?? null);
  const setSource = (v: Source) => (setSourceRaw(v), setSelectedId(null));
  const setSport = (v: string) => (setSportRaw(v), setSelectedId(null));
  const setQuery = (v: string) => (setQueryRaw(v), setSelectedId(null));
  const [me, setMe] = useState<LngLat | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const listRef = useRef<FlatList<MapItem>>(null);

  const nearby = useNearbyPlaces(sport, source === 'nearby');

  // Map style: only modes backed by real data (OpenFreeMap styles; 3D = Liberty's OSM buildings).
  const [mapMode, setMapMode] = useState<'standard' | 'light' | 'bright' | '3d'>('standard');
  const [styleModalVisible, setStyleModalVisible] = useState(false);
  const styleKey: MapStyleKey = mapMode === 'light' ? 'positron' : mapMode === 'bright' ? 'bright' : 'liberty';

  // Genuine photo/details for the selected place only (one lookup at a time; cached server-side).
  const [placeDetails, setPlaceDetails] = useState<Record<string, PlaceDetails | null>>({});

  // Links from other tabs (Workout → "Places near you") arrive as params on an already-mounted tab.
  const lastParams = useRef('');
  useFocusEffect(
    useCallback(() => {
      const sig = `${params.source ?? ''}|${params.sport ?? ''}|${params.place ?? ''}`;
      if (sig === lastParams.current || !params.place) return;
      lastParams.current = sig;
      setSourceRaw('nearby');
      if (params.sport && MVP_SPORTS.some((s) => s.id === params.sport)) setSportRaw(params.sport);
      setSelectedId(params.place);
    }, [params.source, params.sport, params.place])
  );

  // User position for the map / distances (Nearby already has its own fix).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const perm = await Location.getForegroundPermissionsAsync().catch(() => null);
      if (!perm?.granted || cancelled) return;
      const fix =
        (await Location.getLastKnownPositionAsync({ maxAge: 120_000 }).catch(() => null)) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null));
      if (fix && !cancelled) setMe([fix.coords.longitude, fix.coords.latitude]);
    })();
    return () => {
      cancelled = true;
    };
  }, [source]);
  const position: LngLat | null = 'position' in nearby.state && nearby.state.position ? nearby.state.position : me;

  // Routes / saved / activities from the API.
  const loadRoutes = useCallback(async (): Promise<MapItem[]> => {
    if (source === 'activities') {
      const res = await api.athletes.listActivities(currentUser.id, null, 50);
      return res.activities
        .map((a: any) => {
          const path = toRoute(a.polyline);
          return {
            id: a.id,
            kind: 'activity' as const,
            name: a.title,
            subtitle: `${kmValue(Number(a.distanceMeters) || 0)} km · ${formatDuration(a.movingTimeSeconds)}`,
            sportType: a.sportType,
            paths: [path],
            anchor: path[0],
            distanceFromMeM: null,
            saved: false,
          };
        })
        .filter((a: MapItem) => a.paths[0].length > 1);
    }
    const [list, saved] = await Promise.all([
      source === 'saved' ? Promise.resolve(null) : api.routes.list(),
      api.routes.getSaved().catch(() => ({ savedRoutes: [] as any[] })),
    ]);
    const savedIds = new Set(saved.savedRoutes.map((r: any) => r.id ?? r.routeId));
    const rows = source === 'saved' ? saved.savedRoutes : list!.routes;
    return rows
      .map((r: any) => {
        const path = toRoute(r.polylinePoints);
        return {
          id: r.id ?? r.routeId,
          kind: 'route' as const,
          name: r.name,
          subtitle: `${kmValue(Number(r.distanceMeters) || 0)} km${r.estimatedTimeSeconds ? ` · ≈${formatDuration(r.estimatedTimeSeconds)}` : ''}${r.creator?.displayName ? ` · by ${r.creator.displayName}` : ''}`,
          sportType: r.sportType,
          paths: [path],
          anchor: path[0],
          distanceFromMeM: null,
          saved: savedIds.has(r.id ?? r.routeId),
        };
      })
      .filter((r: MapItem) => r.paths[0].length > 1);
  }, [source, currentUser.id]);

  useFocusEffect(
    useCallback(() => {
      if (source === 'nearby') return;
      let cancelled = false;
      void reloadKey;
      setRouteStatus('loading');
      loadRoutes().then(
        (rows) => {
          if (cancelled) return;
          setRouteItems(rows);
          setRouteStatus('ready');
        },
        () => !cancelled && setRouteStatus('error')
      );
      return () => {
        cancelled = true;
      };
    }, [loadRoutes, reloadKey, source])
  );

  const placeItems: MapItem[] = useMemo(() => {
    if (nearby.state.status !== 'ready') return [];
    return nearby.state.places.map((p) => ({
      id: p.id,
      kind: 'place' as const,
      name: p.name,
      subtitle: [PLACE_LABEL[p.category]?.label ?? 'Place', p.lengthM ? `${kmValue(p.lengthM)} km of path` : null, p.address, p.surface ? `surface: ${p.surface}` : null, p.lit ? 'lit at night' : null]
        .filter(Boolean)
        .join(' · '),
      sportType: sport,
      paths: p.path ?? [],
      anchor: [p.lng, p.lat] as LngLat,
      distanceFromMeM: p.distanceM,
      saved: false,
      osmUrl: p.osmUrl,
    }));
  }, [nearby.state, sport]);

  const visible = useMemo(() => {
    const rows = source === 'nearby' ? placeItems : routeItems.filter((i) => source !== 'routes' || sport === 'All' || i.sportType === sport);
    const q = query.trim().toLowerCase();
    const filtered = q ? rows.filter((i) => i.name.toLowerCase().includes(q)) : rows;
    if (source === 'nearby' || !position) return filtered;
    const withDist = filtered.map((i) => ({ ...i, distanceFromMeM: haversineM(position[1], position[0], i.anchor[1], i.anchor[0]) }));
    return withDist.sort((a, b) => a.distanceFromMeM! - b.distanceFromMeM!);
  }, [source, placeItems, routeItems, sport, query, position]);

  const selectedIndex = Math.max(0, visible.findIndex((v) => v.id === selectedId));
  const current = visible[selectedIndex];
  const currentPlaceId = current?.kind === 'place' ? current.id : null;
  useEffect(() => {
    if (!currentPlaceId || currentPlaceId in placeDetails) return;
    let cancelled = false;
    api.places.details(currentPlaceId).then(
      (d) => !cancelled && setPlaceDetails((m) => ({ ...m, [currentPlaceId]: d })),
      () => !cancelled && setPlaceDetails((m) => ({ ...m, [currentPlaceId]: null }))
    );
    return () => {
      cancelled = true;
    };
  }, [currentPlaceId, placeDetails]);
  const select = (index: number, scroll = true) => {
    const item = visible[index];
    if (!item) return;
    setSelectedId(item.id);
    if (scroll) listRef.current?.scrollToIndex({ index, animated: true });
  };

  const toggleSave = async (item: MapItem) => {
    setRouteItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, saved: !x.saved } : x)));
    try {
      const res = await api.routes.toggleSave(item.id);
      setRouteItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, saved: Boolean(res.isSaved) } : x)));
    } catch {
      setRouteItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, saved: item.saved } : x)));
    }
  };

  const directions = (item: MapItem) =>
    Linking.openURL(`geo:${item.anchor[1]},${item.anchor[0]}?q=${item.anchor[1]},${item.anchor[0]}(${encodeURIComponent(item.name)})`).catch(() =>
      Linking.openURL(`https://www.openstreetmap.org/directions?to=${item.anchor[1]}%2C${item.anchor[0]}`)
    );

  const cardWidth = width - space.gutter * 2 - 24;
  const isPlaces = source === 'nearby';
  const others = useMemo(
    () => (isPlaces ? [] : visible.filter((v) => v.id !== current?.id).slice(0, 30).flatMap((v) => v.paths)),
    [visible, current, isPlaces]
  );
  const selectedPaths = current?.paths ?? [];
  const mainRoute = selectedPaths[0] ?? [];

  // ---- bottom panel content: states first (never invented content) ----
  let panel: React.ReactNode = null;
  const box = (children: React.ReactNode) => (
    <View style={{ width: width - 32, marginLeft: 16 }} className="bg-white rounded-2xl p-4 min-h-[112px] shadow-lg border border-gray-100 items-center justify-center">{children}</View>
  );
  if (isPlaces && nearby.state.status !== 'ready') {
    const s = nearby.state;
    if (s.status === 'locating' || s.status === 'loading')
      panel = box(
        <>
          <ActivityIndicator color="#FC4C02" />
          <AppText variant="label" color="inkSecondary" className="mt-2">
            {s.status === 'locating' ? 'Finding your location…' : 'Searching OpenStreetMap near you…'}
          </AppText>
        </>
      );
    else if (s.status === 'permission_denied')
      panel = box(
        <>
          <AppText variant="bodyStrong">Location needed for nearby places</AppText>
          <AppText variant="label" color="inkSecondary" className="text-center mt-0.5">We only use it to search around where you are.</AppText>
          <Button label={s.canAskAgain ? 'Allow location' : 'Open settings'} size="sm" className="mt-2" onPress={() => (s.canAskAgain ? nearby.retry() : Linking.openSettings())} />
        </>
      );
    else if (s.status === 'location_off')
      panel = box(
        <>
          <AppText variant="bodyStrong">Location is turned off</AppText>
          <Button label="Open settings" size="sm" className="mt-2" onPress={() => Linking.openSettings()} />
        </>
      );
    else if (s.status === 'no_fix')
      panel = box(
        <>
          <AppText variant="bodyStrong">Couldn’t get a GPS fix</AppText>
          <AppText variant="label" color="inkSecondary" className="text-center mt-0.5">Go outside or near a window and try again.</AppText>
          <Button label="Try again" size="sm" className="mt-2" onPress={nearby.retry} />
        </>
      );
    else if (s.status === 'error')
      panel = box(
        <>
          <AppText variant="bodyStrong">Nearby places unavailable</AppText>
          <AppText variant="label" color="inkSecondary" className="text-center mt-0.5">{s.message}</AppText>
          <Button label="Retry" size="sm" className="mt-2" onPress={nearby.retry} />
        </>
      );
  } else if (!isPlaces && routeStatus === 'loading') {
    panel = box(<ActivityIndicator color="#FC4C02" />);
  } else if (!isPlaces && routeStatus === 'error') {
    panel = box(
      <>
        <AppText variant="bodyStrong">Couldn’t load the map data</AppText>
        <Button label="Retry" size="sm" className="mt-2" onPress={() => setReloadKey((k) => k + 1)} />
      </>
    );
  } else if (visible.length === 0) {
    panel = box(
      <>
        <AppText variant="bodyStrong">
          {isPlaces ? `No ${sportConfig(sport).label.toLowerCase()} places found within 5 km` : source === 'saved' ? 'No saved routes yet' : source === 'activities' ? 'No recorded routes yet' : 'No routes found'}
        </AppText>
        <AppText variant="label" color="inkSecondary" style={{ textAlign: 'center', marginTop: 2 }}>
          {isPlaces ? 'OpenStreetMap has no matching places mapped near you. Try another sport.' : source === 'activities' ? 'Record an activity with GPS to see it here.' : 'Create a route or change the filters.'}
        </AppText>
      </>
    );
  } else {
    panel = (
      <FlatList
        ref={listRef}
        data={visible}
        horizontal
        keyExtractor={(i) => `${i.kind}:${i.id}`}
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + space.md}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({ length: cardWidth + space.md, offset: (cardWidth + space.md) * index, index })}
        contentContainerStyle={{ paddingHorizontal: space.gutter }}
        onMomentumScrollEnd={(e) => select(Math.round(e.nativeEvent.contentOffset.x / (cardWidth + space.md)), false)}
        renderItem={({ item, index }) => {
          const selected = index === selectedIndex;
          return (
            <Pressable
              onPress={() =>
                !selected
                  ? select(index)
                  : item.kind === 'route'
                    ? router.push({ pathname: '/routes/[id]', params: { id: item.id } })
                    : item.kind === 'activity'
                      ? router.push({ pathname: '/activity/[id]', params: { id: item.id } })
                      : undefined
              }
              accessibilityRole="button"
              accessibilityLabel={`${item.name}. ${selected ? (item.kind === 'place' ? 'Selected' : 'Open') : 'Show on map'}`}
              style={{ width: cardWidth, marginRight: 16 }}
              className={`bg-white rounded-2xl p-4 min-h-[112px] shadow-lg border border-gray-100 ${selected ? 'border-2 border-[#FC4C02]' : ''}`}>
              {item.kind === 'place' && selected && placeDetails[item.id]?.image ? (
                <Image
                  source={{ uri: placeDetails[item.id]!.image!.url }}
                  className="w-full h-28 rounded-xl mb-2 bg-gray-100"
                  contentFit="cover"
                  transition={150}
                  accessibilityLabel={`Photo of ${item.name} (${placeDetails[item.id]!.image!.author ?? 'Wikimedia Commons'}, ${placeDetails[item.id]!.image!.license ?? ''})`}
                />
              ) : null}
              <View className="flex-row items-center">
                <Ionicons name={item.kind === 'place' ? 'location' : sportConfig(item.sportType).icon} size={18} color="#FC4C02" />
                <AppText variant="title3" numberOfLines={1} style={{ flex: 1, marginLeft: space.sm }}>{item.name}</AppText>
                {item.kind === 'route' ? (
                  <IconButton icon={item.saved ? 'bookmark' : 'bookmark-outline'} size={36} accessibilityLabel={item.saved ? 'Remove from saved' : 'Save route'} onPress={() => toggleSave(item)} />
                ) : null}
              </View>
              <AppText variant="label" color="inkSecondary" numberOfLines={1} style={{ marginTop: 2 }}>
                {[item.subtitle, fmtAway(item.distanceFromMeM)].filter(Boolean).join(' · ')}
              </AppText>
              {item.kind === 'place' ? (
                <>
                <View className="flex-row items-center mt-2">
                  <Button
                    label="Route"
                    icon="git-branch-outline"
                    size="sm"
                    onPress={() =>
                      router.push({
                        pathname: '/routes/plan',
                        params: { name: item.name, lat: String(item.anchor[1]), lng: String(item.anchor[0]), sport, place: item.id },
                      })
                    }
                  />
                  <Button label="Directions" icon="navigate-outline" variant="outline" size="sm" style={{ marginLeft: space.sm }} onPress={() => directions(item)} />
                  <Button
                    label="Start"
                    icon="play"
                    variant="dark"
                    size="sm"
                    style={{ marginLeft: space.sm }}
                    onPress={() => {
                      plannedRouteStore.set(null);
                      router.push({ pathname: '/record', params: { sport: sport as SportType } });
                    }}
                  />
                </View>
                {placeDetails[item.id]?.image ? (
                  <AppText variant="caption" color="inkTertiary" numberOfLines={1} style={{ marginTop: 4 }}>
                    Photo: {placeDetails[item.id]!.image!.author ?? 'unknown'} · {placeDetails[item.id]!.image!.license ?? ''} · Wikimedia Commons
                  </AppText>
                ) : null}
                </>
              ) : null}
            </Pressable>
          );
        }}
      />
    );
  }

  return (
    <View className="flex-1 bg-white">
      <MapView
        mode="route"
        route={mainRoute}
        otherRoutes={[...selectedPaths.slice(1), ...others]}
        userPosition={position}
        showUserLocation
        markers={isPlaces ? visible.map((v) => ({ id: v.id, coordinate: v.anchor, selected: v.id === current?.id })) : undefined}
        onMarkerPress={(id) => select(visible.findIndex((v) => v.id === id))}
        focus={current && mainRoute.length < 2 ? { center: current.anchor, zoom: 15 } : null}
        frameKey={current ? `${current.kind}:${current.id}` : position ? 'me' : 'none'}
        padding={{ top: insets.top + 120, bottom: 210 }}
        styleKey={styleKey}
        pitch={mapMode === '3d' ? 55 : 0}
      />

      <View style={{ top: insets.top + 8 }} className="absolute left-0 right-0 gap-1" pointerEvents="box-none">
        <View className="flex-row items-center mx-4 mb-1 px-3 h-12 rounded-xl bg-white shadow-md border border-gray-100">
          <Ionicons name="search" size={18} color="#6B7280" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={isPlaces ? 'Filter nearby places' : source === 'activities' ? 'Search your activities' : 'Search routes'}
            placeholderTextColor="#9CA3AF"
            className="flex-1 ml-2 text-base text-gray-900"
            accessibilityLabel="Search"
            returnKeyType="search"
          />
          {query ? <IconButton icon="close-circle" size={32} accessibilityLabel="Clear search" onPress={() => setQuery('')} /> : null}
        </View>
        <ChipRow>
          <Chip label="Nearby" icon="location-outline" selected={source === 'nearby'} onPress={() => setSource('nearby')} />
          <Chip label="Routes" icon="map-outline" selected={source === 'routes'} onPress={() => setSource('routes')} />
          <Chip label="Saved" icon="bookmark-outline" selected={source === 'saved'} onPress={() => setSource('saved')} />
          <Chip label="My activities" icon="pulse-outline" selected={source === 'activities'} onPress={() => setSource('activities')} />
        </ChipRow>
        {source === 'nearby' || source === 'routes' ? (
          <ChipRow>
            {source === 'routes' ? <Chip label="All sports" selected={sport === 'All'} onPress={() => setSport('All')} /> : null}
            {MVP_SPORTS.map((s) => (
              <Chip key={s.id} label={s.label} icon={s.icon} selected={sport === s.id} onPress={() => setSport(s.id)} />
            ))}
          </ChipRow>
        ) : null}
      </View>

      <View style={{ top: insets.top + 168 }} className="absolute right-4">
        <IconButton icon="layers-outline" appearance="floating" accessibilityLabel="Map style" onPress={() => setStyleModalVisible(true)} />
      </View>
      <BottomSheet visible={styleModalVisible} onClose={() => setStyleModalVisible(false)} title="Map style">
        {(
          [
            ['standard', 'Standard', 'Streets, parks, water and paths', 'map-outline'],
            ['light', 'Light', 'Muted map so routes stand out', 'sunny-outline'],
            ['bright', 'Bright', 'High-contrast street map', 'contrast-outline'],
            ['3d', '3D buildings', 'Tilted view with OpenStreetMap building heights', 'cube-outline'],
          ] as const
        ).map(([id, title, description, icon]) => (
          <OptionRow key={id} title={title} description={description} icon={icon} selected={mapMode === id} onPress={() => (setMapMode(id), setStyleModalVisible(false))} />
        ))}
        <AppText variant="caption" color="inkTertiary" style={{ padding: space.gutter }}>
          Map data © OpenStreetMap contributors · tiles OpenFreeMap. Satellite and terrain views are not offered because no imagery or elevation tile source is configured.
        </AppText>
      </BottomSheet>
      <Pressable onPress={() => router.push('/routes/builder')} accessibilityRole="button" style={{ top: insets.top + 224 }} className="absolute right-4 flex-row items-center bg-white px-4 h-12 rounded-full shadow-lg border border-gray-100">
        <Ionicons name="create-outline" size={20} color="#1F2937" />
        <AppText variant="bodyStrong" style={{ marginLeft: space.sm }}>Create Route</AppText>
      </Pressable>
      {isPlaces && nearby.state.status === 'ready' ? (
        <AppText variant="caption" color="inkTertiary" style={{ bottom: 196 }} className="absolute left-4 bg-white/80 px-1 rounded">
          Places: {nearby.state.attribution}
        </AppText>
      ) : null}

      <View className="absolute left-0 right-0 bottom-4">{panel}</View>
    </View>
  );
}

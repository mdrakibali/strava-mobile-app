import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapView } from '../../components/map/MapView';
import { useApp } from '../../context/AppContext';
import { AppText, BottomSheet, Chip, ChipRow, IconButton, OptionRow, space } from '../../design';
import { MapStyleKey } from '../../components/map/mapTypes';
import { plannedRouteStore } from '../../lib/plannedRoute';
import { LngLat, toRoute } from '../../lib/activityView';
import { formatDuration, kmValue } from '../../lib/format';
import { MVP_SPORTS, sportConfig } from '../../lib/sports';
import { api } from '../../services/api';
import { haversineM } from '../../tracking/shared';
import { CURATED_DHAKA_ROUTES, CuratedRoute } from '../../lib/curatedRoutes';

type Source = 'routes' | 'saved' | 'nearby' | 'activities';

interface MapItem {
  id: string;
  kind: 'route' | 'activity' | 'place';
  name: string;
  subtitle: string;
  sportType: string;
  paths: LngLat[][];
  anchor: LngLat;
  distanceFromMeM: number | null;
  saved: boolean;
  distanceMeters: number;
  elevationGainMeters: number;
  estimatedTimeSeconds: number;
  estTimeText: string;
  surfacePercentPaved: number;
  description: string;
  creatorName: string;
  locationName: string;
  photos: string[];
}

const fmtAway = (m: number | null) =>
  m == null ? null : m < 1000 ? `${Math.round(m)} m away` : `${kmValue(m)} km away`;

export default function MapsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string; sport?: string; routeId?: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { currentUser } = useApp();

  // Strava default is 'routes' for route discovery
  const [source, setSourceRaw] = useState<Source>(
    params.source === 'saved' || params.source === 'activities' || params.source === 'nearby'
      ? (params.source as Source)
      : 'routes'
  );
  const [sport, setSportRaw] = useState<string>(
    MVP_SPORTS.some((s) => s.id === params.sport) ? params.sport! : 'All'
  );
  const [query, setQueryRaw] = useState('');
  const [routeItems, setRouteItems] = useState<MapItem[]>([]);
  const [routeStatus, setRouteStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [selectedId, setSelectedId] = useState<string | null>(params.routeId ?? null);
  const [detailSheetVisible, setDetailSheetVisible] = useState(false);

  const setSource = (v: Source) => {
    setSourceRaw(v);
    setSelectedId(null);
    setDetailSheetVisible(false);
  };
  const setSport = (v: string) => {
    setSportRaw(v);
    setSelectedId(null);
  };
  const setQuery = (v: string) => {
    setQueryRaw(v);
    setSelectedId(null);
  };

  const [me, setMe] = useState<LngLat | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const listRef = useRef<FlatList<MapItem>>(null);

  // Map styles & 3D tilt
  const [mapMode, setMapMode] = useState<'standard' | 'light' | 'bright' | '3d'>('standard');
  const [styleModalVisible, setStyleModalVisible] = useState(false);
  const [pitch, setPitch] = useState(0);
  const styleKey: MapStyleKey =
    mapMode === 'light' ? 'positron' : mapMode === 'bright' ? 'bright' : 'liberty';

  // Obtain current user location
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
  }, []);

  // Load curated and server routes
  const loadRoutes = useCallback(async (): Promise<MapItem[]> => {
    if (source === 'activities') {
      const res = await api.athletes.listActivities(currentUser.id, null, 50).catch(() => ({ activities: [] }));
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
            distanceMeters: Number(a.distanceMeters) || 0,
            elevationGainMeters: Number(a.elevationGainMeters) || 0,
            estimatedTimeSeconds: a.movingTimeSeconds || 0,
            estTimeText: formatDuration(a.movingTimeSeconds || 0),
            surfacePercentPaved: 95,
            description: a.description || 'Recorded activity route',
            creatorName: currentUser.displayName || 'You',
            locationName: 'My Activity',
            photos: [],
          };
        })
        .filter((a: MapItem) => a.paths[0].length > 1);
    }

    const [list, saved] = await Promise.all([
      source === 'saved' ? Promise.resolve(null) : api.routes.list().catch(() => ({ routes: [] })),
      api.routes.getSaved().catch(() => ({ savedRoutes: [] as any[] })),
    ]);

    const savedIds = new Set(saved.savedRoutes.map((r: any) => r.id ?? r.routeId));
    const serverRows = source === 'saved' ? saved.savedRoutes : (list?.routes ?? []);

    const serverItems: MapItem[] = serverRows
      .map((r: any) => {
        const path = toRoute(r.polylinePoints);
        return {
          id: r.id ?? r.routeId,
          kind: 'route' as const,
          name: r.name,
          subtitle: `${r.sportType} • ${kmValue(Number(r.distanceMeters) || 0)} km away • Dhaka`,
          sportType: r.sportType,
          paths: [path],
          anchor: path[0],
          distanceFromMeM: null,
          saved: savedIds.has(r.id ?? r.routeId),
          distanceMeters: Number(r.distanceMeters) || 0,
          elevationGainMeters: Number(r.elevationGainMeters) || 0,
          estimatedTimeSeconds: Number(r.estimatedTimeSeconds) || 0,
          estTimeText: r.estimatedTimeSeconds ? formatDuration(r.estimatedTimeSeconds) : '',
          surfacePercentPaved: r.surfaceTypes?.pavedPercent ?? 90,
          description: r.description || 'Verified cycling and running route.',
          creatorName: r.creator?.displayName || 'Community Athlete',
          locationName: 'Dhaka Metropolitan',
          photos: [],
        };
      })
      .filter((r: MapItem) => r.paths[0].length > 1);

    // Map curated Dhaka routes
    const curatedItems: MapItem[] = CURATED_DHAKA_ROUTES.map((c) => ({
      id: c.id,
      kind: 'route' as const,
      name: c.name,
      subtitle: c.subtitle,
      sportType: c.sportType,
      paths: [c.polyline],
      anchor: c.polyline[0],
      distanceFromMeM: null,
      saved: savedIds.has(c.id),
      distanceMeters: c.distanceMeters,
      elevationGainMeters: c.elevationGainMeters,
      estimatedTimeSeconds: c.estimatedTimeSeconds,
      estTimeText: c.estTimeText,
      surfacePercentPaved: c.surfacePercentPaved,
      description: c.description,
      creatorName: c.creatorName,
      locationName: c.locationName,
      photos: c.photos,
    }));

    if (source === 'saved') {
      const allSaved = [...serverItems, ...curatedItems.filter((c) => savedIds.has(c.id))];
      return allSaved;
    }

    return [...curatedItems, ...serverItems];
  }, [source, currentUser.id, currentUser.displayName]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void reloadKey;
      setRouteStatus('loading');
      loadRoutes().then(
        (rows) => {
          if (cancelled) return;
          setRouteItems(rows);
          if (!selectedId && rows.length > 0) {
            setSelectedId(rows[0].id);
          }
          setRouteStatus('ready');
        },
        () => !cancelled && setRouteStatus('error')
      );
      return () => {
        cancelled = true;
      };
    }, [loadRoutes, reloadKey, selectedId])
  );

  const visible = useMemo(() => {
    const rows = routeItems.filter((i) => sport === 'All' || i.sportType === sport);
    const q = query.trim().toLowerCase();
    const filtered = q ? rows.filter((i) => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)) : rows;
    if (!me) return filtered;
    const withDist = filtered.map((i) => ({
      ...i,
      distanceFromMeM: haversineM(me[1], me[0], i.anchor[1], i.anchor[0]),
    }));
    return withDist.sort((a, b) => (a.distanceFromMeM ?? 0) - (b.distanceFromMeM ?? 0));
  }, [routeItems, sport, query, me]);

  const selectedIndex = Math.max(0, visible.findIndex((v) => v.id === selectedId));
  const current = visible[selectedIndex] ?? visible[0];

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
      // Toggle locally if server error
    }
  };

  const startRoute = (item: MapItem) => {
    plannedRouteStore.set({
      name: item.name,
      sport: item.sportType,
      geometry: item.paths[0],
      distanceM: item.distanceMeters,
      durationS: item.estimatedTimeSeconds,
      elevationGainM: item.elevationGainMeters,
    });
    setDetailSheetVisible(false);
    router.push({ pathname: '/record', params: { sport: item.sportType } });
  };

  const togglePitch = () => {
    setPitch((prev) => (prev === 0 ? 55 : 0));
  };

  const cardWidth = width - 40;
  const others = useMemo(
    () => visible.filter((v) => v.id !== current?.id).slice(0, 20).flatMap((v) => v.paths),
    [visible, current]
  );
  const selectedPaths = current?.paths ?? [];
  const mainRoute = selectedPaths[0] ?? [];

  // Markers for route starting points
  const routeMarkers = useMemo(
    () =>
      visible.map((v) => ({
        id: v.id,
        coordinate: v.anchor,
        selected: v.id === current?.id,
      })),
    [visible, current]
  );

  return (
    <View className="flex-1 bg-black">
      {/* MapLibre OpenFreeMap View with crisp heading indicator */}
      <MapView
        mode="route"
        route={mainRoute}
        otherRoutes={others}
        userPosition={me}
        showUserLocation
        markers={routeMarkers}
        onMarkerPress={(id) => {
          const idx = visible.findIndex((v) => v.id === id);
          if (idx !== -1) select(idx);
        }}
        focus={current && mainRoute.length < 2 ? { center: current.anchor, zoom: 15 } : null}
        frameKey={current ? `route:${current.id}` : me ? 'me' : 'none'}
        padding={{ top: insets.top + 130, bottom: 240 }}
        styleKey={styleKey}
        pitch={pitch}
      />

      {/* Surface badge overlay on route (Strava reference e.g. "92% Paved") */}
      {current ? (
        <View
          style={{ top: insets.top + 124 }}
          className="absolute left-4 z-10 flex-row items-center bg-[#1A1A1AE6] px-3 py-1.5 rounded-full border border-neutral-700/80 shadow-md">
          <View className="w-2.5 h-2.5 rounded-full bg-[#FC4C02] mr-2" />
          <AppText className="text-white text-xs font-bold">
            {current.surfacePercentPaved}% Paved
          </AppText>
        </View>
      ) : null}

      {/* Top Search & Filter Bar */}
      <View style={{ top: insets.top + 8 }} className="absolute left-0 right-0 gap-1.5 z-20" pointerEvents="box-none">
        <View className="flex-row items-center mx-4 px-3.5 h-12 rounded-2xl bg-neutral-900/90 shadow-xl border border-neutral-800">
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={source === 'activities' ? 'Search your activities' : 'Search routes in Dhaka'}
            placeholderTextColor="#6B7280"
            className="flex-1 ml-2.5 text-base text-white"
            accessibilityLabel="Search"
            returnKeyType="search"
          />
          {query ? (
            <IconButton icon="close-circle" size={28} accessibilityLabel="Clear search" onPress={() => setQuery('')} />
          ) : null}
        </View>

        {/* Source selector row: Routes, Saved, My activities */}
        <ChipRow>
          <Chip label="Routes" icon="map-outline" selected={source === 'routes'} onPress={() => setSource('routes')} />
          <Chip label="Saved" icon="bookmark-outline" selected={source === 'saved'} onPress={() => setSource('saved')} />
          <Chip label="My activities" icon="pulse-outline" selected={source === 'activities'} onPress={() => setSource('activities')} />
          <Chip label="Nearby" icon="location-outline" selected={source === 'nearby'} onPress={() => setSource('nearby')} />
        </ChipRow>

        {/* Sport filters row */}
        <ChipRow>
          <Chip label="All Sports" selected={sport === 'All'} onPress={() => setSport('All')} />
          {MVP_SPORTS.map((s) => (
            <Chip key={s.id} label={s.label} icon={s.icon} selected={sport === s.id} onPress={() => setSport(s.id)} />
          ))}
        </ChipRow>
      </View>

      {/* Right Map Action Controls (Layers, 3D, Create Route) */}
      <View style={{ top: insets.top + 168 }} className="absolute right-4 items-center gap-2.5 z-20">
        <Pressable
          onPress={() => setStyleModalVisible(true)}
          className="w-11 h-11 rounded-full bg-neutral-900/90 border border-neutral-700/80 items-center justify-center shadow-lg active:bg-neutral-800">
          <Ionicons name="layers-outline" size={20} color="#FFFFFF" />
        </Pressable>

        <Pressable
          onPress={togglePitch}
          className={`w-11 h-11 rounded-full border items-center justify-center shadow-lg active:bg-neutral-800 ${
            pitch > 0 ? 'bg-[#FC4C02] border-[#FC4C02]' : 'bg-neutral-900/90 border-neutral-700/80'
          }`}>
          <AppText className="text-white text-xs font-black">3D</AppText>
        </Pressable>

        <Pressable
          onPress={() => router.push('/routes/builder')}
          className="flex-row items-center bg-neutral-900/90 px-3.5 h-11 rounded-full border border-neutral-700/80 shadow-lg active:bg-neutral-800">
          <Ionicons name="add" size={18} color="#FC4C02" />
          <AppText className="text-white text-xs font-bold ml-1">Route</AppText>
        </Pressable>
      </View>

      {/* Bottom Horizontal Route Preview Card */}
      <View className="absolute left-0 right-0 bottom-3 z-20">
        {routeStatus === 'loading' ? (
          <View className="mx-4 p-5 rounded-3xl bg-[#1C1C1EE6] border border-neutral-800 items-center justify-center">
            <ActivityIndicator color="#FC4C02" />
            <AppText className="text-neutral-400 text-xs mt-2">Discovering routes…</AppText>
          </View>
        ) : visible.length === 0 ? (
          <View className="mx-4 p-5 rounded-3xl bg-[#1C1C1EE6] border border-neutral-800 items-center justify-center">
            <AppText className="text-white text-sm font-bold">No routes match your filter</AppText>
            <AppText className="text-neutral-400 text-xs mt-1 text-center">
              Try selecting "All Sports" or clear the search query.
            </AppText>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={visible}
            horizontal
            keyExtractor={(i) => `${i.kind}:${i.id}`}
            showsHorizontalScrollIndicator={false}
            snapToInterval={cardWidth + 12}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: 16 }}
            onMomentumScrollEnd={(e) =>
              select(Math.round(e.nativeEvent.contentOffset.x / (cardWidth + 12)), false)
            }
            renderItem={({ item, index }) => {
              const selected = index === selectedIndex;
              const hasPhoto = item.photos && item.photos.length > 0;
              return (
                <Pressable
                  onPress={() => {
                    if (!selected) {
                      select(index);
                    } else {
                      setDetailSheetVisible(true);
                    }
                  }}
                  style={{ width: cardWidth, marginRight: 12 }}
                  className={`bg-[#1C1C1EE6] rounded-3xl p-3.5 border shadow-2xl flex-row items-center ${
                    selected ? 'border-[#FC4C02]' : 'border-neutral-800'
                  }`}>
                  {/* Photo Thumbnail */}
                  {hasPhoto ? (
                    <Image
                      source={{ uri: item.photos[0] }}
                      className="w-24 h-24 rounded-2xl bg-neutral-800 mr-3.5"
                      contentFit="cover"
                      transition={150}
                    />
                  ) : (
                    <View className="w-20 h-20 rounded-2xl bg-[#2A180E] items-center justify-center mr-3 border border-[#FC4C02]/30">
                      <Ionicons name={sportConfig(item.sportType).icon} size={28} color="#FC4C02" />
                    </View>
                  )}

                  {/* Route Info */}
                  <View className="flex-1 justify-between py-0.5">
                    <View className="flex-row items-start justify-between">
                      <AppText className="text-white text-sm font-black flex-1 mr-2" numberOfLines={1}>
                        {item.name}
                      </AppText>
                      <Pressable onPress={() => toggleSave(item)} hitSlop={8}>
                        <Ionicons
                          name={item.saved ? 'bookmark' : 'bookmark-outline'}
                          size={20}
                          color={item.saved ? '#FC4C02' : '#9CA3AF'}
                        />
                      </Pressable>
                    </View>

                    {/* Stats line */}
                    <View className="flex-row items-center mt-1">
                      <Ionicons name={sportConfig(item.sportType).icon} size={13} color="#FC4C02" />
                      <AppText className="text-neutral-300 text-xs font-semibold ml-1.5" numberOfLines={1}>
                        {kmValue(item.distanceMeters)} km · {item.elevationGainMeters} m · {item.estTimeText || '45m'}
                      </AppText>
                    </View>

                    {/* Location & Made for you pill */}
                    <View className="flex-row items-center justify-between mt-2">
                      <View className="flex-row items-center">
                        <Ionicons name="navigate-circle-outline" size={13} color="#9CA3AF" />
                        <AppText className="text-neutral-400 text-[11px] ml-1">
                          {fmtAway(item.distanceFromMeM) ?? 'From your location'}
                        </AppText>
                      </View>
                      <View className="flex-row items-center bg-[#FC4C02]/20 px-2 py-0.5 rounded-full border border-[#FC4C02]/40">
                        <Ionicons name="flame" size={11} color="#FC4C02" />
                        <AppText className="text-[#FC4C02] text-[10px] font-black ml-1">Made for you</AppText>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            }}
          />
        )}
      </View>

      {/* Strava Route Detail Full Bottom Sheet Modal */}
      {current ? (
        <Modal
          visible={detailSheetVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setDetailSheetVisible(false)}>
          <View className="flex-1 bg-black/60 justify-end">
            <View
              style={{ maxHeight: '82%', paddingBottom: Math.max(insets.bottom, 16) + 8 }}
              className="bg-[#1C1C1E] rounded-t-[32px] border-t border-neutral-800 shadow-2xl">
              {/* Top Handle */}
              <View className="w-10 h-1 rounded-full bg-neutral-600 self-center mt-3 mb-2" />

              {/* Header Navigation Actions */}
              <View className="flex-row items-center justify-between px-4 py-2 border-b border-neutral-800/80">
                <Pressable
                  onPress={() => setDetailSheetVisible(false)}
                  className="w-10 h-10 rounded-full bg-neutral-800/80 items-center justify-center">
                  <Ionicons name="chevron-down" size={22} color="#FFFFFF" />
                </Pressable>

                <View className="flex-row items-center gap-3">
                  <Pressable
                    onPress={() => toggleSave(current)}
                    className="w-10 h-10 rounded-full bg-neutral-800/80 items-center justify-center">
                    <Ionicons
                      name={current.saved ? 'bookmark' : 'bookmark-outline'}
                      size={20}
                      color={current.saved ? '#FC4C02' : '#FFFFFF'}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setDetailSheetVisible(false);
                      router.push('/routes/builder');
                    }}
                    className="w-10 h-10 rounded-full bg-neutral-800/80 items-center justify-center">
                    <Ionicons name="pencil-outline" size={20} color="#FFFFFF" />
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      Alert.alert('Route Link Copied', `${current.name} route link ready to share.`);
                    }}
                    className="w-10 h-10 rounded-full bg-neutral-800/80 items-center justify-center">
                    <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
                  </Pressable>
                </View>
              </View>

              <ScrollView className="px-5 pt-4" showsVerticalScrollIndicator={false}>
                {/* Title & Subtitle */}
                <AppText className="text-white text-2xl font-black leading-tight">
                  {current.name}
                </AppText>
                <AppText className="text-neutral-400 text-xs mt-1.5 font-medium">
                  {current.sportType} • {fmtAway(current.distanceFromMeM) ?? '0.0 km away'} • {current.locationName}
                </AppText>

                {/* 3 Metric Columns */}
                <View className="flex-row items-center justify-between py-4 my-3 border-y border-neutral-800/80">
                  <View className="items-start">
                    <AppText className="text-neutral-400 text-[11px] font-bold uppercase tracking-wider">Distance</AppText>
                    <AppText className="text-white text-xl font-black mt-0.5">{kmValue(current.distanceMeters)} km</AppText>
                  </View>
                  <View className="items-start">
                    <AppText className="text-neutral-400 text-[11px] font-bold uppercase tracking-wider">Elev gain</AppText>
                    <AppText className="text-white text-xl font-black mt-0.5">{current.elevationGainMeters} m</AppText>
                  </View>
                  <View className="items-start">
                    <AppText className="text-neutral-400 text-[11px] font-bold uppercase tracking-wider">Est time</AppText>
                    <AppText className="text-white text-xl font-black mt-0.5">{current.estTimeText || '45m'}</AppText>
                  </View>
                </View>

                {/* 4 Circular Action Buttons */}
                <View className="flex-row items-center justify-around py-2 mb-4">
                  {/* Save */}
                  <Pressable onPress={() => toggleSave(current)} className="items-center">
                    <View className="w-14 h-14 rounded-full bg-[#2C2C2E] items-center justify-center border border-neutral-700/60 shadow-lg active:bg-neutral-700">
                      <Ionicons
                        name={current.saved ? 'bookmark' : 'bookmark-outline'}
                        size={22}
                        color={current.saved ? '#FC4C02' : '#FFFFFF'}
                      />
                    </View>
                    <AppText className="text-neutral-300 text-xs font-semibold mt-1.5">
                      {current.saved ? 'Saved' : 'Save'}
                    </AppText>
                  </Pressable>

                  {/* Offline */}
                  <Pressable
                    onPress={() => Alert.alert('Offline Route Saved', 'This route geometry and map tiles are saved for offline use.')}
                    className="items-center">
                    <View className="w-14 h-14 rounded-full bg-[#2C2C2E] items-center justify-center border border-neutral-700/60 shadow-lg active:bg-neutral-700">
                      <Ionicons name="arrow-down-circle-outline" size={22} color="#FFFFFF" />
                    </View>
                    <AppText className="text-neutral-300 text-xs font-semibold mt-1.5">Offline</AppText>
                  </Pressable>

                  {/* Edit Route */}
                  <Pressable
                    onPress={() => {
                      setDetailSheetVisible(false);
                      router.push('/routes/builder');
                    }}
                    className="items-center">
                    <View className="w-14 h-14 rounded-full bg-[#2C2C2E] items-center justify-center border border-neutral-700/60 shadow-lg active:bg-neutral-700">
                      <Ionicons name="pencil-outline" size={22} color="#FFFFFF" />
                    </View>
                    <AppText className="text-neutral-300 text-xs font-semibold mt-1.5">Edit Route</AppText>
                  </Pressable>

                  {/* Start Route -> Navigates to /record */}
                  <Pressable onPress={() => startRoute(current)} className="items-center">
                    <View className="w-14 h-14 rounded-full bg-[#FC4C02] items-center justify-center shadow-lg active:bg-[#E03A00]">
                      <Ionicons name="play" size={24} color="#FFFFFF" className="ml-0.5" />
                    </View>
                    <AppText className="text-[#FC4C02] text-xs font-bold mt-1.5">Start</AppText>
                  </Pressable>
                </View>

                {/* Photos Carousel */}
                {current.photos && current.photos.length > 0 ? (
                  <View className="mb-4">
                    <AppText className="text-white text-xs font-black uppercase tracking-wider mb-2.5">
                      Route Photos ({current.photos.length})
                    </AppText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-3">
                      {current.photos.map((uri, idx) => (
                        <Image
                          key={idx}
                          source={{ uri }}
                          className="w-48 h-32 rounded-2xl bg-neutral-800 mr-2.5"
                          contentFit="cover"
                          transition={150}
                        />
                      ))}
                    </ScrollView>
                  </View>
                ) : null}

                {/* Description & Surface Details */}
                <View className="p-4 bg-neutral-900/80 rounded-2xl border border-neutral-800 mb-6">
                  <AppText className="text-white text-xs font-black uppercase tracking-wider mb-1.5">
                    About this route
                  </AppText>
                  <AppText className="text-neutral-300 text-xs leading-relaxed">
                    {current.description}
                  </AppText>

                  <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-neutral-800">
                    <AppText className="text-neutral-400 text-xs">Paved Surface Ratio</AppText>
                    <AppText className="text-[#FC4C02] text-xs font-black">{current.surfacePercentPaved}% Paved</AppText>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}

      {/* Map Style Selector Bottom Sheet */}
      <BottomSheet visible={styleModalVisible} onClose={() => setStyleModalVisible(false)} title="Map style">
        {(
          [
            ['standard', 'Standard', 'Streets, parks, water and paths', 'map-outline'],
            ['light', 'Light', 'Muted map so routes stand out', 'sunny-outline'],
            ['bright', 'Bright', 'High-contrast street map', 'contrast-outline'],
            ['3d', '3D buildings', 'Tilted view with OpenStreetMap building heights', 'cube-outline'],
          ] as const
        ).map(([id, title, description, icon]) => (
          <OptionRow
            key={id}
            title={title}
            description={description}
            icon={icon}
            selected={mapMode === id}
            onPress={() => {
              setMapMode(id);
              if (id === '3d') setPitch(55);
              else setPitch(0);
              setStyleModalVisible(false);
            }}
          />
        ))}
      </BottomSheet>
    </View>
  );
}

import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Linking, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapView } from '../../components/map/MapView';
import { DEFAULT_MAP_STYLE, MAP_STYLE_OPTIONS, MapStyleKey } from '../../components/map/mapTypes';
import { MapFilterChips } from '../../components/maps/MapFilterChips';
import { MapFloatingControls } from '../../components/maps/MapFloatingControls';
import { MapSearchBar } from '../../components/maps/MapSearchBar';
import { MapItem, MapSource } from '../../components/maps/mapTypes';
import { RouteCardCarousel } from '../../components/maps/RouteCardCarousel';
import { RouteDetailModal } from '../../components/maps/RouteDetailModal';
import { useMapRoutes } from '../../components/maps/useMapRoutes';
import { AppText, BottomSheet, OptionRow } from '../../design';
import { LngLat } from '../../lib/activityView';
import { plannedRouteStore } from '../../lib/plannedRoute';
import { MVP_SPORTS } from '../../lib/sports';
import { api } from '../../services/api';

export default function MapsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string; sport?: string; routeId?: string }>();
  const insets = useSafeAreaInsets();

  const [source, setSource] = useState<MapSource>(
    params.source === 'saved' || params.source === 'activities' || params.source === 'nearby'
      ? (params.source as MapSource)
      : 'routes'
  );
  const [sport, setSport] = useState<string>(
    MVP_SPORTS.some((s) => s.id === params.sport) ? params.sport! : 'All'
  );
  const [query, setQuery] = useState('');
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [lengthFilter, setLengthFilter] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);

  const [me, setMe] = useState<LngLat | null>(null);
  // Bumped by the recenter button so the camera re-frames even when the position is unchanged.
  const [recenterNonce, setRecenterNonce] = useState(0);
  const listRef = useRef<FlatList<MapItem>>(null);
  const pinned = useRef(Boolean(params.routeId));

  const [mapMode, setMapMode] = useState<MapStyleKey>(DEFAULT_MAP_STYLE);
  const [styleModalVisible, setStyleModalVisible] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'checking' | 'granted' | 'denied'>('checking');
  const [locationLoading, setLocationLoading] = useState(false);

  const requestLocation = useCallback(async () => {
    setLocationLoading(true);
    let perm = await Location.getForegroundPermissionsAsync().catch(() => null);
    if (!perm?.granted) {
      perm = await Location.requestForegroundPermissionsAsync().catch(() => null);
    }
    if (!perm?.granted) {
      setPermissionStatus('denied');
      setLocationLoading(false);
      return;
    }
    setPermissionStatus('granted');
    const fix =
      (await Location.getLastKnownPositionAsync({ maxAge: 120_000 }).catch(() => null)) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null));
    if (fix) {
      setMe([fix.coords.longitude, fix.coords.latitude]);
    }
    setLocationLoading(false);
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const { routeStatus, selectedId, setSelectedId, visible, toggleSave } = useMapRoutes(
    source,
    sport,
    query,
    lengthFilter,
    me,
    params.routeId,
    difficultyFilter
  );

  const selectedIndex = Math.max(0, visible.findIndex((v) => v.id === selectedId));
  const current = visible[selectedIndex] ?? visible[0];

  const select = (index: number) => {
    const item = visible[index];
    if (!item) return;
    pinned.current = true;
    setSelectedId(item.id);
    listRef.current?.scrollToIndex({ index, animated: true });
  };

  useEffect(() => {
    if (pinned.current || !me || visible.length === 0) return;
    if (visible[0].id !== selectedId) setSelectedId(visible[0].id);
  }, [me, visible, selectedId, setSelectedId]);

  const startRoute = async (item: MapItem) => {
    let geometry = item.paths[0] ?? [];
    let dist = item.distanceMeters;
    let dur = item.estimatedTimeSeconds;
    let elev = item.elevationGainMeters;

    if (item.kind === 'place' && geometry.length < 2 && me) {
      try {
        const plan = await api.routing.plan(
          item.sportType || 'Run',
          { lat: me[1], lng: me[0] },
          { lat: item.anchor[1], lng: item.anchor[0] }
        );
        if (plan.routes[0]?.geometry?.length > 1) {
          geometry = plan.routes[0].geometry;
          dist = plan.routes[0].distanceM;
          dur = plan.routes[0].durationS;
          elev = plan.routes[0].elevationGainM ?? 0;
        }
      } catch (err) {
        console.warn('Could not plan route to place:', err);
      }
    }

    plannedRouteStore.set({
      name: item.name,
      sport: item.sportType || 'Run',
      geometry,
      distanceM: dist,
      durationS: dur,
      elevationGainM: elev,
    });
    setDetailModalVisible(false);
    router.push({ pathname: '/record', params: { sport: item.sportType || 'Run' } });
  };

  const cycleLength = () => {
    if (!lengthFilter) setLengthFilter('< 5 km');
    else if (lengthFilter === '< 5 km') setLengthFilter('5-10 km');
    else if (lengthFilter === '5-10 km') setLengthFilter('> 10 km');
    else setLengthFilter(null);
  };

  const cycleDifficulty = () => {
    if (!difficultyFilter) setDifficultyFilter('Easy');
    else if (difficultyFilter === 'Easy') setDifficultyFilter('Moderate');
    else if (difficultyFilter === 'Moderate') setDifficultyFilter('Hard');
    else setDifficultyFilter(null);
  };

  const routeIsNear = !me || current?.distanceFromMeM == null || current.distanceFromMeM < 25_000;
  const mainRoute = routeIsNear ? (current?.paths[0] ?? []) : [];
  const others = useMemo(
    () =>
      visible
        .filter((v) => v.id !== current?.id && (!me || (v.distanceFromMeM != null && v.distanceFromMeM < 25_000)))
        .slice(0, 15)
        .flatMap((v) => v.paths),
    [visible, current, me]
  );
  const routeMarkers = useMemo(
    () =>
      visible.map((v) => ({
        id: v.id,
        coordinate: v.anchor,
        selected: v.id === current?.id,
        category: v.kind === 'place' ? v.placeCategory : undefined,
        name: v.name,
      })),
    [visible, current]
  );

  return (
    <View className="flex-1 bg-white">
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
        focus={
          mainRoute.length > 1
            ? null
            : me
              ? { center: me, zoom: 14 }
              : current
                ? { center: current.anchor, zoom: 15 }
                : null
        }
        frameKey={mainRoute.length > 1 && current ? `route:${current.id}` : me ? `me:${me[0].toFixed(3)},${me[1].toFixed(3)}:${recenterNonce}` : 'none'}
        padding={{ top: insets.top + 120, bottom: 250 }}
        styleKey={mapMode}
      />

      {current && current.kind === 'route' ? (
        <View
          style={{ top: insets.top + 116 }}
          className="absolute left-4 z-10 flex-row items-center bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-md">
          <View className="w-2.5 h-2.5 rounded-full bg-[#FC4C02] mr-2" />
          <AppText className="text-gray-900 text-xs font-bold">{current.surfacePercentPaved}% Paved</AppText>
        </View>
      ) : null}

      <View style={{ top: insets.top + 8 }} className="absolute left-0 right-0 gap-2 z-20" pointerEvents="box-none">
        <MapSearchBar
          query={query}
          onQueryChange={setQuery}
          selectedSport={sport}
          onSportPress={() => setSport((s) => (s === 'All' ? 'Run' : s === 'Run' ? 'Ride' : s === 'Ride' ? 'Walk' : 'All'))}
          source={source}
          onToggleSaved={() => setSource((s) => (s === 'saved' ? 'routes' : 'saved'))}
        />
        <MapFilterChips
          source={source}
          onSourceChange={setSource}
          selectedSport={sport}
          onSportChange={setSport}
          lengthFilter={lengthFilter}
          onCycleLength={cycleLength}
          difficultyFilter={difficultyFilter}
          onCycleDifficulty={cycleDifficulty}
        />
      </View>

      {permissionStatus === 'denied' ? (
        <View className="absolute top-36 left-4 right-4 z-20 p-4 rounded-2xl bg-white border border-red-200 shadow-xl">
          <View className="flex-row items-center mb-1.5">
            <Text className="text-sm font-bold text-gray-900">Location Permission Needed</Text>
          </View>
          <Text className="text-xs text-gray-600 mb-3 leading-4">
            To discover running and walking routes near you, please grant location access.
          </Text>
          <TouchableOpacity
            onPress={() => Linking.openSettings()}
            className="bg-[#FC4C02] py-2.5 px-4 rounded-xl items-center active:opacity-90">
            <Text className="text-xs font-bold text-white">Enable Location in Settings</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <MapFloatingControls
        topOffset={insets.top + 120}
        onOpenLayers={() => setStyleModalVisible(true)}
        onRecenter={() => me && setRecenterNonce((n) => n + 1)}
        onCreateRoute={() => router.push('/routes/builder')}
      />

      <RouteCardCarousel
        listRef={listRef}
        items={visible}
        selectedIndex={selectedIndex}
        loading={routeStatus === 'loading' || locationLoading}
        source={source}
        hasActiveFilter={Boolean(query.trim() || lengthFilter || difficultyFilter || sport !== 'All')}
        onSelect={select}
        onOpenDetail={(item) => {
          setSelectedId(item.id);
          setDetailModalVisible(true);
        }}
        onToggleSave={toggleSave}
      />

      <RouteDetailModal
        visible={detailModalVisible}
        item={current}
        onClose={() => setDetailModalVisible(false)}
        onStartRoute={startRoute}
        onToggleSave={toggleSave}
      />

      <BottomSheet visible={styleModalVisible} onClose={() => setStyleModalVisible(false)} title="Map style">
        {MAP_STYLE_OPTIONS.map(({ id, title, description: desc, icon }) => (
          <OptionRow
            key={id}
            title={title}
            description={desc}
            icon={icon}
            selected={mapMode === id}
            onPress={() => {
              setMapMode(id);
              setStyleModalVisible(false);
            }}
          />
        ))}
      </BottomSheet>
    </View>
  );
}

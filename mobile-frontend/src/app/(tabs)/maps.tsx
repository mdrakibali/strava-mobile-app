import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapView } from '../../components/map/MapView';
import { MapStyleKey } from '../../components/map/mapTypes';
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
  const listRef = useRef<FlatList<MapItem>>(null);
  const pinned = useRef(Boolean(params.routeId));

  const [mapMode, setMapMode] = useState<'liberty' | 'positron' | 'bright'>('liberty');
  const [styleModalVisible, setStyleModalVisible] = useState(false);
  const [pitch, setPitch] = useState(0);

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

  const { routeStatus, selectedId, setSelectedId, visible, toggleSave } = useMapRoutes(
    source,
    sport,
    query,
    lengthFilter,
    me,
    params.routeId
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

  const startRoute = (item: MapItem) => {
    plannedRouteStore.set({
      name: item.name,
      sport: item.sportType,
      geometry: item.paths[0],
      distanceM: item.distanceMeters,
      durationS: item.estimatedTimeSeconds,
      elevationGainM: item.elevationGainMeters,
    });
    setDetailModalVisible(false);
    router.push({ pathname: '/record', params: { sport: item.sportType } });
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
    () => visible.map((v) => ({ id: v.id, coordinate: v.anchor, selected: v.id === current?.id })),
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
        frameKey={mainRoute.length > 1 && current ? `route:${current.id}` : me ? `me:${me[0].toFixed(3)},${me[1].toFixed(3)}` : 'none'}
        padding={{ top: insets.top + 120, bottom: 250 }}
        styleKey={mapMode as MapStyleKey}
        pitch={pitch}
      />

      {current ? (
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
          activeFilter={source === 'routes' ? 'Routes' : ''}
          onFilterPress={(f) => f === 'Routes' && setSource('routes')}
          lengthFilter={lengthFilter}
          onCycleLength={cycleLength}
          difficultyFilter={difficultyFilter}
          onCycleDifficulty={cycleDifficulty}
        />
      </View>

      <MapFloatingControls
        topOffset={insets.top + 120}
        pitch={pitch}
        onTogglePitch={() => setPitch((p) => (p === 0 ? 55 : 0))}
        onOpenLayers={() => setStyleModalVisible(true)}
        onRecenter={() => me && setMe([...me])}
        onCreateRoute={() => router.push('/routes/builder')}
      />

      <RouteCardCarousel
        listRef={listRef}
        items={visible}
        selectedIndex={selectedIndex}
        loading={routeStatus === 'loading'}
        onSelect={select}
        onOpenDetail={() => setDetailModalVisible(true)}
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
        {(
          [
            ['liberty', 'Standard', 'Full color roads, parks, and waterways', 'map-outline'],
            ['positron', 'Light', 'Muted map so routes stand out', 'sunny-outline'],
            ['bright', 'Bright', 'High-contrast street map', 'contrast-outline'],
          ] as const
        ).map(([id, title, desc, icon]) => (
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

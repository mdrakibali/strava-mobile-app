import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapView } from '../../components/map/MapView';
import { useApp } from '../../context/AppContext';
import { AppText, Chip, ChipRow, color, elevation, IconButton, radius, space } from '../../design';
import { LngLat, toRoute } from '../../lib/activityView';
import { formatDuration, kmValue } from '../../lib/format';
import { MVP_SPORTS, sportConfig } from '../../lib/sports';
import { api } from '../../services/api';
import { haversineM } from '../../tracking/shared';

type Source = 'routes' | 'saved' | 'activities';

interface MapItem {
  id: string;
  kind: 'route' | 'activity';
  name: string;
  sportType: string;
  distanceMeters: number;
  elevationGainMeters: number | null;
  timeSeconds: number | null;
  path: LngLat[];
  author: string | null;
  saved: boolean;
}

/**
 * Maps tab (reference: strava-screen/maps-tab.png): full-screen map with the user's location,
 * route discovery (all routes / saved / your own recorded activities), search, sport filter,
 * a card carousel that frames the selected route, and Create Route.
 * Everything shown comes from the API; no invented surface stats or authors.
 */
export default function MapsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { currentUser } = useApp();
  const [source, setSourceRaw] = useState<Source>('routes');
  const [sport, setSportRaw] = useState<string>('All');
  const [query, setQueryRaw] = useState('');
  const [items, setItems] = useState<MapItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [selected, setSelected] = useState(0);
  // Changing what is listed always re-selects the first (nearest) item.
  const setSource = (v: Source) => (setSourceRaw(v), setSelected(0));
  const setSport = (v: string) => (setSportRaw(v), setSelected(0));
  const setQuery = (v: string) => (setQueryRaw(v), setSelected(0));
  const [me, setMe] = useState<LngLat | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const listRef = useRef<FlatList<MapItem>>(null);

  // Current location (one fix; the map's own user dot keeps tracking).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const perm = await Location.requestForegroundPermissionsAsync().catch(() => null);
      if (!perm?.granted || cancelled) return;
      const last = await Location.getLastKnownPositionAsync().catch(() => null);
      if (last && !cancelled) setMe([last.coords.longitude, last.coords.latitude]);
      const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
      if (fix && !cancelled) setMe([fix.coords.longitude, fix.coords.latitude]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async (): Promise<MapItem[]> => {
    if (source === 'activities') {
      const res = await api.athletes.listActivities(currentUser.id, null, 50);
      return res.activities
        .map((a: any) => ({
          id: a.id,
          kind: 'activity' as const,
          name: a.title,
          sportType: a.sportType,
          distanceMeters: Number(a.distanceMeters) || 0,
          elevationGainMeters: a.elevationGainMeters ?? null,
          timeSeconds: a.movingTimeSeconds ?? null,
          path: toRoute(a.polyline),
          author: null,
          saved: false,
        }))
        .filter((a: MapItem) => a.path.length > 1);
    }
    const [list, saved] = await Promise.all([
      source === 'saved' ? Promise.resolve(null) : api.routes.list(),
      api.routes.getSaved().catch(() => ({ savedRoutes: [] as any[] })),
    ]);
    const savedIds = new Set(saved.savedRoutes.map((r: any) => r.id ?? r.routeId));
    const rows = source === 'saved' ? saved.savedRoutes : list!.routes;
    return rows
      .map((r: any) => ({
        id: r.id ?? r.routeId,
        kind: 'route' as const,
        name: r.name,
        sportType: r.sportType,
        distanceMeters: Number(r.distanceMeters) || 0,
        elevationGainMeters: r.elevationGainMeters != null ? Number(r.elevationGainMeters) : null,
        timeSeconds: r.estimatedTimeSeconds ?? null,
        path: toRoute(r.polylinePoints),
        author: r.creator?.displayName ?? null,
        saved: savedIds.has(r.id ?? r.routeId),
      }))
      .filter((r: MapItem) => r.path.length > 1);
  }, [source, currentUser.id]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void reloadKey; // retry trigger
      load().then(
        (rows) => {
          if (cancelled) return;
          setItems(rows);
          setStatus('ready');
        },
        () => !cancelled && setStatus('error')
      );
      return () => {
        cancelled = true;
      };
    }, [load, reloadKey])
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = items.filter((i) => (sport === 'All' || i.sportType === sport) && (!q || i.name.toLowerCase().includes(q)));
    if (!me) return rows;
    // Nearest first when we know where the athlete is.
    const dist = (i: MapItem) => haversineM(me[1], me[0], i.path[0][1], i.path[0][0]);
    return [...rows].sort((a, b) => dist(a) - dist(b));
  }, [items, sport, query, me]);

  const current = visible[Math.min(selected, Math.max(0, visible.length - 1))];

  const toggleSave = async (item: MapItem) => {
    setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, saved: !x.saved } : x)));
    try {
      const res = await api.routes.toggleSave(item.id);
      setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, saved: Boolean(res.isSaved) } : x)));
    } catch {
      setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, saved: item.saved } : x)));
    }
  };

  const cardWidth = width - space.gutter * 2 - 24;
  const others = useMemo(() => visible.filter((v) => v.id !== current?.id).slice(0, 30).map((v) => v.path), [visible, current]);

  return (
    <View style={styles.screen}>
      <MapView
        mode="route"
        route={current?.path ?? []}
        otherRoutes={others}
        userPosition={me}
        showUserLocation
        frameKey={current ? `${current.kind}:${current.id}` : me ? 'me' : 'none'}
        padding={{ top: insets.top + 120, bottom: 190 }}
      />

      <View style={[styles.top, { top: insets.top + space.sm }]} pointerEvents="box-none">
        <View style={[styles.search, elevation.floating]}>
          <Ionicons name="search" size={18} color={color.inkSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={source === 'activities' ? 'Search your activities' : 'Search routes'}
            placeholderTextColor={color.inkTertiary}
            style={styles.searchInput}
            accessibilityLabel="Search"
            returnKeyType="search"
          />
          {query ? <IconButton icon="close-circle" size={32} accessibilityLabel="Clear search" onPress={() => setQuery('')} /> : null}
        </View>
        <ChipRow>
          <Chip label="Routes" icon="map-outline" selected={source === 'routes'} onPress={() => setSource('routes')} />
          <Chip label="Saved" icon="bookmark-outline" selected={source === 'saved'} onPress={() => setSource('saved')} />
          <Chip label="My activities" icon="pulse-outline" selected={source === 'activities'} onPress={() => setSource('activities')} />
          <Chip label="All sports" selected={sport === 'All'} onPress={() => setSport('All')} />
          {MVP_SPORTS.map((s) => (
            <Chip key={s.id} label={s.label} icon={s.icon} selected={sport === s.id} onPress={() => setSport(s.id)} />
          ))}
        </ChipRow>
      </View>

      <View style={[styles.sideButtons, { bottom: 200 }]} pointerEvents="box-none">
        <IconButton
          icon="locate"
          appearance="floating"
          accessibilityLabel="Centre on my location"
          onPress={() => {
            setSelected(0);
            setQuery('');
          }}
        />
      </View>

      <Pressable
        onPress={() => router.push('/routes/builder')}
        accessibilityRole="button"
        style={[styles.create, elevation.floating, { bottom: 200 }]}>
        <Ionicons name="create-outline" size={20} color={color.ink} />
        <AppText variant="bodyStrong" style={{ marginLeft: space.sm }}>Create Route</AppText>
      </Pressable>

      <View style={styles.bottom}>
        {status === 'loading' ? (
          <View style={[styles.card, styles.center, { width: width - space.gutter * 2, marginLeft: space.gutter }]}>
            <ActivityIndicator color={color.brand} />
          </View>
        ) : status === 'error' ? (
          <Pressable
            onPress={() => {
              setStatus('loading');
              setReloadKey((k) => k + 1);
            }}
            style={[styles.card, styles.center, { width: width - space.gutter * 2, marginLeft: space.gutter }]}>
            <AppText variant="bodyStrong">Couldn’t load the map data</AppText>
            <AppText variant="label" color="brandText">Tap to retry</AppText>
          </Pressable>
        ) : visible.length === 0 ? (
          <View style={[styles.card, styles.center, { width: width - space.gutter * 2, marginLeft: space.gutter }]}>
            <AppText variant="bodyStrong">
              {source === 'saved' ? 'No saved routes yet' : source === 'activities' ? 'No recorded routes yet' : 'No routes found'}
            </AppText>
            <AppText variant="label" color="inkSecondary" style={{ textAlign: 'center', marginTop: 2 }}>
              {source === 'activities' ? 'Record an activity with GPS to see it here.' : 'Create a route or change the filters.'}
            </AppText>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={visible}
            horizontal
            keyExtractor={(i) => `${i.kind}:${i.id}`}
            showsHorizontalScrollIndicator={false}
            snapToInterval={cardWidth + space.md}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: space.gutter }}
            onMomentumScrollEnd={(e) => setSelected(Math.round(e.nativeEvent.contentOffset.x / (cardWidth + space.md)))}
            renderItem={({ item, index }) => {
              const away = me ? haversineM(me[1], me[0], item.path[0][1], item.path[0][0]) : null;
              return (
                <Pressable
                  onPress={() =>
                    index !== selected
                      ? (setSelected(index), listRef.current?.scrollToIndex({ index, animated: true }))
                      : router.push(
                          item.kind === 'route'
                            ? { pathname: '/routes/[id]', params: { id: item.id } }
                            : { pathname: '/activity/[id]', params: { id: item.id } }
                        )
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`${item.name}. ${index === selected ? 'Open' : 'Show on map'}`}
                  style={[styles.card, { width: cardWidth, marginRight: space.md }, index === selected && styles.cardSelected]}>
                  <View style={styles.row}>
                    <Ionicons name={sportConfig(item.sportType).icon} size={18} color={color.brandText} />
                    <AppText variant="title3" numberOfLines={1} style={{ flex: 1, marginLeft: space.sm }}>{item.name}</AppText>
                    {item.kind === 'route' ? (
                      <IconButton
                        icon={item.saved ? 'bookmark' : 'bookmark-outline'}
                        size={36}
                        accessibilityLabel={item.saved ? 'Remove from saved' : 'Save route'}
                        onPress={() => toggleSave(item)}
                      />
                    ) : null}
                  </View>
                  <AppText variant="label" color="inkSecondary" style={{ marginTop: 2 }}>
                    {kmValue(item.distanceMeters)} km
                    {item.elevationGainMeters != null ? ` · ${Math.round(item.elevationGainMeters)} m` : ''}
                    {item.timeSeconds ? ` · ${formatDuration(item.timeSeconds)}` : ''}
                  </AppText>
                  <AppText variant="label" color="inkSecondary" style={{ marginTop: 2 }} numberOfLines={1}>
                    {away != null ? (away < 1000 ? `${Math.round(away)} m from you` : `${kmValue(away)} km from you`) : 'Location unknown'}
                    {item.author ? ` · by ${item.author}` : ''}
                  </AppText>
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  top: { position: 'absolute', left: 0, right: 0 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: space.gutter,
    marginBottom: space.sm,
    paddingHorizontal: space.md,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: color.surface,
  },
  searchInput: { flex: 1, marginLeft: space.sm, fontSize: 16, color: color.ink },
  sideButtons: { position: 'absolute', right: space.gutter },
  create: {
    position: 'absolute',
    right: space.gutter + 60,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.surface,
    paddingHorizontal: space.lg,
    height: 48,
    borderRadius: 24,
  },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: space.lg },
  card: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg, minHeight: 110, ...elevation.floating },
  cardSelected: { borderWidth: 2, borderColor: color.brand },
  center: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
});

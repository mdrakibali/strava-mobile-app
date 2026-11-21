import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LngLat, toRoute } from '../../lib/activityView';
import { CURATED_DHAKA_ROUTES } from '../../lib/curatedRoutes';
import { formatDuration, kmValue } from '../../lib/format';
import { api, NearbyPlace } from '../../services/api';
import { haversineM } from '../../tracking/shared';
import { MapItem, MapSource } from './mapTypes';

export function useMapRoutes(
  source: MapSource,
  sport: string,
  query: string,
  lengthFilter: string | null,
  me: LngLat | null,
  initialRouteId?: string
) {
  const [routeItems, setRouteItems] = useState<MapItem[]>([]);
  const [nearbyItems, setNearbyItems] = useState<MapItem[]>([]);
  const [routeStatus, setRouteStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [selectedId, setSelectedId] = useState<string | null>(initialRouteId ?? null);

  const loadRoutes = useCallback(async (): Promise<MapItem[]> => {
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
          subtitle: `${r.sportType} • ${kmValue(Number(r.distanceMeters) || 0)} km • Dhaka`,
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
      return [...serverItems, ...curatedItems.filter((c) => savedIds.has(c.id))];
    }
    return [...curatedItems, ...serverItems];
  }, [source]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setRouteStatus('loading');
      loadRoutes().then(
        (rows) => {
          if (cancelled) return;
          setRouteItems(rows);
          if (!selectedId && rows.length > 0) setSelectedId(rows[0].id);
          setRouteStatus('ready');
        },
        () => !cancelled && setRouteStatus('error')
      );
      return () => {
        cancelled = true;
      };
    }, [loadRoutes, selectedId])
  );

  useEffect(() => {
    if (!me) {
      setNearbyItems([]);
      return;
    }
    const sports = sport === 'All' ? (['Walk', 'Run', 'Ride'] as const) : ([sport] as const);
    let cancelled = false;
    (async () => {
      const lists = await Promise.all(
        sports.map((s) => api.places.nearby(me[1], me[0], s, 5000).catch(() => null))
      );
      if (cancelled) return;
      const places = lists.flatMap((list, i) => (list?.places ?? []).map((p) => ({ ...p, sportType: sports[i] })));
      const seen = new Set<string>();
      const unique = places.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
      const withPath = unique.filter((p) => (p.path ?? []).some((line) => line.length > 1));
      const needsPlan = unique.filter((p) => !(p.path ?? []).some((line) => line.length > 1)).slice(0, 2);
      const planned = (
        await Promise.all(
          needsPlan.map(async (p) => {
            try {
              const plan = await api.routing.plan(p.sportType, { lat: me[1], lng: me[0] }, { lat: p.lat, lng: p.lng });
              const route = plan.routes[0];
              if (!route || route.geometry.length < 2) return null;
              return placeRouteItem(p, p.sportType, route.geometry, route.distanceM, route.durationS, route.elevationGainM ?? 0);
            } catch {
              return null;
            }
          })
        )
      ).filter((item): item is MapItem => item != null);
      if (cancelled) return;
      setNearbyItems([
        ...withPath.map((p) => {
          const lines = (p.path ?? []).filter((line) => line.length > 1);
          const length = p.lengthM || lines.reduce((sum, line) => sum + pathLength(line), 0);
          return placeRouteItem(p, p.sportType, lines[0], length, null, 0, lines);
        }),
        ...planned,
      ]);
    })();
    return () => {
      cancelled = true;
    };
  }, [me, sport]);

  const visible = useMemo(() => {
    let rows = [...nearbyItems, ...routeItems].filter((i) => sport === 'All' || i.sportType === sport);
    const q = query.trim().toLowerCase();
    if (q) rows = rows.filter((i) => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
    if (lengthFilter === '< 5 km') rows = rows.filter((i) => i.distanceMeters < 5000);
    else if (lengthFilter === '5-10 km') rows = rows.filter((i) => i.distanceMeters >= 5000 && i.distanceMeters <= 10000);
    else if (lengthFilter === '> 10 km') rows = rows.filter((i) => i.distanceMeters > 10000);
    if (!me) return rows;
    const withDist = rows.map((i) => ({
      ...i,
      distanceFromMeM: haversineM(me[1], me[0], i.anchor[1], i.anchor[0]),
    }));
    return withDist.sort((a, b) => (a.distanceFromMeM ?? 0) - (b.distanceFromMeM ?? 0));
  }, [routeItems, nearbyItems, sport, query, lengthFilter, me]);

  const toggleSave = async (item: MapItem) => {
    const patch = (list: MapItem[]) => list.map((x) => (x.id === item.id ? { ...x, saved: !x.saved } : x));
    setRouteItems(patch);
    setNearbyItems(patch);
    try {
      const res = await api.routes.toggleSave(item.id);
      const apply = (list: MapItem[]) => list.map((x) => (x.id === item.id ? { ...x, saved: Boolean(res.isSaved) } : x));
      setRouteItems(apply);
      setNearbyItems(apply);
    } catch {
      const revert = (list: MapItem[]) => list.map((x) => (x.id === item.id ? { ...x, saved: item.saved } : x));
      setRouteItems(revert);
      setNearbyItems(revert);
    }
  };

  return {
    routeStatus,
    selectedId,
    setSelectedId,
    visible,
    toggleSave,
  };
}

const pathLength = (line: [number, number][]) => {
  let m = 0;
  for (let i = 1; i < line.length; i++) m += haversineM(line[i - 1][1], line[i - 1][0], line[i][1], line[i][0]);
  return m;
};

const placeRouteItem = (
  place: NearbyPlace,
  sportType: string,
  line: [number, number][],
  distanceM: number,
  durationS: number | null,
  elevationM: number,
  paths?: [number, number][][]
): MapItem => ({
  id: `place:${place.id}`,
  kind: 'place',
  name: place.name,
  subtitle: place.address || place.category,
  sportType,
  paths: paths && paths.length ? paths : [line],
  anchor: line[0] ?? [place.lng, place.lat],
  distanceFromMeM: place.distanceM,
  saved: false,
  distanceMeters: distanceM,
  elevationGainMeters: elevationM,
  estimatedTimeSeconds: durationS ?? 0,
  estTimeText: durationS ? formatDuration(durationS) : '',
  surfacePercentPaved: place.surface === 'asphalt' || place.surface === 'paved' ? 100 : 0,
  description: place.address || `Mapped ${place.category.replace('_', ' ')} near you.`,
  creatorName: 'OpenStreetMap',
  locationName: place.address || place.name,
  photos: [],
});


import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { LngLat, toRoute } from '../../lib/activityView';
import { CURATED_DHAKA_ROUTES } from '../../lib/curatedRoutes';
import { formatDuration, kmValue } from '../../lib/format';
import { api } from '../../services/api';
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

  const visible = useMemo(() => {
    let rows = routeItems.filter((i) => sport === 'All' || i.sportType === sport);
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
  }, [routeItems, sport, query, lengthFilter, me]);

  const toggleSave = async (item: MapItem) => {
    setRouteItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, saved: !x.saved } : x)));
    try {
      const res = await api.routes.toggleSave(item.id);
      setRouteItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, saved: Boolean(res.isSaved) } : x)));
    } catch {}
  };

  return {
    routeStatus,
    selectedId,
    setSelectedId,
    visible,
    toggleSave,
  };
}


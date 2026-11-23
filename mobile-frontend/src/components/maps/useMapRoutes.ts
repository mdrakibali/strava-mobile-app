import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToggleSaveRoute } from '../../hooks/useRoutes';
import { LngLat, toRoute } from '../../lib/activityView';
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
  initialRouteId?: string,
  difficultyFilter?: string | null
) {
  const toggleSaveRouteMutation = useToggleSaveRoute();
  const [routeItems, setRouteItems] = useState<MapItem[]>([]);
  const [nearbyItems, setNearbyItems] = useState<MapItem[]>([]);
  const [routeStatus, setRouteStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [nearbyStatus, setNearbyStatus] = useState<
    'idle' | 'loading' | 'ready' | 'empty' | 'error'
  >('idle');
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [nearbyNonce, setNearbyNonce] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(initialRouteId ?? null);

  const reloadNearby = useCallback(() => {
    setNearbyNonce((n) => n + 1);
  }, []);

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
          subtitle: `${r.sportType} • ${kmValue(Number(r.distanceMeters) || 0)} km`,
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
          description: r.description || '',
          creatorName: r.creator?.displayName || 'Community Athlete',
          locationName: r.locationName || 'Local Route',
          photos: [],
          elevationProfile: r.elevationProfile ?? null,
          difficulty:
            Number(r.distanceMeters) > 15000 || Number(r.elevationGainMeters) > 300
              ? 'Hard'
              : Number(r.distanceMeters) > 7000 || Number(r.elevationGainMeters) > 100
                ? 'Moderate'
                : 'Easy',
        };
      })
      .filter((r: MapItem) => r.paths[0].length > 1);

    return serverItems;
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

  const [prevMe, setPrevMe] = useState(me);
  if (me !== prevMe) {
    setPrevMe(me);
    if (!me) {
      setNearbyItems([]);
      setNearbyStatus('idle');
      setNearbyError(null);
    }
  }

  useEffect(() => {
    if (!me) return;
    let cancelled = false;

    (async () => {
      setNearbyStatus('loading');
      setNearbyError(null);
      try {
        let res: any = null;
        let lastErr: any = null;
        try {
          res = await api.places.nearby(me[1], me[0], sport, 5000);
        } catch (e: any) {
          lastErr = e;
        }

        // Only expand to 10 km if 5 km succeeded with 0 places (not on provider error)
        if (!lastErr && (!res?.places || res.places.length === 0)) {
          try {
            res = await api.places.nearby(me[1], me[0], sport, 10000);
          } catch (e: any) {
            lastErr = e;
          }
        }

        if (cancelled) return;

        if (lastErr) {
          setNearbyError(lastErr?.message || 'Nearby places are temporarily unavailable.');
          setNearbyStatus('error');
          setNearbyItems([]);
          return;
        }

        const places = res?.places ?? [];
        if (places.length === 0) {
          setNearbyStatus('empty');
          setNearbyItems([]);
          return;
        }

        const seen = new Set<string>();
        const unique = places.filter((p: any) => (seen.has(p.id) ? false : (seen.add(p.id), true)));

        setNearbyItems(
          unique.map((p: any) => {
            const lines = (p.path ?? []).filter((line: any) => line.length > 1);
            const length =
              p.lengthM ||
              (lines.length > 0
                ? lines.reduce((sum: number, line: any) => sum + pathLength(line), 0)
                : 0);
            return placeRouteItem(
              p,
              sport === 'All' ? 'Run' : sport,
              lines[0] ?? [],
              length,
              null,
              0,
              lines
            );
          })
        );
        setNearbyStatus('ready');
      } catch (err: any) {
        if (cancelled) return;
        setNearbyError(err?.message || 'Nearby places are temporarily unavailable.');
        setNearbyStatus('error');
        setNearbyItems([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [me, sport, nearbyNonce]);

  const visible = useMemo(() => {
    let rows: MapItem[];
    if (source === 'saved') {
      rows = routeItems.filter((i) => i.saved);
    } else if (source === 'nearby') {
      rows = nearbyItems;
    } else {
      rows = [...routeItems, ...nearbyItems];
    }

    if (sport !== 'All') {
      rows = rows.filter((i) => i.sportType === sport);
    }

    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.subtitle.toLowerCase().includes(q)
      );
    }

    if (lengthFilter === '< 5 km') rows = rows.filter((i) => i.distanceMeters < 5000);
    else if (lengthFilter === '5-10 km')
      rows = rows.filter((i) => i.distanceMeters >= 5000 && i.distanceMeters <= 10000);
    else if (lengthFilter === '> 10 km') rows = rows.filter((i) => i.distanceMeters > 10000);

    if (difficultyFilter) {
      rows = rows.filter((i) => !i.difficulty || i.difficulty === difficultyFilter);
    }

    if (!me) return rows;
    const withDist = rows.map((i) => ({
      ...i,
      distanceFromMeM: haversineM(me[1], me[0], i.anchor[1], i.anchor[0]),
    }));
    return withDist.sort((a, b) => (a.distanceFromMeM ?? 0) - (b.distanceFromMeM ?? 0));
  }, [routeItems, nearbyItems, source, sport, query, lengthFilter, difficultyFilter, me]);

  // Auto-plan real street route from user location to selected place so map draws the highlighted route polyline
  useEffect(() => {
    if (!me || !selectedId) return;
    const target = visible.find((v) => v.id === selectedId);
    if (!target) return;
    // If it already has a full route line (> 1 points), nothing needed
    if (target.paths && target.paths[0] && target.paths[0].length > 1) return;

    let cancelled = false;
    const planSport = sport === 'All' ? 'Run' : sport;
    api.routing
      .plan(planSport, { lat: me[1], lng: me[0] }, { lat: target.anchor[1], lng: target.anchor[0] })
      .then((plan) => {
        if (cancelled || !plan?.routes?.[0]?.geometry?.length) return;
        const r0 = plan.routes[0];
        const update = (list: MapItem[]) =>
          list.map((it) => {
            if (it.id === selectedId) {
              return {
                ...it,
                paths: [r0.geometry],
                distanceMeters: r0.distanceM,
                estimatedTimeSeconds: r0.durationS,
                estTimeText: formatDuration(r0.durationS),
                elevationGainMeters: r0.elevationGainM ?? 0,
                elevationProfile: r0.elevationProfile
                  ? r0.elevationProfile.map((p) => p[1])
                  : undefined,
                surfacePercentPaved: 85,
              };
            }
            return it;
          });
        setNearbyItems(update);
        setRouteItems(update);
      })
      .catch(() => {
        // Fallback: draw a direct line between me and anchor
        if (cancelled) return;
        const directLine: [number, number][] = [me, target.anchor];
        const update = (list: MapItem[]) =>
          list.map((it) => (it.id === selectedId ? { ...it, paths: [directLine] } : it));
        setNearbyItems(update);
        setRouteItems(update);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId, me, sport, visible]);

  const toggleSave = async (item: MapItem) => {
    const patch = (list: MapItem[]) =>
      list.map((x) => (x.id === item.id ? { ...x, saved: !x.saved } : x));
    setRouteItems(patch);
    setNearbyItems(patch);
    try {
      const res = await toggleSaveRouteMutation.mutateAsync(item.id);
      const apply = (list: MapItem[]) =>
        list.map((x) => (x.id === item.id ? { ...x, saved: Boolean(res.isSaved) } : x));
      setRouteItems(apply);
      setNearbyItems(apply);
    } catch {
      const revert = (list: MapItem[]) =>
        list.map((x) => (x.id === item.id ? { ...x, saved: item.saved } : x));
      setRouteItems(revert);
      setNearbyItems(revert);
    }
  };

  return {
    routeStatus,
    nearbyStatus,
    nearbyError,
    reloadNearby,
    selectedId,
    setSelectedId,
    visible,
    toggleSave,
  };
}

const pathLength = (line: [number, number][]) => {
  let m = 0;
  for (let i = 1; i < line.length; i++)
    m += haversineM(line[i - 1][1], line[i - 1][0], line[i][1], line[i][0]);
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
  subtitle: place.address || place.category.replace(/_/g, ' '),
  sportType,
  paths: paths && paths.length ? paths : line.length > 1 ? [line] : [],
  anchor: [place.lng, place.lat],
  distanceFromMeM: place.distanceM,
  saved: false,
  distanceMeters: distanceM,
  elevationGainMeters: elevationM,
  estimatedTimeSeconds: durationS ?? 0,
  estTimeText: durationS ? formatDuration(durationS) : '',
  surfacePercentPaved: place.surface === 'asphalt' || place.surface === 'paved' ? 100 : 0,
  description: place.address || `Mapped ${place.category.replace(/_/g, ' ')} near you.`,
  creatorName: 'OpenStreetMap',
  locationName: place.address || place.name,
  photos: [],
  placeCategory: place.category,
  placeAddress: place.address,
  osmUrl: place.osmUrl,
});

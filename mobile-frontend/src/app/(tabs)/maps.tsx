import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  HeatmapTypeOption,
  MapMarkerItem,
  MapTypeOption,
  StravaMapView,
  TerrainTypeOption,
} from '../../components/map/StravaMapView';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { RouteItem, SportType } from '../../types';

const calculateHaversineKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return +(R * c).toFixed(1);
};

const getEstimatedDuration = (distanceMeters: number, sport: SportType) => {
  const km = distanceMeters / 1000;
  const mins = sport === 'Ride' ? Math.round((km / 22) * 60) : Math.round(km * 5.5);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export default function MapsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { segments, activities } = useApp();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState<'Run' | 'Ride' | 'Hike' | 'Walk'>('Run');
  const [activeFilter, setActiveFilter] = useState<'Routes' | 'Length' | 'Difficulty' | 'Elevation' | 'Surface'>('Routes');
  const [selectedRoute, setSelectedRoute] = useState<RouteItem | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Layers & Map Controls (100% Free & Unlocked for All Users)
  const [showLayersSheet, setShowLayersSheet] = useState(false);
  const [mapType, setMapType] = useState<MapTypeOption>('standard');
  const [heatmapType, setHeatmapType] = useState<HeatmapTypeOption>('global_run');
  const [terrainType, setTerrainType] = useState<TerrainTypeOption>('none');
  const [is3D, setIs3D] = useState(false);
  const [poiEnabled, setPoiEnabled] = useState(true);
  const [bikeLanesEnabled, setBikeLanesEnabled] = useState(false);

  // Live GPS coordinate tracking
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }).catch(() => null);
          if (loc) {
            setUserLocation([loc.coords.longitude, loc.coords.latitude]);
          }
          sub = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, distanceInterval: 5 },
            (newLoc) => {
              setUserLocation([newLoc.coords.longitude, newLoc.coords.latitude]);
            }
          );
        }
      } catch (err) {
        console.warn('Location query error on maps tab:', err);
      }
    })();
    return () => {
      sub?.remove();
    };
  }, []);

  // Dynamic routes created from real recorded workouts
  const activityRoutes: RouteItem[] = activities
    .filter((a) => a.routePoints && a.routePoints.length > 0)
    .map((a) => ({
      id: a.id,
      name: a.title,
      sportType: (a.sportType as any) || 'Run',
      distanceMeters: a.distanceMeters,
      elevationGainMeters: a.elevationGainMeters,
      estimatedTimeSeconds: a.movingTimeSeconds,
      polylinePoints: a.routePoints || [],
      surfacePavedPercent: 95,
      surfaceGravelPercent: 5,
      surfaceDirtPercent: 0,
      elevationProfile: a.elevationProfile || [10, 15, 20, 15, 10],
      turns: [],
      isSaved: true,
      authorName: a.athlete?.displayName || 'Md Rakib Ali',
      climbCategory: a.elevationGainMeters > 30 ? 'Moderate Climb' : 'Flat Grade',
    }));

  const [serverRoutes, setServerRoutes] = useState<RouteItem[]>([]);

  useEffect(() => {
    api.routes.list().then((res) => {
      if (res?.routes && res.routes.length > 0) {
        setServerRoutes(
          res.routes.map((r: any) => ({
            id: r.id,
            name: r.name,
            sportType: r.sportType || 'Run',
            distanceMeters: Number(r.distanceMeters || 5000),
            elevationGainMeters: r.elevationGainMeters || 20,
            estimatedTimeSeconds: r.estimatedTimeSeconds || 1800,
            polylinePoints: r.polylinePoints || [],
            surfacePavedPercent: 90,
            surfaceGravelPercent: 10,
            surfaceDirtPercent: 0,
            elevationProfile: r.elevationProfile || [10, 15, 20, 15, 10],
            turns: [],
            isSaved: false,
            authorName: r.creator?.displayName || 'Md Rakib Ali',
            climbCategory: Number(r.distanceMeters) > 8000 ? 'Moderate' : 'Easy',
          }))
        );
      }
    }).catch(() => null);
  }, []);

  const allRoutes = useMemo(() => {
    return [...activityRoutes, ...serverRoutes];
  }, [activityRoutes, serverRoutes]);

  // Sort routes by distance from user's live GPS coordinates (Nearest First)
  const sortedRoutes = useMemo(() => {
    if (!allRoutes.length) return [];
    if (!userLocation) return allRoutes;

    return [...allRoutes].sort((a, b) => {
      const pA = a.polylinePoints[0];
      const pB = b.polylinePoints[0];
      if (!pA) return 1;
      if (!pB) return -1;
      const distA = calculateHaversineKm(userLocation[1], userLocation[0], pA.latitude, pA.longitude);
      const distB = calculateHaversineKm(userLocation[1], userLocation[0], pB.latitude, pB.longitude);
      return distA - distB;
    });
  }, [allRoutes, userLocation]);

  // Filtered routes based on search query and active filters
  const filteredRoutes = useMemo(() => {
    return sortedRoutes.filter((r) => {
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        if (!r.name.toLowerCase().includes(q)) return false;
      }
      if (activeFilter === 'Length') {
        if (r.distanceMeters > 8000) return true;
      }
      if (activeFilter === 'Difficulty') {
        if (r.climbCategory === 'Moderate' || r.climbCategory === 'Moderate Climb') return true;
      }
      return true;
    });
  }, [sortedRoutes, searchQuery, activeFilter]);

  const currentPreviewRoute = selectedRoute || filteredRoutes[0] || sortedRoutes[0] || null;

  // Convert routes and segments to nearby map markers
  const mapMarkers: MapMarkerItem[] = useMemo(() => {
    const list: MapMarkerItem[] = [];

    // Area cluster pills matching Strava reference
    list.push(
      {
        id: 'cluster_kuril',
        coordinate: [90.4215, 23.8210],
        title: 'Kuril',
        type: 'route',
      },
      {
        id: 'cluster_bashundhara',
        coordinate: [90.4320, 23.8180],
        title: 'Bashundhara R/A · 3',
        type: 'route',
      },
      {
        id: 'cluster_300feet',
        coordinate: [90.4450, 23.8320],
        title: '300 Feet · 1',
        type: 'route',
      },
      {
        id: 'cluster_baridhara',
        coordinate: [90.4190, 23.8010],
        title: 'Baridhara',
        type: 'route',
      },
      {
        id: 'cluster_gulshan',
        coordinate: [90.4150, 23.7890],
        title: 'Gulshan · 2',
        type: 'route',
      }
    );

    // Actual route markers
    allRoutes.forEach((r) => {
      if (r.polylinePoints && r.polylinePoints.length > 0) {
        list.push({
          id: r.id,
          coordinate: [r.polylinePoints[0].longitude, r.polylinePoints[0].latitude],
          title: r.name,
          subtitle: `${(r.distanceMeters / 1000).toFixed(1)} km`,
          type: 'route',
        });
      }
    });

    return list;
  }, [allRoutes]);

  const handleMarkerSelect = (marker: MapMarkerItem) => {
    const foundRoute = allRoutes.find((r) => r.id === marker.id);
    if (foundRoute) {
      setSelectedRoute(foundRoute);
    } else {
      // Find nearest route to clicked cluster
      const nearest = sortedRoutes[0];
      if (nearest) setSelectedRoute(nearest);
    }
  };

  const activeRouteCoords = currentPreviewRoute?.polylinePoints
    ? currentPreviewRoute.polylinePoints.map(
        (p) => [p.longitude, p.latitude] as [number, number]
      )
    : undefined;

  const toggle3DMode = () => {
    setIs3D((prev) => !prev);
  };

  return (
    <View style={{ flex: 1 }} className="bg-stone-900 relative">
      {/* Full-Screen Edge-to-Edge Map with Public Free OSM Tiles */}
      <StravaMapView
        markers={mapMarkers}
        selectedMarkerId={currentPreviewRoute?.id}
        onMarkerPress={handleMarkerSelect}
        routeCoordinates={activeRouteCoords}
        userLocation={userLocation || undefined}
        centerCoordinate={userLocation || [90.4215, 23.8142]}
        zoomLevel={15}
        mapType={mapType}
        heatmapType={heatmapType}
        terrainType={terrainType}
        is3D={is3D}
        poiEnabled={poiEnabled}
        bikeLanesEnabled={bikeLanesEnabled}
        showControls={false}
        showUserLocation={true}>
        
        {/* Top Search & Filter Bar HUD */}
        <SafeAreaView edges={['top']} className="absolute top-0 left-0 right-0 z-30 px-3 pt-1">
          {/* Main Search Input Row */}
          <View className="bg-white rounded-2xl px-3 py-2.5 shadow-md flex-row items-center border border-gray-100">
            {/* Sport Icon Dropdown Button */}
            <TouchableOpacity
              onPress={() =>
                setSelectedSport((prev) =>
                  prev === 'Run' ? 'Ride' : prev === 'Ride' ? 'Hike' : 'Run'
                )
              }
              className="flex-row items-center pr-2 border-r border-gray-200 mr-2">
              <Ionicons
                name={selectedSport === 'Ride' ? 'bicycle' : 'fitness'}
                size={20}
                color="#FC4C02"
              />
              <Ionicons name="chevron-down" size={14} color="#6B7280" style={{ marginLeft: 2 }} />
            </TouchableOpacity>

            {/* Search Input */}
            <TextInput
              placeholder="Trail run with views"
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 text-sm font-semibold text-gray-900 h-9 p-0"
            />

            {/* Saved Routes Shortcut */}
            <TouchableOpacity
              onPress={() => router.push('/routes/saved')}
              className="flex-row items-center bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-full ml-1">
              <Ionicons name="bookmark-outline" size={14} color="#111827" />
              <Text className="text-xs font-bold text-gray-900 ml-1">Saved</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Chips Carousel */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row mt-2 space-x-2 py-1">
            {[
              { id: 'Routes', label: 'Routes' },
              { id: 'Length', label: 'Length' },
              { id: 'Difficulty', label: 'Difficulty' },
              { id: 'Elevation', label: 'Elevation' },
              { id: 'Surface', label: 'Surface' },
            ].map((f) => {
              const isActive = activeFilter === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => setActiveFilter(f.id as any)}
                  className={`px-3.5 py-1.5 rounded-full shadow-xs border mr-2 flex-row items-center ${
                    isActive
                      ? 'bg-white border-[#FC4C02]'
                      : 'bg-white border-gray-200'
                  }`}>
                  <Text
                    className={`text-xs font-bold ${
                      isActive ? 'text-[#FC4C02]' : 'text-gray-700'
                    }`}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>

        {/* Right Map Action Controls */}
        <View className="absolute right-4 top-40 z-30 items-center">
          {/* Compass Icon */}
          <TouchableOpacity
            onPress={() => {
              if (userLocation) {
                setSelectedRoute(null);
              }
            }}
            className="w-11 h-11 rounded-full bg-white shadow-md items-center justify-center border border-gray-200 mb-2">
            <Ionicons name="compass-outline" size={22} color="#111827" />
          </TouchableOpacity>

          {/* Layers Toggle Button */}
          <TouchableOpacity
            onPress={() => setShowLayersSheet(true)}
            className="w-11 h-11 rounded-full bg-white shadow-md items-center justify-center border border-gray-200 mb-2">
            <Ionicons name="layers" size={20} color="#111827" />
          </TouchableOpacity>

          {/* 3D / 2D Perspective Toggle Button */}
          <TouchableOpacity
            onPress={toggle3DMode}
            className={`w-11 h-11 rounded-full shadow-md items-center justify-center border mb-2 ${
              is3D ? 'bg-black border-black' : 'bg-white border-gray-200'
            }`}>
            <Text className={`text-xs font-black ${is3D ? 'text-white' : 'text-gray-900'}`}>
              {is3D ? '3D' : '2D'}
            </Text>
          </TouchableOpacity>

          {/* Recenter / Crosshairs GPS Button */}
          <TouchableOpacity
            onPress={() => {
              if (userLocation) {
                setSelectedRoute(null);
              }
            }}
            className="w-11 h-11 rounded-full bg-white shadow-md items-center justify-center border border-gray-200 mb-2">
            <Ionicons name="locate" size={20} color="#FC4C02" />
          </TouchableOpacity>

          {/* Route Builder / Pencil Button */}
          <TouchableOpacity
            onPress={() => router.push('/routes/builder')}
            className="w-11 h-11 rounded-full bg-white shadow-md items-center justify-center border border-gray-200">
            <Ionicons name="pencil" size={18} color="#111827" />
          </TouchableOpacity>
        </View>

        {/* Bottom Route Preview Sheet & Location-Based Recommendations */}
        <View
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
          className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl shadow-2xl border-t border-gray-100 z-30 px-4 pt-3">
          {/* Drag Handle */}
          <View className="w-10 h-1 bg-gray-300 rounded-full self-center mb-3" />

          {/* Primary Featured Route Card */}
          {currentPreviewRoute && (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push(`/routes/${currentPreviewRoute.id}`)}
              className="bg-white rounded-2xl border border-gray-200 p-3 shadow-xs flex-row items-center mb-3">
              {/* Route Thumbnail */}
              <View className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 mr-3 relative">
                <Image
                  source={{
                    uri: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=300',
                  }}
                  className="w-full h-full"
                />
                <View className="absolute top-1 left-1 bg-black/60 rounded px-1">
                  <Text className="text-[8px] font-bold text-white">Route</Text>
                </View>
              </View>

              {/* Route Details */}
              <View className="flex-1 justify-center">
                <View className="flex-row justify-between items-start">
                  <Text
                    className="text-sm font-black text-gray-900 flex-1 mr-2"
                    numberOfLines={1}>
                    {currentPreviewRoute.name || 'প্রগতি সরণী - Kuril Flyover Loop'}
                  </Text>
                  <Ionicons name="bookmark-outline" size={18} color="#4B5563" />
                </View>

                {/* Badges: Grade · Distance · Elevation · Estimated Duration */}
                <View className="flex-row items-center flex-wrap my-1">
                  <View className="bg-blue-600 px-1.5 py-0.5 rounded mr-1.5">
                    <Text className="text-[10px] font-bold text-white">{currentPreviewRoute.climbCategory || 'Moderate'}</Text>
                  </View>
                  <Text className="text-xs font-semibold text-gray-700">
                    {(currentPreviewRoute.distanceMeters / 1000).toFixed(1)} km · +
                    {currentPreviewRoute.elevationGainMeters} m · {getEstimatedDuration(currentPreviewRoute.distanceMeters, selectedSport)}
                  </Text>
                </View>

                {/* Subtext: Real Distance From Your Location */}
                <View className="flex-row items-center">
                  <Ionicons name="locate-outline" size={11} color="#6B7280" />
                  <Text className="text-[10px] text-gray-500 ml-1">
                    {userLocation && currentPreviewRoute.polylinePoints[0]
                      ? `${calculateHaversineKm(userLocation[1], userLocation[0], currentPreviewRoute.polylinePoints[0].latitude, currentPreviewRoute.polylinePoints[0].longitude)} km away · `
                      : 'From your location · '}
                  </Text>
                  <Ionicons name="flash" size={10} color="#FC4C02" />
                  <Text className="text-[10px] font-bold text-[#FC4C02] ml-0.5">Made for you</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {/* Section: Explore anywhere with confidence */}
          <View className="flex-row justify-between items-center py-1 mb-1">
            <Text className="text-base font-black text-gray-900">
              Explore anywhere with confidence
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/routes/saved')}
              className="flex-row items-center">
              <Text className="text-xs font-bold text-[#FC4C02]">See All</Text>
              <Ionicons name="chevron-forward" size={14} color="#FC4C02" />
            </TouchableOpacity>
          </View>

          {/* Horizontal Suggested Nearby Routes List */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row pb-2">
            {sortedRoutes.map((route) => {
              const isSelected = route.id === currentPreviewRoute?.id;
              const distFromUser = userLocation && route.polylinePoints[0]
                ? calculateHaversineKm(userLocation[1], userLocation[0], route.polylinePoints[0].latitude, route.polylinePoints[0].longitude)
                : null;

              return (
                <TouchableOpacity
                  key={route.id}
                  onPress={() => setSelectedRoute(route)}
                  className={`w-48 p-2.5 rounded-xl border mr-3 ${
                    isSelected ? 'border-[#FC4C02] bg-orange-50/40' : 'border-gray-200 bg-white'
                  }`}>
                  <Text className="text-xs font-black text-gray-900" numberOfLines={1}>
                    {route.name}
                  </Text>
                  <Text className="text-[11px] text-gray-500 mt-0.5 font-medium">
                    {(route.distanceMeters / 1000).toFixed(1)} km · +{route.elevationGainMeters}m
                  </Text>
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="navigate-outline" size={10} color="#FC4C02" />
                    <Text className="text-[10px] text-gray-600 font-semibold ml-1">
                      {distFromUser !== null ? `${distFromUser} km from you` : 'Nearby'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </StravaMapView>

      {/* Map Layers Bottom Sheet Modal (100% Free - Zero Locks) */}
      <Modal
        visible={showLayersSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLayersSheet(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl pt-3 px-5 pb-8 shadow-2xl">
            {/* Drag Handle */}
            <View className="w-12 h-1.5 bg-gray-300 rounded-full self-center mb-4" />

            <ScrollView showsVerticalScrollIndicator={false} className="max-h-[500px]">
              {/* Section 1: Map Types */}
              <Text className="text-base font-black text-gray-900 mb-3">Map Types</Text>
              <View className="flex-row justify-between mb-5">
                {[
                  { id: 'standard', label: 'Standard', icon: 'map' },
                  { id: 'satellite', label: 'Satellite', icon: 'planet' },
                  { id: 'hybrid', label: 'Hybrid', icon: 'earth' },
                  { id: 'winter', label: 'Winter / Topo', icon: 'snow' },
                ].map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    onPress={() => setMapType(type.id as MapTypeOption)}
                    className="items-center w-[22%]">
                    <View
                      className={`w-16 h-16 rounded-2xl items-center justify-center relative border-2 ${
                        mapType === type.id
                          ? 'border-[#FC4C02] bg-orange-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}>
                      <Ionicons
                        name={type.icon as any}
                        size={24}
                        color={mapType === type.id ? '#FC4C02' : '#4B5563'}
                      />
                    </View>
                    <Text
                      className={`text-[11px] font-bold mt-1.5 text-center ${
                        mapType === type.id ? 'text-[#FC4C02]' : 'text-gray-700'
                      }`}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Section 2: Heatmaps */}
              <View className="flex-row items-center mb-3">
                <Text className="text-base font-black text-gray-900 mr-1.5">Heatmaps</Text>
                <Ionicons name="information-circle-outline" size={16} color="#9CA3AF" />
              </View>
              <View className="flex-row justify-between mb-5">
                {[
                  { id: 'global_run', label: 'Global Run', icon: 'flame' },
                  { id: 'weekly', label: 'Weekly', icon: 'stats-chart' },
                  { id: 'night', label: 'Night', icon: 'moon' },
                  { id: 'personal', label: 'Personal', icon: 'person' },
                ].map((hm) => (
                  <TouchableOpacity
                    key={hm.id}
                    onPress={() => setHeatmapType(hm.id as HeatmapTypeOption)}
                    className="items-center w-[22%]">
                    <View
                      className={`w-16 h-16 rounded-2xl items-center justify-center relative border-2 ${
                        heatmapType === hm.id
                          ? 'border-[#FC4C02] bg-orange-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}>
                      <Ionicons
                        name={hm.icon as any}
                        size={24}
                        color={heatmapType === hm.id ? '#FC4C02' : '#4B5563'}
                      />
                    </View>
                    <Text
                      className={`text-[11px] font-bold mt-1.5 text-center ${
                        heatmapType === hm.id ? 'text-[#FC4C02]' : 'text-gray-700'
                      }`}>
                      {hm.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Section 3: Layers */}
              <View className="flex-row items-center mb-3">
                <Text className="text-base font-black text-gray-900 mr-1.5">Layers</Text>
                <Ionicons name="information-circle-outline" size={16} color="#9CA3AF" />
              </View>
              <View className="flex-row space-x-4 mb-5">
                <TouchableOpacity
                  onPress={() => setPoiEnabled((prev) => !prev)}
                  className="items-center mr-6">
                  <View
                    className={`w-16 h-16 rounded-2xl items-center justify-center border-2 ${
                      poiEnabled
                        ? 'border-[#FC4C02] bg-orange-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}>
                    <Ionicons
                      name="cafe"
                      size={24}
                      color={poiEnabled ? '#FC4C02' : '#4B5563'}
                    />
                  </View>
                  <Text
                    className={`text-[11px] font-bold mt-1.5 ${
                      poiEnabled ? 'text-[#FC4C02]' : 'text-gray-700'
                    }`}>
                    Points of Interest
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setBikeLanesEnabled((prev) => !prev)}
                  className="items-center">
                  <View
                    className={`w-16 h-16 rounded-2xl items-center justify-center border-2 ${
                      bikeLanesEnabled
                        ? 'border-[#FC4C02] bg-orange-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}>
                    <Ionicons
                      name="bicycle"
                      size={24}
                      color={bikeLanesEnabled ? '#FC4C02' : '#4B5563'}
                    />
                  </View>
                  <Text
                    className={`text-[11px] font-bold mt-1.5 ${
                      bikeLanesEnabled ? 'text-[#FC4C02]' : 'text-gray-700'
                    }`}>
                    Bike Lanes
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Section 4: Terrain */}
              <View className="flex-row items-center mb-3">
                <Text className="text-base font-black text-gray-900 mr-1.5">Terrain</Text>
                <Ionicons name="information-circle-outline" size={16} color="#9CA3AF" />
              </View>
              <View className="flex-row justify-between mb-4">
                {[
                  { id: 'aspect', label: 'Aspect', icon: 'triangle-outline' },
                  { id: 'avalanche', label: 'Avalanche Gradient', icon: 'warning-outline' },
                  { id: 'gradient', label: 'Gradient', icon: 'trending-up-outline' },
                ].map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() =>
                      setTerrainType(terrainType === t.id ? 'none' : (t.id as TerrainTypeOption))
                    }
                    className="items-center w-[30%]">
                    <View
                      className={`w-16 h-16 rounded-2xl items-center justify-center relative border-2 ${
                        terrainType === t.id
                          ? 'border-[#FC4C02] bg-orange-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}>
                      <Ionicons
                        name={t.icon as any}
                        size={22}
                        color={terrainType === t.id ? '#FC4C02' : '#4B5563'}
                      />
                    </View>
                    <Text
                      className={`text-[10px] font-bold mt-1.5 text-center ${
                        terrainType === t.id ? 'text-[#FC4C02]' : 'text-gray-700'
                      }`}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Done / Close Button */}
            <TouchableOpacity
              onPress={() => setShowLayersSheet(false)}
              className="w-full bg-gray-900 py-3.5 rounded-2xl items-center justify-center mt-3">
              <Text className="text-white font-bold text-sm">Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

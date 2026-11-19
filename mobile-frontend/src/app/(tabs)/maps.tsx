import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import { MOCK_ROUTES } from '../../mock/data';
import { RouteItem } from '../../types';

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

  // Layers & Map Controls matching Strava Pro features (100% Unlocked)
  const [showLayersSheet, setShowLayersSheet] = useState(false);
  const [mapType, setMapType] = useState<MapTypeOption>('standard');
  const [heatmapType, setHeatmapType] = useState<HeatmapTypeOption>('global_run');
  const [terrainType, setTerrainType] = useState<TerrainTypeOption>('none');
  const [is3D, setIs3D] = useState(false);
  const [show3DTooltip, setShow3DTooltip] = useState(false);
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

  // Dynamic routes created from real recorded workouts + curated library
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
      authorName: a.athlete?.displayName || 'Community Athlete',
      climbCategory: a.elevationGainMeters > 50 ? 'Moderate Climb' : 'Flat Grade',
    }));

  const allRoutes = activityRoutes.length > 0 ? activityRoutes : MOCK_ROUTES;
  const currentPreviewRoute = selectedRoute || allRoutes[0];

  // Convert routes and segments to map markers
  const mapMarkers: MapMarkerItem[] = [
    ...allRoutes.map((r) => ({
      id: r.id,
      coordinate: [
        r.polylinePoints[0]?.longitude || 90.412,
        r.polylinePoints[0]?.latitude || 23.774,
      ] as [number, number],
      title: r.name,
      subtitle: `${(r.distanceMeters / 1000).toFixed(1)} km · +${r.elevationGainMeters}m`,
      type: 'route' as const,
    })),
    ...segments.map((s) => ({
      id: s.id,
      coordinate: [
        s.polylinePoints[0]?.longitude || 90.415,
        s.polylinePoints[0]?.latitude || 23.778,
      ] as [number, number],
      title: s.name,
      subtitle: `${(s.distanceMeters / 1000).toFixed(1)} km · ${s.averageGradePercent}% grade`,
      type: 'segment' as const,
    })),
  ];

  const handleMarkerSelect = (marker: MapMarkerItem) => {
    const foundRoute = allRoutes.find((r) => r.id === marker.id);
    if (foundRoute) {
      setSelectedRoute(foundRoute);
    } else {
      router.push(`/segment/${marker.id}`);
    }
  };

  const activeRouteCoords = currentPreviewRoute?.polylinePoints.map(
    (p) => [p.longitude, p.latitude] as [number, number]
  );

  const toggle3DMode = () => {
    setIs3D((prev) => !prev);
    setShow3DTooltip(true);
    setTimeout(() => setShow3DTooltip(false), 3000);
  };

  return (
    <View className="flex-1 bg-stone-900 relative">
      {/* Full-Screen Edge-to-Edge Map with Pro Layers */}
      <StravaMapView
        markers={mapMarkers}
        selectedMarkerId={currentPreviewRoute?.id}
        onMarkerPress={handleMarkerSelect}
        routeCoordinates={activeRouteCoords}
        userLocation={userLocation || undefined}
        centerCoordinate={userLocation || [90.4125, 23.7745]}
        mapType={mapType}
        heatmapType={heatmapType}
        terrainType={terrainType}
        is3D={is3D}
        poiEnabled={poiEnabled}
        bikeLanesEnabled={bikeLanesEnabled}
        showControls={false}
        showUserLocation={true}>
        {/* Top Search & Filter Bar HUD (matching Screenshot 4) */}
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
              <Ionicons name="chevron-down" size={14} color="#6B7280" className="ml-1" />
            </TouchableOpacity>

            {/* Search Input Box */}
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Trail run with views"
              placeholderTextColor="#9CA3AF"
              className="flex-1 text-sm font-semibold text-gray-900"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} className="mr-2">
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}

            {/* Saved Routes Shortcut */}
            <TouchableOpacity
              onPress={() => router.push('/routes/saved')}
              className="flex-row items-center pl-2">
              <Ionicons name="bookmark-outline" size={16} color="#111827" />
              <Text className="text-xs font-black text-gray-900 ml-1">Saved</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Chips Bar (Screenshot 4: Routes, Length, Difficulty, Elevation, Surface) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row mt-2.5 space-x-2">
            {(['Routes', 'Length', 'Difficulty', 'Elevation', 'Surface'] as const).map(
              (filterName) => {
                const isSelected = activeFilter === filterName;
                return (
                  <TouchableOpacity
                    key={filterName}
                    onPress={() => setActiveFilter(filterName)}
                    className={`px-3.5 py-1.5 rounded-full mr-2 border shadow-xs ${
                      isSelected
                        ? 'bg-white border-[#FC4C02]'
                        : 'bg-white/95 border-gray-200'
                    }`}>
                    <Text
                      className={`text-xs font-bold ${
                        isSelected ? 'text-[#FC4C02]' : 'text-gray-700'
                      }`}>
                      {filterName}
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}
          </ScrollView>
        </SafeAreaView>

        {/* Floating Center "Search Here" Pill (Screenshot 5) */}
        <View className="absolute top-28 inset-x-0 items-center z-20 pointer-events-box-none">
          <TouchableOpacity
            activeOpacity={0.85}
            className="bg-[#FC4C02] px-6 py-2.5 rounded-full shadow-lg">
            <Text className="text-xs font-black text-white tracking-wider">Search Here</Text>
          </TouchableOpacity>
        </View>

        {/* Floating Compass (N) in top right */}
        <View className="absolute top-36 right-4 z-20">
          <View className="w-10 h-10 rounded-full bg-white shadow-md items-center justify-center border border-gray-200">
            <Text className="text-[10px] font-black text-red-500">N</Text>
            <View className="w-0.5 h-3 bg-red-500" />
            <View className="w-0.5 h-3 bg-gray-400" />
          </View>
        </View>

        {/* Floating Right HUD Tool Palette (Screenshots 4 & 5) */}
        <View className="absolute right-4 bottom-72 space-y-2.5 z-20">
          {/* 1. Layers Button with badge '2' -> Opens Screenshot 6 Layers Modal */}
          <TouchableOpacity
            onPress={() => setShowLayersSheet(true)}
            className="w-11 h-11 rounded-full bg-white shadow-md items-center justify-center border border-gray-200 relative mb-2">
            <Ionicons name="layers" size={20} color="#111827" />
            <View className="absolute -top-1 -right-1 bg-black w-4 h-4 rounded-full items-center justify-center">
              <Text className="text-[9px] font-black text-white">2</Text>
            </View>
          </TouchableOpacity>

          {/* 2. 3D / 2D Perspective Toggle Button (Screenshot 5) */}
          <View className="relative items-end mb-2">
            {show3DTooltip && (
              <View className="absolute right-14 top-1 bg-black px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-50">
                <Text className="text-xs font-bold text-white">
                  {is3D ? '✨ 3D Mode Active (Free)' : '2D Map View'}
                </Text>
              </View>
            )}
            <TouchableOpacity
              onPress={toggle3DMode}
              className={`w-11 h-11 rounded-full shadow-md items-center justify-center border ${
                is3D ? 'bg-black border-black' : 'bg-white border-gray-200'
              }`}>
              <Text className={`text-xs font-black ${is3D ? 'text-white' : 'text-gray-900'}`}>
                {is3D ? '3D' : '2D'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 3. Recenter / Crosshairs GPS Button */}
          <TouchableOpacity
            onPress={() => {
              if (userLocation) {
                // Already centered via reactive prop
              }
            }}
            className="w-11 h-11 rounded-full bg-white shadow-md items-center justify-center border border-gray-200 mb-2">
            <Ionicons name="locate" size={20} color="#111827" />
          </TouchableOpacity>

          {/* 4. Route Builder / Pencil Button */}
          <TouchableOpacity
            onPress={() => router.push('/routes/builder')}
            className="w-11 h-11 rounded-full bg-white shadow-md items-center justify-center border border-gray-200">
            <Ionicons name="pencil" size={18} color="#111827" />
          </TouchableOpacity>
        </View>

        {/* Bottom Route Preview Sheet & Explorer (Screenshots 4 & 5) */}
        <View
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
          className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl shadow-2xl border-t border-gray-100 z-30 px-4 pt-3">
          {/* Drag Handle */}
          <View className="w-10 h-1 bg-gray-300 rounded-full self-center mb-3" />

          {/* Route Card matching Screenshot 4 */}
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
                    {currentPreviewRoute.name || 'প্রগতি সরণী-Afroza Begum Road'}
                  </Text>
                  <Ionicons name="bookmark-outline" size={18} color="#4B5563" />
                </View>

                {/* Badges: Moderate · 7.2 km · 8.4 m · 1h 4m */}
                <View className="flex-row items-center flex-wrap my-1">
                  <View className="bg-blue-600 px-1.5 py-0.5 rounded mr-1.5">
                    <Text className="text-[10px] font-bold text-white">Moderate</Text>
                  </View>
                  <Text className="text-xs font-semibold text-gray-700">
                    {(currentPreviewRoute.distanceMeters / 1000).toFixed(1)} km · +
                    {currentPreviewRoute.elevationGainMeters} m · 1h 4m
                  </Text>
                </View>

                {/* Subtext: From your location · Made for you */}
                <View className="flex-row items-center">
                  <Ionicons name="locate-outline" size={11} color="#6B7280" />
                  <Text className="text-[10px] text-gray-500 ml-1">From your location · </Text>
                  <Ionicons name="flash" size={10} color="#FC4C02" />
                  <Text className="text-[10px] font-bold text-[#FC4C02] ml-0.5">Made for you</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {/* Section: Explore anywhere with confidence */}
          <View className="flex-row justify-between items-center py-1">
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
        </View>
      </StravaMapView>

      {/* Map Layers Bottom Sheet Modal (matching Screenshot 6 EXACTLY) */}
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
                  { id: 'winter', label: 'Winter', icon: 'snow', isUnlocked: true },
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
                      {type.isUnlocked && (
                        <View className="absolute top-1 right-1 bg-emerald-500 rounded-full w-4 h-4 items-center justify-center">
                          <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                    <Text
                      className={`text-[11px] font-bold mt-1.5 ${
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
                  { id: 'weekly', label: 'Weekly', icon: 'stats-chart', isUnlocked: true },
                  { id: 'night', label: 'Night', icon: 'moon', isUnlocked: true },
                  { id: 'personal', label: 'Personal', icon: 'person', isUnlocked: true },
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
                      {hm.isUnlocked && (
                        <View className="absolute top-1 right-1 bg-emerald-500 rounded-full w-4 h-4 items-center justify-center">
                          <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                        </View>
                      )}
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
                      <View className="absolute top-1 right-1 bg-emerald-500 rounded-full w-4 h-4 items-center justify-center">
                        <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                      </View>
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

            <TouchableOpacity
              onPress={() => setShowLayersSheet(false)}
              className="w-full py-3.5 bg-black rounded-full items-center mt-2">
              <Text className="text-sm font-bold text-white">Apply Layers</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapMarkerItem, StravaMapView } from '../../components/map/StravaMapView';
import { useApp } from '../../context/AppContext';
import { MOCK_ROUTES } from '../../mock/data';
import { RouteItem } from '../../types';

export default function MapsScreen() {
  const router = useRouter();
  const { segments } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState<'All' | 'Run' | 'Ride'>('All');
  const [selectedRoute, setSelectedRoute] = useState<RouteItem | null>(null);

  // Convert routes and segments to map markers
  const mapMarkers: MapMarkerItem[] = [
    ...MOCK_ROUTES.map((r) => ({
      id: r.id,
      coordinate: [r.polylinePoints[0]?.longitude || 90.412, r.polylinePoints[0]?.latitude || 23.774] as [number, number],
      title: r.name,
      subtitle: `${(r.distanceMeters / 1000).toFixed(1)} km · +${r.elevationGainMeters}m`,
      type: 'route' as const,
    })),
    ...segments.map((s) => ({
      id: s.id,
      coordinate: [s.polylinePoints[0]?.longitude || 90.415, s.polylinePoints[0]?.latitude || 23.778] as [number, number],
      title: s.name,
      subtitle: `${(s.distanceMeters / 1000).toFixed(1)} km · ${s.averageGradePercent}% grade`,
      type: 'segment' as const,
    })),
  ];

  const handleMarkerSelect = (marker: MapMarkerItem) => {
    const foundRoute = MOCK_ROUTES.find((r) => r.id === marker.id);
    if (foundRoute) {
      setSelectedRoute(foundRoute);
    } else {
      router.push(`/segment/${marker.id}`);
    }
  };

  // Convert selected route polyline to [lon, lat][]
  const activeRouteCoords = selectedRoute?.polylinePoints.map(
    (p) => [p.longitude, p.latitude] as [number, number]
  );

  return (
    <View className="flex-1 bg-stone-900 relative">
      {/* Full-Screen Edge-to-Edge Map */}
      <StravaMapView
        markers={mapMarkers}
        selectedMarkerId={selectedRoute?.id}
        onMarkerPress={handleMarkerSelect}
        routeCoordinates={activeRouteCoords}
        showControls={true}
        showUserLocation={true}>
        {/* Floating Top Search & Filter HUD */}
        <SafeAreaView className="absolute top-0 left-0 right-0 z-30 px-4 pt-2">
          {/* Floating Search Pill */}
          <View className="bg-white/95 rounded-2xl p-2.5 shadow-lg border border-gray-100 flex-row items-center mb-2">
            <Ionicons name="search" size={18} color="#FC4C02" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search trails, segments, climbs..."
              placeholderTextColor="#9CA3AF"
              className="flex-1 ml-2 text-sm font-semibold text-gray-900"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => router.push('/analytics/heatmap')}
              className="ml-2 pl-2 border-l border-gray-200 flex-row items-center">
              <Ionicons name="flame" size={16} color="#FC4C02" />
              <Text className="text-xs font-bold text-gray-700 ml-1">Heatmap</Text>
            </TouchableOpacity>
          </View>

          {/* Floating Sport Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {(['All', 'Run', 'Ride'] as const).map((sport) => {
              const isSelected = selectedSport === sport;
              return (
                <TouchableOpacity
                  key={sport}
                  onPress={() => setSelectedSport(sport)}
                  className={`px-4 py-1.5 rounded-full mr-2 shadow-sm border ${
                    isSelected
                      ? 'bg-[#FC4C02] border-[#FC4C02]'
                      : 'bg-white/95 border-gray-200'
                  }`}>
                  <Text
                    className={`text-xs font-bold ${
                      isSelected ? 'text-white' : 'text-gray-800'
                    }`}>
                    {sport === 'All' ? 'All Activities' : sport === 'Run' ? 'Running' : 'Cycling'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>

        {/* Floating Bottom Sheet for Selected Route / Segment */}
        {selectedRoute && (
          <View className="absolute bottom-6 left-4 right-4 bg-white/95 rounded-3xl p-5 shadow-2xl border border-gray-100 z-40">
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1 mr-3">
                <View className="flex-row items-center mb-1">
                  <View className="bg-orange-100 px-2 py-0.5 rounded mr-2">
                    <Text className="text-[10px] font-bold text-[#FC4C02]">{selectedRoute.sportType}</Text>
                  </View>
                  <Text className="text-[11px] font-bold text-gray-400">{selectedRoute.climbCategory}</Text>
                </View>
                <Text className="text-base font-black text-gray-900" numberOfLines={1}>
                  {selectedRoute.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedRoute(null)} className="p-1">
                <Ionicons name="close-circle" size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Metrics Row */}
            <View className="flex-row justify-between py-2 border-y border-gray-100 my-2">
              <View>
                <Text className="text-[10px] uppercase font-bold text-gray-400">Distance</Text>
                <Text className="text-base font-black text-gray-900">
                  {(selectedRoute.distanceMeters / 1000).toFixed(1)} km
                </Text>
              </View>
              <View>
                <Text className="text-[10px] uppercase font-bold text-gray-400">Climb</Text>
                <Text className="text-base font-black text-gray-900">+{selectedRoute.elevationGainMeters} m</Text>
              </View>
              <View>
                <Text className="text-[10px] uppercase font-bold text-gray-400">Surface</Text>
                <Text className="text-base font-black text-gray-900">{selectedRoute.surfacePavedPercent}% Paved</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="flex-row space-x-2 mt-2">
              <TouchableOpacity
                onPress={() => router.push(`/routes/${selectedRoute.id}`)}
                className="flex-1 py-3 bg-gray-100 rounded-xl items-center mr-2">
                <Text className="text-xs font-bold text-gray-800">Route Details</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/routes/navigation')}
                className="flex-1 py-3 bg-[#FC4C02] rounded-xl flex-row items-center justify-center shadow-md">
                <Ionicons name="navigate" size={14} color="#FFFFFF" />
                <Text className="text-xs font-black text-white ml-1.5">Start Navigation</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Floating Route Builder Shortcut FAB (when no route selected) */}
        {!selectedRoute && (
          <TouchableOpacity
            onPress={() => router.push('/routes/builder')}
            className="absolute bottom-6 right-4 bg-[#FC4C02] px-5 py-3.5 rounded-full shadow-2xl flex-row items-center border-2 border-white z-30">
            <Ionicons name="map" size={18} color="#FFFFFF" />
            <Text className="text-xs font-black text-white ml-2">Build Route</Text>
          </TouchableOpacity>
        )}
      </StravaMapView>
    </View>
  );
}

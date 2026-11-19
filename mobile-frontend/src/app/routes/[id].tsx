import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ElevationChart } from '../../components/common/ElevationChart';
import { StatBox } from '../../components/common/StatBox';
import { StravaMapView } from '../../components/map/StravaMapView';
import { api } from '../../services/api';

export default function RouteDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [route, setRoute] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    api.routes
      .get(id)
      .then((res) => {
        if (res?.route) {
          setRoute(res.route);
        }
      })
      .catch((err) => {
        console.warn('Fetch route error:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  const handleToggleSave = async () => {
    if (!id) return;
    try {
      const res = await api.routes.toggleSave(id);
      setIsSaved(res.isSaved);
    } catch (err) {
      console.warn('Toggle save route error:', err);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#FC4C02" />
      </SafeAreaView>
    );
  }

  if (!route) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center p-6">
        <Ionicons name="map-outline" size={48} color="#9CA3AF" />
        <Text className="text-base font-bold text-gray-900 mt-3">Route not found</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 px-6 py-2.5 bg-primary rounded-full">
          <Text className="text-xs font-black text-white">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const distKm = (Number(route.distanceMeters || 0) / 1000).toFixed(1);
  const timeHours = (Number(route.estimatedTimeSeconds || 0) / 3600).toFixed(1);
  const polyPoints = route.polylinePoints || [];
  const routeCoords = polyPoints.map((p: any) =>
    Array.isArray(p) ? p : ([p.longitude, p.latitude] as [number, number])
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900 flex-1 text-center mx-2" numberOfLines={1}>
          {route.name}
        </Text>
        <TouchableOpacity onPress={handleToggleSave} className="p-1">
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={isSaved ? '#FC4C02' : '#111827'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerClassName="pb-28">
        {/* Real Route Map */}
        <View className="h-60 w-full border-b border-gray-200">
          <StravaMapView
            routeCoordinates={routeCoords}
            showControls={false}
            showUserLocation={false}
            className="w-full h-full"
          />
        </View>

        {/* Route Header Info */}
        <View className="p-4 bg-white border-b border-gray-200">
          <View className="flex-row justify-between items-center mb-1">
            <View className="flex-row items-center">
              <View className="bg-orange-50 px-2.5 py-1 rounded-full mr-2">
                <Text className="text-xs font-bold text-[#FC4C02]">{route.sportType || 'Run'}</Text>
              </View>
              <View className="bg-gray-100 px-2.5 py-1 rounded-full">
                <Text className="text-xs font-bold text-gray-700">Moderate Grade</Text>
              </View>
            </View>
            <Text className="text-xs text-gray-400 font-medium">
              By {route.creator?.displayName || 'Community Athlete'}
            </Text>
          </View>
          <Text className="text-lg font-black text-gray-900 mt-1">{route.name}</Text>
          {route.description ? (
            <Text className="text-xs text-gray-600 mt-1">{route.description}</Text>
          ) : null}
        </View>

        {/* Stats Grid */}
        <View className="flex-row justify-between bg-white px-4 py-3 border-b border-gray-200">
          <StatBox label="Distance" value={`${distKm} km`} />
          <StatBox label="Elevation Gain" value={`+${route.elevationGainMeters || 0} m`} />
          <StatBox label="Est. Moving Time" value={`${timeHours} hrs`} />
        </View>

        {/* Elevation Profile */}
        <View className="bg-white p-4 border-b border-gray-200 mt-3">
          <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Elevation Profile
          </Text>
          <ElevationChart />
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-white p-4 border-t border-gray-200 flex-row space-x-3">
        <TouchableOpacity
          onPress={() => router.push('/routes/navigation')}
          className="flex-1 py-3.5 bg-[#FC4C02] rounded-2xl flex-row items-center justify-center shadow-md mr-2">
          <Ionicons name="navigate" size={16} color="#FFFFFF" />
          <Text className="text-sm font-black text-white ml-2">Start Navigation</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => alert('Route exported as GPX file')}
          className="px-4 py-3.5 bg-gray-100 rounded-2xl items-center justify-center">
          <Ionicons name="download-outline" size={20} color="#374151" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

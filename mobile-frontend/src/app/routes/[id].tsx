import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ElevationChart } from '../../components/common/ElevationChart';
import { StatBox } from '../../components/common/StatBox';
import { StravaMapView } from '../../components/map/StravaMapView';
import { api } from '../../services/api';
import { CURATED_DHAKA_ROUTES } from '../../lib/curatedRoutes';
import { plannedRouteStore } from '../../lib/plannedRoute';

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
        } else {
          const curated = CURATED_DHAKA_ROUTES.find((c) => c.id === id);
          if (curated) {
            setRoute({
              id: curated.id,
              name: curated.name,
              description: curated.description,
              sportType: curated.sportType,
              distanceMeters: curated.distanceMeters,
              elevationGainMeters: curated.elevationGainMeters,
              estimatedTimeSeconds: curated.estimatedTimeSeconds,
              polylinePoints: curated.polyline,
              surfaceTypes: { pavedPercent: curated.surfacePercentPaved, unpavedPercent: 100 - curated.surfacePercentPaved },
              creator: { displayName: curated.creatorName },
            });
          } else {
            setRoute(null);
          }
        }
      })
      .catch(() => {
        const curated = CURATED_DHAKA_ROUTES.find((c) => c.id === id);
        if (curated) {
          setRoute({
            id: curated.id,
            name: curated.name,
            description: curated.description,
            sportType: curated.sportType,
            distanceMeters: curated.distanceMeters,
            elevationGainMeters: curated.elevationGainMeters,
            estimatedTimeSeconds: curated.estimatedTimeSeconds,
            polylinePoints: curated.polyline,
            surfaceTypes: { pavedPercent: curated.surfacePercentPaved, unpavedPercent: 100 - curated.surfacePercentPaved },
            creator: { displayName: curated.creatorName },
          });
        } else {
          setRoute(null);
        }
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
          className="mt-4 px-6 py-2.5 bg-[#FC4C02] rounded-full">
          <Text className="text-xs font-black text-white">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const distKm = (Number(route.distanceMeters || 0) / 1000).toFixed(1);
  const timeHours = (Number(route.estimatedTimeSeconds || 0) / 3600).toFixed(1);
  const polyPoints = route.polylinePoints || [];
  const coords: [number, number][] = polyPoints.map((p: any) =>
    Array.isArray(p) ? p : [p.longitude, p.latitude]
  );
  const centerCoord: [number, number] | undefined = coords[0];

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900 flex-1 mx-3" numberOfLines={1}>
          {route.name}
        </Text>
        <TouchableOpacity onPress={handleToggleSave} className="p-1">
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={24}
            color={isSaved ? '#FC4C02' : '#111827'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Full Interactive Map View */}
        <View className="h-72 w-full bg-stone-100 relative">
          <StravaMapView
            styleKey="positron"
            centerCoordinate={centerCoord}
            routeCoordinates={coords}
            showControls={false}
            showUserLocation={false}
            mode="view-route"
            autoFitRoute={true}
            className="w-full h-full"
          />
        </View>

        {/* Route Details Card */}
        <View className="p-5">
          <View className="flex-row justify-between items-start mb-2">
            <View className="flex-1 mr-3">
              <Text className="text-2xl font-black text-gray-900 mb-1">{route.name}</Text>
              <Text className="text-xs text-gray-500 font-medium">
                Created by {route.creator?.displayName || 'Community Athlete'} · {route.sportType}
              </Text>
            </View>
            <View className="bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
              <Text className="text-xs font-black text-[#FC4C02]">{route.sportType}</Text>
            </View>
          </View>

          {route.description ? (
            <Text className="text-sm text-gray-600 mt-2 leading-relaxed">{route.description}</Text>
          ) : null}

          {/* Key Metrics Grid */}
          <View className="flex-row justify-between py-4 my-3 border-y border-gray-100">
            <StatBox label="Distance" value={`${distKm} km`} />
            <StatBox label="Est. Moving Time" value={`${timeHours} hrs`} />
            <StatBox label="Elevation Gain" value={route.elevationGainMeters ? `${route.elevationGainMeters} m` : '–'} />
          </View>

          {/* Elevation profile only when real samples exist (no invented 10/15/20 m curve). */}
          {Array.isArray(route.elevationProfile) && route.elevationProfile.length > 1 ? (
            <View className="my-2">
              <Text className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">
                Elevation Profile
              </Text>
              <ElevationChart elevations={route.elevationProfile} height={110} />
            </View>
          ) : null}

          {/* Surface Breakdown */}
          {route.surfaceTypes && route.surfaceTypes.pavedPercent != null && (
            <View className="my-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <Text className="text-xs font-black text-gray-800 mb-2">Surface Breakdown</Text>
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-gray-600">Paved Asphalt</Text>
                <Text className="text-xs font-bold text-gray-900">
                  {route.surfaceTypes.pavedPercent}%
                </Text>
              </View>
              <View className="flex-row items-center justify-between mt-1">
                <Text className="text-xs text-gray-600">Gravel / Trail</Text>
                <Text className="text-xs font-bold text-gray-900">
                  {route.surfaceTypes.unpavedPercent ?? 0}%
                </Text>
              </View>
            </View>
          )}

          {/* Start Navigation Action Button */}
          <TouchableOpacity
            onPress={() => {
              plannedRouteStore.set({
                name: route.name,
                sport: route.sportType || 'Ride',
                geometry: coords,
                distanceM: Number(route.distanceMeters) || 0,
                durationS: Number(route.estimatedTimeSeconds) || 0,
                elevationGainM: Number(route.elevationGainMeters) || 0,
              });
              router.push({
                pathname: '/record',
                params: { sport: route.sportType || 'Ride' },
              });
            }}
            className="w-full py-4.5 bg-[#FC4C02] rounded-full flex-row items-center justify-center shadow-lg mt-4 active:bg-[#E03A00]">
            <Ionicons name="play" size={20} color="#FFFFFF" />
            <Text className="text-base font-black text-white ml-2 tracking-wide">
              Start Workout with this Route
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

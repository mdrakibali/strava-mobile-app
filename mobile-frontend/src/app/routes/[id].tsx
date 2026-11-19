import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ElevationChart } from '../../components/common/ElevationChart';
import { StatBox } from '../../components/common/StatBox';
import { StravaMapView } from '../../components/map/StravaMapView';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';

export default function RouteDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activities } = useApp();
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
          // Check activities fallback
          const matchingAct = activities.find((a) => a.id === id);
          if (matchingAct) {
            setRoute({
              id: matchingAct.id,
              name: matchingAct.title,
              description: matchingAct.description,
              sportType: matchingAct.sportType,
              distanceMeters: matchingAct.distanceMeters,
              elevationGainMeters: matchingAct.elevationGainMeters,
              estimatedTimeSeconds: matchingAct.movingTimeSeconds,
              polylinePoints: matchingAct.routePoints || [],
              elevationProfile: matchingAct.elevationProfile || [10, 15, 20, 15, 10],
              surfaceTypes: { pavedPercent: 95, unpavedPercent: 5 },
              creator: {
                displayName: matchingAct.athlete?.displayName || 'Community Athlete',
                avatarUrl: matchingAct.athlete?.avatarUrl,
              },
            });
          }
        }
      })
      .catch(() => {
        const matchingAct = activities.find((a) => a.id === id);
        if (matchingAct) {
          setRoute({
            id: matchingAct.id,
            name: matchingAct.title,
            description: matchingAct.description,
            sportType: matchingAct.sportType,
            distanceMeters: matchingAct.distanceMeters,
            elevationGainMeters: matchingAct.elevationGainMeters,
            estimatedTimeSeconds: matchingAct.movingTimeSeconds,
            polylinePoints: matchingAct.routePoints || [],
            elevationProfile: matchingAct.elevationProfile || [10, 15, 20, 15, 10],
            surfaceTypes: { pavedPercent: 95, unpavedPercent: 5 },
            creator: {
              displayName: matchingAct.athlete?.displayName || 'Community Athlete',
              avatarUrl: matchingAct.athlete?.avatarUrl,
            },
          });
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id, activities]);

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
  const centerCoord: [number, number] = coords[0] || [90.4125, 23.7745];

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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Full Interactive Map View */}
        <View className="h-72 w-full bg-stone-100 relative">
          <StravaMapView
            styleKey="positron"
            centerCoordinate={centerCoord}
            routeCoordinates={coords}
            showControls={false}
            showUserLocation={false}
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
            <StatBox label="Elevation Gain" value={`${route.elevationGainMeters || 0} m`} />
          </View>

          {/* Elevation Profile Area Chart */}
          <View className="my-2">
            <Text className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">
              Elevation Profile
            </Text>
            <ElevationChart elevations={route.elevationProfile || [10, 15, 20, 15, 10]} height={110} />
          </View>

          {/* Surface Breakdown */}
          {route.surfaceTypes && (
            <View className="my-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <Text className="text-xs font-black text-gray-800 mb-2">Surface Breakdown</Text>
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-gray-600">Paved Asphalt</Text>
                <Text className="text-xs font-bold text-gray-900">
                  {route.surfaceTypes.pavedPercent ?? 90}%
                </Text>
              </View>
              <View className="flex-row items-center justify-between mt-1">
                <Text className="text-xs text-gray-600">Gravel / Trail</Text>
                <Text className="text-xs font-bold text-gray-900">
                  {route.surfaceTypes.unpavedPercent ?? 10}%
                </Text>
              </View>
            </View>
          )}

          {/* Start Navigation Action Button */}
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/routes/navigation',
                params: { routeId: route.id },
              })
            }
            className="w-full py-4.5 bg-[#FC4C02] rounded-full flex-row items-center justify-center shadow-lg mt-4 active:bg-[#E03A00]">
            <Ionicons name="navigate" size={20} color="#FFFFFF" />
            <Text className="text-base font-black text-white ml-2 tracking-wide">
              Start Turn-by-Turn Navigation
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

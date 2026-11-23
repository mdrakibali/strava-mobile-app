import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useState } from 'react';
import { Alert, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AppBar,
  AppText,
  Button,
  Chip,
  ChipRow,
  color,
  Divider,
  ErrorState,
  IconButton,
  LoadingState,
  space,
  TextField,
} from '../../design';
import {
  useCreatePrivacyZone,
  useDeletePrivacyZone,
  usePrivacyZones,
} from '../../hooks/usePrivacyZones';

const RADII = [200, 500, 1000];

export default function PrivacyZonesScreen() {
  const { data: zones = [], isLoading, isError, error, isRefetching, refetch } = usePrivacyZones();
  const createZone = useCreatePrivacyZone();
  const deleteZone = useDeletePrivacyZone();

  const [name, setName] = useState('');
  const [radiusM, setRadiusM] = useState(500);
  const [addError, setAddError] = useState<string | null>(null);

  const onAdd = async () => {
    setAddError(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        throw new Error('Location permission is needed to place the zone where you are.');
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if ((pos.coords.accuracy ?? 999) > 100) {
        throw new Error('Your location is too imprecise right now. Try again outdoors.');
      }
      await createZone.mutateAsync({
        name: name.trim() || 'Privacy zone',
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        radiusMeters: radiusM,
      });
      setName('');
    } catch (e: any) {
      setAddError(e?.message || 'Couldn’t create the zone.');
    }
  };

  const onDelete = (zone: any) =>
    Alert.alert(
      'Delete privacy zone?',
      `“${zone.name}” will no longer hide your route in new uploads.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteZone.mutateAsync(zone.id);
            } catch (e: any) {
              Alert.alert('Couldn’t delete', e?.message || 'Try again.');
            }
          },
        },
      ]
    );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <AppBar title="Privacy zones" />
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState
          message={(error as any)?.message ?? 'Could not load privacy zones.'}
          onRetry={() => {
            void refetch();
          }}
        />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                void refetch();
              }}
              colors={['#FC4C02']}
            />
          }
        >
          <AppText variant="body" color="inkSecondary">
            Parts of your route inside a privacy zone are hidden from other athletes on activities
            you upload from now on.
          </AppText>

          <View className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-4">
            {zones.length === 0 ? (
              <AppText variant="body" color="inkSecondary" style={{ padding: space.lg }}>
                No privacy zones yet.
              </AppText>
            ) : (
              zones.map((z: any, i: number) => (
                <View key={z.id}>
                  {i > 0 ? <Divider inset={space.lg} /> : null}
                  <View className="flex-row items-center pl-4 pr-2 min-h-[64px]">
                    <Ionicons name="shield-checkmark" size={22} color={color.success} />
                    <View style={{ flex: 1, marginLeft: space.md }}>
                      <AppText variant="title3">{z.name}</AppText>
                      <AppText variant="caption" color="inkTertiary">
                        {z.radiusMeters} m radius
                      </AppText>
                    </View>
                    <IconButton
                      icon="trash-outline"
                      iconColor={color.danger}
                      accessibilityLabel={`Delete ${z.name}`}
                      onPress={() => onDelete(z)}
                    />
                  </View>
                </View>
              ))
            )}
          </View>

          <AppText variant="title2" style={{ marginTop: space.xxl, marginBottom: space.md }}>
            Add a zone where you are now
          </AppText>
          <TextField
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Home"
            maxLength={50}
          />
          <AppText
            variant="label"
            color="inkSecondary"
            style={{ marginTop: space.lg, marginBottom: space.sm }}
          >
            Radius
          </AppText>
          <ChipRow>
            {RADII.map((r) => (
              <Chip
                key={r}
                label={`${r} m`}
                selected={radiusM === r}
                onPress={() => setRadiusM(r)}
              />
            ))}
          </ChipRow>
          {addError ? (
            <View style={{ marginTop: space.lg }}>
              <ErrorState compact message={addError} />
            </View>
          ) : null}
          <Button
            label="Add zone at my location"
            icon="locate"
            fullWidth
            loading={createZone.isPending}
            onPress={onAdd}
            style={{ marginTop: space.xl }}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

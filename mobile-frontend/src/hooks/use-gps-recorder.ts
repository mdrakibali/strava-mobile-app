import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { SportType, SplitItem } from '../types';

export interface ActiveRecordingState {
  isRecording: boolean;
  isPaused: boolean;
  isAutoPaused: boolean;
  gpsSignal: 'searching' | 'good' | 'strong' | 'denied' | 'disabled';
  accuracyMeters: number | null;
  sportType: SportType;
  elapsedSeconds: number;
  movingSeconds: number;
  distanceMeters: number;
  currentSpeedMps: number;
  maxSpeedMps: number;
  averageSpeedMps: number;
  elevationGainMeters: number;
  currentAltitudeMeters: number | null;
  currentHeartRate: number;
  routeCoordinates: {
    latitude: number;
    longitude: number;
    altitude?: number | null;
    timestamp?: number;
    speed?: number | null;
  }[];
  splits: SplitItem[];
  elevationProfile: number[];
  isSimulated: boolean;
  /** Wall-clock start (ms). Sent as the activity start time on save (technical audit SYNC-01). */
  startedAt: number | null;
}

const INITIAL_RECORDING_STATE: ActiveRecordingState = {
  isRecording: false,
  isPaused: false,
  isAutoPaused: false,
  gpsSignal: 'searching',
  accuracyMeters: null,
  sportType: 'Run',
  elapsedSeconds: 0,
  movingSeconds: 0,
  distanceMeters: 0,
  currentSpeedMps: 0,
  maxSpeedMps: 0,
  averageSpeedMps: 0,
  elevationGainMeters: 0,
  currentAltitudeMeters: null,
  currentHeartRate: 0,
  routeCoordinates: [],
  splits: [],
  elevationProfile: [],
  isSimulated: false,
  startedAt: null,
};

// Geodesic distance using Haversine formula
const calculateHaversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const useGpsRecorder = () => {
  const [activeRecording, setActiveRecording] = useState<ActiveRecordingState>(INITIAL_RECORDING_STATE);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const lastSplitDistRef = useRef<number>(0);
  const lastSplitTimeRef = useRef<number>(0);
  const lastCoordRef = useRef<{ lat: number; lon: number; alt?: number | null; time: number } | null>(null);
  const isSimulatedRef = useRef<boolean>(false);

  // Master Elapsed & Moving Time Timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;

    if (activeRecording.isRecording && !activeRecording.isPaused) {
      timer = setInterval(() => {
        setActiveRecording((prev) => {
          const nextElapsed = prev.elapsedSeconds + 1;
          const isMoving = !prev.isAutoPaused && (prev.currentSpeedMps >= 0.8 || prev.isSimulated);
          const nextMoving = isMoving ? prev.movingSeconds + 1 : prev.movingSeconds;

          // Compute simulated progress if in simulation mode (e.g. desktop/emulator test)
          if (prev.isSimulated) {
            const baseSpeed = prev.sportType === 'Ride' ? 8.2 : 3.3;
            const jitter = (Math.random() - 0.45) * 0.4;
            const currentSpeed = Math.max(1.5, baseSpeed + jitter);
            const addedDist = currentSpeed;
            const newDist = prev.distanceMeters + addedDist;
            const addedElev = Math.random() > 0.85 ? 1 : 0;
            const newElev = prev.elevationGainMeters + addedElev;

            // Generate next coordinate near last coordinate
            const lastPoint = prev.routeCoordinates[prev.routeCoordinates.length - 1] || {
              latitude: 23.7745,
              longitude: 90.4125,
            };
            const angle = (prev.elapsedSeconds * 0.05) % (2 * Math.PI);
            const latDelta = Math.sin(angle) * 0.00015;
            const lonDelta = Math.cos(angle) * 0.00018;
            const newCoord = {
              latitude: +(lastPoint.latitude + latDelta).toFixed(6),
              longitude: +(lastPoint.longitude + lonDelta).toFixed(6),
              altitude: (lastPoint.altitude || 12) + addedElev,
              timestamp: Date.now(),
              speed: currentSpeed,
            };

            // Check if 1km split threshold crossed
            let updatedSplits = [...prev.splits];
            const currentKmIndex = Math.floor(newDist / 1000);
            if (currentKmIndex > prev.splits.length && currentKmIndex > 0) {
              const splitTimeSecs = nextMoving - lastSplitTimeRef.current;
              lastSplitTimeRef.current = nextMoving;
              const paceMin = Math.floor(splitTimeSecs / 60);
              const paceSec = splitTimeSecs % 60;
              updatedSplits.push({
                splitNumber: currentKmIndex,
                distanceKm: 1.0,
                paceFormatted: `${paceMin}:${paceSec < 10 ? '0' : ''}${paceSec} /km`,
                elevationDeltaMeters: addedElev * 3,
                averageHeartRate: 154 + Math.floor(Math.random() * 8),
              });
            }

            return {
              ...prev,
              elapsedSeconds: nextElapsed,
              movingSeconds: nextMoving,
              distanceMeters: newDist,
              currentSpeedMps: currentSpeed,
              maxSpeedMps: Math.max(prev.maxSpeedMps, currentSpeed),
              averageSpeedMps: nextMoving > 0 ? newDist / nextMoving : currentSpeed,
              elevationGainMeters: newElev,
              currentHeartRate: prev.sportType === 'Ride' ? 144 + Math.floor(Math.random() * 8) : 158 + Math.floor(Math.random() * 6),
              routeCoordinates: [...prev.routeCoordinates, newCoord],
              splits: updatedSplits,
              elevationProfile: [...prev.elevationProfile, (lastPoint.altitude || 12) + addedElev],
              gpsSignal: 'strong',
              accuracyMeters: 3,
            };
          }

          // Real GPS mode: time advances; distance/speed are supplied by watchPositionAsync callback
          return {
            ...prev,
            elapsedSeconds: nextElapsed,
            movingSeconds: nextMoving,
            averageSpeedMps: nextMoving > 0 ? prev.distanceMeters / nextMoving : prev.currentSpeedMps,
          };
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeRecording.isRecording, activeRecording.isPaused]);

  // Real Hardware GPS Location Listener
  const startGpsSubscription = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setActiveRecording((prev) => ({ ...prev, gpsSignal: 'denied' }));
        Alert.alert(
          'Location Permission Required',
          'Open Strava needs GPS access to record your route, distance, and pace accurately.'
        );
        return;
      }

      // Check if location services are enabled
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        setActiveRecording((prev) => ({ ...prev, gpsSignal: 'disabled' }));
        Alert.alert('GPS Disabled', 'Please enable location services on your device.');
        return;
      }

      // Fetch immediate starting fix
      const initialFix = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      }).catch(() => null);

      if (initialFix) {
        const startCoord = {
          latitude: initialFix.coords.latitude,
          longitude: initialFix.coords.longitude,
          altitude: initialFix.coords.altitude,
          timestamp: initialFix.timestamp,
          speed: initialFix.coords.speed || 0,
        };
        lastCoordRef.current = {
          lat: initialFix.coords.latitude,
          lon: initialFix.coords.longitude,
          alt: initialFix.coords.altitude,
          time: initialFix.timestamp,
        };

        setActiveRecording((prev) => ({
          ...prev,
          gpsSignal: 'good',
          accuracyMeters: initialFix.coords.accuracy || 5,
          currentAltitudeMeters: initialFix.coords.altitude || 10,
          routeCoordinates: [startCoord],
          elevationProfile: [initialFix.coords.altitude || 10],
        }));
      }

      // Watch continuously with high precision
      locationSubRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (loc) => {
          if (!loc?.coords) return;
          const { latitude, longitude, altitude, speed, accuracy } = loc.coords;

          setActiveRecording((prev) => {
            if (!prev.isRecording || prev.isPaused) return prev;

            const accuracyVal = accuracy || 10;
            const signalLevel = accuracyVal <= 8 ? 'strong' : accuracyVal <= 20 ? 'good' : 'searching';

            // Filter out massive GPS spikes (dilution of precision > 30m)
            if (accuracyVal > 30) {
              return { ...prev, gpsSignal: signalLevel, accuracyMeters: accuracyVal };
            }

            let addedDistance = 0;
            let addedElev = 0;

            if (lastCoordRef.current) {
              const deltaMeters = calculateHaversineDistance(
                lastCoordRef.current.lat,
                lastCoordRef.current.lon,
                latitude,
                longitude
              );

              // Reject micro-jitter (< 0.8m in 1s)
              if (deltaMeters >= 0.8) {
                addedDistance = deltaMeters;
              }

              // Elevation gain calculation (ignore negative descents and sub-meter noise)
              if (altitude != null && lastCoordRef.current.alt != null) {
                const elevDelta = altitude - lastCoordRef.current.alt;
                if (elevDelta > 0.6) {
                  addedElev = Math.round(elevDelta);
                }
              }
            }

            lastCoordRef.current = {
              lat: latitude,
              lon: longitude,
              alt: altitude,
              time: loc.timestamp,
            };

            const computedSpeed = speed != null && speed >= 0 ? speed : (addedDistance > 0 ? addedDistance : 0);
            const isAutoPaused = computedSpeed < 0.8;
            const newTotalDist = prev.distanceMeters + addedDistance;
            const newTotalElev = prev.elevationGainMeters + addedElev;

            const newCoord = {
              latitude,
              longitude,
              altitude,
              timestamp: loc.timestamp,
              speed: computedSpeed,
            };

            // 1km Split Checking
            let updatedSplits = [...prev.splits];
            const currentKm = Math.floor(newTotalDist / 1000);
            if (currentKm > prev.splits.length && currentKm > 0) {
              const splitTimeSecs = prev.movingSeconds - lastSplitTimeRef.current;
              lastSplitTimeRef.current = prev.movingSeconds;
              const paceMin = Math.floor(splitTimeSecs / 60);
              const paceSec = splitTimeSecs % 60;
              updatedSplits.push({
                splitNumber: currentKm,
                distanceKm: 1.0,
                paceFormatted: `${paceMin}:${paceSec < 10 ? '0' : ''}${paceSec} /km`,
                elevationDeltaMeters: addedElev,
                averageHeartRate: prev.currentHeartRate || 154,
              });
            }

            return {
              ...prev,
              gpsSignal: signalLevel,
              accuracyMeters: accuracyVal,
              isAutoPaused,
              distanceMeters: newTotalDist,
              currentSpeedMps: computedSpeed,
              maxSpeedMps: Math.max(prev.maxSpeedMps, computedSpeed),
              elevationGainMeters: newTotalElev,
              currentAltitudeMeters: altitude,
              currentHeartRate: prev.currentHeartRate || 0,
              routeCoordinates: [...prev.routeCoordinates, newCoord],
              splits: updatedSplits,
              elevationProfile: altitude != null ? [...prev.elevationProfile, Math.round(altitude)] : prev.elevationProfile,
            };
          });
        }
      );
    } catch (err) {
      console.warn('GPS location error:', err);
    }
  };

  const startRecording = (sport: SportType = 'Run', simulate: boolean = false) => {
    isSimulatedRef.current = simulate;
    lastSplitDistRef.current = 0;
    lastSplitTimeRef.current = 0;
    lastCoordRef.current = null;

    setActiveRecording({
      ...INITIAL_RECORDING_STATE,
      isRecording: true,
      sportType: sport,
      isSimulated: simulate,
      startedAt: Date.now(),
    });

    if (!simulate && Platform.OS !== 'web') {
      startGpsSubscription();
    } else {
      // Initialize starting coordinate for simulator/web
      setActiveRecording((prev) => ({
        ...prev,
        gpsSignal: 'strong',
        accuracyMeters: 3,
        routeCoordinates: [{ latitude: 23.7745, longitude: 90.4125, altitude: 12, timestamp: Date.now() }],
        elevationProfile: [12],
      }));
    }
  };

  const pauseRecording = () => {
    setActiveRecording((prev) => ({ ...prev, isPaused: true }));
  };

  const resumeRecording = () => {
    setActiveRecording((prev) => ({ ...prev, isPaused: false }));
  };

  const discardRecording = () => {
    if (locationSubRef.current) {
      locationSubRef.current.remove();
      locationSubRef.current = null;
    }
    setActiveRecording(INITIAL_RECORDING_STATE);
  };

  const finishRecording = () => {
    if (locationSubRef.current) {
      locationSubRef.current.remove();
      locationSubRef.current = null;
    }
    const finalSnapshot = { ...activeRecording, isRecording: false };
    setActiveRecording(finalSnapshot);
    return finalSnapshot;
  };

  const toggleSimulation = () => {
    setActiveRecording((prev) => {
      const nextSim = !prev.isSimulated;
      isSimulatedRef.current = nextSim;
      return { ...prev, isSimulated: nextSim };
    });
  };

  return {
    activeRecording,
    startRecording,
    pauseRecording,
    resumeRecording,
    discardRecording,
    finishRecording,
    toggleSimulation,
  };
};

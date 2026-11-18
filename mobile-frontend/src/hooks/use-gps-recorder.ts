import { useEffect, useState } from 'react';
import { SportType } from '../types';

export interface ActiveRecordingState {
  isRecording: boolean;
  isPaused: boolean;
  sportType: SportType;
  elapsedSeconds: number;
  movingSeconds: number;
  distanceMeters: number;
  currentSpeedMps: number;
  elevationGainMeters: number;
  currentHeartRate: number;
  routeCoordinates: { latitude: number; longitude: number }[];
}

const INITIAL_RECORDING_STATE: ActiveRecordingState = {
  isRecording: false,
  isPaused: false,
  sportType: 'Run',
  elapsedSeconds: 0,
  movingSeconds: 0,
  distanceMeters: 0,
  currentSpeedMps: 0,
  elevationGainMeters: 0,
  currentHeartRate: 0,
  routeCoordinates: [],
};

export const useGpsRecorder = () => {
  const [activeRecording, setActiveRecording] = useState<ActiveRecordingState>(INITIAL_RECORDING_STATE);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (activeRecording.isRecording && !activeRecording.isPaused) {
      interval = setInterval(() => {
        setActiveRecording((prev) => {
          const speed = prev.sportType === 'Ride' ? 7.8 + Math.random() * 2 : 3.2 + Math.random() * 0.4;
          const addDist = speed;
          const newDist = prev.distanceMeters + addDist;
          const newElev = prev.elevationGainMeters + (Math.random() > 0.8 ? 1 : 0);
          const newHr = prev.sportType === 'Ride' ? 142 + Math.floor(Math.random() * 10) : 158 + Math.floor(Math.random() * 8);

          return {
            ...prev,
            elapsedSeconds: prev.elapsedSeconds + 1,
            movingSeconds: prev.movingSeconds + 1,
            distanceMeters: newDist,
            currentSpeedMps: speed,
            elevationGainMeters: newElev,
            currentHeartRate: newHr,
          };
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeRecording.isRecording, activeRecording.isPaused]);

  const startRecording = (sport: SportType = 'Run') => {
    setActiveRecording({
      ...INITIAL_RECORDING_STATE,
      isRecording: true,
      sportType: sport,
      routeCoordinates: [
        { latitude: 23.7745, longitude: 90.4072 },
        { latitude: 23.778, longitude: 90.415 },
      ],
    });
  };

  const pauseRecording = () => {
    setActiveRecording((prev) => ({ ...prev, isPaused: true }));
  };

  const resumeRecording = () => {
    setActiveRecording((prev) => ({ ...prev, isPaused: false }));
  };

  const discardRecording = () => {
    setActiveRecording(INITIAL_RECORDING_STATE);
  };

  const finishRecording = () => {
    const finalSnapshot = { ...activeRecording, isRecording: false };
    setActiveRecording(finalSnapshot);
    return finalSnapshot;
  };

  return {
    activeRecording,
    startRecording,
    pauseRecording,
    resumeRecording,
    discardRecording,
    finishRecording,
  };
};


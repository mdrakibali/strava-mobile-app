import React, { createContext, useContext, useState } from 'react';
import { useGpsRecorder, ActiveRecordingState } from '../hooks/use-gps-recorder';
import {
  CURRENT_USER,
  MOCK_ACTIVITIES,
  MOCK_CHALLENGES,
  MOCK_CLUBS,
  MOCK_EVENTS,
  MOCK_NOTIFICATIONS,
  MOCK_SEGMENTS,
} from '../mock/data';
import {
  Activity,
  Athlete,
  Challenge,
  Club,
  GroupEvent,
  NotificationItem,
  Segment,
  SportType,
} from '../types';
import { AppContextType } from './appContextTypes';

export { ActiveRecordingState, AppContextType };

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser] = useState<Athlete>(CURRENT_USER);
  const [activities, setActivities] = useState<Activity[]>(MOCK_ACTIVITIES);
  const [clubs, setClubs] = useState<Club[]>(MOCK_CLUBS);
  const [challenges, setChallenges] = useState<Challenge[]>(MOCK_CHALLENGES);
  const [events, setEvents] = useState<GroupEvent[]>(MOCK_EVENTS);
  const [segments] = useState<Segment[]>(MOCK_SEGMENTS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);

  const {
    activeRecording,
    startRecording,
    pauseRecording,
    resumeRecording,
    discardRecording,
    finishRecording,
  } = useGpsRecorder();

  const toggleKudos = (activityId: string) => {
    setActivities((prev) =>
      prev.map((act) => {
        if (act.id === activityId) {
          const nextHasKudos = !act.hasKudos;
          return {
            ...act,
            hasKudos: nextHasKudos,
            kudosCount: nextHasKudos ? act.kudosCount + 1 : Math.max(0, act.kudosCount - 1),
          };
        }
        return act;
      })
    );
  };

  const addComment = (activityId: string, content: string) => {
    if (!content.trim()) return;
    setActivities((prev) =>
      prev.map((act) => {
        if (act.id === activityId) {
          const newComment = {
            id: `c_${Date.now()}`,
            activityId,
            athlete: currentUser,
            content,
            createdAt: 'Just now',
          };
          return {
            ...act,
            commentsCount: act.commentsCount + 1,
            comments: [...(act.comments || []), newComment],
          };
        }
        return act;
      })
    );
  };

  const toggleJoinClub = (clubId: string) => {
    setClubs((prev) =>
      prev.map((c) =>
        c.id === clubId
          ? {
              ...c,
              isMember: !c.isMember,
              memberCount: c.isMember ? c.memberCount - 1 : c.memberCount + 1,
            }
          : c
      )
    );
  };

  const toggleJoinChallenge = (challengeId: string) => {
    setChallenges((prev) =>
      prev.map((ch) =>
        ch.id === challengeId ? { ...ch, isJoined: !ch.isJoined } : ch
      )
    );
  };

  const toggleRsvp = (eventId: string, status: 'GOING' | 'MAYBE' | 'DECLINED') => {
    setEvents((prev) =>
      prev.map((ev) =>
        ev.id === eventId
          ? {
              ...ev,
              rsvpStatus: status,
              attendeesCount: status === 'GOING' ? ev.attendeesCount + 1 : ev.attendeesCount,
            }
          : ev
      )
    );
  };

  const toggleFollowAthlete = (athleteId: string) => {
    setActivities((prev) =>
      prev.map((act) => {
        if (act.athlete.id === athleteId) {
          return {
            ...act,
            athlete: { ...act.athlete, isFollowing: !act.athlete.isFollowing },
          };
        }
        return act;
      })
    );
  };

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const saveNewActivity = (
    title: string,
    description: string,
    visibility: 'PUBLIC' | 'FOLLOWERS_ONLY' | 'ONLY_ME'
  ) => {
    const distKm = (activeRecording.distanceMeters / 1000).toFixed(2);
    const mins = Math.floor(activeRecording.movingSeconds / 60);
    const secs = activeRecording.movingSeconds % 60;
    const timeFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    const paceSeconds =
      activeRecording.distanceMeters > 0
        ? Math.round(activeRecording.movingSeconds / (activeRecording.distanceMeters / 1000))
        : 300;
    const paceMin = Math.floor(paceSeconds / 60);
    const paceSec = paceSeconds % 60;
    const paceFormatted =
      activeRecording.sportType === 'Ride'
        ? `${(activeRecording.currentSpeedMps * 3.6).toFixed(1)} km/h`
        : `${paceMin}:${paceSec < 10 ? '0' : ''}${paceSec} /km`;

    const newActivity: Activity = {
      id: `act_${Date.now()}`,
      athlete: currentUser,
      title: title || `${activeRecording.sportType} Workout`,
      description: description || 'Recorded with Open Strava GPS',
      sportType: activeRecording.sportType,
      visibility,
      startTime: new Date().toISOString(),
      distanceMeters: activeRecording.distanceMeters,
      movingTimeSeconds: activeRecording.movingSeconds,
      elapsedTimeSeconds: activeRecording.elapsedSeconds,
      elevationGainMeters: activeRecording.elevationGainMeters,
      averageSpeedMps: activeRecording.currentSpeedMps,
      maxSpeedMps: activeRecording.currentSpeedMps * 1.3,
      averageHeartRate: activeRecording.currentHeartRate || 152,
      maxHeartRate: (activeRecording.currentHeartRate || 152) + 18,
      distanceFormatted: `${distKm} km`,
      movingTimeFormatted: timeFormatted,
      paceFormatted,
      elevationFormatted: `${activeRecording.elevationGainMeters} m`,
      gapFormatted: activeRecording.sportType === 'Run' ? paceFormatted : undefined,
      relativeEffortScore: Math.round(activeRecording.movingSeconds / 45),
      kudosCount: 0,
      hasKudos: false,
      commentsCount: 0,
      comments: [],
      routePoints: [
        { latitude: 23.771, longitude: 90.412 },
        { latitude: 23.774, longitude: 90.416 },
        { latitude: 23.778, longitude: 90.422 },
        { latitude: 23.782, longitude: 90.428 },
      ],
      elevationProfile: [10, 15, 22, 18, 25, 30, 24, 18],
    };

    setActivities((prev) => [newActivity, ...prev]);
    discardRecording();
  };

  const unreadNotificationCount = notifications.filter((n) => !n.isRead).length;

  return (
    <AppContext.Provider
      value={{
        currentUser,
        activities,
        clubs,
        challenges,
        events,
        segments,
        notifications,
        unreadNotificationCount,
        activeRecording,
        toggleKudos,
        addComment,
        toggleFollowAthlete,
        toggleJoinClub,
        toggleJoinChallenge,
        toggleRsvp,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        startRecording,
        pauseRecording,
        resumeRecording,
        discardRecording,
        finishRecording,
        saveNewActivity,
      }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

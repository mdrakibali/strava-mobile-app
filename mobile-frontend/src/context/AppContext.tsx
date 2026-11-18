import React, { createContext, useContext, useEffect, useState } from 'react';
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

interface AppContextType {
  currentUser: Athlete;
  activities: Activity[];
  clubs: Club[];
  challenges: Challenge[];
  events: GroupEvent[];
  segments: Segment[];
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  activeRecording: ActiveRecordingState;

  // Actions
  toggleKudos: (activityId: string) => void;
  addComment: (activityId: string, content: string) => void;
  toggleJoinClub: (clubId: string) => void;
  toggleJoinChallenge: (challengeId: string) => void;
  toggleRsvp: (eventId: string, status: 'GOING' | 'MAYBE' | 'DECLINED') => void;
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
  toggleFollowAthlete: (athleteId: string) => void;

  // Recording Controls
  startRecording: (sport?: SportType) => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  discardRecording: () => void;
  finishRecording: () => ActiveRecordingState;
  saveNewActivity: (title: string, description: string, visibility: 'PUBLIC' | 'FOLLOWERS_ONLY' | 'ONLY_ME') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser] = useState<Athlete>(CURRENT_USER);
  const [activities, setActivities] = useState<Activity[]>(MOCK_ACTIVITIES);
  const [clubs, setClubs] = useState<Club[]>(MOCK_CLUBS);
  const [challenges, setChallenges] = useState<Challenge[]>(MOCK_CHALLENGES);
  const [events, setEvents] = useState<GroupEvent[]>(MOCK_EVENTS);
  const [segments] = useState<Segment[]>(MOCK_SEGMENTS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);

  // Active recording state
  const [activeRecording, setActiveRecording] = useState<ActiveRecordingState>({
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
  });

  // Ticking timer for active recording
  useEffect(() => {
    let interval: any;
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
    return () => clearInterval(interval);
  }, [activeRecording.isRecording, activeRecording.isPaused]);

  // Social Kudos toggle
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

  // Add Comment
  const addComment = (activityId: string, content: string) => {
    if (!content.trim()) return;
    setActivities((prev) =>
      prev.map((act) => {
        if (act.id === activityId) {
          const newComment = {
            id: `c_${Date.now()}`,
            activityId,
            athlete: currentUser,
            content: content.trim(),
            createdAt: 'Just now',
          };
          const updatedComments = act.comments ? [...act.comments, newComment] : [newComment];
          return {
            ...act,
            commentsCount: act.commentsCount + 1,
            comments: updatedComments,
          };
        }
        return act;
      })
    );
  };

  // Follow/Unfollow athlete
  const toggleFollowAthlete = (athleteId: string) => {
    setActivities((prev) =>
      prev.map((act) => {
        if (act.athlete.id === athleteId) {
          const nextFollow = !act.athlete.isFollowing;
          return {
            ...act,
            athlete: {
              ...act.athlete,
              isFollowing: nextFollow,
              followersCount: nextFollow
                ? act.athlete.followersCount + 1
                : Math.max(0, act.athlete.followersCount - 1),
            },
          };
        }
        return act;
      })
    );
  };

  // Club Join/Leave
  const toggleJoinClub = (clubId: string) => {
    setClubs((prev) =>
      prev.map((club) => {
        if (club.id === clubId) {
          const nextMember = !club.isMember;
          return {
            ...club,
            isMember: nextMember,
            memberCount: nextMember ? club.memberCount + 1 : Math.max(0, club.memberCount - 1),
          };
        }
        return club;
      })
    );
  };

  // Challenge Join/Leave
  const toggleJoinChallenge = (challengeId: string) => {
    setChallenges((prev) =>
      prev.map((ch) => {
        if (ch.id === challengeId) {
          return {
            ...ch,
            isJoined: !ch.isJoined,
          };
        }
        return ch;
      })
    );
  };

  // Event RSVP
  const toggleRsvp = (eventId: string, status: 'GOING' | 'MAYBE' | 'DECLINED') => {
    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id === eventId) {
          const wasGoing = ev.rsvpStatus === 'GOING';
          const isNowGoing = status === 'GOING';
          let newCount = ev.attendeesCount;
          if (!wasGoing && isNowGoing) newCount += 1;
          if (wasGoing && !isNowGoing) newCount = Math.max(0, newCount - 1);
          return {
            ...ev,
            rsvpStatus: ev.rsvpStatus === status ? null : status,
            attendeesCount: newCount,
          };
        }
        return ev;
      })
    );
  };

  // Notification actions
  const markNotificationAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const unreadNotificationCount = notifications.filter((n) => !n.isRead).length;

  // Recording controls
  const startRecording = (sport: SportType = 'Run') => {
    setActiveRecording({
      isRecording: true,
      isPaused: false,
      sportType: sport,
      elapsedSeconds: 0,
      movingSeconds: 0,
      distanceMeters: 0,
      currentSpeedMps: sport === 'Ride' ? 8.2 : 3.4,
      elevationGainMeters: 0,
      currentHeartRate: sport === 'Ride' ? 144 : 155,
      routeCoordinates: [
        { latitude: 23.771, longitude: 90.412 },
        { latitude: 23.773, longitude: 90.415 },
      ],
    });
  };

  const pauseRecording = () => {
    setActiveRecording((prev) => ({ ...prev, isPaused: true, currentSpeedMps: 0 }));
  };

  const resumeRecording = () => {
    setActiveRecording((prev) => ({
      ...prev,
      isPaused: false,
      currentSpeedMps: prev.sportType === 'Ride' ? 8.0 : 3.3,
    }));
  };

  const discardRecording = () => {
    setActiveRecording({
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
    });
  };

  const finishRecording = () => {
    pauseRecording();
    return activeRecording;
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
    const paceSeconds = activeRecording.distanceMeters > 0
      ? Math.round(activeRecording.movingSeconds / (activeRecording.distanceMeters / 1000))
      : 300;
    const paceMin = Math.floor(paceSeconds / 60);
    const paceSec = paceSeconds % 60;
    const paceFormatted = activeRecording.sportType === 'Ride'
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


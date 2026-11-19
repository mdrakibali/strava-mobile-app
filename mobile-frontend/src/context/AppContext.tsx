import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActiveRecordingState, useGpsRecorder } from '../hooks/use-gps-recorder';
import {
  MOCK_EVENTS,
  MOCK_SEGMENTS,
} from '../mock/data';
import { api, setAuthToken } from '../services/api';
import {
  Activity,
  Athlete,
  Challenge,
  Club,
  GroupEvent,
  NotificationItem,
  Segment,
} from '../types';
import { AppContextType } from './appContextTypes';

export { ActiveRecordingState, AppContextType };

const INITIAL_ATHLETE: Athlete = {
  id: 'ath_initial',
  displayName: 'Athlete',
  username: 'athlete',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
  city: 'Dhaka',
  country: 'Bangladesh',
  bio: 'Open Strava Runner',
  followersCount: 0,
  followingCount: 0,
  isFollowing: false,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Athlete>(INITIAL_ATHLETE);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [events, setEvents] = useState<GroupEvent[]>(MOCK_EVENTS);
  const [segments] = useState<Segment[]>(MOCK_SEGMENTS);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(true);

  const {
    activeRecording,
    startRecording,
    pauseRecording,
    resumeRecording,
    discardRecording,
    finishRecording,
    toggleSimulation,
  } = useGpsRecorder();

  // Helper: map backend activity format to frontend Activity interface
  const mapBackendActivity = (item: any): Activity => {
    const distKm = (item.distanceMeters / 1000).toFixed(2);
    const mins = Math.floor(item.movingTimeSeconds / 60);
    const secs = item.movingTimeSeconds % 60;
    const timeFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    const paceSeconds =
      item.distanceMeters > 0
        ? Math.round(item.movingTimeSeconds / (item.distanceMeters / 1000))
        : 300;
    const paceMin = Math.floor(paceSeconds / 60);
    const paceSec = paceSeconds % 60;
    const paceFormatted =
      item.sportType === 'Ride'
        ? `${((item.averageSpeedMps || 0) * 3.6).toFixed(1)} km/h`
        : `${paceMin}:${paceSec < 10 ? '0' : ''}${paceSec} /km`;

    return {
      id: item.id,
      athlete: {
        id: item.athlete.id,
        displayName: item.athlete.displayName,
        username: item.athlete.username,
        avatarUrl: item.athlete.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
        city: item.athlete.city || 'Dhaka',
        country: 'Bangladesh',
        bio: 'Runner & Cyclist',
        followersCount: 142,
        followingCount: 98,
        isFollowing: false,
      },
      title: item.title,
      description: item.description || '',
      sportType: item.sportType,
      visibility: item.visibility,
      startTime: item.startTime,
      distanceMeters: item.distanceMeters,
      movingTimeSeconds: item.movingTimeSeconds,
      elapsedTimeSeconds: item.elapsedTimeSeconds,
      elevationGainMeters: item.elevationGainMeters,
      averageSpeedMps: item.averageSpeedMps || 3.0,
      maxSpeedMps: item.maxSpeedMps || 4.5,
      averageHeartRate: item.averageHeartRate || 150,
      maxHeartRate: 175,
      distanceFormatted: `${distKm} km`,
      movingTimeFormatted: timeFormatted,
      paceFormatted,
      elevationFormatted: `${item.elevationGainMeters} m`,
      gapFormatted: item.gapFormatted || paceFormatted,
      relativeEffortScore: item.relativeEffortScore || 45,
      kudosCount: item.kudosCount || 0,
      hasKudos: item.hasKudos || false,
      commentsCount: item.commentsCount || 0,
      comments: [],
      routePoints: item.polyline || [],
      photos: item.photos || undefined,
    };
  };

  // Helper: map backend club format
  const mapBackendClub = (item: any): Club => ({
    id: item.id,
    name: item.name,
    sportType: item.sportType,
    city: item.city || 'Dhaka',
    description: item.description || '',
    avatarUrl: item.avatarUrl,
    bannerUrl: item.bannerUrl,
    memberCount: item.membersCount || 0,
    isMember: Boolean(item.isMember),
    weeklyDistanceMeters: 42000,
    weeklyActivitiesCount: 8,
  });

  // Helper: map backend challenge format
  const mapBackendChallenge = (item: any): Challenge => ({
    id: item.id,
    title: item.title,
    description: item.description || '',
    sportType: item.sportType,
    targetMeters: item.targetMeters,
    badgeUrl: item.badgeUrl,
    participantsCount: item.participantsCount || 0,
    isJoined: Boolean(item.isJoined),
    currentMeters: item.currentMeters || 0,
    isCompleted: Boolean(item.isCompleted),
    daysRemaining: item.daysRemaining || 10,
  });

  // Initial Sync: Load REAL data from Neon PostgreSQL via Cloudflare Workers
  const syncWithBackend = async () => {
    setIsSyncing(true);
    try {
      // 1. Authenticate with backend and retrieve real athlete session
      const authRes = await api.auth.demoLogin().catch(() => null);
      if (authRes?.token) {
        setAuthToken(authRes.token);
        if (authRes.athlete) {
          setCurrentUser({
            id: authRes.athlete.id,
            displayName: authRes.athlete.displayName,
            username: authRes.athlete.username,
            avatarUrl: authRes.athlete.avatarUrl,
            city: authRes.athlete.city || 'Dhaka',
            country: authRes.athlete.country || 'Bangladesh',
            bio: authRes.athlete.bio || '',
            followersCount: authRes.athlete.followersCount || 0,
            followingCount: authRes.athlete.followingCount || 0,
            isFollowing: false,
          });
        }
      }

      // 2. Fetch REAL timeline feed from Database
      const feedRes = await api.feed.getFeed('all').catch(() => null);
      if (feedRes?.feed) {
        setActivities(feedRes.feed.map(mapBackendActivity));
      }

      // 3. Fetch REAL clubs from Database
      const clubsRes = await api.clubs.list().catch(() => null);
      if (clubsRes?.clubs) {
        setClubs(clubsRes.clubs.map(mapBackendClub));
      }

      // 4. Fetch REAL challenges from Database
      const chRes = await api.challenges.list().catch(() => null);
      if (chRes?.challenges) {
        setChallenges(chRes.challenges.map(mapBackendChallenge));
      }

      // 5. Fetch REAL notifications from Database
      const notifRes = await api.notifications.list().catch(() => null);
      if (notifRes?.notifications) {
        setNotifications(
          notifRes.notifications.map((n: any) => ({
            id: n.id,
            actionType: (n.actionType?.toUpperCase() || 'KUDOS') as any,
            actor: {
              id: n.actor?.id || 'ath_unknown',
              displayName: n.actor?.displayName || 'Athlete',
              username: n.actor?.username || 'athlete',
              avatarUrl: n.actor?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
              city: 'Dhaka',
              country: 'Bangladesh',
              followersCount: 0,
              followingCount: 0,
            },
            message: n.message,
            targetActivityId: n.targetActivityId,
            timeAgo: n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
            isRead: n.isRead,
          }))
        );
      }
    } catch (err) {
      console.warn('Backend sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    syncWithBackend();
  }, []);

  const refreshFeed = async () => {
    setIsSyncing(true);
    try {
      const feedRes = await api.feed.getFeed('all');
      if (feedRes?.feed) {
        setActivities(feedRes.feed.map(mapBackendActivity));
      }
    } catch (err) {
      console.warn('Refresh feed failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const loginWithGoogle = async (idToken: string) => {
    setIsSyncing(true);
    try {
      const res = await api.auth.googleLogin(idToken);
      if (res.token) {
        setAuthToken(res.token);
        if (res.athlete) {
          setCurrentUser({
            id: res.athlete.id,
            displayName: res.athlete.displayName,
            username: res.athlete.username,
            avatarUrl: res.athlete.avatarUrl,
            city: res.athlete.city || 'Dhaka',
            country: res.athlete.country || 'Bangladesh',
            bio: res.athlete.bio || '',
            followersCount: res.athlete.followersCount || 0,
            followingCount: res.athlete.followingCount || 0,
            isFollowing: false,
          });
        }
        await refreshFeed();
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const loginWithDemo = async () => {
    await syncWithBackend();
  };

  const toggleKudos = (activityId: string) => {
    // 1. Optimistic UI update
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

    // 2. Fire background API request to live worker
    api.activities.toggleKudos(activityId).catch((err) => {
      console.warn('Kudos toggle sync error:', err);
    });
  };

  const addComment = (activityId: string, content: string) => {
    if (!content.trim()) return;

    // 1. Optimistic UI update
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

    // 2. Fire background API request
    api.activities.addComment(activityId, content.trim()).catch((err) => {
      console.warn('Comment post sync error:', err);
    });
  };

  const toggleJoinClub = (clubId: string) => {
    // 1. Optimistic UI update
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

    // 2. Fire background API request
    api.clubs.join(clubId).catch((err) => {
      console.warn('Club join sync error:', err);
    });
  };

  const toggleJoinChallenge = (challengeId: string) => {
    // 1. Optimistic UI update
    setChallenges((prev) =>
      prev.map((ch) =>
        ch.id === challengeId ? { ...ch, isJoined: !ch.isJoined } : ch
      )
    );

    // 2. Fire background API request
    api.challenges.join(challengeId).catch((err) => {
      console.warn('Challenge join sync error:', err);
    });
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
    api.notifications.markRead(notificationId).catch(console.warn);
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    api.notifications.markAllRead().catch(console.warn);
  };

  // Upload activity to Live Cloudflare Workers + Neon Database
  const saveNewActivity = async (
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

    const optimisticId = `act_${Date.now()}`;
    const newActivity: Activity = {
      id: optimisticId,
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
      maxSpeedMps: activeRecording.maxSpeedMps || activeRecording.currentSpeedMps * 1.3,
      averageHeartRate: activeRecording.currentHeartRate || 152,
      maxHeartRate: (activeRecording.currentHeartRate || 152) + 18,
      distanceFormatted: `${distKm} km`,
      movingTimeFormatted: timeFormatted,
      paceFormatted,
      elevationFormatted: `${activeRecording.elevationGainMeters} m`,
      gapFormatted: activeRecording.sportType === 'Run' ? paceFormatted : undefined,
      relativeEffortScore: Math.max(1, Math.round(activeRecording.movingSeconds / 45)),
      kudosCount: 0,
      hasKudos: false,
      commentsCount: 0,
      comments: [],
      routePoints:
        activeRecording.routeCoordinates.length > 0
          ? activeRecording.routeCoordinates
          : [
              { latitude: 23.771, longitude: 90.412 },
              { latitude: 23.774, longitude: 90.416 },
              { latitude: 23.778, longitude: 90.422 },
              { latitude: 23.782, longitude: 90.428 },
            ],
      splits: activeRecording.splits.length > 0 ? activeRecording.splits : undefined,
      elevationProfile:
        activeRecording.elevationProfile.length > 0
          ? activeRecording.elevationProfile
          : [10, 15, 22, 18, 25, 30, 24, 18],
    };

    // 1. Optimistic insert
    setActivities((prev) => [newActivity, ...prev]);

    // 2. Fire live backend upload API call
    try {
      const serverRes = await api.activities.create({
        title: newActivity.title,
        description: newActivity.description,
        sportType: newActivity.sportType,
        distanceMeters: activeRecording.distanceMeters,
        movingTimeSeconds: activeRecording.movingSeconds,
        elapsedTimeSeconds: activeRecording.elapsedSeconds,
        elevationGainMeters: activeRecording.elevationGainMeters,
        rawPolyline: newActivity.routePoints || [],
        splits: newActivity.splits,
        elevationProfile: newActivity.elevationProfile,
      });

      if (serverRes?.activity?.id) {
        // Update optimistic item with real server-generated activity ID & masked coordinates
        setActivities((prev) =>
          prev.map((a) =>
            a.id === optimisticId ? { ...a, id: serverRes.activity.id } : a
          )
        );
      }
    } catch (err) {
      console.warn('Background activity upload to Neon failed (saved locally):', err);
    }

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
        isSyncing,
        toggleKudos,
        addComment,
        toggleFollowAthlete,
        toggleJoinClub,
        toggleJoinChallenge,
        toggleRsvp,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        refreshFeed,
        loginWithGoogle,
        loginWithDemo,
        startRecording,
        pauseRecording,
        resumeRecording,
        discardRecording,
        finishRecording,
        toggleSimulation,
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

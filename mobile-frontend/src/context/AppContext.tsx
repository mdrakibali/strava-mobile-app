import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { recordingEngine } from '../tracking/engine';
import { syncWorker } from '../tracking/sync';
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
import { FEATURES } from '../config/features';
import { formatRelative } from '../lib/format';
import { AppContextType } from './appContextTypes';

export { AppContextType };

/** Signed-out placeholder only (never shown as a real profile): no invented city, photo or bio. */
const INITIAL_ATHLETE: Athlete = {
  id: '',
  displayName: '',
  username: '',
  avatarUrl: '',
  city: '',
  country: '',
  bio: '',
  followersCount: 0,
  followingCount: 0,
  isFollowing: false,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Athlete>(INITIAL_ATHLETE);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(true);

  // Recording + upload state live outside React (src/tracking). They only need to know who is
  // signed in: recordings and pending uploads are bound to the athlete who made them.
  useEffect(() => {
    const id = isAuthenticated ? currentUser.id : null;
    recordingEngine.setAthlete(id);
    syncWorker.startTriggers();
    syncWorker.setAthlete(id);
    if (id) recordingEngine.load(true).catch((e) => console.warn('recording recovery failed', e));
  }, [isAuthenticated, currentUser.id]);

  // Helper: map backend club format
  const mapBackendClub = (item: any): Club => ({
    id: item.id,
    name: item.name,
    sportType: item.sportType,
    city: item.city || '',
    description: item.description || '',
    avatarUrl: item.avatarUrl,
    bannerUrl: item.bannerUrl,
    memberCount: Number(item.memberCount ?? item.membersCount) || 0,
    isMember: Boolean(item.isMember),
    // Not provided by the list endpoint — 0, never an invented number.
    weeklyDistanceMeters: Number(item.weeklyDistanceMeters) || 0,
    weeklyActivitiesCount: Number(item.weeklyActivitiesCount) || 0,
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
    daysRemaining: Number(item.daysRemaining) || 0,
  });

  // Load data from Neon PostgreSQL via Cloudflare Workers
  const loadFeedData = async () => {
    setIsSyncing(true);
    try {
      // The home feed, profile and activity screens load their own data (paginated, with
      // error states). Here we only load app-wide data: notifications, plus out-of-scope
      // modules when their feature flag is on (ADR-15).
      if (FEATURES.groups) {
        const clubsRes = await api.clubs.list().catch(() => null);
        if (clubsRes?.clubs) {
          setClubs(clubsRes.clubs.map(mapBackendClub));
        }
        const chRes = await api.challenges.list().catch(() => null);
        if (chRes?.challenges) {
          setChallenges(chRes.challenges.map(mapBackendChallenge));
        }
      }

      // 4. Fetch REAL notifications from Database
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
              avatarUrl: n.actor?.avatarUrl || '',
              city: '',
              country: '',
              followersCount: 0,
              followingCount: 0,
            },
            message: n.message,
            targetActivityId: n.targetActivityId,
            timeAgo: formatRelative(n.createdAt),
            isRead: n.isRead,
          }))
        );
      }

      if (!FEATURES.groups && !FEATURES.explore) return;

      const eventsRes = await api.events.list().catch(() => null);
      if (eventsRes?.events && eventsRes.events.length > 0) {
        setEvents(eventsRes.events);
      }

      const segRes = await api.segments.list().catch(() => null);
      if (segRes?.segments && segRes.segments.length > 0) {
        setSegments(
          segRes.segments.map((s: any) => ({
            id: s.id,
            name: s.name,
            sportType: s.sportType,
            distanceMeters: Number(s.distanceMeters || 1000),
            averageGradePercent: Number(s.averageGradePercent || 1.0),
            elevationGainMeters: s.elevationGainMeters || 10,
            polylinePoints: s.polylinePoints || [],
            komAthleteName: 'Community Leader',
            komTimeFormatted: '3:20',
            userPrTimeFormatted: undefined,
            rank: 1,
          }))
        );
      }
    } catch (err) {
      console.warn('Backend sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Check stored auth session on startup
  useEffect(() => {
    const initAuthSession = async () => {
      try {
        setIsAuthLoading(true);
        const storedToken = await AsyncStorage.getItem('@open_strava_token');
        const storedAthlete = await AsyncStorage.getItem('@open_strava_athlete');

        if (storedToken && storedAthlete) {
          setAuthToken(storedToken);
          setCurrentUser(JSON.parse(storedAthlete));
          setIsAuthenticated(true);
          await loadFeedData();
        } else {
          setIsAuthenticated(false);
          setIsSyncing(false);
        }
      } catch (err) {
        console.warn('Auth session check failed:', err);
        setIsAuthenticated(false);
        setIsSyncing(false);
      } finally {
        setIsAuthLoading(false);
      }
    };

    initAuthSession();
  }, []);

  const refreshFeed = async () => {
    await loadFeedData();
  };

  const loginWithEmail = async (email: string, password: string) => {
    setIsSyncing(true);
    try {
      const res = await api.auth.login(email, password);
      if (res?.token && res?.athlete) {
        const athleteProfile: Athlete = {
          id: res.athlete.id,
          displayName: res.athlete.displayName,
          username: res.athlete.username,
          avatarUrl: res.athlete.avatarUrl,
          city: res.athlete.city || '',
          country: res.athlete.country || '',
          bio: res.athlete.bio || '',
          followersCount: res.athlete.followersCount || 0,
          followingCount: res.athlete.followingCount || 0,
          isFollowing: false,
        };

        await AsyncStorage.setItem('@open_strava_token', res.token);
        await AsyncStorage.setItem('@open_strava_athlete', JSON.stringify(athleteProfile));

        setAuthToken(res.token);
        setCurrentUser(athleteProfile);
        setIsAuthenticated(true);
        await loadFeedData();
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const registerWithEmail = async (data: { email: string; password: string; displayName: string; username?: string }) => {
    setIsSyncing(true);
    try {
      const res = await api.auth.register(data);
      if (res?.token && res?.athlete) {
        const athleteProfile: Athlete = {
          id: res.athlete.id,
          displayName: res.athlete.displayName,
          username: res.athlete.username,
          avatarUrl: res.athlete.avatarUrl,
          city: res.athlete.city || '',
          country: res.athlete.country || '',
          bio: res.athlete.bio || '',
          followersCount: res.athlete.followersCount || 0,
          followingCount: res.athlete.followingCount || 0,
          isFollowing: false,
        };

        await AsyncStorage.setItem('@open_strava_token', res.token);
        await AsyncStorage.setItem('@open_strava_athlete', JSON.stringify(athleteProfile));

        setAuthToken(res.token);
        setCurrentUser(athleteProfile);
        setIsAuthenticated(true);
        await loadFeedData();
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const loginWithGoogle = async (idToken: string) => {
    setIsSyncing(true);
    try {
      const res = await api.auth.googleLogin(idToken);
      if (res?.token && res?.athlete) {
        const athleteProfile: Athlete = {
          id: res.athlete.id,
          displayName: res.athlete.displayName,
          username: res.athlete.username,
          avatarUrl: res.athlete.avatarUrl,
          city: res.athlete.city || '',
          country: res.athlete.country || '',
          bio: res.athlete.bio || '',
          followersCount: res.athlete.followersCount || 0,
          followingCount: res.athlete.followingCount || 0,
          isFollowing: false,
        };

        await AsyncStorage.setItem('@open_strava_token', res.token);
        await AsyncStorage.setItem('@open_strava_athlete', JSON.stringify(athleteProfile));

        setAuthToken(res.token);
        setCurrentUser(athleteProfile);
        setIsAuthenticated(true);
        await loadFeedData();
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const logout = async () => {
    try {
      // Also end the Google session so the account chooser appears on the next Google sign-in.
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { TurboModuleRegistry } = require('react-native');
        if (TurboModuleRegistry.get('RNGoogleSignin')) {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          await require('@react-native-google-signin/google-signin').GoogleSignin.signOut();
        }
      } catch {
        // not signed in with Google / module unavailable
      }
      await AsyncStorage.multiRemove(['@open_strava_token', '@open_strava_athlete']);
      setAuthToken(null);
      setCurrentUser(INITIAL_ATHLETE);
      setIsAuthenticated(false);
      setActivities([]);
      setNotifications([]);
    } catch (err) {
      console.warn('Logout error:', err);
    }
  };

  /** Apply server-confirmed profile changes locally and to the persisted session profile. */
  const updateCurrentUser = async (patch: Partial<Athlete>) => {
    const next = { ...currentUser, ...patch };
    setCurrentUser(next);
    await AsyncStorage.setItem('@open_strava_athlete', JSON.stringify(next)).catch(() => {});
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
    api.athletes.toggleFollow(athleteId).catch((err) => {
      console.warn('Follow sync error:', err);
    });
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

  const unreadNotificationCount = notifications.filter((n) => !n.isRead).length;

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isAuthLoading,
        activities,
        clubs,
        challenges,
        events,
        segments,
        notifications,
        unreadNotificationCount,
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
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        logout,
        updateCurrentUser,
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

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { recordingEngine } from '../tracking/engine';
import { syncWorker } from '../tracking/sync';
import { api, setAuthToken, setUnauthorizedHandler } from '../services/api';
import { Athlete, NotificationItem } from '../types';
import { formatRelative } from '../lib/format';
import { resetSessionOverlays } from '../lib/sessionReset';
import { realtimeWs } from '../services/websocket';
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
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(true);
  const profileMutationEpochRef = useRef(0);

  // Recording + upload state live outside React (src/tracking). They only need to know who is
  // signed in: recordings and pending uploads are bound to the athlete who made them.
  useEffect(() => {
    const id = isAuthenticated ? currentUser.id : null;
    recordingEngine.setAthlete(id);
    syncWorker.startTriggers();
    syncWorker.setAthlete(id);
    syncWorker.setViewer(
      id
        ? {
            id: currentUser.id,
            displayName: currentUser.displayName,
            username: currentUser.username,
            avatarUrl: currentUser.avatarUrl,
            city: currentUser.city ?? null,
          }
        : null
    );
    if (id) recordingEngine.load(true).catch((e) => console.warn('recording recovery failed', e));
  }, [
    isAuthenticated,
    currentUser.id,
    currentUser.displayName,
    currentUser.username,
    currentUser.avatarUrl,
    currentUser.city,
  ]);

  // The home feed, profile, activity, club, challenge and event screens load their own data
  // (paginated, with error states). App-wide state is only the session and notifications.
  const refreshNotifications = useCallback(async () => {
    try {
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
    } catch {}
  }, []);

  const loadFeedData = useCallback(async () => {
    setIsSyncing(true);
    try {
      await refreshNotifications();
    } finally {
      setIsSyncing(false);
    }
  }, [refreshNotifications]);

  // Check stored auth session on startup
  useEffect(() => {
    const initAuthSession = async () => {
      try {
        setIsAuthLoading(true);
        const storedToken = await AsyncStorage.getItem('@open_strava_token');
        const storedAthlete = await AsyncStorage.getItem('@open_strava_athlete');

        if (storedToken && storedAthlete) {
          const parsed = JSON.parse(storedAthlete);
          setAuthToken(storedToken);
          setCurrentUser(parsed);
          setIsAuthenticated(true);
          realtimeWs.init(storedToken);
          await loadFeedData();
          if (parsed?.id) {
            const requestEpoch = profileMutationEpochRef.current;
            api.athletes
              .getProfile(parsed.id)
              .then((fresh) => {
                if (fresh?.athlete && profileMutationEpochRef.current === requestEpoch) {
                  setCurrentUser((prev) => {
                    if (prev.id !== fresh.athlete.id) return prev;
                    const nextAthlete = {
                      ...prev,
                      displayName: fresh.athlete.displayName ?? prev.displayName,
                      username: fresh.athlete.username ?? prev.username,
                      avatarUrl: fresh.athlete.avatarUrl ?? prev.avatarUrl,
                      bio: fresh.athlete.bio ?? prev.bio,
                      city: fresh.athlete.city ?? prev.city,
                      country: fresh.athlete.country ?? prev.country,
                      followersCount: fresh.athlete.followersCount ?? prev.followersCount,
                      followingCount: fresh.athlete.followingCount ?? prev.followingCount,
                    };
                    AsyncStorage.setItem('@open_strava_athlete', JSON.stringify(nextAthlete)).catch(
                      () => {}
                    );
                    return nextAthlete;
                  });
                }
              })
              .catch(() => {});
          }
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
  }, [loadFeedData]);

  const refreshFeed = async () => {
    await loadFeedData();
  };

  /** Single place where a session starts. Clears the previous account's local state first. */
  const startSession = async (res: { token?: string; athlete?: any } | undefined) => {
    if (!res?.token || !res?.athlete) return;
    profileMutationEpochRef.current += 1;
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

    resetSessionOverlays();
    setNotifications([]);
    await AsyncStorage.setItem('@open_strava_token', res.token);
    await AsyncStorage.setItem('@open_strava_athlete', JSON.stringify(athleteProfile));

    setAuthToken(res.token);
    setCurrentUser(athleteProfile);
    setIsAuthenticated(true);
    realtimeWs.init(res.token);
    await loadFeedData();
  };

  const loginWithEmail = async (email: string, password: string) => {
    setIsSyncing(true);
    try {
      await startSession(await api.auth.login(email, password));
    } finally {
      setIsSyncing(false);
    }
  };

  const registerWithEmail = async (data: {
    email: string;
    password: string;
    displayName: string;
    username?: string;
  }) => {
    setIsSyncing(true);
    try {
      await startSession(await api.auth.register(data));
    } finally {
      setIsSyncing(false);
    }
  };

  const loginWithGoogle = async (idToken: string) => {
    setIsSyncing(true);
    try {
      await startSession(await api.auth.googleLogin(idToken));
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
      realtimeWs.disconnect();
      resetSessionOverlays();
      setCurrentUser(INITIAL_ATHLETE);
      setIsAuthenticated(false);
      setNotifications([]);
    } catch (err) {
      console.warn('Logout error:', err);
    }
  };

  // An expired or revoked token must end the session instead of leaving every request failing.
  const logoutRef = useRef(logout);
  useEffect(() => {
    logoutRef.current = logout;
  });
  useEffect(() => {
    setUnauthorizedHandler(() => {
      logoutRef.current().catch(() => {});
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  /** Apply server-confirmed profile changes locally and to the persisted session profile. */
  const updateCurrentUser = async (patch: Partial<Athlete>) => {
    profileMutationEpochRef.current += 1;
    setCurrentUser((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem('@open_strava_athlete', JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
    api.notifications.markRead(notificationId).catch(console.warn);
  };

  useEffect(() => {
    if (!isAuthenticated) {
      realtimeWs.disconnect();
      return;
    }
    realtimeWs.init();
    let cancelled = false;
    api.notifications
      .list()
      .then((notifRes) => {
        if (!cancelled && notifRes?.notifications) {
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
      })
      .catch(() => {});

    const unsub = realtimeWs.addListener('notification', () => {
      refreshNotifications();
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [isAuthenticated, refreshNotifications]);

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
        notifications,
        unreadNotificationCount,
        isSyncing,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        refreshNotifications,
        refreshFeed,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        logout,
        updateCurrentUser,
      }}
    >
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

import { Athlete, NotificationItem } from '../types';

export interface AppContextType {
  currentUser: Athlete;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  isSyncing: boolean;

  // Actions
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
  refreshNotifications: () => Promise<void>;
  refreshFeed: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (data: { email: string; password: string; displayName: string; username?: string }) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  updateCurrentUser: (patch: Partial<Athlete>) => Promise<void>;

}


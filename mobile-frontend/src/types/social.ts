import { Athlete } from './index';

export interface BestEffortItem {
  id: string;
  distanceLabel: string;
  timeFormatted: string;
  paceFormatted: string;
  dateAchieved: string;
  isRecentPr?: boolean;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  isRead: boolean;
}

export interface Conversation {
  id: string;
  participant: Athlete;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

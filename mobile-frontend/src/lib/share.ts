import { Share } from 'react-native';
import { ActivityView } from './activityView';
import { formatDuration, kmValue } from './format';
import { sportConfig } from './sports';

/** Deep link handled by Expo Router (app.json scheme) → /activity/[id]. */
export const activityLink = (id: string) => `mobilefrontend://activity/${id}`;
export const athleteLink = (id: string) => `mobilefrontend://athlete/${id}`;

/** System share sheet with a readable summary + deep link. Private activities are not shareable. */
export const shareActivity = async (a: Pick<ActivityView, 'id' | 'title' | 'sportType' | 'distanceMeters' | 'movingTimeSeconds' | 'athlete'>) => {
  const sport = sportConfig(a.sportType).label;
  const message = `${a.athlete.displayName}: ${a.title} — ${kmValue(a.distanceMeters)} km ${sport.toLowerCase()} in ${formatDuration(a.movingTimeSeconds)}\n${activityLink(a.id)}`;
  return Share.share({ message, title: a.title });
};

export const shareAthlete = async (id: string, name: string) =>
  Share.share({ message: `${name} on Kinetix\n${athleteLink(id)}`, title: name });

export const clubLink = (id: string) => `mobilefrontend://club/${id}`;
export const challengeLink = (id: string) => `mobilefrontend://challenge/${id}`;

export const shareClub = async (id: string, name: string) =>
  Share.share({ message: `Join ${name} on Kinetix\n${clubLink(id)}`, title: name });

export const shareChallenge = async (id: string, title: string) =>
  Share.share({ message: `${title} — join this challenge on Kinetix\n${challengeLink(id)}`, title });

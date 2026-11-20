import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ProfileView } from '../../components/profile/ProfileView';
import { useApp } from '../../context/AppContext';

/** Another athlete's profile (or your own, when opened from a feed card). */
export default function AthleteProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useApp();
  const athleteId = Array.isArray(id) ? id[0] : id;
  return <ProfileView athleteId={athleteId} isSelf={athleteId === currentUser.id} />;
}

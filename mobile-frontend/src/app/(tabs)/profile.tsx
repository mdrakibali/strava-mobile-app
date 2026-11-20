import React from 'react';
import { ProfileView } from '../../components/profile/ProfileView';
import { useApp } from '../../context/AppContext';

/** "You" tab — own profile, progress and activity history. */
export default function YouScreen() {
  const { currentUser } = useApp();
  return <ProfileView athleteId={currentUser.id} isSelf />;
}

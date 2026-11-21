import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Text, TouchableOpacity } from 'react-native';
import { loadNativeGoogleSignin } from '../../lib/nativeGoogleSignin';

interface Props {
  isLoading: boolean;
  onSuccess: (idToken: string) => Promise<void>;
  onStatusChange: (msg: string | null) => void;
  onLoadingChange: (loading: boolean) => void;
}

export const GoogleAuthButton: React.FC<Props> = ({
  isLoading,
  onSuccess,
  onStatusChange,
  onLoadingChange,
}) => {
  const handleGoogleSignInPress = async () => {
    const native = loadNativeGoogleSignin();
    if (!native) {
      Alert.alert(
        'Google Sign-In',
        'Google Sign-In needs the app’s development or release build (it is not available in Expo Go). You can sign in with email meanwhile.'
      );
      return;
    }
    onLoadingChange(true);
    onStatusChange('Opening Google…');
    try {
      await native.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const res: any = await native.GoogleSignin.signIn();
      if (res?.type === 'cancelled') return;
      const idToken = res?.data?.idToken ?? res?.idToken;
      if (!idToken) {
        Alert.alert(
          'Google Sign-In',
          'Google did not return an ID token. Check the OAuth client configuration (web client ID).'
        );
        return;
      }
      await onSuccess(idToken);
    } catch (error: any) {
      const codes = native.statusCodes ?? {};
      if (error?.code === codes.SIGN_IN_CANCELLED) return;
      if (error?.code === codes.IN_PROGRESS) return;
      if (error?.code === codes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Google Play Services', 'Google Play Services is not available or needs an update on this device.');
      } else if (String(error?.code) === '10' || /DEVELOPER_ERROR/i.test(String(error?.message))) {
        Alert.alert(
          'Google Sign-In Configuration Error',
          'Google returned DEVELOPER_ERROR (Code 10). Make sure you have created a "Web application" OAuth Client ID in Google Cloud Console and set it as webClientId.'
        );
      } else {
        Alert.alert('Google Sign-In', error?.message || 'Unable to sign in with Google. Please try again or use email.');
      }
    } finally {
      onLoadingChange(false);
      onStatusChange(null);
    }
  };

  return (
    <TouchableOpacity
      disabled={isLoading}
      onPress={handleGoogleSignInPress}
      activeOpacity={0.85}
      className="w-full py-3.5 px-4 bg-white border border-gray-300 rounded-2xl flex-row items-center justify-center shadow-xs mb-4">
      <Ionicons name="logo-google" size={18} color="#EA4335" />
      <Text className="text-sm font-bold text-gray-800 ml-2.5">
        Continue with Google
      </Text>
    </TouchableOpacity>
  );
};


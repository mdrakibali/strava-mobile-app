import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

export default function RecordTabPlaceholder() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/record');
  }, []);

  return <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />;
}


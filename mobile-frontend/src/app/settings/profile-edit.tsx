import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { AppBar, Button, color, ErrorState, space, TextField } from '../../design';
import { api } from '../../services/api';

/**
 * Edit profile — now saves via the existing PUT /athletes/me (it previously showed
 * "Profile Updated" without calling the API; UI/UX audit X-5). No invented defaults.
 */
export default function ProfileEditScreen() {
  const router = useRouter();
  const { currentUser, updateCurrentUser } = useApp();
  const [displayName, setDisplayName] = useState(currentUser.displayName || '');
  const [city, setCity] = useState(currentUser.city || '');
  const [country, setCountry] = useState(currentUser.country || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await api.athletes.updateMe({
        displayName: displayName.trim(),
        city: city.trim(),
        country: country.trim(),
        bio: bio.trim(),
      });
      const a = res.athlete ?? {};
      await updateCurrentUser({
        displayName: a.displayName ?? displayName.trim(),
        city: a.city ?? city.trim(),
        country: a.country ?? country.trim(),
        bio: a.bio ?? bio.trim(),
      });
      router.back();
    } catch (e: any) {
      setError(e?.message || 'Couldn’t save your profile. Try again.');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <AppBar title="Edit profile" leading="close" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TextField label="Name" value={displayName} onChangeText={setDisplayName} maxLength={100} autoCapitalize="words" />
          <View style={styles.gap} />
          <TextField label="City" value={city} onChangeText={setCity} maxLength={100} placeholder="e.g. Dhaka" />
          <View style={styles.gap} />
          <TextField label="Country" value={country} onChangeText={setCountry} maxLength={100} placeholder="e.g. Bangladesh" />
          <View style={styles.gap} />
          <TextField label="Bio" value={bio} onChangeText={setBio} multiline maxLength={300} placeholder="Tell other athletes about yourself" />
          {error ? (
            <View style={{ marginTop: space.lg }}>
              <ErrorState compact message={error} />
            </View>
          ) : null}
        </ScrollView>
        <View style={styles.footer}>
          <Button label="Save" size="lg" fullWidth loading={saving} disabled={!displayName.trim()} onPress={onSave} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  content: { padding: space.gutter },
  gap: { height: space.lg },
  footer: {
    padding: space.gutter,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
});

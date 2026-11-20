import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBar, Button, color, ErrorState, space } from '../../design';

/** Shared layout for create/edit forms: app bar, scrolling body, sticky submit button, error. */
export const FormScreen: React.FC<{
  title: string;
  submitLabel: string;
  canSubmit: boolean;
  submitting: boolean;
  error: string | null;
  onSubmit: () => void;
  children: React.ReactNode;
}> = ({ title, submitLabel, canSubmit, submitting, error, onSubmit, children }) => {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <AppBar title={title} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: space.gutter, paddingBottom: space.xxxl }} keyboardShouldPersistTaps="handled">
          {children}
          {error ? (
            <View style={{ marginTop: space.lg }}>
              <ErrorState compact message={error} />
            </View>
          ) : null}
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
          <Button label={submitLabel} size="lg" variant="dark" fullWidth loading={submitting} disabled={!canSubmit} onPress={onSubmit} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  footer: { paddingHorizontal: space.gutter, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
});

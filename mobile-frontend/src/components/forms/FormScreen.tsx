import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBar, Button, ErrorState, space } from '../../design';

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
    <SafeAreaView edges={['top']} style={{ flex: 1 }} className="flex-1 bg-white">
      <AppBar title={title} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 64 }}
          keyboardShouldPersistTaps="handled">
          {children}
          {error ? (
            <View style={{ marginTop: space.lg }}>
              <ErrorState compact message={error} />
            </View>
          ) : null}
        </ScrollView>
        <View
          style={{ paddingBottom: Math.max(insets.bottom, 12) + 12 }}
          className="px-4 pt-3 border-t border-gray-100 bg-white">
          <Button
            label={submitLabel}
            size="lg"
            variant="dark"
            fullWidth
            loading={submitting}
            disabled={!canSubmit}
            onPress={onSubmit}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

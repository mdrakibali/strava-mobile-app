import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBar, AppText, ErrorState, space } from '../../design';

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
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }} className="flex-1 bg-white">
      <AppBar title={title} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled">
          {children}

          {error ? (
            <View style={{ marginTop: space.lg }}>
              <ErrorState compact message={error} />
            </View>
          ) : null}
        </ScrollView>

        {/* Single Sticky Bottom Submit Button */}
        <View
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
          className="px-4 pt-3 pb-3 border-t border-gray-100 bg-white shadow-sm">
          <Pressable
            onPress={onSubmit}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel={submitLabel}
            className="h-14 rounded-full bg-[#FC4C02] flex-row items-center justify-center shadow-md active:bg-[#E03A00]">
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ color: '#FFFFFF' }} className="text-base font-black">
                {submitLabel}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-white">
      {/* Top Header with prominent Save/Create action button */}
      <AppBar
        title={title}
        right={
          <Pressable
            onPress={onSubmit}
            disabled={submitting}
            hitSlop={8}
            className="px-3.5 py-1.5 rounded-full bg-[#FC4C02] active:bg-[#E03A00] mr-2">
            <AppText className="text-white text-xs font-black">
              {submitting ? 'Saving…' : 'Create'}
            </AppText>
          </Pressable>
        }
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled">
          {children}

          {error ? (
            <View style={{ marginTop: space.lg }}>
              <ErrorState compact message={error} />
            </View>
          ) : null}

          {/* Form In-line Submit Button */}
          <View className="mt-8 mb-4">
            <Pressable
              onPress={onSubmit}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel={submitLabel}
              className="h-14 rounded-full bg-[#FC4C02] flex-row items-center justify-center shadow-lg active:bg-[#E03A00]">
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={22} color="#FFFFFF" />
                  <AppText className="text-white text-base font-black ml-2">
                    {submitLabel}
                  </AppText>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>

        {/* Sticky Bottom Submit Bar */}
        <View
          style={{ paddingBottom: Math.max(insets.bottom, 8) + 8 }}
          className="px-4 pt-3 border-t border-gray-100 bg-white shadow-md">
          <Pressable
            onPress={onSubmit}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel={submitLabel}
            className="h-14 rounded-full bg-[#FC4C02] flex-row items-center justify-center shadow-lg active:bg-[#E03A00]">
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={22} color="#FFFFFF" />
                <AppText className="text-white text-base font-black ml-2">
                  {submitLabel}
                </AppText>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

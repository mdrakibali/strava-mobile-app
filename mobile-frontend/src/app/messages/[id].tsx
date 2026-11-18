import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MOCK_CONVERSATIONS, MOCK_MESSAGES } from '../../mock/data';
import { DirectMessage } from '../../types';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const conversation =
    MOCK_CONVERSATIONS.find((c) => c.id === id) || MOCK_CONVERSATIONS[0];

  const [messages, setMessages] = useState<DirectMessage[]>(
    (id && MOCK_MESSAGES[id]) || MOCK_MESSAGES['conv_1'] || []
  );
  const [inputText, setInputText] = useState('');

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    const newMsg: DirectMessage = {
      id: `m_${Date.now()}`,
      senderId: 'user_current',
      text: inputText.trim(),
      timestamp: 'Just now',
      isRead: true,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Chat Top Header */}
      <View className="flex-row items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200">
        <View className="flex-row items-center flex-1 mr-2">
          <TouchableOpacity onPress={() => router.back()} className="p-1 mr-1">
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push(`/athlete/${conversation.participant.id}`)}
            className="flex-row items-center flex-1">
            <Image
              source={{ uri: conversation.participant.avatarUrl }}
              className="w-9 h-9 rounded-full bg-gray-100 mr-2.5"
            />
            <View>
              <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>
                {conversation.participant.displayName}
              </Text>
              <Text className="text-[10px] text-emerald-600 font-semibold">Active now</Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => router.push(`/athlete/${conversation.participant.id}`)}
          className="p-1">
          <Ionicons name="person-circle-outline" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Messages Stream */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerClassName="p-4 pb-6 space-y-3">
          {messages.map((m) => {
            const isMe = m.senderId === 'user_current';
            return (
              <View
                key={m.id}
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 mb-2 ${
                  isMe
                    ? 'self-end bg-[#FC4C02] rounded-br-xs'
                    : 'self-start bg-white border border-gray-200 rounded-bl-xs'
                }`}>
                <Text
                  className={`text-xs leading-4 ${
                    isMe ? 'text-white font-medium' : 'text-gray-900 font-normal'
                  }`}>
                  {m.text}
                </Text>
                <Text
                  className={`text-[9px] mt-1 text-right ${
                    isMe ? 'text-orange-200' : 'text-gray-400'
                  }`}>
                  {m.timestamp}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Input Bar */}
        <View className="flex-row items-center bg-white px-4 py-2.5 border-t border-gray-200">
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 h-10 bg-gray-100 rounded-full px-4 text-xs text-gray-900 mr-2"
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={!inputText.trim()}
            className={`w-9 h-9 rounded-full bg-[#FC4C02] items-center justify-center ${
              !inputText.trim() ? 'opacity-40' : ''
            }`}>
            <Ionicons name="send" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

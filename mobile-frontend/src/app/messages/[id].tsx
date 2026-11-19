import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentUser } = useApp();

  const [partner, setPartner] = useState<any>({
    id: id || 'partner',
    displayName: 'Athlete',
    username: 'athlete',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
  });
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollViewRef = useRef<any>(null);

  const fetchChatHistory = async () => {
    if (!id) return;
    try {
      // 1. Fetch partner details
      const profileRes = await api.athletes.getProfile(id).catch(() => null);
      if (profileRes?.athlete) {
        setPartner(profileRes.athlete);
      }

      // 2. Fetch real message thread
      const res = await api.messages.getThread(id);
      if (res?.messages) {
        setMessages(res.messages);
      }
    } catch (err) {
      console.warn('Failed to load chat history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChatHistory();
    // Poll every 4 seconds for new incoming messages while in chat
    const interval = setInterval(() => {
      if (id) {
        api.messages.getThread(id).then((res) => {
          if (res?.messages) {
            setMessages(res.messages);
          }
        }).catch(() => null);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [id]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !id || isSending) return;
    const textToSend = inputText.trim();
    setInputText('');
    setIsSending(true);

    // Optimistic UI insert
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      senderId: currentUser.id,
      recipientId: id,
      text: textToSend,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const res = await api.messages.send(id, textToSend);
      if (res?.directMessage) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? res.directMessage : m))
        );
      }
    } catch (err: any) {
      console.warn('Send message error:', err);
    } finally {
      setIsSending(false);
    }
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
            onPress={() => router.push(`/athlete/${partner.id}`)}
            className="flex-row items-center flex-1">
            <Image
              source={{ uri: partner.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200' }}
              className="w-9 h-9 rounded-full bg-gray-100 mr-2.5"
            />
            <View>
              <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>
                {partner.displayName}
              </Text>
              <Text className="text-[10px] text-emerald-600 font-semibold">Athlete</Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => router.push(`/athlete/${partner.id}`)}
          className="p-1">
          <Ionicons name="person-circle-outline" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Messages Stream */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#FC4C02" />
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            className="flex-1"
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            contentContainerClassName="p-4 pb-6 space-y-3">
            {messages.length > 0 ? (
              messages.map((m) => {
                const isMe = m.senderId === currentUser.id;
                const timeString = m.createdAt
                  ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Just now';

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
                      {timeString}
                    </Text>
                  </View>
                );
              })
            ) : (
              <View className="items-center justify-center py-24">
                <Ionicons name="chatbubble-ellipses-outline" size={40} color="#D1D5DB" />
                <Text className="text-xs font-bold text-gray-400 mt-2">
                  Say hi to {partner.displayName}!
                </Text>
              </View>
            )}
          </ScrollView>
        )}

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
            disabled={!inputText.trim() || isSending}
            className={`w-9 h-9 rounded-full bg-[#FC4C02] items-center justify-center ${
              !inputText.trim() || isSending ? 'opacity-40' : ''
            }`}>
            <Ionicons name="send" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { realtimeWs } from '../../services/websocket';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentUser } = useApp();

  const [partner, setPartner] = useState<any>({
    id: id || 'partner',
    displayName: 'Athlete',
    username: 'athlete',
    avatarUrl: '',
  });
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const scrollViewRef = useRef<any>(null);
  const typingTimerRef = useRef<any>(null);
  const effectiveId = id === 'ath_seed_ahmed' ? 'ath_seed_tanvir' : id;

  const fetchChatHistory = async () => {
    if (!effectiveId) return;
    try {
      const profileRes = await api.athletes.getProfile(effectiveId).catch(() => null);
      if (profileRes?.athlete) setPartner(profileRes.athlete);
      const res = await api.messages.getThread(effectiveId);
      if (res?.messages) setMessages(res.messages);
    } catch (err) {
      console.warn('Failed to load chat history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchChatHistory();
    const unsubMsg = realtimeWs.addListener('new_message', (payload: any) => {
      const dm = payload.directMessage;
      if (!dm) return;
      if (dm.senderId === effectiveId || dm.recipientId === effectiveId) {
        setMessages((prev) => (prev.some((m) => m.id === dm.id) ? prev : [...prev, dm]));
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      }
    });

    const unsubTyping = realtimeWs.addListener('typing', (payload: any) => {
      if (payload.senderId === effectiveId) {
        setIsPartnerTyping(true);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setIsPartnerTyping(false), 2500);
      }
    });

    return () => {
      unsubMsg();
      unsubTyping();
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [effectiveId]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !effectiveId || isSending) return;
    const textToSend = inputText.trim();
    setInputText('');
    setIsSending(true);

    const tempId = `temp_${Date.now()}`;
    setMessages((prev) => [...prev, { id: tempId, senderId: currentUser.id, recipientId: effectiveId, text: textToSend, createdAt: new Date().toISOString() }]);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const res = await api.messages.send(effectiveId, textToSend);
      if (res?.directMessage) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? res.directMessage : m)));
      }
    } catch (err: any) {
      console.warn('Send message error:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <View className="flex-row items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200">
        <View className="flex-row items-center flex-1 mr-2">
          <TouchableOpacity onPress={() => router.back()} className="p-1 mr-1">
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push(`/athlete/${partner.id}`)} className="flex-row items-center flex-1">
            <Image source={{ uri: partner.avatarUrl || undefined }} className="w-9 h-9 rounded-full bg-gray-100 mr-2.5" />
            <View>
              <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>{partner.displayName}</Text>
              <Text className="text-[10px] text-emerald-600 font-semibold">{isPartnerTyping ? 'typing...' : 'Active Athlete'}</Text>
            </View>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => router.push(`/athlete/${partner.id}`)} className="p-1">
          <Ionicons name="person-circle-outline" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#FC4C02" />
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            contentContainerStyle={{ padding: 16, flexGrow: 1, justifyContent: messages.length === 0 ? 'center' : 'flex-start' }}>
            {messages.length > 0 ? (
              messages.map((m) => {
                const isMe = m.senderId === currentUser.id;
                const timeString = m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';
                return (
                  <View key={m.id} className={`max-w-[80%] rounded-2xl px-4 py-2.5 mb-2.5 shadow-xs ${isMe ? 'self-end bg-[#FC4C02]' : 'self-start bg-white border border-gray-200'}`}>
                    <Text className={`text-xs leading-4 ${isMe ? 'text-white font-medium' : 'text-gray-900'}`}>{m.text}</Text>
                    <Text className={`text-[9px] mt-1 text-right ${isMe ? 'text-orange-200' : 'text-gray-400'}`}>{timeString}</Text>
                  </View>
                );
              })
            ) : (
              <View className="items-center justify-center py-16">
                <Ionicons name="chatbubble-ellipses-outline" size={44} color="#D1D5DB" />
                <Text className="text-sm font-bold text-gray-700 mt-2">Say hi to {partner.displayName}!</Text>
                <Text className="text-xs text-gray-400 text-center mt-1">Start the conversation with encouragement or ask about routes.</Text>
              </View>
            )}
          </ScrollView>
        )}

        {isPartnerTyping && (
          <View className="px-5 py-1">
            <Text className="text-[11px] text-gray-500 italic">{partner.displayName} is typing...</Text>
          </View>
        )}

        <View className="flex-row items-center bg-white px-4 py-2.5 border-t border-gray-200">
          <TextInput
            value={inputText}
            onChangeText={(val) => {
              setInputText(val);
              if (val.trim() && effectiveId) realtimeWs.sendTyping(effectiveId);
            }}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 h-10 bg-gray-100 rounded-full px-4 text-xs text-gray-900 mr-2"
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={!inputText.trim() || isSending}
            activeOpacity={0.8}
            className={`w-10 h-10 rounded-full bg-[#FC4C02] items-center justify-center ${!inputText.trim() || isSending ? 'opacity-40' : ''}`}>
            <Ionicons name="send" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

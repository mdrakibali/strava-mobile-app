import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../services/api";

export default function MessagesInboxScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [conversations, setConversations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = async () => {
    try {
      const res = await api.messages.getConversations();
      if (res?.conversations) {
        setConversations(res.conversations);
      }
    } catch (err) {
      console.warn("Fetch conversations error:", err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  const filtered = conversations.filter(
    (c) =>
      c.participant?.displayName
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      c.participant?.username
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()),
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900">
          Direct Messages
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/athlete/suggested")}
          className="p-1"
        >
          <Ionicons name="create-outline" size={22} color="#FC4C02" />
        </TouchableOpacity>
      </View>

      {/* Search Input Bar */}
      <View className="px-4 py-2.5 bg-white border-b border-gray-200">
        <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2">
          <Ionicons name="search-outline" size={16} color="#9CA3AF" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search conversations..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 ml-2 text-xs text-gray-900"
          />
        </View>
      </View>

      {/* Conversation Thread List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#FC4C02"]}
          />
        }
        contentContainerClassName="p-3 pb-24"
      >
        {isLoading ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#FC4C02" />
          </View>
        ) : filtered.length > 0 ? (
          filtered.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.8}
              onPress={() => router.push(`/messages/${item.participant.id}`)}
              className="flex-row items-center p-3.5 bg-white rounded-2xl mb-2.5 border border-gray-100 shadow-sm"
            >
              {/* Avatar with Online Status Indicator */}
              <View className="relative mr-3">
                <Image
                  source={{
                    uri:
                      item.participant.avatarUrl ||
                      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
                  }}
                  className="w-12 h-12 rounded-full bg-gray-100"
                />
                <View className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
              </View>

              {/* Message Details */}
              <View className="flex-1 mr-2">
                <View className="flex-row items-center justify-between mb-0.5">
                  <Text
                    className="text-sm font-bold text-gray-900"
                    numberOfLines={1}
                  >
                    {item.participant.displayName}
                  </Text>
                  <Text className="text-[10px] text-gray-400 font-medium">
                    {item.lastMessageTime
                      ? new Date(item.lastMessageTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </Text>
                </View>
                <Text
                  className={`text-xs ${
                    item.unreadCount > 0
                      ? "font-bold text-gray-900"
                      : "font-normal text-gray-500"
                  }`}
                  numberOfLines={1}
                >
                  {item.lastMessage}
                </Text>
              </View>

              {/* Unread Pill Badge */}
              {item.unreadCount > 0 && (
                <View className="w-5 h-5 rounded-full bg-[#FC4C02] items-center justify-center">
                  <Text className="text-[10px] font-bold text-white">
                    {item.unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <View className="items-center justify-center py-20">
            <Ionicons name="chatbubbles-outline" size={48} color="#D1D5DB" />
            <Text className="text-base font-bold text-gray-900 mt-3">
              No conversations yet
            </Text>
            <Text className="text-xs text-gray-400 mt-1 text-center px-6">
              Connect with athletes in your area or search for friends to
              message them!
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/athlete/suggested")}
              className="mt-4 px-5 py-2.5 bg-[#FC4C02] rounded-full"
            >
              <Text className="text-xs font-black text-white">
                Find Athletes
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

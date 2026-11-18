import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Switch, Text, TouchableOpacity, View } from 'react-native';

interface RecordSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const RecordSettingsModal: React.FC<RecordSettingsModalProps> = ({
  visible,
  onClose,
}) => {
  const [autoPause, setAutoPause] = useState(true);
  const [audioCues, setAudioCues] = useState(true);
  const [beacon, setBeacon] = useState(false);
  const [offRouteAlert, setOffRouteAlert] = useState(true);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-white rounded-t-3xl p-6 shadow-2xl">
          <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-4" />

          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-black text-gray-900">Recording Settings</Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <Ionicons name="close" size={22} color="#4B5563" />
            </TouchableOpacity>
          </View>

          <View className="space-y-4 mb-4">
            <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
              <View className="flex-1 mr-3">
                <Text className="text-sm font-bold text-gray-900">Auto-Pause</Text>
                <Text className="text-xs text-gray-500">Automatically pause timer when stopped</Text>
              </View>
              <Switch value={autoPause} onValueChange={setAutoPause} trackColor={{ true: '#FC4C02', false: '#E5E7EB' }} />
            </View>

            <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
              <View className="flex-1 mr-3">
                <Text className="text-sm font-bold text-gray-900">Audio Announcements</Text>
                <Text className="text-xs text-gray-500">Pace and distance spoken every 1 km</Text>
              </View>
              <Switch value={audioCues} onValueChange={setAudioCues} trackColor={{ true: '#FC4C02', false: '#E5E7EB' }} />
            </View>

            <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
              <View className="flex-1 mr-3">
                <Text className="text-sm font-bold text-gray-900">Off-Route Alerts</Text>
                <Text className="text-xs text-gray-500">Notify when straying &gt;50m from loaded route</Text>
              </View>
              <Switch value={offRouteAlert} onValueChange={setOffRouteAlert} trackColor={{ true: '#FC4C02', false: '#E5E7EB' }} />
            </View>

            <View className="flex-row items-center justify-between py-2">
              <View className="flex-1 mr-3">
                <Text className="text-sm font-bold text-gray-900">Beacon Live Safety</Text>
                <Text className="text-xs text-gray-500">Share real-time GPS location with trusted contacts</Text>
              </View>
              <Switch value={beacon} onValueChange={setBeacon} trackColor={{ true: '#FC4C02', false: '#E5E7EB' }} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};


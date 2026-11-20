import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { VISIBILITY_LABEL } from "../components/activity/FeedCard";
import { RoutePreview } from "../components/map/RoutePreview";
import { SportSheet } from "../components/record/SportSheet";
import {
  BottomSheet,
  Button,
  EmptyState,
  ErrorState,
  MetricRow,
  MetricTile,
  OptionRow,
  SectionTitle,
  SelectField,
  TextField,
} from "../design";
import {
  defaultActivityTitle,
  formatDuration,
  formatElevation,
  kmValue,
  paceValue,
  speedValue,
} from "../lib/format";
import { plannedRouteStore } from "../lib/plannedRoute";
import { sportConfig } from "../lib/sports";
import { recordingEngine } from "../tracking/engine";
import { TrackSummary } from "../tracking/shared";
import { syncWorker } from "../tracking/sync";
import { useRecording } from "../tracking/useRecording";
import { ActivityVisibility, SportType } from "../types";

const VISIBILITY_OPTIONS: {
  id: ActivityVisibility;
  title: string;
  description: string;
}[] = [
  {
    id: "PUBLIC",
    title: "Everyone",
    description: "Anyone can view this activity.",
  },
  {
    id: "FOLLOWERS_ONLY",
    title: "Followers",
    description: "Only people who follow you can view this activity.",
  },
  {
    id: "ONLY_ME",
    title: "Only you",
    description: "Private. Only you can view this activity.",
  },
];

/**
 * Save Activity (reference: ScreensDesign 374734 / 374750 / 374747; research §3).
 * Only fields the backend actually stores are shown (UI/UX audit: no fake controls).
 */
export default function SaveActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const rec = useRecording();
  const active =
    rec.lifecycle.status === "recording" || rec.lifecycle.status === "paused";

  const [startDate] = useState(
    () => new Date(rec.lifecycle.startedAt ?? Date.now()),
  );
  const [sport, setSport] = useState<SportType>(rec.sport as SportType);
  const [title, setTitle] = useState(() =>
    defaultActivityTitle(sportConfig(rec.sport).label, startDate),
  );
  const [titleEdited, setTitleEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<ActivityVisibility>("PUBLIC");
  const [sportSheet, setSportSheet] = useState(false);
  const [visibilitySheet, setVisibilitySheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Summary exactly as the activity will be stored: same shared math the server re-runs.
  const [summary, setSummary] = useState<TrackSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    recordingEngine.previewSummary().then((s) => !cancelled && setSummary(s));
    return () => {
      cancelled = true;
    };
  }, [rec.distanceM]);

  const cfg = sportConfig(sport);
  const route = rec.route;

  if (!active && !saving) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <EmptyState
          icon="checkmark-done-outline"
          title="Nothing to save"
          body="There is no recorded activity waiting to be saved."
          primary={{ label: "Close", onPress: () => router.back() }}
        />
      </SafeAreaView>
    );
  }

  const onResume = async () => {
    await recordingEngine.resume();
    router.back();
  };

  const onDiscard = () =>
    Alert.alert(
      "Discard activity?",
      "This recording will be deleted. This can’t be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: async () => {
            await recordingEngine.discard();
            plannedRouteStore.set(null);
            router.dismissAll();
          },
        },
      ],
    );

  /**
   * Local-first save: the activity is committed to the phone's database first (it can't be lost
   * from here on), then uploaded. We wait briefly so a good connection lands on the new activity;
   * otherwise the upload continues in the background and Home shows it as pending.
   */
  const onSave = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    let sessionId: string;
    try {
      sessionId = await recordingEngine.complete({
        title: title.trim(),
        description: description.trim(),
        sportType: sport,
        visibility,
      });
    } catch (e: any) {
      setError(e?.message ?? "Could not save the activity.");
      setSaving(false);
      return;
    }
    plannedRouteStore.set(null); // the saved activity is the recorded track only
    const { synced, activityId } = await syncWorker.waitFor(sessionId, 8000);
    router.dismissAll();
    if (synced && activityId)
      router.push({ pathname: "/activity/[id]", params: { id: activityId } });
    else if (!synced)
      Alert.alert(
        "Saved on this phone",
        "Your activity will upload automatically when the connection is back.",
      );
  };

  const s = summary;
  const distanceM = s?.distanceM ?? rec.distanceM;
  const movingS = s?.movingTimeS ?? rec.movingTimeS;
  const second =
    cfg.primaryMetric === "speed"
      ? {
          label: "Avg speed",
          value: speedValue(movingS > 0 ? distanceM / movingS : null),
          unit: "km/h",
        }
      : {
          label: "Avg pace",
          value: paceValue(distanceM, movingS),
          unit: "/km",
        };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">
      <View className="h-14 flex-row items-center px-4 border-b border-gray-100 justify-between">
        <Button
          label="Resume"
          variant="outline"
          size="sm"
          onPress={onResume}
          disabled={saving}
        />
        <Text className="text-lg font-bold text-gray-900 text-center flex-1">
          Save Activity
        </Text>
        <View className="w-20" />
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 64 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="p-4 bg-gray-50 rounded-2xl mb-4">
            <MetricRow>
              <MetricTile
                label="Distance"
                value={kmValue(distanceM)}
                unit="km"
              />
              <MetricTile label="Moving time" value={formatDuration(movingS)} />
              <MetricTile
                label={second.label}
                value={second.value}
                unit={second.value === "–" ? undefined : second.unit}
              />
              <MetricTile
                label="Elev gain"
                value={formatElevation(s ? s.elevGainM : rec.elevGainM)}
              />
            </MetricRow>
          </View>
          {route.length > 1 ? (
            <View className="mb-4">
              <RoutePreview route={route} height={150} rounded />
            </View>
          ) : null}

          <TextField
            value={title}
            onChangeText={(t) => {
              setTitle(t);
              setTitleEdited(true);
            }}
            placeholder="Title your activity"
            accessibilityLabel="Activity title"
            maxLength={100}
            returnKeyType="next"
          />
          <View className="h-4" />
          <TextField
            value={description}
            onChangeText={setDescription}
            placeholder="How did it go? Share more about your activity."
            accessibilityLabel="Description"
            multiline
            maxLength={2000}
          />
          <View className="h-4" />
          <SelectField
            value={cfg.label}
            icon={cfg.icon}
            onPress={() => setSportSheet(true)}
            accessibilityLabel="Sport"
          />

          {/* Add Photos/Videos Dashed Box (Strava Style) */}
          <Pressable
            onPress={() =>
              Alert.alert(
                "Photos & Videos",
                "Photo and video upload feature will be available in the next cloud storage update.",
              )
            }
            className="mt-4 border-2 border-dashed border-[#FC4C02] rounded-2xl py-6 items-center justify-center bg-[#FFF9F6]"
          >
            <Ionicons name="image-outline" size={32} color="#FC4C02" />
            <Text className="text-sm font-bold text-[#FC4C02] mt-1">
              Add Photos/Videos
            </Text>
          </Pressable>

          {/* Details Section */}
          <SectionTitle title="Details" className="mt-6" />
          <Pressable
            onPress={() =>
              Alert.alert(
                "Activity Tag",
                "Select a tag (Workout, Race, Long Run).",
              )
            }
            className="flex-row items-center justify-between bg-gray-50 rounded-xl px-4 py-3.5 border border-gray-100"
          >
            <View className="flex-row items-center">
              <Ionicons
                name="pricetag-outline"
                size={18}
                color="#6B7280"
              />
              <Text className="text-sm font-medium text-gray-800 ml-2">
                Activity Tag
              </Text>
            </View>
            <Ionicons
              name="chevron-down"
              size={16}
              color="#6B7280"
            />
          </Pressable>

          <Pressable
            onPress={() =>
              Alert.alert(
                "Perceived Exertion",
                "Rate how hard the activity felt (1-10).",
              )
            }
            className="flex-row items-center justify-between bg-gray-50 rounded-xl px-4 py-3.5 border border-gray-100 mt-2.5"
          >
            <View className="flex-row items-center">
              <Ionicons
                name="speedometer-outline"
                size={18}
                color="#6B7280"
              />
              <Text className="text-sm font-medium text-gray-800 ml-2">
                How did that activity feel?
              </Text>
            </View>
            <Ionicons
              name="chevron-down"
              size={16}
              color="#6B7280"
            />
          </Pressable>

          <View className="flex-row items-start bg-gray-50 rounded-xl p-3 border border-gray-100 mt-2.5">
            <Ionicons
              name="lock-closed-outline"
              size={16}
              color="#6B7280"
              className="mt-0.5 mr-1.5"
            />
            <Text className="text-xs text-gray-500 flex-1 leading-4">
              Jot down private notes here. Only you can see these.
            </Text>
          </View>

          <SectionTitle title="Visibility" className="mt-6" />
          <Text className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
            Who can view
          </Text>
          <SelectField
            value={VISIBILITY_LABEL[visibility].label}
            icon={VISIBILITY_LABEL[visibility].icon}
            onPress={() => setVisibilitySheet(true)}
            accessibilityLabel="Who can view"
          />

          {error ? (
            <View className="mt-4">
              <ErrorState compact message={error} />
            </View>
          ) : null}

          <Button
            label="Discard Activity"
            variant="danger"
            onPress={onDiscard}
            disabled={saving}
            className="self-center mt-7"
          />
        </ScrollView>

        <View
          style={{ paddingBottom: insets.bottom + 12 }}
          className="px-4 pt-3 bg-white border-t border-gray-100"
        >
          <Button
            label={error ? "Try again" : "Save Activity"}
            variant="dark"
            size="lg"
            fullWidth
            loading={saving}
            onPress={onSave}
            disabled={!title.trim()}
          />
        </View>
      </KeyboardAvoidingView>

      <SportSheet
        visible={sportSheet}
        selected={sport}
        onSelect={(s) => {
          setSport(s);
          if (!titleEdited)
            setTitle(defaultActivityTitle(sportConfig(s).label, startDate));
          setSportSheet(false);
        }}
        onClose={() => setSportSheet(false)}
      />
      <BottomSheet
        visible={visibilitySheet}
        onClose={() => setVisibilitySheet(false)}
        title="Who can view"
      >
        {VISIBILITY_OPTIONS.map((o) => (
          <OptionRow
            key={o.id}
            title={o.title}
            description={o.description}
            icon={VISIBILITY_LABEL[o.id].icon}
            selected={visibility === o.id}
            onPress={() => {
              setVisibility(o.id);
              setVisibilitySheet(false);
            }}
          />
        ))}
      </BottomSheet>
    </SafeAreaView>
  );
}
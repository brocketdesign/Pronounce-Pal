import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  Platform,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAudioPlayer } from "expo-audio";
import * as FileSystem from "expo-file-system";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Fonts } from "@/constants/theme";
import { useLessonStore, VOICE_OPTIONS, VoiceOption } from "@/stores/lessonStore";
import { getApiUrl } from "@/lib/query-client";

export default function SettingsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { apiKey, setApiKey, selectedVoice, setSelectedVoice } = useLessonStore();
  const [showApiKey, setShowApiKey] = useState(false);
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [playingVoiceSample, setPlayingVoiceSample] = useState<VoiceOption | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [shouldPlaySample, setShouldPlaySample] = useState(false);
  const webAudioRef = useRef<HTMLAudioElement | null>(null);
  
  const player = useAudioPlayer(audioUri ? { uri: audioUri } : null);

  const handleSaveApiKey = () => {
    setApiKey(localApiKey.trim());
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    if (!localApiKey.trim()) {
      Alert.alert("Error", "Please enter an API key first");
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch("https://api.openai.com/v1/models", {
        headers: {
          Authorization: `Bearer ${localApiKey.trim()}`,
        },
      });

      if (response.ok) {
        setTestResult("success");
        setApiKey(localApiKey.trim());
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        setTestResult("error");
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }
    } catch {
      setTestResult("error");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleOpenLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Error", "Could not open link");
    }
  };

  React.useEffect(() => {
    return () => {
      if (webAudioRef.current) {
        webAudioRef.current.pause();
        if (webAudioRef.current.src) {
          URL.revokeObjectURL(webAudioRef.current.src);
        }
        webAudioRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    if (shouldPlaySample && audioUri && player && Platform.OS !== "web") {
      player.play();
      setShouldPlaySample(false);
    }
  }, [audioUri, shouldPlaySample, player]);

  React.useEffect(() => {
    if (Platform.OS !== "web" && player && playingVoiceSample) {
      const checkStatus = () => {
        if (player.playing === false && audioUri) {
          setPlayingVoiceSample(null);
        }
      };
      const interval = setInterval(checkStatus, 200);
      return () => clearInterval(interval);
    }
  }, [player, playingVoiceSample, audioUri]);

  const handlePlayVoiceSample = async (voiceId: VoiceOption) => {
    if (playingVoiceSample) return;
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setPlayingVoiceSample(voiceId);

    try {
      const voiceName = VOICE_OPTIONS.find(v => v.id === voiceId)?.name || voiceId;
      const sampleText = `Hello, I'm ${voiceName}. This is how I sound.`;
      const apiUrl = new URL("/api/text-to-speech", getApiUrl()).toString();
      
      if (Platform.OS === "web") {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: sampleText, voice: voiceId }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate audio");
        }

        const audioBlob = await response.blob();
        const blobUrl = URL.createObjectURL(audioBlob);
        
        if (webAudioRef.current) {
          webAudioRef.current.pause();
          URL.revokeObjectURL(webAudioRef.current.src);
        }
        
        const audio = new window.Audio(blobUrl);
        webAudioRef.current = audio;
        
        audio.onended = () => {
          setPlayingVoiceSample(null);
          URL.revokeObjectURL(blobUrl);
        };
        audio.onerror = () => {
          setPlayingVoiceSample(null);
          URL.revokeObjectURL(blobUrl);
        };
        
        await audio.play();
      } else {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: sampleText, voice: voiceId }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate audio");
        }

        const audioBlob = await response.blob();
        const reader = new FileReader();
        
        reader.onloadend = async () => {
          try {
            const base64Data = (reader.result as string).split(",")[1];
            const fileUri = FileSystem.cacheDirectory + `voice_sample_${voiceId}_${Date.now()}.mp3`;
            await FileSystem.writeAsStringAsync(fileUri, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            });
            
            setAudioUri(fileUri);
            setShouldPlaySample(true);
          } catch {
            setPlayingVoiceSample(null);
          }
        };
        
        reader.onerror = () => setPlayingVoiceSample(null);
        reader.readAsDataURL(audioBlob);
      }
    } catch {
      setPlayingVoiceSample(null);
      Alert.alert("Error", "Could not play voice sample");
    }
  };

  const handleSelectVoice = (voiceId: VoiceOption) => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    setSelectedVoice(voiceId);
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText type="h2">Settings</ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            OpenAI Configuration
          </ThemedText>
          <ThemedText
            type="small"
            style={[styles.sectionDescription, { color: theme.textSecondary }]}
          >
            Enter your OpenAI API key to generate pronunciation lessons. Your
            key is stored securely on your device.
          </ThemedText>

          <View style={styles.inputContainer}>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: theme.backgroundSecondary },
                testResult === "success" && { borderColor: theme.success, borderWidth: 1 },
                testResult === "error" && { borderColor: theme.error, borderWidth: 1 },
              ]}
            >
              <Feather name="key" size={20} color={theme.textSecondary} />
              <TextInput
                style={[
                  styles.input,
                  { color: theme.text, fontFamily: Fonts?.mono },
                ]}
                placeholder="sk-..."
                placeholderTextColor={theme.textSecondary}
                value={localApiKey}
                onChangeText={(text) => {
                  setLocalApiKey(text);
                  setTestResult(null);
                }}
                secureTextEntry={!showApiKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                onPress={() => setShowApiKey(!showApiKey)}
                hitSlop={8}
              >
                <Feather
                  name={showApiKey ? "eye-off" : "eye"}
                  size={20}
                  color={theme.textSecondary}
                />
              </Pressable>
            </View>

            {testResult === "success" ? (
              <View style={styles.resultContainer}>
                <Feather name="check-circle" size={16} color={theme.success} />
                <ThemedText type="small" style={{ color: theme.success }}>
                  API key is valid
                </ThemedText>
              </View>
            ) : null}

            {testResult === "error" ? (
              <View style={styles.resultContainer}>
                <Feather name="x-circle" size={16} color={theme.error} />
                <ThemedText type="small" style={{ color: theme.error }}>
                  Invalid API key
                </ThemedText>
              </View>
            ) : null}
          </View>

          <View style={styles.buttonRow}>
            <Button
              onPress={handleTestConnection}
              disabled={isTesting || !localApiKey.trim()}
              style={styles.button}
            >
              {isTesting ? "Testing..." : "Test Connection"}
            </Button>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Voice Selection
          </ThemedText>
          <ThemedText
            type="small"
            style={[styles.sectionDescription, { color: theme.textSecondary }]}
          >
            Choose a voice for audio playback. Tap the play button to preview each voice.
          </ThemedText>

          <View style={styles.voiceCardsContainer}>
            {VOICE_OPTIONS.map((voice) => {
              const isSelected = selectedVoice === voice.id;
              return (
                <Pressable
                  key={voice.id}
                  onPress={() => handleSelectVoice(voice.id)}
                  testID={`voice-card-${voice.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${voice.name} voice`}
                  style={({ pressed }) => [
                    styles.voiceCard,
                    { 
                      backgroundColor: theme.backgroundSecondary,
                      borderColor: isSelected ? theme.primary : 'transparent',
                      borderWidth: 2,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <View style={styles.voiceCardContent}>
                    <View style={styles.voiceCardLeft}>
                      {isSelected ? (
                        <View style={[styles.voiceCheckIcon, { backgroundColor: theme.primary }]}>
                          <Feather name="check" size={12} color="#FFFFFF" />
                        </View>
                      ) : (
                        <View style={[styles.voiceCheckIcon, { backgroundColor: theme.backgroundDefault }]}>
                          <Feather name="mic" size={12} color={theme.textSecondary} />
                        </View>
                      )}
                      <View>
                        <ThemedText type="body" style={{ fontWeight: '600' }}>
                          {voice.name}
                        </ThemedText>
                        <ThemedText type="small" style={{ color: theme.textSecondary }}>
                          {voice.description}
                        </ThemedText>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => handlePlayVoiceSample(voice.id)}
                      disabled={playingVoiceSample !== null}
                      testID={`play-voice-${voice.id}`}
                      style={[
                        styles.playVoiceButton,
                        { 
                          backgroundColor: playingVoiceSample === voice.id 
                            ? theme.primary 
                            : theme.backgroundDefault 
                        },
                      ]}
                      hitSlop={8}
                    >
                      {playingVoiceSample === voice.id ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Feather 
                          name="play" 
                          size={16} 
                          color={theme.primary} 
                        />
                      )}
                    </Pressable>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            About
          </ThemedText>

          <Pressable
            onPress={() => handleOpenLink("https://example.com/privacy")}
            style={[styles.linkItem, { backgroundColor: theme.backgroundDefault }]}
          >
            <View style={styles.linkContent}>
              <Feather name="shield" size={20} color={theme.textSecondary} />
              <ThemedText type="body">Privacy Policy</ThemedText>
            </View>
            <Feather name="external-link" size={18} color={theme.textSecondary} />
          </Pressable>

          <Pressable
            onPress={() => handleOpenLink("https://example.com/terms")}
            style={[styles.linkItem, { backgroundColor: theme.backgroundDefault }]}
          >
            <View style={styles.linkContent}>
              <Feather name="file-text" size={20} color={theme.textSecondary} />
              <ThemedText type="body">Terms of Service</ThemedText>
            </View>
            <Feather name="external-link" size={18} color={theme.textSecondary} />
          </Pressable>

          <View
            style={[styles.versionItem, { backgroundColor: theme.backgroundDefault }]}
          >
            <View style={styles.linkContent}>
              <Feather name="info" size={20} color={theme.textSecondary} />
              <ThemedText type="body">App Version</ThemedText>
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              1.0.0
            </ThemedText>
          </View>
        </View>
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.xl,
  },
  header: {
    marginBottom: Spacing["2xl"],
  },
  section: {
    marginBottom: Spacing["3xl"],
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  sectionDescription: {
    marginBottom: Spacing.lg,
  },
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: "100%",
  },
  resultContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  buttonRow: {
    gap: Spacing.md,
  },
  button: {
    flex: 1,
  },
  linkItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  linkContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  versionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
  },
  voiceCardsContainer: {
    gap: Spacing.sm,
  },
  voiceCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  voiceCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  voiceCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  voiceCheckIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  playVoiceButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});

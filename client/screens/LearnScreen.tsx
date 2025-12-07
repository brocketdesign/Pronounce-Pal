import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAudioPlayer } from "expo-audio";
import { File, Paths } from "expo-file-system";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Fonts, Typography } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useLessonStore, WordPhonetic, VoiceOption } from "@/stores/lessonStore";
import { getApiUrl } from "@/lib/query-client";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface TappableWordProps {
  word: string;
  phonetic: string;
  hasPhonetic: boolean;
  isActive: boolean;
  showAllPhonetics: boolean;
  onPress: () => void;
}

function TappableWord({
  word,
  phonetic,
  hasPhonetic,
  isActive,
  showAllPhonetics,
  onPress,
}: TappableWordProps) {
  const { theme } = useTheme();

  const handlePress = () => {
    if (!hasPhonetic) return;
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onPress();
  };

  const cleanWord = word.replace(/[.,!?;:'"()]/g, "");
  const punctuation = word.replace(cleanWord, "");
  const shouldShowPhonetic = hasPhonetic && (isActive || showAllPhonetics);

  return (
    <Pressable
      onPress={handlePress}
      style={styles.wordContainer}
      disabled={!hasPhonetic}
    >
      <View
        style={[
          styles.wordWrapper,
          shouldShowPhonetic && { backgroundColor: theme.highlight },
        ]}
      >
        <ThemedText
          style={[
            styles.wordText,
            hasPhonetic && styles.wordTextBold,
            hasPhonetic && { color: theme.primary },
          ]}
        >
          {cleanWord}
        </ThemedText>
        {shouldShowPhonetic ? (
          <ThemedText
            style={[
              styles.phoneticText,
              { color: theme.phonetic, fontFamily: Fonts?.mono },
            ]}
          >
            {phonetic}
          </ThemedText>
        ) : null}
      </View>
      {punctuation ? (
        <ThemedText style={styles.wordText}>{punctuation} </ThemedText>
      ) : (
        <ThemedText style={styles.wordText}> </ThemedText>
      )}
    </Pressable>
  );
}

export default function LearnScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const { currentLesson, selectedVoice } = useLessonStore();
  const [activeWords, setActiveWords] = useState<Set<string>>(new Set());
  const [showAllPhonetics, setShowAllPhonetics] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [shouldPlay, setShouldPlay] = useState(false);
  const webAudioRef = useRef<HTMLAudioElement | null>(null);
  const [playingWord, setPlayingWord] = useState<string | null>(null);
  const wordWebAudioRef = useRef<HTMLAudioElement | null>(null);
  const [wordAudioUri, setWordAudioUri] = useState<string | null>(null);
  const [shouldPlayWord, setShouldPlayWord] = useState(false);

  const player = useAudioPlayer(audioUri ? { uri: audioUri } : null);
  const wordPlayer = useAudioPlayer(wordAudioUri ? { uri: wordAudioUri } : null);

  useEffect(() => {
    if (shouldPlay && audioUri && player && Platform.OS !== "web") {
      player.play();
      setShouldPlay(false);
    }
  }, [audioUri, shouldPlay, player]);

  useEffect(() => {
    if (Platform.OS !== "web" && player) {
      const checkStatus = () => {
        if (player.playing === false && isPlaying && !isLoadingAudio) {
          setIsPlaying(false);
        }
      };
      const interval = setInterval(checkStatus, 500);
      return () => clearInterval(interval);
    }
  }, [player, isPlaying, isLoadingAudio]);

  useEffect(() => {
    if (shouldPlayWord && wordAudioUri && wordPlayer && Platform.OS !== "web") {
      wordPlayer.play();
      setShouldPlayWord(false);
    }
  }, [wordAudioUri, shouldPlayWord, wordPlayer]);

  useEffect(() => {
    if (Platform.OS !== "web" && wordPlayer && playingWord) {
      const checkStatus = () => {
        if (wordPlayer.playing === false && wordAudioUri) {
          setPlayingWord(null);
        }
      };
      const interval = setInterval(checkStatus, 200);
      return () => clearInterval(interval);
    }
  }, [wordPlayer, playingWord, wordAudioUri]);

  useEffect(() => {
    return () => {
      if (wordWebAudioRef.current) {
        wordWebAudioRef.current.pause();
        if (wordWebAudioRef.current.src) {
          URL.revokeObjectURL(wordWebAudioRef.current.src);
        }
        wordWebAudioRef.current = null;
      }
    };
  }, []);

  const toggleWord = useCallback((word: string) => {
    setActiveWords((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(word)) {
        newSet.delete(word);
      } else {
        newSet.add(word);
      }
      return newSet;
    });
  }, []);

  const toggleShowAllPhonetics = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAllPhonetics((prev) => !prev);
  };

  const handleShowWordsList = () => {
    navigation.navigate("WordsList");
  };

  const handlePlayAudio = async () => {
    if (!currentLesson) return;
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsLoadingAudio(true);
    setAudioError(null);

    try {
      const apiUrl = new URL("/api/text-to-speech", getApiUrl()).toString();
      
      if (Platform.OS === "web") {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: currentLesson.paragraph, voice: selectedVoice }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to generate audio");
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
          setIsPlaying(false);
          URL.revokeObjectURL(blobUrl);
        };
        audio.onerror = () => {
          setIsPlaying(false);
          setAudioError("Failed to play audio");
          URL.revokeObjectURL(blobUrl);
        };
        
        setIsPlaying(true);
        await audio.play();
      } else {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: currentLesson.paragraph, voice: selectedVoice }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to generate audio");
        }

        const audioBlob = await response.blob();
        const reader = new FileReader();
        
        reader.onloadend = async () => {
          try {
            const base64Data = (reader.result as string).split(",")[1];
            const file = new File(Paths.cache, `tts_audio_${Date.now()}.mp3`);
            file.create({ overwrite: true });
            file.write(base64Data, { encoding: 'base64' });
            
            setAudioUri(file.uri);
            setIsPlaying(true);
            setShouldPlay(true);
          } catch (err: any) {
            setAudioError("Failed to save audio file");
            setIsPlaying(false);
          }
        };
        
        reader.onerror = () => {
          setAudioError("Failed to process audio");
          setIsPlaying(false);
        };
        
        reader.readAsDataURL(audioBlob);
      }
    } catch (error: any) {
      setAudioError(error.message || "Failed to play audio");
      setIsPlaying(false);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handlePlayWordAudio = async (word: string) => {
    if (playingWord) return;
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setPlayingWord(word);

    try {
      const apiUrl = new URL("/api/text-to-speech", getApiUrl()).toString();
      
      if (Platform.OS === "web") {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: word, voice: selectedVoice }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate audio");
        }

        const audioBlob = await response.blob();
        const blobUrl = URL.createObjectURL(audioBlob);
        
        if (wordWebAudioRef.current) {
          wordWebAudioRef.current.pause();
          URL.revokeObjectURL(wordWebAudioRef.current.src);
        }
        
        const audio = new window.Audio(blobUrl);
        wordWebAudioRef.current = audio;
        
        audio.onended = () => {
          setPlayingWord(null);
          URL.revokeObjectURL(blobUrl);
        };
        audio.onerror = () => {
          setPlayingWord(null);
          URL.revokeObjectURL(blobUrl);
        };
        
        await audio.play();
      } else {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: word, voice: selectedVoice }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate audio");
        }

        const audioBlob = await response.blob();
        const reader = new FileReader();
        
        reader.onloadend = async () => {
          try {
            const base64Data = (reader.result as string).split(",")[1];
            const file = new File(Paths.cache, `word_audio_${Date.now()}.mp3`);
            file.create({ overwrite: true });
            file.write(base64Data, { encoding: 'base64' });
            
            setWordAudioUri(file.uri);
            setShouldPlayWord(true);
          } catch {
            setPlayingWord(null);
          }
        };
        
        reader.onerror = () => setPlayingWord(null);
        reader.readAsDataURL(audioBlob);
      }
    } catch {
      setPlayingWord(null);
    }
  };

  if (!currentLesson) {
    return (
      <ThemedView style={styles.container}>
        <View
          style={[
            styles.emptyContainer,
            {
              paddingTop: insets.top + Spacing.xl,
              paddingBottom: tabBarHeight + Spacing.xl,
            },
          ]}
        >
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="book-open" size={48} color={theme.textSecondary} />
          </View>
          <ThemedText type="h3" style={styles.emptyTitle}>
            No Lesson Yet
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.emptyText, { color: theme.textSecondary }]}
          >
            Select a topic from the Home tab to generate your first
            pronunciation lesson.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  const words = currentLesson.paragraph.split(" ");
  const wordPhoneticMap = new Map(
    currentLesson.words.map((w) => [w.word.toLowerCase(), w.phonetic])
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View
              style={[styles.topicIcon, { backgroundColor: theme.highlight }]}
            >
              <Feather
                name={currentLesson.icon as any}
                size={20}
                color={theme.primary}
              />
            </View>
            <ThemedText type="h3">{currentLesson.topic}</ThemedText>
          </View>
          <Pressable
            onPress={handleShowWordsList}
            style={[
              styles.wordsListButton,
              { backgroundColor: theme.highlight },
            ]}
          >
            <Feather name="list" size={18} color={theme.primary} />
            <ThemedText type="small" style={{ color: theme.primary }}>
              {currentLesson.words.length} words
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.controlsRow}>
          <Pressable
            onPress={toggleShowAllPhonetics}
            style={[
              styles.toggleButton,
              {
                backgroundColor: showAllPhonetics
                  ? theme.primary
                  : theme.backgroundSecondary,
              },
            ]}
          >
            <Feather
              name={showAllPhonetics ? "eye" : "eye-off"}
              size={16}
              color={showAllPhonetics ? "#FFFFFF" : theme.textSecondary}
            />
            <ThemedText
              type="small"
              style={{
                color: showAllPhonetics ? "#FFFFFF" : theme.textSecondary,
                fontWeight: "500",
              }}
            >
              {showAllPhonetics ? "Hide Phonetics" : "Show Phonetics"}
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={handlePlayAudio}
            disabled={isLoadingAudio || isPlaying}
            style={[
              styles.playButton,
              {
                backgroundColor: isPlaying
                  ? theme.success
                  : theme.primary,
                opacity: isLoadingAudio ? 0.7 : 1,
              },
            ]}
          >
            {isLoadingAudio ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Feather
                name={isPlaying ? "volume-2" : "play"}
                size={16}
                color="#FFFFFF"
              />
            )}
            <ThemedText
              type="small"
              style={{
                color: "#FFFFFF",
                fontWeight: "500",
              }}
            >
              {isLoadingAudio ? "Loading..." : isPlaying ? "Playing" : "Listen"}
            </ThemedText>
          </Pressable>
        </View>

        {audioError ? (
          <View style={[styles.errorBanner, { backgroundColor: `${theme.error}15` }]}>
            <Feather name="alert-circle" size={14} color={theme.error} />
            <ThemedText type="small" style={{ color: theme.error, flex: 1 }}>
              {audioError}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.paragraphContainer}>
          <ThemedText
            type="small"
            style={[styles.instruction, { color: theme.textSecondary }]}
          >
            Tap bold words to see pronunciation
          </ThemedText>
          <View style={styles.paragraph}>
            {words.map((word, index) => {
              const cleanWord = word
                .replace(/[.,!?;:'"()]/g, "")
                .toLowerCase();
              const phonetic = wordPhoneticMap.get(cleanWord) || "";
              const hasPhonetic = phonetic.length > 0;
              return (
                <TappableWord
                  key={`${word}-${index}`}
                  word={word}
                  phonetic={phonetic}
                  hasPhonetic={hasPhonetic}
                  isActive={activeWords.has(`${word}-${index}`)}
                  showAllPhonetics={showAllPhonetics}
                  onPress={() => toggleWord(`${word}-${index}`)}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.vocabularySection}>
          <View style={styles.vocabularyHeader}>
            <ThemedText type="h4">Key Vocabulary</ThemedText>
            <View style={[styles.badge, { backgroundColor: theme.primary }]}>
              <ThemedText type="small" style={{ color: "#FFFFFF" }}>
                {currentLesson.words.length}
              </ThemedText>
            </View>
          </View>
          <ThemedText
            type="small"
            style={[styles.chipInstruction, { color: theme.textSecondary }]}
          >
            Tap a word to hear its pronunciation
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContainer}
          >
            {currentLesson.words.slice(0, 10).map((wordItem, index) => {
              const isWordPlaying = playingWord === wordItem.word;
              return (
                <Pressable
                  key={index}
                  onPress={() => handlePlayWordAudio(wordItem.word)}
                  disabled={playingWord !== null}
                  style={[
                    styles.chip, 
                    { 
                      borderColor: isWordPlaying ? theme.primary : theme.border,
                      backgroundColor: isWordPlaying ? `${theme.primary}15` : 'transparent',
                    }
                  ]}
                >
                  <View style={styles.chipContent}>
                    <View style={styles.chipTextContainer}>
                      <ThemedText type="body" style={{ fontWeight: "600" }}>
                        {wordItem.word}
                      </ThemedText>
                      <ThemedText
                        type="small"
                        style={{ color: theme.phonetic, fontFamily: Fonts?.mono }}
                      >
                        {wordItem.phonetic}
                      </ThemedText>
                    </View>
                    {isWordPlaying ? (
                      <ActivityIndicator size="small" color={theme.primary} style={styles.chipIcon} />
                    ) : (
                      <Feather name="volume-2" size={14} color={theme.textSecondary} style={styles.chipIcon} />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </ScrollView>
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
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["3xl"],
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing["2xl"],
  },
  emptyTitle: {
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  emptyText: {
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  topicIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  wordsListButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  controlsRow: {
    flexDirection: "row",
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  playButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  paragraphContainer: {
    marginBottom: Spacing["2xl"],
  },
  instruction: {
    marginBottom: Spacing.md,
  },
  paragraph: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
  },
  wordContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  wordWrapper: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  wordText: {
    ...Typography.paragraph,
  },
  wordTextBold: {
    fontWeight: "700",
  },
  phoneticText: {
    ...Typography.phonetic,
    marginTop: 2,
  },
  vocabularySection: {
    marginBottom: Spacing["2xl"],
  },
  vocabularyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  chipsContainer: {
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  chipInstruction: {
    marginBottom: Spacing.sm,
  },
  chipContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  chipTextContainer: {
    alignItems: "center",
  },
  chipIcon: {
    marginLeft: Spacing.xs,
  },
});

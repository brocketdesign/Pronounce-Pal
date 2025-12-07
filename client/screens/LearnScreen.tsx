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
import * as FileSystem from "expo-file-system";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Fonts } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useLessonStore, WordPhonetic, ParagraphSection } from "@/stores/lessonStore";
import { getApiUrl, apiRequest } from "@/lib/query-client";

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
      hitSlop={4}
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

interface ParagraphDisplayProps {
  section: ParagraphSection;
  sectionIndex: number;
  showAllPhonetics: boolean;
  activeWords: Set<string>;
  toggleWord: (key: string) => void;
  selectedVoice: string;
  playingWord: string | null;
  onPlayWordAudio: (word: string) => void;
}

function ParagraphDisplay({
  section,
  sectionIndex,
  showAllPhonetics,
  activeWords,
  toggleWord,
  selectedVoice,
  playingWord,
  onPlayWordAudio,
}: ParagraphDisplayProps) {
  const { theme } = useTheme();
  const words = section.paragraph.split(" ");
  const wordPhoneticMap = new Map(
    section.words.map((w) => [w.word.toLowerCase(), w.phonetic])
  );

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionBadge, { backgroundColor: theme.primary }]}>
          <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "600" }}>
            {sectionIndex + 1}
          </ThemedText>
        </View>
        <ThemedText type="body" style={{ color: theme.textSecondary }}>
          Paragraph {sectionIndex + 1}
        </ThemedText>
      </View>
      
      <View style={styles.paragraph}>
        {words.map((word, index) => {
          const cleanWord = word
            .replace(/[.,!?;:'"()]/g, "")
            .toLowerCase();
          const phonetic = wordPhoneticMap.get(cleanWord) || "";
          const hasPhonetic = phonetic.length > 0;
          const wordKey = `${sectionIndex}-${word}-${index}`;
          return (
            <TappableWord
              key={wordKey}
              word={word}
              phonetic={phonetic}
              hasPhonetic={hasPhonetic}
              isActive={activeWords.has(wordKey)}
              showAllPhonetics={showAllPhonetics}
              onPress={() => toggleWord(wordKey)}
            />
          );
        })}
      </View>

      <View style={styles.vocabularySection}>
        <View style={styles.vocabularyHeader}>
          <ThemedText type="h4">Vocabulary</ThemedText>
          <View style={[styles.badge, { backgroundColor: theme.primary }]}>
            <ThemedText type="small" style={{ color: "#FFFFFF" }}>
              {section.words.length}
            </ThemedText>
          </View>
        </View>
        <ThemedText
          type="small"
          style={[styles.chipInstruction, { color: theme.textSecondary }]}
        >
          Tap a word to hear pronunciation
        </ThemedText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContainer}
        >
          {section.words.slice(0, 10).map((wordItem, index) => {
            const isWordPlaying = playingWord === wordItem.word;
            return (
              <Pressable
                key={`${sectionIndex}-chip-${index}`}
                onPress={() => onPlayWordAudio(wordItem.word)}
                disabled={playingWord !== null}
                hitSlop={6}
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
    </View>
  );
}

export default function LearnScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const { currentLesson, selectedVoice, isExtending, addSection, setIsExtending, setError } = useLessonStore();
  const [isExtendingLocal, setIsExtendingLocal] = useState(false);
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
  const [extendError, setExtendError] = useState<string | null>(null);
  const [extendSuccess, setExtendSuccess] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

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

  const toggleWord = useCallback((wordKey: string) => {
    setActiveWords((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(wordKey)) {
        newSet.delete(wordKey);
      } else {
        newSet.add(wordKey);
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
    if (!currentLesson || currentLesson.sections.length === 0) return;
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsLoadingAudio(true);
    setAudioError(null);

    const allParagraphs = currentLesson.sections.map(s => s.paragraph).join(" ");

    try {
      const apiUrl = new URL("/api/text-to-speech", getApiUrl()).toString();
      
      if (Platform.OS === "web") {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: allParagraphs, voice: selectedVoice }),
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
          body: JSON.stringify({ text: allParagraphs, voice: selectedVoice }),
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
            const fileUri = FileSystem.cacheDirectory + `tts_audio_${Date.now()}.mp3`;
            await FileSystem.writeAsStringAsync(fileUri, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            });
            
            setAudioUri(fileUri);
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
            const fileUri = FileSystem.cacheDirectory + `word_audio_${Date.now()}.mp3`;
            await FileSystem.writeAsStringAsync(fileUri, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            });
            
            setWordAudioUri(fileUri);
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

  const handleExtendLesson = async () => {
    if (!currentLesson || isExtendingLocal || isExtending) return;
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // immediately mark local state to prevent re-entrancy before store updates
    setIsExtendingLocal(true);
    setIsExtending(true);
    setExtendError(null);

    // ensure the loading placeholder is scrolled into view so users see feedback
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 50);

    try {
      const existingParagraphs = currentLesson.sections.map(s => s.paragraph);
      
      const response = await apiRequest("POST", "/api/extend-lesson", {
        topic: currentLesson.topic,
        existingParagraphs,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to extend lesson");
      }

      console.log("Extend lesson response:", data);
      console.log("Adding section with paragraph:", data.paragraph?.substring(0, 50));
      console.log("Words count:", data.words?.length);

      if (data.paragraph && data.words) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        addSection({
          paragraph: data.paragraph,
          words: data.words,
        });
        console.log("Section added successfully");
        setExtendSuccess(true);
        setTimeout(() => setExtendSuccess(false), 3000);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 300);
      } else {
        throw new Error("Invalid response data - missing paragraph or words");
      }
    } catch (err: any) {
      console.error("Extend lesson error:", err);
      setExtendError(err.message || "Failed to extend lesson");
    } finally {
      setIsExtending(false);
      // clear local state after the store has been updated
      setIsExtendingLocal(false);
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

  const totalWords = currentLesson.sections.reduce((sum, s) => sum + s.words.length, 0);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
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
              {totalWords} words
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

        <ThemedText
          type="small"
          style={[styles.instruction, { color: theme.textSecondary }]}
        >
          Tap bold words to see pronunciation
        </ThemedText>

        {currentLesson.sections.map((section, index) => (
          <ParagraphDisplay
            key={`section-${index}`}
            section={section}
            sectionIndex={index}
            showAllPhonetics={showAllPhonetics}
            activeWords={activeWords}
            toggleWord={toggleWord}
            selectedVoice={selectedVoice}
            playingWord={playingWord}
            onPlayWordAudio={handlePlayWordAudio}
          />
        ))}

        {isExtending && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <ActivityIndicator size="small" color={theme.primary} />
              <ThemedText type="body" style={{ color: theme.textSecondary, marginLeft: Spacing.sm }}>
                Generating Paragraph {currentLesson.sections.length + 1}...
              </ThemedText>
            </View>
            <View style={styles.paragraph}>
              <ThemedText style={{ color: theme.textSecondary }}>
                Please wait while we create a new paragraph for your lesson.
              </ThemedText>
            </View>
          </View>
        )}

        {extendSuccess ? (
          <View style={[styles.successBanner, { backgroundColor: `${theme.success}15`, marginTop: Spacing.lg, borderColor: theme.success, borderWidth: 1 }]}>
            <Feather name="check-circle" size={14} color={theme.success} />
            <ThemedText type="small" style={{ color: theme.success, flex: 1 }}>
              New paragraph added!
            </ThemedText>
          </View>
        ) : null}

        {extendError ? (
          <View style={[styles.errorBanner, { backgroundColor: `${theme.error}15`, marginTop: Spacing.lg }]}>
            <Feather name="alert-circle" size={14} color={theme.error} />
            <ThemedText type="small" style={{ color: theme.error, flex: 1 }}>
              {extendError}
            </ThemedText>
          </View>
        ) : null}

        <Pressable
          onPress={handleExtendLesson}
          disabled={isExtending}
          hitSlop={Platform.OS === "web" ? 12 : 8}
          style={({ pressed }) => [
            styles.extendButton,
            {
              backgroundColor: isExtending 
                ? theme.primary 
                : pressed 
                  ? theme.highlight 
                  : theme.backgroundSecondary,
              borderColor: isExtending ? theme.primary : theme.border,
              transform: [{ scale: pressed && !isExtending ? 0.98 : 1 }],
            },
          ]}
        >
          {isExtending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Feather name="plus-circle" size={20} color={theme.primary} />
          )}
          <ThemedText
            type="body"
            style={{ 
              color: isExtending ? "#FFFFFF" : theme.primary, 
              fontWeight: "600" 
            }}
          >
            {isExtending ? "Generating new paragraph..." : "Extend Lesson"}
          </ThemedText>
        </Pressable>
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
    marginBottom: Spacing.lg,
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
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  instruction: {
    marginBottom: Spacing.lg,
  },
  sectionContainer: {
    marginBottom: Spacing["2xl"],
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  paragraph: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: Spacing.xl,
  },
  wordContainer: {
    flexDirection: "row",
  },
  wordWrapper: {
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRadius: BorderRadius.xs,
  },
  wordText: {
    fontSize: 18,
    lineHeight: 32,
  },
  wordTextBold: {
    fontWeight: "600",
  },
  phoneticText: {
    fontSize: 12,
    marginTop: -2,
    textAlign: "center",
  },
  vocabularySection: {
    marginTop: Spacing.sm,
  },
  vocabularyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  chipInstruction: {
    marginBottom: Spacing.md,
  },
  chipsContainer: {
    paddingRight: Spacing.xl,
    gap: Spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  chipContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  chipTextContainer: {
    alignItems: "center",
  },
  chipIcon: {
    marginLeft: Spacing.xs,
  },
  extendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    gap: Spacing.md,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
});

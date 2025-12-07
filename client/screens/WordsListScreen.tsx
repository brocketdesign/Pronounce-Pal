import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useAudioPlayer, AudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Fonts } from "@/constants/theme";
import { useLessonStore, WordPhonetic } from "@/stores/lessonStore";
import { getApiUrl } from "@/lib/query-client";

interface WordItemProps {
  item: WordPhonetic;
  isPlaying: boolean;
  isAnyPlaying: boolean;
  onPlayAudio: (word: string) => void;
  onToggleSaved?: (word: WordPhonetic) => void;
  isSaved?: boolean;
}

function WordItem({ item, isPlaying, isAnyPlaying, onPlayAudio, onToggleSaved, isSaved }: WordItemProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.wordItem, { backgroundColor: theme.backgroundDefault }]}>
      <View style={styles.wordContent}>
        <ThemedText type="body" style={styles.word}>
          {item.word}
        </ThemedText>
        <ThemedText
          type="small"
          style={[styles.phonetic, { color: theme.phonetic, fontFamily: Fonts?.mono }]}
        >
          {item.phonetic}
        </ThemedText>
      </View>
      <View style={{ flexDirection: "row" }}>
        <Pressable
          onPress={() => onPlayAudio(item.word)}
          disabled={isAnyPlaying}
          style={[
            styles.audioButton,
            {
              backgroundColor: isPlaying ? `${theme.primary}15` : theme.backgroundSecondary,
              borderWidth: isPlaying ? 1 : 0,
              borderColor: theme.primary,
            },
          ]}
        >
          {isPlaying ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Feather name="volume-2" size={18} color={theme.textSecondary} style={{ opacity: isAnyPlaying ? 0.5 : 1 }} />
          )}
        </Pressable>
        <Pressable
          onPress={() => onToggleSaved?.(item)}
          style={[
            styles.favoriteButton,
            { backgroundColor: isSaved ? `${theme.primary}15` : theme.backgroundSecondary, marginLeft: Spacing.sm },
          ]}
        >
          <Feather name="heart" size={18} color={isSaved ? theme.primary : theme.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

export default function WordsListScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { currentLesson, selectedVoice, toggleSavedWord, isSavedWord } = useLessonStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [playingWord, setPlayingWord] = useState<string | null>(null);
  const [wordAudioUri, setWordAudioUri] = useState<string | null>(null);
  const [shouldPlayWord, setShouldPlayWord] = useState(false);
  const wordWebAudioRef = useRef<HTMLAudioElement | null>(null);
  const wordAudioPlayer = useAudioPlayer(wordAudioUri ? { uri: wordAudioUri } : null);

  useEffect(() => {
    if (shouldPlayWord && wordAudioUri && wordAudioPlayer) {
      setShouldPlayWord(false);
      wordAudioPlayer.play();
    }
  }, [shouldPlayWord, wordAudioUri, wordAudioPlayer]);

  useEffect(() => {
    if (!wordAudioPlayer) return;
    
    const checkStatus = () => {
      if (wordAudioPlayer.playing === false && playingWord && wordAudioUri) {
        setPlayingWord(null);
        setWordAudioUri(null);
      }
    };
    
    const interval = setInterval(checkStatus, 100);
    return () => clearInterval(interval);
  }, [wordAudioPlayer, playingWord, wordAudioUri]);

  useEffect(() => {
    return () => {
      if (wordWebAudioRef.current) {
        wordWebAudioRef.current.pause();
        URL.revokeObjectURL(wordWebAudioRef.current.src);
        wordWebAudioRef.current = null;
      }
    };
  }, []);

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

  const words = currentLesson?.sections.flatMap(s => s.words) || [];

  const filteredWords = useMemo(() => {
    if (!searchQuery.trim()) {
      return words;
    }
    return words.filter((w) =>
      w.word.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [words, searchQuery]);

  const groupedWords = useMemo(() => {
    const groups: { [key: string]: WordPhonetic[] } = {};
    filteredWords.forEach((word) => {
      const letter = word.word[0].toUpperCase();
      if (!groups[letter]) {
        groups[letter] = [];
      }
      groups[letter].push(word);
    });

    const sortedKeys = Object.keys(groups).sort();
    const result: { type: "header" | "word"; data: string | WordPhonetic }[] = [];

    sortedKeys.forEach((key) => {
      result.push({ type: "header", data: key });
      groups[key]
        .sort((a, b) => a.word.localeCompare(b.word))
        .forEach((word) => {
          result.push({ type: "word", data: word });
        });
    });

    return result;
  }, [filteredWords]);

  const renderItem = ({
    item,
  }: {
    item: { type: "header" | "word"; data: string | WordPhonetic };
  }) => {
    if (item.type === "header") {
      return (
        <View style={styles.sectionHeader}>
          <ThemedText
            type="small"
            style={[styles.sectionTitle, { color: theme.textSecondary }]}
          >
            {item.data as string}
          </ThemedText>
        </View>
      );
    }

    const wordData = item.data as WordPhonetic;
    return (
      <WordItem
        item={wordData}
        isPlaying={playingWord === wordData.word}
        isAnyPlaying={playingWord !== null}
        onPlayAudio={handlePlayWordAudio}
        onToggleSaved={toggleSavedWord}
        isSaved={isSavedWord(wordData.word)}
      />
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.searchContainer,
          {
            paddingTop: headerHeight + Spacing.md,
            backgroundColor: theme.backgroundRoot,
          },
        ]}
      >
        <View
          style={[
            styles.searchWrapper,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <Feather name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[
              styles.searchInput,
              { color: theme.text, fontFamily: Fonts?.sans },
            ]}
            placeholder="Search words..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery("")}>
              <Feather name="x" size={20} color={theme.textSecondary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {filteredWords.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="search" size={48} color={theme.textSecondary} />
          <ThemedText
            type="body"
            style={[styles.emptyText, { color: theme.textSecondary }]}
          >
            No words found
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={groupedWords}
          renderItem={renderItem}
          keyExtractor={(item, index) =>
            item.type === "header"
              ? `header-${item.data}`
              : `word-${(item.data as WordPhonetic).word}-${index}`
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + Spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
          scrollIndicatorInsets={{ bottom: insets.bottom }}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: "100%",
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
  },
  sectionHeader: {
    paddingVertical: Spacing.sm,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  wordItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  wordContent: {
    flex: 1,
  },
  word: {
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  phonetic: {},
  audioButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  emptyText: {},
});

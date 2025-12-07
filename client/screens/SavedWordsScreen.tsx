import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Fonts } from "@/constants/theme";
import { useLessonStore, WordPhonetic } from "@/stores/lessonStore";
import { getApiUrl } from "@/lib/query-client";

export default function SavedWordsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { savedWords, toggleSavedWord, selectedVoice } = useLessonStore();
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

  const renderItem = ({ item }: { item: WordPhonetic }) => {
    return (
      <View style={[styles.wordItem, { backgroundColor: theme.backgroundDefault }]}> 
        <View style={styles.wordContent}>
          <ThemedText type="body" style={styles.word}>{item.word}</ThemedText>
          <ThemedText type="small" style={[styles.phonetic, { color: theme.phonetic, fontFamily: Fonts?.mono }]}>
            {item.phonetic}
          </ThemedText>
        </View>
        <View style={{ flexDirection: "row" }}>
          <Pressable
            onPress={() => handlePlayWordAudio(item.word)}
            disabled={!!playingWord}
            style={[styles.audioButton, { backgroundColor: playingWord === item.word ? `${theme.primary}15` : theme.backgroundSecondary, borderWidth: playingWord === item.word ? 1 : 0, borderColor: theme.primary }]}
          >
            {playingWord === item.word ? <ActivityIndicator size="small" color={theme.primary} /> : <Feather name="volume-2" size={18} color={theme.textSecondary} />}
          </Pressable>
          <Pressable onPress={() => toggleSavedWord(item)} style={[styles.favoriteButton, { backgroundColor: theme.backgroundSecondary, marginLeft: Spacing.sm }]}> 
            <Feather name="heart" size={18} color={theme.textSecondary} />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {savedWords.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="bookmark" size={56} color={theme.textSecondary} />
          <ThemedText type="body" style={[styles.emptyText, { color: theme.textSecondary }]}>No saved words</ThemedText>
        </View>
      ) : (
        <FlatList
          data={savedWords}
          renderItem={renderItem}
          keyExtractor={(item) => `saved-${item.word}`}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + Spacing.xl }]}
          showsVerticalScrollIndicator={false}
          scrollIndicatorInsets={{ bottom: insets.bottom }}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: Spacing.xl },
  wordItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  wordContent: { flex: 1 },
  word: { fontWeight: "500", marginBottom: Spacing.xs },
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
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.md },
  emptyText: {},
});

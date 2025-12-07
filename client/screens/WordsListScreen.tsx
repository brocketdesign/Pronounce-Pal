import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Fonts } from "@/constants/theme";
import { useLessonStore, WordPhonetic } from "@/stores/lessonStore";

interface WordItemProps {
  item: WordPhonetic;
}

function WordItem({ item }: WordItemProps) {
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
      <View style={[styles.audioButton, { backgroundColor: theme.backgroundSecondary }]}>
        <Feather name="volume-2" size={18} color={theme.textSecondary} />
      </View>
    </View>
  );
}

export default function WordsListScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { currentLesson } = useLessonStore();
  const [searchQuery, setSearchQuery] = useState("");

  const words = currentLesson?.words || [];

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

    return <WordItem item={item.data as WordPhonetic} />;
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
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  emptyText: {},
});

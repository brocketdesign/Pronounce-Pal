import React, { useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Fonts } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useLessonStore } from "@/stores/lessonStore";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const TOPICS = [
  { id: "travel", name: "Travel", icon: "globe", description: "Explore the world" },
  { id: "business", name: "Business", icon: "briefcase", description: "Professional terms" },
  { id: "daily", name: "Daily Life", icon: "home", description: "Everyday phrases" },
  { id: "technology", name: "Technology", icon: "cpu", description: "Tech vocabulary" },
  { id: "food", name: "Food", icon: "coffee", description: "Culinary words" },
  { id: "health", name: "Health", icon: "heart", description: "Medical terms" },
  { id: "education", name: "Education", icon: "book-open", description: "Academic words" },
  { id: "entertainment", name: "Entertainment", icon: "film", description: "Fun expressions" },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TopicCardProps {
  topic: typeof TOPICS[0];
  onPress: () => void;
}

function TopicCard({ topic, onPress }: TopicCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 15, stiffness: 150 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 150 });
      }}
      style={[
        styles.topicCard,
        { backgroundColor: theme.backgroundDefault },
        animatedStyle,
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: theme.highlight }]}>
        <Feather name={topic.icon as any} size={24} color={theme.primary} />
      </View>
      <ThemedText type="body" style={styles.topicName}>
        {topic.name}
      </ThemedText>
      <ThemedText
        type="small"
        style={[styles.topicDescription, { color: theme.textSecondary }]}
      >
        {topic.description}
      </ThemedText>
    </AnimatedPressable>
  );
}

export default function HomeScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = useState("");
  const { recentTopics } = useLessonStore();

  const filteredTopics = TOPICS.filter(
    (topic) =>
      topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTopicPress = (topic: typeof TOPICS[0]) => {
    navigation.navigate("GenerateLesson", { topic: topic.name, icon: topic.icon });
  };

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
      >
        <View style={styles.header}>
          <ThemedText type="h2">SpeakEasy</ThemedText>
          <ThemedText
            type="body"
            style={[styles.subtitle, { color: theme.textSecondary }]}
          >
            Master your English pronunciation
          </ThemedText>
        </View>

        <View
          style={[
            styles.searchContainer,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <Feather name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[
              styles.searchInput,
              { color: theme.text, fontFamily: Fonts?.sans },
            ]}
            placeholder="Search topics..."
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

        {recentTopics.length > 0 ? (
          <View style={styles.section}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Recent Lessons
            </ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentContainer}
            >
              {recentTopics.slice(0, 5).map((topic, index) => {
                const topicData = TOPICS.find(
                  (t) => t.name.toLowerCase() === topic.toLowerCase()
                ) || { name: topic, icon: "book-open", description: "" };
                return (
                  <Pressable
                    key={index}
                    onPress={() =>
                      handleTopicPress({ ...topicData, id: topic, name: topic })
                    }
                    style={[
                      styles.recentChip,
                      { backgroundColor: theme.highlight },
                    ]}
                  >
                    <Feather
                      name={topicData.icon as any}
                      size={16}
                      color={theme.primary}
                    />
                    <ThemedText type="small" style={{ color: theme.primary }}>
                      {topic}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Choose a Topic
          </ThemedText>
          <View style={styles.topicsGrid}>
            {filteredTopics.map((topic) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                onPress={() => handleTopicPress(topic)}
              />
            ))}
          </View>
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
  header: {
    marginBottom: Spacing["2xl"],
  },
  subtitle: {
    marginTop: Spacing.xs,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing["2xl"],
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: "100%",
  },
  section: {
    marginBottom: Spacing["2xl"],
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  recentContainer: {
    gap: Spacing.sm,
  },
  recentChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  topicsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.lg,
  },
  topicCard: {
    width: "47%",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  topicName: {
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  topicDescription: {
    opacity: 0.8,
  },
});

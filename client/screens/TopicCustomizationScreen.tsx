import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Fonts } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "TopicCustomization">;

const TOPIC_TAGS: Record<string, string[]> = {
  Travel: ["Airports", "Hotels", "Directions", "Sightseeing", "Transportation"],
  Business: ["Meetings", "Negotiations", "Presentations", "Networking", "Emails"],
  "Daily Life": ["Shopping", "Cooking", "Chores", "Weather", "Greetings"],
  Technology: ["Software", "Hardware", "Internet", "AI", "Mobile Apps"],
  Food: ["Restaurants", "Recipes", "Ingredients", "Ordering", "Cuisines"],
  Health: ["Fitness", "Nutrition", "Medical", "Mental Health", "Exercise"],
  Education: ["Studying", "Exams", "Research", "Classroom", "Learning"],
  Entertainment: ["Movies", "Music", "Games", "Sports", "Hobbies"],
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TagChipProps {
  tag: string;
  selected: boolean;
  onPress: () => void;
}

function TagChip({ tag, selected, onPress }: TagChipProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.95, { damping: 15, stiffness: 150 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 150 });
      }}
      style={[
        styles.tagChip,
        {
          backgroundColor: selected ? theme.primary : theme.backgroundSecondary,
          borderColor: selected ? theme.primary : theme.border,
        },
        animatedStyle,
      ]}
    >
      <ThemedText
        type="small"
        style={[
          styles.tagText,
          { color: selected ? "#FFFFFF" : theme.text },
        ]}
      >
        {tag}
      </ThemedText>
      {selected ? (
        <Feather name="check" size={14} color="#FFFFFF" />
      ) : null}
    </AnimatedPressable>
  );
}

export default function TopicCustomizationScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { topic, icon } = route.params;

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [details, setDetails] = useState("");

  const availableTags = TOPIC_TAGS[topic] || TOPIC_TAGS["Daily Life"];

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    );
  };

  const handleGenerate = () => {
    navigation.navigate("GenerateLesson", {
      topic,
      icon,
      tags: selectedTags,
      details: details.trim(),
    });
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: theme.highlight },
            ]}
          >
            <Feather name={icon as any} size={32} color={theme.primary} />
          </View>
          <ThemedText type="h2" style={styles.topicTitle}>
            {topic}
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.subtitle, { color: theme.textSecondary }]}
          >
            Customize your lesson to focus on specific areas
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Focus Areas
          </ThemedText>
          <ThemedText
            type="small"
            style={[styles.sectionSubtitle, { color: theme.textSecondary }]}
          >
            Select topics to include in your lesson (optional)
          </ThemedText>
          <View style={styles.tagsContainer}>
            {availableTags.map((tag) => (
              <TagChip
                key={tag}
                tag={tag}
                selected={selectedTags.includes(tag)}
                onPress={() => toggleTag(tag)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Additional Details
          </ThemedText>
          <ThemedText
            type="small"
            style={[styles.sectionSubtitle, { color: theme.textSecondary }]}
          >
            Add any specific words or context you want to learn (optional)
          </ThemedText>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
                borderColor: theme.border,
                fontFamily: Fonts?.sans,
              },
            ]}
            placeholder="e.g., I'm preparing for a job interview, focus on formal language..."
            placeholderTextColor={theme.textSecondary}
            value={details}
            onChangeText={setDetails}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button onPress={handleGenerate} style={styles.generateButton}>
            <Feather name="zap" size={20} color="#FFFFFF" />
            <ThemedText type="body" style={styles.buttonText}>
              Generate Lesson
            </ThemedText>
          </Button>
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
  content: {
    paddingHorizontal: Spacing.xl,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  topicTitle: {
    marginBottom: Spacing.xs,
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
  },
  section: {
    marginBottom: Spacing["2xl"],
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    marginBottom: Spacing.lg,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  tagText: {
    fontWeight: "500",
  },
  textArea: {
    minHeight: 100,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: Spacing.lg,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});

import React, { useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useLessonStore, Lesson } from "@/stores/lessonStore";
import { getApiUrl, apiRequest } from "@/lib/query-client";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "GenerateLesson">;

export default function GenerateLessonScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { topic, icon } = route.params;

  const {
    apiKey,
    setCurrentLesson,
    addRecentTopic,
    isLoading,
    setIsLoading,
    error,
    setError,
  } = useLessonStore();

  const [status, setStatus] = useState<"loading" | "error" | "no-key">("loading");

  useEffect(() => {
    if (!apiKey) {
      setStatus("no-key");
      return;
    }

    generateLesson();
  }, []);

  const generateLesson = async () => {
    if (!apiKey) {
      setStatus("no-key");
      return;
    }

    setStatus("loading");
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest("POST", "/api/generate-lesson", {
        topic,
        apiKey,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to generate lesson");
      }

      const lesson: Lesson = {
        topic,
        icon,
        paragraph: data.paragraph,
        words: data.words,
        createdAt: new Date(),
      };

      setCurrentLesson(lesson);
      addRecentTopic(topic);
      setIsLoading(false);

      navigation.goBack();
      setTimeout(() => {
        navigation.navigate("Main");
      }, 100);
    } catch (err: any) {
      setStatus("error");
      setError(err.message || "Failed to generate lesson");
      setIsLoading(false);
    }
  };

  const handleGoToSettings = () => {
    navigation.goBack();
  };

  const handleRetry = () => {
    generateLesson();
  };

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        {status === "loading" ? (
          <View style={styles.centerContent}>
            <View
              style={[
                styles.loadingIcon,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
            <ThemedText type="h3" style={styles.title}>
              Generating Lesson
            </ThemedText>
            <ThemedText
              type="body"
              style={[styles.subtitle, { color: theme.textSecondary }]}
            >
              Creating a pronunciation lesson about {topic}...
            </ThemedText>
          </View>
        ) : null}

        {status === "no-key" ? (
          <View style={styles.centerContent}>
            <View
              style={[
                styles.errorIcon,
                { backgroundColor: `${theme.error}15` },
              ]}
            >
              <Feather name="key" size={48} color={theme.error} />
            </View>
            <ThemedText type="h3" style={styles.title}>
              API Key Required
            </ThemedText>
            <ThemedText
              type="body"
              style={[styles.subtitle, { color: theme.textSecondary }]}
            >
              Please add your OpenAI API key in Settings to generate lessons.
            </ThemedText>
            <Button onPress={handleGoToSettings} style={styles.button}>
              Go to Settings
            </Button>
          </View>
        ) : null}

        {status === "error" ? (
          <View style={styles.centerContent}>
            <View
              style={[
                styles.errorIcon,
                { backgroundColor: `${theme.error}15` },
              ]}
            >
              <Feather name="alert-circle" size={48} color={theme.error} />
            </View>
            <ThemedText type="h3" style={styles.title}>
              Generation Failed
            </ThemedText>
            <ThemedText
              type="body"
              style={[styles.subtitle, { color: theme.textSecondary }]}
            >
              {error || "Something went wrong. Please try again."}
            </ThemedText>
            <Button onPress={handleRetry} style={styles.button}>
              Try Again
            </Button>
          </View>
        ) : null}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing["2xl"],
  },
  errorIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing["2xl"],
  },
  title: {
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    marginBottom: Spacing["2xl"],
    paddingHorizontal: Spacing.xl,
  },
  button: {
    minWidth: 200,
  },
});

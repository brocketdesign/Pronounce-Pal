import React, { useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import {
  useNavigation,
  useRoute,
  RouteProp,
  CommonActions,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useLessonStore, Lesson } from "@/stores/lessonStore";
import { apiRequest } from "@/lib/query-client";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "GenerateLesson">;

export default function GenerateLessonScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { topic, icon, tags = [], details = "" } = route.params;

  const {
    setCurrentLesson,
    addRecentTopic,
    setIsLoading,
    error,
    setError,
  } = useLessonStore();

  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    generateLesson();
  }, []);

  const generateLesson = async () => {
    setStatus("loading");
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest("POST", "/api/generate-lesson", {
        topic,
        tags,
        details,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to generate lesson");
      }

      const lesson: Lesson = {
        topic,
        icon,
        sections: [
          {
            paragraph: data.paragraph,
            words: data.words,
          },
        ],
        createdAt: new Date(),
      };

      setCurrentLesson(lesson);
      addRecentTopic(topic);
      setIsLoading(false);

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: "Main",
              state: {
                routes: [{ name: "LearnTab" }],
                index: 1,
              },
            },
          ],
        })
      );
    } catch (err: any) {
      setStatus("error");
      setError(err.message || "Failed to generate lesson");
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    generateLesson();
  };

  const handleGoBack = () => {
    navigation.goBack();
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
            <View style={styles.buttonRow}>
              <Button onPress={handleRetry} style={styles.button}>
                Try Again
              </Button>
              <Button onPress={handleGoBack} style={styles.secondaryButton}>
                Go Back
              </Button>
            </View>
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
  buttonRow: {
    gap: Spacing.md,
    width: "100%",
    alignItems: "center",
  },
  button: {
    minWidth: 200,
  },
  secondaryButton: {
    minWidth: 200,
    backgroundColor: "transparent",
  },
});

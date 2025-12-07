import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import TopicCustomizationScreen from "@/screens/TopicCustomizationScreen";
import GenerateLessonScreen from "@/screens/GenerateLessonScreen";
import WordsListScreen from "@/screens/WordsListScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type RootStackParamList = {
  Main: undefined;
  TopicCustomization: { topic: string; icon: string };
  GenerateLesson: { topic: string; icon: string; tags?: string[]; details?: string };
  WordsList: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TopicCustomization"
        component={TopicCustomizationScreen}
        options={{
          presentation: "modal",
          headerTitle: "Customize Lesson",
        }}
      />
      <Stack.Screen
        name="GenerateLesson"
        component={GenerateLessonScreen}
        options={{
          presentation: "modal",
          headerTitle: "Generate Lesson",
        }}
      />
      <Stack.Screen
        name="WordsList"
        component={WordsListScreen}
        options={{
          presentation: "modal",
          headerTitle: "Vocabulary",
        }}
      />
    </Stack.Navigator>
  );
}

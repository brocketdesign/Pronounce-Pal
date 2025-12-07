import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import GenerateLessonScreen from "@/screens/GenerateLessonScreen";
import WordsListScreen from "@/screens/WordsListScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type RootStackParamList = {
  Main: undefined;
  GenerateLesson: { topic: string; icon: string };
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

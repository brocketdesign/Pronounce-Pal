import { useState, useCallback, useEffect } from "react";

export interface WordPhonetic {
  word: string;
  phonetic: string;
}

export interface Lesson {
  topic: string;
  icon: string;
  paragraph: string;
  words: WordPhonetic[];
  createdAt: Date;
}

export type VoiceOption = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

export const VOICE_OPTIONS: { id: VoiceOption; name: string; description: string }[] = [
  { id: "alloy", name: "Alloy", description: "Neutral and balanced" },
  { id: "echo", name: "Echo", description: "Warm and conversational" },
  { id: "fable", name: "Fable", description: "Expressive and dynamic" },
  { id: "onyx", name: "Onyx", description: "Deep and authoritative" },
  { id: "nova", name: "Nova", description: "Friendly and upbeat" },
  { id: "shimmer", name: "Shimmer", description: "Clear and gentle" },
];

interface LessonStore {
  currentLesson: Lesson | null;
  recentTopics: string[];
  apiKey: string;
  selectedVoice: VoiceOption;
  isLoading: boolean;
  error: string | null;
  setCurrentLesson: (lesson: Lesson | null) => void;
  addRecentTopic: (topic: string) => void;
  setApiKey: (key: string) => void;
  setSelectedVoice: (voice: VoiceOption) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearLesson: () => void;
}

let globalState: {
  currentLesson: Lesson | null;
  recentTopics: string[];
  apiKey: string;
  selectedVoice: VoiceOption;
  isLoading: boolean;
  error: string | null;
} = {
  currentLesson: null,
  recentTopics: [],
  apiKey: "",
  selectedVoice: "alloy",
  isLoading: false,
  error: null,
};

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function useLessonStore(): LessonStore {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const listener = () => forceUpdate({});
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const setCurrentLesson = useCallback((lesson: Lesson | null) => {
    globalState = { ...globalState, currentLesson: lesson };
    notifyListeners();
  }, []);

  const addRecentTopic = useCallback((topic: string) => {
    const filtered = globalState.recentTopics.filter((t) => t !== topic);
    globalState = {
      ...globalState,
      recentTopics: [topic, ...filtered].slice(0, 10),
    };
    notifyListeners();
  }, []);

  const setApiKey = useCallback((key: string) => {
    globalState = { ...globalState, apiKey: key };
    notifyListeners();
  }, []);

  const setSelectedVoice = useCallback((voice: VoiceOption) => {
    globalState = { ...globalState, selectedVoice: voice };
    notifyListeners();
  }, []);

  const setIsLoading = useCallback((loading: boolean) => {
    globalState = { ...globalState, isLoading: loading };
    notifyListeners();
  }, []);

  const setError = useCallback((error: string | null) => {
    globalState = { ...globalState, error: error };
    notifyListeners();
  }, []);

  const clearLesson = useCallback(() => {
    globalState = { ...globalState, currentLesson: null, error: null };
    notifyListeners();
  }, []);

  return {
    currentLesson: globalState.currentLesson,
    recentTopics: globalState.recentTopics,
    apiKey: globalState.apiKey,
    selectedVoice: globalState.selectedVoice,
    isLoading: globalState.isLoading,
    error: globalState.error,
    setCurrentLesson,
    addRecentTopic,
    setApiKey,
    setSelectedVoice,
    setIsLoading,
    setError,
    clearLesson,
  };
}

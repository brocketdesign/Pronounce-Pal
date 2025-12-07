import { useState, useCallback, useMemo } from "react";

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

interface LessonStore {
  currentLesson: Lesson | null;
  recentTopics: string[];
  apiKey: string;
  isLoading: boolean;
  error: string | null;
  setCurrentLesson: (lesson: Lesson | null) => void;
  addRecentTopic: (topic: string) => void;
  setApiKey: (key: string) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearLesson: () => void;
}

let globalState: {
  currentLesson: Lesson | null;
  recentTopics: string[];
  apiKey: string;
  isLoading: boolean;
  error: string | null;
} = {
  currentLesson: null,
  recentTopics: [],
  apiKey: "",
  isLoading: false,
  error: null,
};

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function useLessonStore(): LessonStore {
  const [, forceUpdate] = useState({});

  const subscribe = useCallback(() => {
    const listener = () => forceUpdate({});
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  useMemo(() => {
    const unsubscribe = subscribe();
    return unsubscribe;
  }, [subscribe]);

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
    isLoading: globalState.isLoading,
    error: globalState.error,
    setCurrentLesson,
    addRecentTopic,
    setApiKey,
    setIsLoading,
    setError,
    clearLesson,
  };
}

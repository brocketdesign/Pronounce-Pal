import { useState, useCallback, useEffect } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WordPhonetic {
  word: string;
  phonetic: string;
}

export interface ParagraphSection {
  paragraph: string;
  words: WordPhonetic[];
}

export interface Lesson {
  topic: string;
  icon: string;
  sections: ParagraphSection[];
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
  isExtending: boolean;
  error: string | null;
  setCurrentLesson: (lesson: Lesson | null) => void;
  addSection: (section: ParagraphSection) => void;
  addRecentTopic: (topic: string) => void;
  setApiKey: (key: string) => void;
  setSelectedVoice: (voice: VoiceOption) => void;
  setIsLoading: (loading: boolean) => void;
  setIsExtending: (extending: boolean) => void;
  setError: (error: string | null) => void;
  clearLesson: () => void;
  savedWords: WordPhonetic[];
  toggleSavedWord: (word: WordPhonetic) => void;
  removeSavedWord: (word: string) => void;
  isSavedWord: (word: string) => boolean;
}

let globalState: {
  currentLesson: Lesson | null;
  recentTopics: string[];
  apiKey: string;
  selectedVoice: VoiceOption;
  isLoading: boolean;
  isExtending: boolean;
  error: string | null;
  version: number;
  savedWords: WordPhonetic[];
} = {
  currentLesson: null,
  recentTopics: [],
  apiKey: "",
  selectedVoice: "alloy",
  isLoading: false,
  isExtending: false,
  error: null,
  version: 0,
  savedWords: [],
};

const listeners = new Set<() => void>();

function notifyListeners() {
  globalState = { ...globalState, version: globalState.version + 1 };
  listeners.forEach((listener) => listener());
}

export function useLessonStore(): LessonStore {
  const [, setVersion] = useState(0);

  useEffect(() => {
    const listener = () => setVersion(v => v + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const setCurrentLesson = useCallback((lesson: Lesson | null) => {
    globalState = { ...globalState, currentLesson: lesson };
    notifyListeners();
  }, []);

  const STORAGE_KEY = "savedWords:v1";

  useEffect(() => {
    (async () => {
      try {
        const json = await AsyncStorage.getItem(STORAGE_KEY);
        if (json) {
          const parsed = JSON.parse(json) as WordPhonetic[];
          globalState = { ...globalState, savedWords: parsed };
          notifyListeners();
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const persistSavedWords = useCallback(async (words: WordPhonetic[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(words));
    } catch (e) {
      // ignore
    }
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

  const setIsExtending = useCallback((extending: boolean) => {
    globalState = { ...globalState, isExtending: extending };
    notifyListeners();
  }, []);

  const setError = useCallback((error: string | null) => {
    globalState = { ...globalState, error: error };
    notifyListeners();
  }, []);

  const addSection = useCallback((section: ParagraphSection) => {
    console.log("addSection called with section:", section?.paragraph?.substring(0, 50));
    console.log("Current lesson exists:", !!globalState.currentLesson);
    console.log("Current sections count:", globalState.currentLesson?.sections?.length);
    
    if (!globalState.currentLesson) {
      console.log("No current lesson - returning early");
      return;
    }
    
    globalState = {
      ...globalState,
      currentLesson: {
        ...globalState.currentLesson,
        sections: [...globalState.currentLesson.sections, section],
      },
    };
    
    console.log("Updated sections count:", globalState.currentLesson?.sections?.length);
    console.log("Notifying listeners...");
    notifyListeners();
  }, []);

  const toggleSavedWord = useCallback((word: WordPhonetic) => {
    const exists = globalState.savedWords.some((w) => w.word === word.word);
    const newSaved = exists
      ? globalState.savedWords.filter((w) => w.word !== word.word)
      : [...globalState.savedWords, word];
    globalState = { ...globalState, savedWords: newSaved };
    persistSavedWords(newSaved);
    notifyListeners();
  }, [persistSavedWords]);

  const removeSavedWord = useCallback((word: string) => {
    const newSaved = globalState.savedWords.filter((w) => w.word !== word);
    globalState = { ...globalState, savedWords: newSaved };
    persistSavedWords(newSaved);
    notifyListeners();
  }, [persistSavedWords]);

  const isSavedWord = useCallback((word: string) => {
    return globalState.savedWords.some((w) => w.word === word);
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
    isExtending: globalState.isExtending,
    error: globalState.error,
    setCurrentLesson,
    addSection,
    addRecentTopic,
    setApiKey,
    setSelectedVoice,
    setIsLoading,
    setIsExtending,
    setError,
    clearLesson,
    savedWords: globalState.savedWords,
    toggleSavedWord,
    removeSavedWord,
    isSavedWord,
  };
}

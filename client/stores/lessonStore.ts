import { useState, useCallback, useEffect } from "react";

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
} = {
  currentLesson: null,
  recentTopics: [],
  apiKey: "",
  selectedVoice: "alloy",
  isLoading: false,
  isExtending: false,
  error: null,
  version: 0,
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
  };
}

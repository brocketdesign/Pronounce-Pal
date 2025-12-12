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
  id: string;
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

function generateLessonId(): string {
  return `lesson_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

interface LessonStore {
  currentLesson: Lesson | null;
  currentLessonIndex: number;
  lessonsForTopic: Lesson[];
  lessonCache: Map<string, Lesson[]>;
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
  switchToLesson: (index: number) => void;
  getLessonsForCurrentTopic: () => Lesson[];
  addNewLessonToCache: (lesson: Lesson) => void;
  generateLessonId: () => string;
}

let globalState: {
  currentLesson: Lesson | null;
  currentLessonIndex: number;
  lessonCache: Map<string, Lesson[]>;
  recentTopics: string[];
  apiKey: string;
  selectedVoice: VoiceOption;
  isLoading: boolean;
  isExtending: boolean;
  error: string | null;
  version: number;
} = {
  currentLesson: null,
  currentLessonIndex: 0,
  lessonCache: new Map(),
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
    if (lesson) {
      const topic = lesson.topic.toLowerCase();
      const existingLessons = globalState.lessonCache.get(topic) || [];
      const existingIndex = existingLessons.findIndex(l => l.id === lesson.id);
      
      if (existingIndex === -1) {
        const updatedLessons = [...existingLessons, lesson];
        globalState.lessonCache.set(topic, updatedLessons);
        globalState = { 
          ...globalState, 
          currentLesson: lesson,
          currentLessonIndex: updatedLessons.length - 1
        };
      } else {
        existingLessons[existingIndex] = lesson;
        globalState.lessonCache.set(topic, existingLessons);
        globalState = { 
          ...globalState, 
          currentLesson: lesson,
          currentLessonIndex: existingIndex
        };
      }
    } else {
      globalState = { ...globalState, currentLesson: null, currentLessonIndex: 0 };
    }
    notifyListeners();
  }, []);

  const addNewLessonToCache = useCallback((lesson: Lesson) => {
    const topic = lesson.topic.toLowerCase();
    const existingLessons = globalState.lessonCache.get(topic) || [];
    const updatedLessons = [...existingLessons, lesson];
    globalState.lessonCache.set(topic, updatedLessons);
    globalState = { 
      ...globalState, 
      currentLesson: lesson,
      currentLessonIndex: updatedLessons.length - 1
    };
    notifyListeners();
  }, []);

  const switchToLesson = useCallback((index: number) => {
    if (!globalState.currentLesson) return;
    
    const topic = globalState.currentLesson.topic.toLowerCase();
    const lessons = globalState.lessonCache.get(topic) || [];
    
    if (index >= 0 && index < lessons.length) {
      globalState = {
        ...globalState,
        currentLesson: lessons[index],
        currentLessonIndex: index
      };
      notifyListeners();
    }
  }, []);

  const getLessonsForCurrentTopic = useCallback(() => {
    if (!globalState.currentLesson) return [];
    const topic = globalState.currentLesson.topic.toLowerCase();
    return globalState.lessonCache.get(topic) || [];
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
    
    const updatedLesson = {
      ...globalState.currentLesson,
      sections: [...globalState.currentLesson.sections, section],
    };
    
    const topic = updatedLesson.topic.toLowerCase();
    const existingLessons = globalState.lessonCache.get(topic) || [];
    const lessonIndex = existingLessons.findIndex(l => l.id === updatedLesson.id);
    
    if (lessonIndex !== -1) {
      existingLessons[lessonIndex] = updatedLesson;
      globalState.lessonCache.set(topic, existingLessons);
    }
    
    globalState = {
      ...globalState,
      currentLesson: updatedLesson,
    };
    
    console.log("Updated sections count:", globalState.currentLesson?.sections?.length);
    console.log("Notifying listeners...");
    notifyListeners();
  }, []);

  const clearLesson = useCallback(() => {
    globalState = { ...globalState, currentLesson: null, currentLessonIndex: 0, error: null };
    notifyListeners();
  }, []);

  const lessonsForTopic = globalState.currentLesson 
    ? (globalState.lessonCache.get(globalState.currentLesson.topic.toLowerCase()) || [])
    : [];

  return {
    currentLesson: globalState.currentLesson,
    currentLessonIndex: globalState.currentLessonIndex,
    lessonsForTopic,
    lessonCache: globalState.lessonCache,
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
    switchToLesson,
    getLessonsForCurrentTopic,
    addNewLessonToCache,
    generateLessonId,
  };
}

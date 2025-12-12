# SpeakEasy - English Pronunciation Learning App

## Overview
SpeakEasy is a mobile application that helps users improve their English pronunciation. Users can select a topic, and the app uses AI (OpenAI GPT-4) to generate a paragraph about that topic along with phonetic transcriptions (IPA) for each word.

## Current State
- **Version**: 1.0.0
- **Platform**: Expo React Native (iOS, Android, Web)
- **Status**: MVP Complete - Frontend prototype with backend AI integration

## Project Architecture

### Frontend (Expo/React Native)
- **Navigation**: React Navigation 7 with bottom tabs
  - Home Tab: Topic selection and browsing
  - Learn Tab: Active lesson display with interactive phonetics
  - Settings Tab: API key configuration

- **Screens**:
  - `HomeScreen`: Topic grid with search, recent lessons
  - `LearnScreen`: Paragraph display with tap-to-reveal phonetics
  - `SettingsScreen`: OpenAI API key configuration
  - `GenerateLessonScreen`: Modal for lesson generation
  - `WordsListScreen`: Modal for vocabulary list

- **State Management**: Custom in-memory store (`useLessonStore`)

### Backend (Express.js)
- **Endpoint**: `POST /api/generate-lesson`
  - Accepts topic and API key
  - Generates paragraph and phonetic vocabulary using OpenAI GPT-4

## Key Features
1. Topic-based lesson generation (Travel, Business, Daily Life, etc.)
2. AI-generated paragraphs using OpenAI
3. IPA phonetic transcriptions for vocabulary
4. Tap-to-reveal phonetics on words
5. User-provided API key support
6. Audio playback with intelligent caching (instant replay without new API requests)
7. Multiple lessons per topic with seamless switching
8. Automatic cache reset when voice selection changes

## Design System
- **Colors**: Deep Blue primary (#2563EB), Purple secondary (#7C3AED)
- **Style**: iOS 26 Liquid Glass inspired UI
- **Typography**: System fonts with monospace for phonetics

## How to Run
1. Add your OpenAI API key in Settings
2. Select a topic from Home screen
3. View generated lesson in Learn tab
4. Tap words to see pronunciation

## Tech Stack
- Expo SDK 54
- React Navigation 7
- React Native Reanimated
- Express.js backend
- OpenAI API

## Recent Changes
- December 2024: Initial MVP created with all core features

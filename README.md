# Pronounce Pal

An Expo (React Native) app for practising English pronunciation: it generates short topic-based reading passages with IPA transcriptions using OpenAI and reads them aloud with OpenAI text-to-speech. In `app.json` the app is named "SpeakEasy".

## What it does

- Home screen with eight topics (Travel, Business, Daily Life, Technology, Food, Health, Education, Entertainment), a search box and a list of recent topics.
- Before generating, the user can narrow a topic with focus tags (for example Airports or Hotels for Travel) and free-text details.
- The API server asks GPT-4o for a 3-5 sentence paragraph plus 15-20 key words with IPA transcriptions, then parses the reply into `{ paragraph, words }`.
- Learn screen: tap a word to see its IPA or show all transcriptions at once, extend the lesson with a new paragraph on the same topic, and create or switch between several lessons per topic.
- Audio for the whole lesson, one paragraph or one word through OpenAI `tts-1`, with six selectable voices. Clips are cached for the session and the cache is cleared when the voice changes.
- Word list screen with each key word, its IPA and a play button.
- Settings screen with voice samples and a field to enter and test an OpenAI API key (see Status).

## Tech stack

- Expo SDK 54, React Native 0.81, React 19.1, TypeScript
- React Navigation 7 (native stack and bottom tabs), Reanimated, expo-audio, expo-haptics
- Express 4 API server using the OpenAI Node SDK (chat completions and speech)
- Targets iOS and Android through Expo Go, plus web through react-native-web

## Getting started

### Prerequisites

- Node.js 20+
- An OpenAI API key
- Expo Go on a phone, or an iOS simulator, Android emulator or browser

### Install

```bash
npm install
```

### Environment variables

| Name | Meaning |
| --- | --- |
| `OPENAI_API_KEY` | Server-side key used for lesson generation and text-to-speech |
| `PORT` | API server port (default `5000`) |
| `EXPO_PUBLIC_DOMAIN` | Host (and port) of the API server; the app always calls `https://<EXPO_PUBLIC_DOMAIN>` |
| `REPLIT_DEV_DOMAIN` | Replit dev URL; used by the `expo:dev` script and allowed as a CORS origin |
| `REPLIT_DOMAINS` | Comma-separated extra CORS origins for Replit deployments |
| `REPLIT_INTERNAL_APP_DOMAIN` | Base URL written into the static Expo Go build by `expo:static:build` |
| `DATABASE_URL` | Only used by `npm run db:push`; the app itself does not use a database |

### Run

On Replit the scripts work as they are:

```bash
npm run all:dev            # Expo dev server + API server
npm run server:dev         # API server only (tsx)
npm run expo:dev           # Expo dev server only
```

Outside Replit, start the API server with `OPENAI_API_KEY` exported, then start Expo with `EXPO_PUBLIC_DOMAIN` pointing at it, for example `EXPO_PUBLIC_DOMAIN=<api-host> npx expo start`. Because the client always uses HTTPS, the API must be reachable over HTTPS (a tunnel works), or `getApiUrl()` in `client/lib/query-client.ts` has to be changed. On macOS, remove `reusePort: true` from `server/index.ts` if the server fails with `listen ENOTSUP`.

Other scripts:

```bash
npm run expo:static:build  # build static Expo Go bundles into static-build/
npm run server:build       # bundle the server into server_dist/
npm run server:prod        # run the bundled server
npm run lint               # expo lint
npm run check:types        # tsc --noEmit
```

## Project structure

```
client/
  navigation/            root stack (customize, generate, word list) and tabs (Home, Learn, Settings)
  screens/               Home, TopicCustomization, GenerateLesson, Learn, WordsList, Settings
  stores/lessonStore.ts  in-memory lessons, recent topics, selected voice and API key
  lib/query-client.ts    API base URL and request helpers
  components/ hooks/ constants/   themed UI building blocks
server/
  index.ts               Express setup, CORS, Expo manifest and landing-page routing
  routes.ts              /api/generate-lesson, /api/extend-lesson, /api/text-to-speech
  templates/             landing page with a QR code for Expo Go
scripts/build.js         static Expo Go build
assets/                  icons and splash images
```

## Status

Prototype built on Replit. The topic-to-lesson-to-audio flow is implemented end to end. Last commit: December 2025.

- Lessons, recent topics and settings are kept in memory and are lost when the app reloads.
- The API key entered in Settings is only used to test the key against OpenAI. Lesson generation and speech always use the server's `OPENAI_API_KEY`.
- `drizzle.config.ts`, `shared/schema.ts` and `server/storage.ts` are unused leftovers from the Replit template.
- The privacy and terms links in Settings point to placeholder URLs.
- There are no automated tests.

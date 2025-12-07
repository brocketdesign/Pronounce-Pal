# English Pronunciation Learning App - Design Guidelines

## Architecture Decisions

### Authentication
**No Authentication Required**
- This is a utility/learning app with local data storage
- Include a **Settings screen** with:
  - User display name field (e.g., "Learner Name")
  - OpenAI API key configuration (stored securely in AsyncStorage)
  - App preferences (theme, text size)
  - Privacy policy & terms of service links

### Navigation Structure
**Tab Navigation (3 tabs)**
- Tab 1: **Home** - Topic selection and recent lessons
- Tab 2: **Learn** (center) - Active lesson with paragraph and phonetics
- Tab 3: **Settings** - API key configuration and preferences

### Screen Specifications

#### 1. Home Screen
- **Purpose**: Browse and select learning topics, access recent lessons
- **Layout**:
  - Transparent header with "English Pronunciation" title
  - Search bar below header for topic filtering
  - Main content: Scrollable grid of topic cards (2 columns)
  - Top safe area inset: headerHeight + Spacing.xl
  - Bottom safe area inset: tabBarHeight + Spacing.xl
- **Components**:
  - Topic cards with category icons (Feather icons): Travel (globe), Business (briefcase), Daily Life (home), Technology (cpu), Food (coffee), etc.
  - Each card shows topic name and brief description
  - "Recent Lessons" section at bottom with horizontal scrollable list
- **Interaction**: Tap card → Navigate to lesson generation

#### 2. Lesson Generation Screen (Modal)
- **Purpose**: Generate AI paragraph for selected topic
- **Layout**:
  - Standard navigation header with close button (X) on left
  - Title: Selected topic name
  - Main content: Centered loading state or form
  - Safe area insets: default with modal presentation
- **Components**:
  - Loading indicator with "Generating your lesson..." text
  - Error state with retry button if API fails
  - Success → Auto-navigate to Learn screen
- **Interaction**: Automatic generation on mount, manual retry on error

#### 3. Learn Screen
- **Purpose**: Read generated paragraph with phonetic annotations
- **Layout**:
  - Transparent header with topic name as title, right button: "Words List" icon (list)
  - Main content: Scrollable view
  - Top safe area inset: headerHeight + Spacing.xl
  - Bottom safe area inset: tabBarHeight + Spacing.xl
- **Components**:
  - Section 1: Generated paragraph with large, readable text
  - Each word is tappable to reveal phonetic pronunciation below it
  - Visual indicator (subtle underline) shows tappable words
  - Section 2: "Key Vocabulary" header with word count badge
  - Horizontal chip list of challenging words that scroll to their position in paragraph when tapped
- **Interaction**:
  - Tap word → Show phonetic transcription in IPA beneath word with fade-in animation
  - Tap again → Hide phonetics
  - Tap vocabulary chip → Scroll to and highlight that word in paragraph

#### 4. Words List Screen (Modal)
- **Purpose**: View all words with phonetic pronunciations in a dedicated list
- **Layout**:
  - Standard navigation header with "Vocabulary" title, close button on right
  - Main content: Scrollable list of word cards
  - Safe area insets: default with modal presentation
- **Components**:
  - List items with:
    - Word in large text (left)
    - Phonetic transcription in secondary text below
    - Optional audio playback icon (volume-2) on right (placeholder for future feature)
  - Search bar in header to filter words
  - Alphabetical section headers
- **Interaction**: Scroll to browse, search to filter

#### 5. Settings Screen
- **Purpose**: Configure API key and app preferences
- **Layout**:
  - Default navigation header with "Settings" title
  - Scrollable form layout
  - Top safe area inset: Spacing.xl (default header)
  - Bottom safe area inset: tabBarHeight + Spacing.xl
- **Components**:
  - Section 1: "OpenAI Configuration"
    - API Key input field (secure text entry with show/hide toggle)
    - Help text: "Your key is stored securely on your device"
    - "Test Connection" button
  - Section 2: "Preferences"
    - Text size slider (Small, Medium, Large)
    - Theme toggle (Light/Dark)
  - Section 3: "About"
    - App version
    - Privacy policy link
    - Terms of service link
- **Interaction**: Form inputs auto-save on change, test button validates API key

## Design System

### Color Palette
**Primary**: Deep Blue (#2563EB) - Trust, learning, clarity
**Secondary**: Warm Purple (#7C3AED) - Creativity, engagement
**Success**: Green (#10B981) - Correct pronunciation, completion
**Error**: Red (#EF4444) - Mistakes, API errors
**Background**: 
- Light mode: Off-white (#F9FAFB)
- Dark mode: Dark gray (#111827)
**Surface**: 
- Light mode: White (#FFFFFF)
- Dark mode: Dark surface (#1F2937)
**Text**:
- Primary: Near-black (#1F2937) / Off-white (#F9FAFB)
- Secondary: Gray (#6B7280) / Light gray (#9CA3AF)
- Phonetic text: Purple tint (#8B5CF6) for distinction

### Typography
**Paragraph Text**: 18-20pt, line height 1.6, serif font (Georgia or system serif) for readability
**Phonetic Text**: 14-16pt, monospace font for IPA clarity
**Word List**: 16-18pt for words, 14pt for phonetics
**Headers**: 24-28pt, bold, sans-serif
**Body Text**: 16pt, regular, sans-serif

### Visual Design
- **Topic Cards**: Rounded corners (12px), subtle elevation, icon + text layout, tap scales to 0.98
- **Tappable Words**: Subtle underline (1px, primary color, 20% opacity), tap reveals phonetics with slide-down animation
- **Active Word Highlight**: Light purple background (primary color, 10% opacity) with 8px padding
- **Vocabulary Chips**: Pill-shaped, outlined style, tap navigates with haptic feedback
- **API Key Input**: Secure entry with eye icon toggle, monospace font for key display
- **Floating Action**: None required for this app
- **All Touchables**: 44pt minimum tap target, visual feedback on press (opacity 0.7)

### Critical Assets
- **Topic Category Icons**: Use Feather icons from @expo/vector-icons
  - Travel: "globe"
  - Business: "briefcase"
  - Daily Life: "home"
  - Technology: "cpu"
  - Food: "coffee"
  - Health: "heart"
  - Education: "book-open"
  - Entertainment: "film"

**No additional custom assets required** - the app relies on clear typography, system icons, and generated text content.

### Accessibility Requirements
- Phonetic text must have high contrast ratio (4.5:1 minimum)
- All interactive elements have 44pt minimum touch targets
- VoiceOver support for word-by-word navigation
- Dynamic text size support (respect system text size settings)
- Color-blind friendly: Don't rely solely on color to convey phonetic information
- Haptic feedback on word selection for tactile learners
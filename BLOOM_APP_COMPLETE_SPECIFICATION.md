# BLOOM WORKOUT TRACKER - COMPLETE SPECIFICATION

## APPLICATION OVERVIEW

Bloom is a comprehensive fitness tracking web application designed as a mobile-first PWA (Progressive Web App) that helps users log workouts, track progress, and manage their training splits. All data is stored locally on the device using IndexedDB for complete offline functionality. The app supports custom exercises, muscle groups, workout splits, body weight tracking, and demonstration videos/images for exercise form.

**Tech Stack:**
- Next.js 16 (React 19, App Router)
- TypeScript
- Tailwind CSS 4 with CVA (class-variance-authority)
- IndexedDB (via idb library) for local data persistence
- Capacitor for native mobile apps (Android/iOS)
- Lucide React icons
- Sonner for toast notifications
- Recharts for charts/visualizations
- shadcn/ui component library (base-ui variant)

---

## DATA STRUCTURES & TYPES

### MuscleGroup
```
- id: string (UUID)
- name: string (e.g., "Chest", "Back", "Legs")
- color: number (0-4, maps to chart colors for visual grouping)
- order: number (for sorting)
```

### Exercise
```
- id: string (UUID)
- muscleGroupId: string (foreign key to MuscleGroup)
- name: string (e.g., "Barbell Bench Press")
- notes?: string (optional notes for the exercise)
- hasVideo?: boolean (whether on-device demo exists)
- videoUrl?: string (external YouTube/Instagram link)
- bodyweight?: boolean (true for exercises like pull-ups, push-ups with no weight)
- order: number (for sorting within muscle group)
- variantOf?: string (if this is a variant of another exercise)
- mainVariantId?: string (if this is the main exercise leading a variant group)
- variantGroupName?: string (e.g., "Bench Press variations")
- variantGroupNote?: string (shared note for variant group)
- variantNote?: string (individual variant-specific note)
```

### ExerciseVideo
```
- id: string (same as exerciseId)
- exerciseId: string
- blob: Blob (the actual file - image or video)
- fileName: string (original filename with extension)
- addedAt: number (timestamp in ms)
```

### WorkoutSet
```
- reps: number (repetitions performed)
- weight: number (weight used)
- unit?: "kg" | "lbs" (weight unit, defaults to kg)
- isDropset?: boolean (whether this was a dropset - lighter weight with continued reps)
```

### LogEntry
```
- id: string (UUID)
- date: string (YYYY-MM-DD format, the day the exercise was logged)
- exerciseId: string (foreign key)
- muscleGroupId: string (denormalized for performance)
- sets: WorkoutSet[] (array of sets performed)
- note?: string (optional session note)
- createdAt: number (timestamp when logged, ms)
```

### SplitDay
```
- id: string (UUID)
- name: string (e.g., "Leg Day", "Push", "Pull")
- muscleGroupIds: string[] (muscle groups targeted on this day)
- exerciseIds: string[] (exercises to perform on this day)
- isRest?: boolean (marks this as a dedicated rest day)
```

### WorkoutSplit
```
- id: string (UUID)
- name: string (e.g., "Glutes & Strength 4-Day")
- description?: string (optional description)
- days: SplitDay[] (array of days in the split)
- createdAt: number (timestamp, ms)
```

### BodyWeightEntry
```
- date: string (YYYY-MM-DD, used as key)
- weight: number
- createdAt: number (timestamp, ms)
```

### Settings
```
- key: string (setting name)
- value: unknown (any value type)
```

---

## DATABASE (IndexedDB)

**Database Name:** "bloom-fitness"
**Version:** 2

### Object Stores:

1. **muscleGroups** - Key: id
2. **exercises** - Key: id, Indexes: byMuscleGroup
3. **videos** - Key: id, Indexes: byExercise
4. **logs** - Key: id, Indexes: byDate, byExercise
5. **splits** - Key: id
6. **settings** - Key: key
7. **bodyWeights** - Key: date

**Key DB Functions:**
- `getMuscleGroups()`, `putMuscleGroup()`, `deleteMuscleGroup()`
- `getExercises()`, `putExercise()`, `deleteExercise()`
- `putVideo()`, `getVideo()`, `deleteVideo()`
- `getLogsByDate()`, `getLogsByExercise()`, `getAllLogs()`, `getMostRecentLog()`, `getLatestLogForExercise()`, `putLog()`, `deleteLog()`
- `getSplits()`, `putSplit()`, `deleteSplit()`
- `getBodyWeight()`, `putBodyWeight()`, `deleteBodyWeight()`, `getBodyWeights()`
- `getSetting()`, `setSetting()`
- `getBackupData()`, `restoreBackup()` (for full export/import)
- `getStorageEstimate()` (returns storage quota/usage)

---

## SCREENS & NAVIGATION

The app has 4 main screens accessible via bottom navigation bar:

### 1. LOG SCREEN (Default)
**Purpose:** Track workouts for a selected date

**Components:**
- **Calendar (Month Calendar):** Shows full month view or compact single-row view. Selected date is highlighted. Dates with logged exercises show dot indicators.
- **Split Day Selector:** If an active split is set, user can choose which split day is scheduled for the selected date
- **Body Weight Card:** Shows body weight for the selected date with quick add/edit button
- **Day Logs:** Lists all exercises logged for the selected date in chronological order (by createdAt)
  - Each log entry shows: muscle group badge, exercise name, sets (in format "3 x 8 @ 60kg"), demo media link if available
  - Expandable history via "History" link
  - Expandable demo media section via "View form media" link (shows image or video based on uploaded file)
  - Edit button to modify the log entry
  - Delete button with confirmation
- **Empty State:** "No exercises logged today" with CTA to log first exercise
- **+ Log Button:** Opens LogEntryDialog to add new exercise for selected date

**Key Features:**
- Calendar can be toggled between full month and compact single-row view (preference saved)
- Split day selection persisted per date (can assign "Leg Day" to a specific date)
- Demonstrates selected exercise form via image or video
- Quick access to exercise history

---

### 2. EXERCISES SCREEN
**Purpose:** Browse and manage all exercises, view form demonstrations

**Components:**
- **Muscle Group Tabs:** Horizontal scrolling tabs for each muscle group (color-coded)
- **Exercise List:** Grid/list of exercises grouped by muscle group
  - Each exercise shows: name, order number, demo media indicator (camera icon)
  - Camera icon opens VideoDialog for that exercise
- **Empty State:** "No exercises in this group"

**Key Features:**
- Filter exercises by muscle group
- Quick access to exercise demo videos/images
- Visual grouping by color (based on muscle group)

---

### 3. SPLITS SCREEN
**Purpose:** Create and manage workout splits

**Components:**
- **Active Split Display:** Shows currently active split with its days
- **Split Editor:** Add/edit/delete splits and their days
  - Assign muscle groups and exercises to each day
  - Mark days as "Rest" days
- **Split Day Cards:** Show name, muscle groups, exercise count

**Key Features:**
- Create custom splits (e.g., "Push/Pull/Legs", "Upper/Lower", etc.)
- Assign specific muscle groups to each day
- Mark rest days
- Activate/switch between splits
- Used on Log Screen to restrict exercise choices by split day

---

### 4. PROGRESS SCREEN
**Purpose:** View training progress and statistics

**Components:**
- **Exercise Session Comparison:** Compare two workouts of the same exercise
- **Exercise History Dashboard:** Visual charts showing exercise progression
  - Line charts for weight progression
  - Rep count trends
  - Volume (weight × reps) progression
  - Last session reference

**Key Features:**
- Track strength gains over time
- Visualize volume progression
- Compare sessions side-by-side
- See personal records

---

## MAIN COMPONENTS

### AppShell
**Purpose:** Main application container, manages screen state and navigation

**Features:**
- Routes between Log, Exercises, Splits, Progress screens
- Bottom navigation bar for screen switching
- Settings button (top-right)
- Responsive mobile-first layout

---

### LogEntryDialog
**Purpose:** Modal for logging/editing a workout entry

**Functionality:**
- **Exercise Selection:** Browse and select exercises (optionally filtered by active split day)
- **Set Entry:** Add multiple sets with reps, weight, unit, dropset flag
  - Prefill from last session (auto-load preference: first/last/off)
  - Inline set editing with reps/weight spinners
  - Set deletion
- **Muscle Group Assignment:** Auto-selected from exercise but can be changed
- **Notes:** Optional note for the session
- **Auto-fill Features:**
  - Suggests next reps (last session reps or auto-increment by 1)
  - Pre-fills weight from last session
  - Shows exercise history in collapsible section
  - Shows exercise demo media inline
- **Save/Cancel:** 
  - Validates at least 1 rep or weight entered
  - Creates or updates log entry
  - Syncs to database

---

### VideoDialog
**Purpose:** Modal for uploading/managing exercise demo media

**Functionality:**
- **File Upload:** 
  - Accept image files (.jpg, .png, .gif, .webp, etc.) OR video files
  - File size validation (max 500MB)
  - Upload stores on-device via IndexedDB
- **Display:**
  - Images: Shows as plain image without video controls
  - Videos: Shows video player with controls (play, pause, progress, volume, fullscreen)
- **External Link:** 
  - Paste YouTube or Instagram link
  - Link is stored on the exercise record (videoUrl field)
- **Delete:** 
  - With confirmation dialog
  - Undo option with 5-second window
- **Text Labels:** Updated to use "Demo media" instead of "video" to reflect image + video support
  - "Hide form media" / "View form media" buttons
  - "Demo link" instead of "Video link"
  - "Demo media no longer available" when file is missing

---

### InlineFormVideo
**Purpose:** Inline display of exercise demo media within log forms

**Functionality:**
- **Display Logic:**
  - Check for on-device video first
  - Fall back to external link if no on-device file
  - Show "no demo" placeholder if neither exists
- **Media Type Detection:** Automatically detects if file is image or video based on extension
  - Images (.jpg, .png, .gif, .webp, .heic, .svg): Rendered as `<img>` without controls
  - Videos: Rendered as `<video>` with controls
- **Lazy Load:** Only loads when viewing form

---

### BodyWeightCard
**Purpose:** Quick body weight logging

**Functionality:**
- Shows weight for selected date
- Click to edit
- Quick add new weight button
- Inline edit with input field
- Weight unit selector (kg/lbs)

---

### MonthCalendar
**Purpose:** Calendar navigation and date selection

**Functionality:**
- Full month view with all dates
- Toggleable compact single-row view
- Dots on dates with logged exercises
- Selected date highlighted
- Navigation between months

---

### ExerciseHistoryDashboard
**Purpose:** Display exercise history and progression charts

**Functionality:**
- Lists all past sessions for an exercise
- Shows sets, weight, reps for each session
- Displays trend lines
- Volume calculation (weight × reps × sets)

---

### SessionComparison
**Purpose:** Side-by-side comparison of two workout sessions

**Functionality:**
- Select two dates/sessions
- Compare sets, weight, reps
- Show differences and improvements

---

### SettingsDialog
**Purpose:** App configuration and backup

**Functionality:**
- **Preferences:**
  - Weight unit (kg/lbs)
  - Auto-load set preference (first/last/off)
  - Skip muscle group when split active (show all or just split exercises)
- **Backup/Restore:**
  - Export all data (except videos) as JSON
  - Import previously exported data
  - Download video files separately
  - Restore complete backup
- **Storage Info:** Show storage usage and quota
- **Reset Options:** Clear all data with confirmation

---

### ConfirmDialog
**Purpose:** Confirmation for destructive actions

**Functionality:**
- Custom title and description
- Confirm/Cancel buttons
- Returns promise (await confirmation)
- Used for: delete log, delete video, reset data, etc.

---

### DataProvider (Context)
**Purpose:** Global app state management

**State Provided:**
- `muscleGroups`: All muscle groups
- `exercises`: All exercises
- `splits`: All workout splits
- `activeSplitId`: Currently selected split
- `weightUnit`: kg or lbs
- `skipGroupWhenSplit`: Boolean flag
- `ready`: Boolean (data loaded)
- `goal`: String (optional workout goal)
- `appName`: String (app branding)

**Features:**
- Loads all data on mount
- Persists preferences to settings
- Allows global state updates
- Refetch capability

---

## KEY FLOWS

### Log a Workout
1. User selects date on calendar (Log Screen)
2. Optionally selects split day (restricts exercise choices)
3. Clicks "+ Log" button
4. LogEntryDialog opens
5. User selects exercise
6. System shows last session prefilled (if auto-load enabled)
7. User enters reps/weight for each set
8. User adds more sets or clicks "Save Set"
9. Dialog closes, log appears in day logs list
10. Data synced to IndexedDB

### Upload Exercise Demo
1. User navigates to Exercises screen
2. Clicks camera icon on exercise
3. VideoDialog opens
4. User clicks "Add file" button
5. File picker opens
6. User selects image or video file
7. File validated (type, size)
8. File stored as Blob in IndexedDB
9. Exercise record updated (hasVideo: true)
10. Demo now displays in form logs

### View Exercise Progress
1. User navigates to Progress screen
2. Selects exercise (via dropdown or list)
3. System retrieves all logs for that exercise
4. Renders charts:
   - Weight progression line chart
   - Rep count progression
   - Volume progression
5. Shows last session stats for reference

### Manage Splits
1. User navigates to Splits screen
2. Creates new split (or edits existing)
3. Adds days (e.g., "Chest", "Back", "Legs")
4. Assigns muscle groups to each day
5. Assigns specific exercises to each day
6. Activates split
7. On Log screen, split days now appear in selector

### Backup & Restore
1. User opens Settings
2. Clicks "Export Backup"
3. All data (except video blobs) downloaded as JSON
4. User can then:
   - Download videos separately (each as .mp4 or .jpg)
   - Move files to new device or store securely
5. On new device:
   - Import JSON backup
   - Re-upload video files
   - All data restored

---

## UI/UX DETAILS

### Color Scheme
- **Primary:** Blue (for interactive elements, CTAs)
- **Accent:** Salmon/coral (for positive actions)
- **Destructive:** Red (for delete/dangerous actions)
- **Muscle Group Colors:** 5-color palette mapped to muscle groups for visual grouping
- **Background:** Dark mode support via next-themes

### Typography
- **Font:** Geist (sans) and Geist Mono (for code)
- **Headings:** Bold, larger font sizes
- **Body:** Regular weight, readable line-height

### Layout
- **Mobile-first:** Responsive design, optimized for small screens
- **Grid/Flex:** Flexbox for most layouts, CSS Grid where appropriate
- **Spacing:** Consistent rem-based spacing (via Tailwind scale)
- **Responsive Breakpoints:** sm (640px), md (768px), lg (1024px)

### Interactive Elements
- **Buttons:** Raised style with hover effects, loading states
- **Input Fields:** Clean, minimal design with clear focus states
- **Modals:** Backdrop blur, centered, overlay
- **Cards:** Subtle shadows, rounded corners
- **Icons:** Lucide React icons (20-24px typical size)
- **Animations:** Smooth transitions, fade-ins (respects prefers-reduced-motion)

### Mobile-Specific Features
- **Bottom Navigation:** Fixed bottom bar with 4 tabs
- **Touch-Friendly:** Large tap targets (min 44px)
- **Offline Support:** Works completely offline via PWA/service worker
- **Native Feel:** Capacitor integration for Android/iOS

---

## FEATURES & EDGE CASES

### Exercise Management
- **Variants:** Exercises can be grouped as variants (e.g., Dumbbell vs Barbell Bench)
  - Main variant shows group name and optional group note
  - Individual variants show variant-specific notes
- **Bodyweight:** Mark exercises as bodyweight (no weight recorded, only reps)
- **Ordering:** Custom exercise order within muscle groups

### Set Tracking
- **Dropsets:** Mark sets as dropsets (lighter weight with continued reps)
- **Unit Selection:** Enter weight in kg or lbs per set
- **Auto-increment:** Suggested next rep count can auto-increment

### Split Management
- **Rest Days:** Mark specific days as rest (no exercises logged)
- **Muscle Group Restriction:** When split day selected, only show exercises from that group
- **Exercise Restriction:** Can assign specific exercises to split days

### Data Persistence
- **IndexedDB Limits:** Handle storage quota gracefully
- **Large Files:** Support large video files (up to 500MB per video)
- **Backup/Restore:** Export all data + video files, restore completely

### Error Handling
- **File Upload Errors:**
  - File type validation (image or video only)
  - File size validation (max 500MB)
  - Storage quota exceeded handling
- **Database Errors:**
  - Try-catch blocks on all async DB operations
  - User-friendly error messages via toast
  - Error logging to console for debugging
- **Network:** Works completely offline, no network calls needed

### Edge Cases Handled
- **Date Validation:** YYYY-MM-DD format strict
- **Empty States:** All screens show appropriate empty states
- **Multiple Sets Per Session:** Support logging 10+ sets
- **Split Conflicts:** If split day assigned but exercises deleted, gracefully show empty
- **Video File Detection:** Extension-based detection (.jpg, .png, .mp4, etc.) for image vs video
- **Rapid Updates:** Debounce/batch database writes where needed
- **Browser Back Button:** Properly managed modal/screen state

---

## TECHNICAL IMPLEMENTATION NOTES

### State Management
- **Context API:** DataProvider for global state (exercises, splits, settings)
- **Local State:** useState for screen-specific state (selectedDate, logs, etc.)
- **Persistence:** Settings stored in IndexedDB, loaded on app start

### Async Operations
- **Promises:** All DB operations return promises
- **Error Handling:** Try-catch blocks with user feedback
- **Loading States:** Boolean flags for ongoing operations

### Performance Optimizations
- **Memoization:** useMemo for expensive computations (filtering, sorting)
- **Lazy Loading:** Videos/images only load when needed
- **Indexing:** DB indexes on frequently queried fields (date, exerciseId, muscleGroupId)
- **Caching:** Memoized DOM calculations for calendar, logs

### Responsive Design
- **Mobile:** 320px+ (small phones)
- **Tablet:** 768px+ (landscape phones, tablets)
- **Desktop:** 1024px+ (large tablets, desktops)

### Accessibility
- **Semantic HTML:** Proper heading hierarchy, labels
- **ARIA:** Labels on buttons, dialogs, regions
- **Keyboard Navigation:** All interactive elements keyboard accessible
- **Screen Readers:** Text alternatives for icons
- **Color Contrast:** WCAG AA compliance

### PWA Features
- **Manifest:** Web manifest for installability
- **Service Worker:** Offline support via Capacitor
- **Icons:** Multiple sizes for home screen

### Browser Support
- **Modern Browsers:** Chrome, Firefox, Safari, Edge (latest versions)
- **Mobile Browsers:** iOS Safari, Chrome Mobile, Samsung Internet
- **IndexedDB:** Supported in all modern browsers

---

## SETUP & DEPLOYMENT

### Prerequisites
- Node.js 18+
- pnpm (or npm/yarn)

### Installation
```bash
npm install  # or pnpm install
```

### Development
```bash
npm run dev  # or pnpm dev
```
Opens http://localhost:3000

### Production Build
```bash
npm run build
npm start
```

### Android Build (via Capacitor)
```bash
npm run build:android
```

### Tech Stack Summary
- **Framework:** Next.js 16 (React 19, TypeScript)
- **Styling:** Tailwind CSS 4 + CVA
- **UI Components:** shadcn/ui (base-ui variant)
- **Icons:** Lucide React
- **Database:** IndexedDB (via idb library)
- **Native Mobile:** Capacitor (for Android/iOS)
- **Notifications:** Sonner
- **Charts:** Recharts
- **Mobile App:** Can be built as native Android app via Capacitor

---

## FILES STRUCTURE

```
/app
  /layout.tsx           - Root layout with theme provider
  /page.tsx             - App shell/main entry
  /manifest.ts          - PWA manifest

/components
  /app-shell.tsx        - Main app container, navigation
  /app-icon.tsx         - App branding
  /bottom-nav.tsx       - Bottom navigation bar
  /body-weight-card.tsx - Body weight logging
  /confirm-dialog.tsx   - Confirmation modals
  /data-provider.tsx    - Global state context
  /log-entry-dialog.tsx - Workout logging modal
  /month-calendar.tsx   - Date picker calendar
  /inline-form-video.tsx - Demo media display in forms
  /video-dialog.tsx     - Upload/manage demo media
  /settings-dialog.tsx  - App settings
  /theme-provider.tsx   - Dark mode support
  
  /screens
    /log-screen.tsx     - Workout logging screen
    /exercises-screen.tsx - Exercise management
    /splits-screen.tsx   - Workout split management
    /progress-screen.tsx - Progress visualization
  
  /ui
    /button.tsx, /input.tsx, /dialog.tsx, etc. - shadcn components

/lib
  /db.ts                - IndexedDB operations
  /types.ts             - TypeScript interfaces
  /date.ts              - Date utilities
  /utils.ts             - General utilities (cn function, etc.)
```

---

## FINAL NOTES

This application is fully functional offline, with no external API dependencies. All workout data is stored locally on the user's device via IndexedDB. The app is designed as a mobile-first PWA that can be installed on home screen and works completely offline.

The codebase is well-structured with clear separation of concerns:
- **Components:** UI presentation layer
- **Screens:** Full-page components for each main view
- **Database (db.ts):** All data persistence operations
- **Types:** Centralized type definitions
- **Context:** Global state via DataProvider

All error handling includes try-catch blocks with user-friendly toast notifications. File uploads validate type and size. Database operations include proper error propagation.

The app is production-ready and can be deployed as a web app or built as native Android/iOS apps via Capacitor.

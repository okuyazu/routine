# Vita — a personal health & longevity tracker

Log your **labs**, **exercise**, **diet**, and **sleep**, and Vita combines all
four into a single **Health Score** and an **estimated life expectancy** — with
a fully transparent explanation of how the number is built.

Built with **React Native + Expo** (one codebase runs on iOS, Android, and web).

> **Not medical advice.** Vita is an educational tool. Its estimate is a
> transparent rule-of-thumb loosely based on public-health guidance (WHO
> activity targets, sleep-duration research, standard lab reference ranges). It
> **cannot** predict any individual's real lifespan. See a clinician for
> anything about your health.

---

## What it does

- **Four pillars, one score.** Labs, Exercise, Diet, and Sleep each get a
  0–100 score; together they produce an overall Health Score.
- **Life-expectancy estimate.** Each pillar nudges a baseline life expectancy
  (set by sex) up or down. The dashboard shows the estimate and the net change.
- **Lab ranges built in.** Blood pressure, cholesterol (total/LDL/HDL),
  triglycerides, fasting glucose, HbA1c, and resting heart rate are each
  compared to their optimal range. BMI is derived from your profile.
- **Personalized insights.** The Insights screen ranks your biggest wins and
  explains, pillar by pillar, exactly how the estimate was calculated.
- **Private by default.** Everything is stored on your device (AsyncStorage).
  Nothing is uploaded.

---

## Run it

You do **not** need Xcode or Android Studio to try it on your phone.

1. **Install Node.js** (v18+): https://nodejs.org
2. **Install "Expo Go"** on your phone (App Store / Play Store).
3. In this folder:
   ```bash
   npm install
   npx expo start
   ```
4. Scan the **QR code** with your iPhone Camera (iOS) or the Expo Go app
   (Android). To try it in a browser instead, run `npx expo start --web`.

---

## How the project is organized

```
App.tsx                     App entry point: navigation + global state provider
index.ts                    Registers App.tsx with Expo (don't need to touch)
app.json                    App name, icon, and configuration

src/
  health.ts                 ⭐ The scoring "brain": pillar scores + life-expectancy model
  HealthContext.tsx         Global state: all logged data + add/remove + derived summary
  storage.ts                Saves everything on the device (AsyncStorage)
  types.ts                  Data shapes (Profile, LabEntry, ExerciseEntry, …)
  ui.tsx                    Shared inputs/buttons/cards used by the logging screens
  theme.ts                  Colors, spacing, font sizes — restyle the app here
  navigation.ts             The list of screens and what data each needs

screens/
  DashboardScreen.tsx       Overview: Health Score + life-expectancy estimate + pillars
  LabsScreen.tsx            Log blood/vitals markers; see each vs. its optimal range
  ExerciseScreen.tsx        Log workouts (activity, minutes, intensity)
  DietScreen.tsx            Log a daily diet snapshot (quality, fruit/veg, sugar, alcohol)
  SleepScreen.tsx           Log a night's sleep (hours, quality)
  ProfileScreen.tsx         Age, sex, height, weight (sets baseline + BMI)
  InsightsScreen.tsx        Top wins + a transparent breakdown of the estimate
```

### The core loop

```
Logging screen  →  addLab / addExercise / addDiet / addSleep   (HealthContext)
                →  saved to the device                          (storage.ts)
                →  summarize(data)                              (health.ts)
                →  scores + life-expectancy estimate shown      (DashboardScreen / Insights)
```

Everything derived flows through `summarize()` in `src/health.ts`. Every rule in
that file is deliberately simple and readable, so the model is easy to audit and
tweak — and never a black box.

---

## How the estimate works (in brief)

Each pillar is scored 0–100 from your **last 7 days** of logs (labs use your most
recent reading per marker):

| Pillar   | Weight | Basis |
|----------|:------:|-------|
| 🩸 Labs     | 35% | Each marker vs. its standard optimal range (incl. BMI) |
| 🏃 Exercise | 25% | Weekly minutes vs. the WHO 150-min target (vigorous counts double) |
| 🥗 Diet     | 20% | Daily quality + fruit/veg, minus sugary drinks & excess alcohol |
| 😴 Sleep    | 20% | A consistent 7–8 hours with good quality |

Each pillar's score shifts a baseline life expectancy (79 male / 83 female) up
or down; the total is capped within **±12 years** so no single habit swings it
unrealistically. The Insights screen shows the exact per-pillar contribution.

---

## Ideas for what to build next

- **Trends & charts** — plot each marker and pillar score over time
- **Reminders** — nudge to log sleep in the morning, diet in the evening
- **Import from wearables / Apple Health / Google Fit**
- **Unit toggles** — mg/dL ↔ mmol/L, cm/kg ↔ ft/lb
- **Cloud sync / accounts** (start by swapping out `storage.ts`)
- **Refine the model** — the rules all live in one readable file, `src/health.ts`

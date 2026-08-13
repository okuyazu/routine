/**
 * navigation.ts
 * -------------------------------------------------------------
 * Lists every screen in the app and what data each one needs.
 * This gives us type-safety: if you try to open a screen with the
 * wrong params, the editor will warn you.
 */

export type RootStackParamList = {
  Dashboard: undefined; // Overview: score + life-expectancy estimate.
  Labs: undefined; // Log & review blood/vitals markers.
  Exercise: undefined; // Log workouts.
  Diet: undefined; // Log daily eating.
  Sleep: undefined; // Log nightly sleep.
  Profile: undefined; // Age, sex, height, weight.
  Insights: undefined; // How the estimate works + personalized tips.
};

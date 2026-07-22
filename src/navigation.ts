/**
 * navigation.ts
 * -------------------------------------------------------------
 * Lists every screen in the app and what data each one needs.
 * This gives us type-safety: if you try to open the Detail screen
 * without passing a concept id, the editor will warn you.
 */

export type RootStackParamList = {
  Home: undefined; // Home needs no data.
  AddConcept: undefined; // Add screen needs no data.
  ConceptDetail: { id: string }; // Detail screen needs which concept to show.
};

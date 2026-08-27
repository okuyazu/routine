/**
 * navigation.ts
 * -------------------------------------------------------------
 * Lists every screen in the app and what data each one needs.
 * This gives type-safety: passing the wrong params is caught in the editor.
 */

export type RootStackParamList = {
  Home: undefined; // Current State dashboard for the active subject.
  CreateSubject: undefined; // Create a new subject.
  AddMeasurement: { parameterKey?: string }; // Enter a numeric lab value.
  LipidResult: undefined; // The persisted ApoB / lipid engine evaluation.
  MeasurementHistory: { parameterKey: string }; // Append-only event log.
};

/**
 * LidContext.tsx
 * -------------------------------------------------------------
 * The app's single source of truth. Any screen calls `useLid()` to read
 * subjects, measurements, and engine evaluations, and to run actions.
 *
 * The append-only invariant lives here:
 *   - addMeasurement      -> a new `original` event
 *   - correctMeasurement  -> a new `correction` event that supersedes one
 *   - retractMeasurement  -> a new `retraction` event that supersedes one
 * Nothing is ever mutated or deleted in place.
 *
 * `effectiveEvents()` resolves the append-only history into the set of
 * events that currently "count" (latest correction wins; retracted values
 * drop out) — which is exactly what the engine is fed.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import {
  EngineEvaluation,
  EventType,
  MeasurementEvent,
  Sex,
  Subject,
} from './types';
import { getParameter } from './parameters';
import { ENGINE_NAME, ENGINE_VERSION, runLipidEngine } from './engine';
import {
  hasSeeded,
  loadEvaluations,
  loadMeasurements,
  loadSubjects,
  markSeeded,
  saveEvaluations,
  saveMeasurements,
  saveSubjects,
} from './storage';
import { DEMO_MEASUREMENTS, DEMO_SUBJECT } from './seed';

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Input for entering a brand-new measurement (an `original` event). */
export type NewMeasurementInput = {
  parameterKey: string;
  reportedValue: number;
  reportedUnit: string;
  method?: string;
  sampleDate: string;
  note?: string;
};

type LidContextValue = {
  loading: boolean;

  subjects: Subject[];
  activeSubjectId: string | null;
  activeSubject: Subject | null;

  measurements: MeasurementEvent[]; // for the active subject
  evaluations: EngineEvaluation[]; // for the active subject

  createSubject: (name: string, sex: Sex, birthYear?: number) => string;
  setActiveSubject: (id: string) => void;

  addMeasurement: (input: NewMeasurementInput) => void;
  correctMeasurement: (
    eventId: string,
    reportedValue: number,
    reportedUnit: string,
    note?: string
  ) => void;
  retractMeasurement: (eventId: string, note?: string) => void;

  /** All events for one parameter (active subject), newest entry first. */
  eventsForParameter: (parameterKey: string) => MeasurementEvent[];
  /** The events that currently "count" for one parameter. */
  effectiveEvents: (parameterKey: string) => MeasurementEvent[];

  /** Run the deterministic lipid engine and persist the evaluation. */
  runLipid: () => EngineEvaluation | null;
  /** Most recent persisted lipid evaluation for the active subject. */
  latestLipid: EngineEvaluation | null;
};

const LidContext = createContext<LidContextValue | undefined>(undefined);

/** Normalize a reported value to a parameter's canonical unit. */
function normalize(parameterKey: string, value: number, unit: string) {
  const def = getParameter(parameterKey);
  const canonicalUnit = def?.canonicalUnit ?? unit;
  const conv = def?.acceptedUnits.find((u) => u.unit === unit);
  const normalizedValue = conv ? conv.toCanonical(value) : value;
  // Round to 2 dp so display stays tidy.
  return {
    normalizedValue: Math.round(normalizedValue * 100) / 100,
    normalizedUnit: canonicalUnit,
  };
}

export function LidProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allMeasurements, setAllMeasurements] = useState<MeasurementEvent[]>([]);
  const [allEvaluations, setAllEvaluations] = useState<EngineEvaluation[]>([]);
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);

  // First load: read from device, seed demo data once if empty.
  useEffect(() => {
    let active = true;
    (async () => {
      let [subs, meas, evals, seeded] = await Promise.all([
        loadSubjects(),
        loadMeasurements(),
        loadEvaluations(),
        hasSeeded(),
      ]);
      if (!seeded && subs.length === 0) {
        subs = [DEMO_SUBJECT];
        meas = DEMO_MEASUREMENTS;
        await Promise.all([saveSubjects(subs), saveMeasurements(meas), markSeeded()]);
      }
      if (!active) return;
      setSubjects(subs);
      setAllMeasurements(meas);
      setAllEvaluations(evals);
      setActiveSubjectId(subs[0]?.id ?? null);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Persist on change (after first load).
  useEffect(() => {
    if (!loading) saveSubjects(subjects);
  }, [subjects, loading]);
  useEffect(() => {
    if (!loading) saveMeasurements(allMeasurements);
  }, [allMeasurements, loading]);
  useEffect(() => {
    if (!loading) saveEvaluations(allEvaluations);
  }, [allEvaluations, loading]);

  const activeSubject = useMemo(
    () => subjects.find((s) => s.id === activeSubjectId) ?? null,
    [subjects, activeSubjectId]
  );

  const measurements = useMemo(
    () => allMeasurements.filter((m) => m.subjectId === activeSubjectId),
    [allMeasurements, activeSubjectId]
  );
  const evaluations = useMemo(
    () => allEvaluations.filter((e) => e.subjectId === activeSubjectId),
    [allEvaluations, activeSubjectId]
  );

  const createSubject = useCallback(
    (name: string, sex: Sex, birthYear?: number): string => {
      const id = makeId('subj');
      const subject: Subject = {
        id,
        name: name.trim() || 'Unnamed subject',
        sex,
        birthYear,
        createdAt: Date.now(),
      };
      setSubjects((prev) => [...prev, subject]);
      setActiveSubjectId(id);
      return id;
    },
    []
  );

  const setActiveSubject = useCallback((id: string) => setActiveSubjectId(id), []);

  const appendEvent = useCallback(
    (
      parameterKey: string,
      eventType: EventType,
      reportedValue: number,
      reportedUnit: string,
      opts: {
        supersedesEventId?: string;
        method?: string;
        sampleDate: string;
        note?: string;
      }
    ) => {
      if (!activeSubjectId) return;
      const { normalizedValue, normalizedUnit } = normalize(
        parameterKey,
        reportedValue,
        reportedUnit
      );
      const event: MeasurementEvent = {
        id: makeId('evt'),
        subjectId: activeSubjectId,
        parameterKey,
        eventType,
        supersedesEventId: opts.supersedesEventId,
        reportedValue,
        reportedUnit,
        normalizedValue,
        normalizedUnit,
        method: opts.method,
        sampleDate: opts.sampleDate,
        enteredAt: Date.now(),
        note: opts.note,
      };
      // Append-only: add, never mutate existing rows.
      setAllMeasurements((prev) => [...prev, event]);
    },
    [activeSubjectId]
  );

  const addMeasurement = useCallback(
    (input: NewMeasurementInput) => {
      appendEvent(input.parameterKey, 'original', input.reportedValue, input.reportedUnit, {
        method: input.method,
        sampleDate: input.sampleDate,
        note: input.note,
      });
    },
    [appendEvent]
  );

  const correctMeasurement = useCallback(
    (eventId: string, reportedValue: number, reportedUnit: string, note?: string) => {
      const target = allMeasurements.find((m) => m.id === eventId);
      if (!target) return;
      appendEvent(target.parameterKey, 'correction', reportedValue, reportedUnit, {
        supersedesEventId: eventId,
        method: target.method,
        sampleDate: target.sampleDate,
        note,
      });
    },
    [allMeasurements, appendEvent]
  );

  const retractMeasurement = useCallback(
    (eventId: string, note?: string) => {
      const target = allMeasurements.find((m) => m.id === eventId);
      if (!target) return;
      appendEvent(
        target.parameterKey,
        'retraction',
        target.reportedValue,
        target.reportedUnit,
        {
          supersedesEventId: eventId,
          method: target.method,
          sampleDate: target.sampleDate,
          note,
        }
      );
    },
    [allMeasurements, appendEvent]
  );

  const eventsForParameter = useCallback(
    (parameterKey: string) =>
      measurements
        .filter((m) => m.parameterKey === parameterKey)
        .sort((a, b) => b.enteredAt - a.enteredAt),
    [measurements]
  );

  /**
   * Resolve the append-only chain into the events that currently count:
   * drop any event that a later event supersedes, and drop retractions
   * (tombstones) themselves. What remains is the effective evidence.
   */
  const effectiveEvents = useCallback(
    (parameterKey: string) => {
      const forParam = measurements.filter((m) => m.parameterKey === parameterKey);
      const superseded = new Set(
        forParam.map((m) => m.supersedesEventId).filter(Boolean) as string[]
      );
      return forParam
        .filter((m) => !superseded.has(m.id) && m.eventType !== 'retraction')
        .sort((a, b) => {
          if (a.sampleDate !== b.sampleDate)
            return a.sampleDate < b.sampleDate ? 1 : -1;
          return b.enteredAt - a.enteredAt;
        });
    },
    [measurements]
  );

  const runLipid = useCallback((): EngineEvaluation | null => {
    if (!activeSubjectId) return null;
    const effectiveApob = effectiveEvents('apob');
    const latest = effectiveApob[0]; // newest effective ApoB, if any
    const result = runLipidEngine({ apobMgDl: latest ? latest.normalizedValue : null });

    const evaluation: EngineEvaluation = {
      id: makeId('eval'),
      subjectId: activeSubjectId,
      engineName: ENGINE_NAME,
      engineVersion: ENGINE_VERSION,
      inputSnapshot: result.inputSnapshot,
      sourceEventIds: latest ? [latest.id] : [],
      band: result.band,
      primaryValue: result.primaryValue,
      primaryUnit: result.primaryUnit,
      interpretation: result.interpretation,
      createdAt: Date.now(),
    };
    setAllEvaluations((prev) => [...prev, evaluation]);
    return evaluation;
  }, [activeSubjectId, effectiveEvents]);

  const latestLipid = useMemo(() => {
    const lip = evaluations
      .filter((e) => e.engineName === ENGINE_NAME)
      .sort((a, b) => b.createdAt - a.createdAt);
    return lip[0] ?? null;
  }, [evaluations]);

  const value: LidContextValue = {
    loading,
    subjects,
    activeSubjectId,
    activeSubject,
    measurements,
    evaluations,
    createSubject,
    setActiveSubject,
    addMeasurement,
    correctMeasurement,
    retractMeasurement,
    eventsForParameter,
    effectiveEvents,
    runLipid,
    latestLipid,
  };

  return <LidContext.Provider value={value}>{children}</LidContext.Provider>;
}

export function useLid(): LidContextValue {
  const ctx = useContext(LidContext);
  if (!ctx) throw new Error('useLid must be used inside a <LidProvider>.');
  return ctx;
}

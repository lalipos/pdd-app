import AsyncStorage from '@react-native-async-storage/async-storage';
import { Question } from '../types';

const REPO = 'https://raw.githubusercontent.com/lalipos/pdd-app/main/data';

const KEY_VERSION = 'remote_version';
const KEY_QUESTIONS_AB = 'remote_questions_ab';
const KEY_HINTS_AB = 'remote_hints_ab';

interface RemoteMeta {
  version: number;
  updated_at: string;
  needs_review: string[];
}

export interface UpdateResult {
  questions: Question[];
  hints: Record<string, string>;
}

async function fetchJSON(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function getCachedVersion(): Promise<number> {
  const v = await AsyncStorage.getItem(KEY_VERSION);
  return v ? parseInt(v, 10) : 0;
}

/**
 * Downloads fresh data if remote version is newer.
 * Returns new data immediately so the app can apply it without restarting.
 * Returns null if already up to date or on error.
 */
export async function checkAndUpdate(): Promise<UpdateResult | null> {
  try {
    const meta = (await fetchJSON(`${REPO}/meta.json`)) as RemoteMeta;
    const cached = await getCachedVersion();
    if (meta.version <= cached) return null;

    const [questions, hints] = await Promise.all([
      fetchJSON(`${REPO}/questions_ab.json`),
      fetchJSON(`${REPO}/hints_ab_v2.json`),
    ]);

    await AsyncStorage.multiSet([
      [KEY_VERSION, String(meta.version)],
      [KEY_QUESTIONS_AB, JSON.stringify(questions)],
      [KEY_HINTS_AB, JSON.stringify(hints)],
    ]);

    return {
      questions: questions as Question[],
      hints: hints as Record<string, string>,
    };
  } catch {
    return null;
  }
}

/** Returns cached questions from AsyncStorage, or null if none cached yet. */
export async function getCachedQuestions(): Promise<Question[] | null> {
  const raw = await AsyncStorage.getItem(KEY_QUESTIONS_AB);
  return raw ? (JSON.parse(raw) as Question[]) : null;
}

/** Returns cached hints from AsyncStorage, or null if none cached yet. */
export async function getCachedHints(): Promise<Record<string, string> | null> {
  const raw = await AsyncStorage.getItem(KEY_HINTS_AB);
  return raw ? (JSON.parse(raw) as Record<string, string>) : null;
}

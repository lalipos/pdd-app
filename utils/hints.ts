import { Category, Question } from '../types';

const hintsABBundled: Record<string, string> = require('../assets/hints_ab_v2.json');
const topicsAB: Record<string, string> = require('../assets/hints_topics_ab.json');
const hintsCD: Record<string, string> = require('../assets/hints_cd.json');

let hintsABOverride: Record<string, string> | null = null;

/** Call at app startup with cached hints from AsyncStorage. */
export function setHintsOverride(hints: Record<string, string>): void {
  hintsABOverride = hints;
}

export function getHint(category: Category, question: Question): string | null {
  if (category === 'AB') {
    const pool = hintsABOverride ?? hintsABBundled;
    const individual = pool[question.id];
    if (individual) return individual;
    for (const topic of question.topic || []) {
      if (topicsAB[topic]) return topicsAB[topic];
    }
    return null;
  }

  if (category === 'CD') {
    return hintsCD[question.id] || null;
  }

  return null;
}

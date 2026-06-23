import { Category, Question } from '../types';

const hintsAB: Record<string, string> = require('../assets/hints_ab_v2.json');
const topicsAB: Record<string, string> = require('../assets/hints_topics_ab.json');
const hintsCD: Record<string, string> = require('../assets/hints_cd.json');

export function getHint(category: Category, question: Question): string | null {
  if (category === 'AB') {
    const individual = hintsAB[question.id];
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

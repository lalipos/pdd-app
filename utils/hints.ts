import { Category, Question } from '../types';

// Двухуровневые мнемо-крючки для категории AB:
// 1) индивидуальный крючок по id вопроса (assets/hints_ab.json) — точнее;
// 2) если его нет — крючок-алгоритм по теме вопроса (assets/hints_topics_ab.json).
// Темы покрывают все 800 вопросов, поэтому для AB крючок есть всегда.
const hintsAB: Record<string, string> = require('../assets/hints_ab.json');
const topicsAB: Record<string, string> = require('../assets/hints_topics_ab.json');

export function getHint(category: Category, question: Question): string | null {
  if (category !== 'AB') return null;

  const individual = hintsAB[question.id];
  if (individual) return individual;

  for (const topic of question.topic || []) {
    if (topicsAB[topic]) return topicsAB[topic];
  }
  return null;
}

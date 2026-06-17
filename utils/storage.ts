import AsyncStorage from '@react-native-async-storage/async-storage';
import { Category, Stats } from '../types';

const CATEGORY_KEY = 'user_category';
const STATS_KEY = (cat: Category) => `stats_${cat}`;

export async function getSavedCategory(): Promise<Category | null> {
  const val = await AsyncStorage.getItem(CATEGORY_KEY);
  return val as Category | null;
}

export async function saveCategory(cat: Category): Promise<void> {
  await AsyncStorage.setItem(CATEGORY_KEY, cat);
}

export async function getStats(cat: Category): Promise<Stats> {
  const val = await AsyncStorage.getItem(STATS_KEY(cat));
  if (!val) return { totalAnswered: 0, totalCorrect: 0, wrongQuestionIds: [] };
  return JSON.parse(val);
}

export async function recordAnswer(cat: Category, questionId: string, correct: boolean): Promise<void> {
  const stats = await getStats(cat);
  stats.totalAnswered++;
  if (correct) {
    stats.totalCorrect++;
    stats.wrongQuestionIds = stats.wrongQuestionIds.filter(id => id !== questionId);
  } else {
    if (!stats.wrongQuestionIds.includes(questionId)) {
      stats.wrongQuestionIds.push(questionId);
    }
  }
  await AsyncStorage.setItem(STATS_KEY(cat), JSON.stringify(stats));
}

export async function clearStats(cat: Category): Promise<void> {
  await AsyncStorage.removeItem(STATS_KEY(cat));
}

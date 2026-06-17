import AsyncStorage from '@react-native-async-storage/async-storage';
import { createEmptyCard, fsrs, Rating, Card } from 'ts-fsrs';
import { Category, Question } from '../types';

// Интервальные повторения на FSRS (тот же алгоритм, что в Anki).
// Состояние каждой карточки (вопроса) храним в AsyncStorage по ключу srs_<cat>.

const SRS_KEY = (cat: Category) => `srs_${cat}`;
const NEW_PER_DAY = 20;

const scheduler = fsrs({ enable_short_term: false });

type CardStore = Record<string, Card>;

// JSON.parse теряет тип Date — возвращаем due/last_review обратно в Date,
// иначе FSRS получит строку и посчитает интервалы неверно.
function reviveCard(raw: any): Card {
  return {
    ...raw,
    due: new Date(raw.due),
    last_review: raw.last_review ? new Date(raw.last_review) : undefined,
  };
}

async function loadStore(cat: Category): Promise<CardStore> {
  try {
    const val = await AsyncStorage.getItem(SRS_KEY(cat));
    if (!val) return {};
    const parsed = JSON.parse(val);
    const store: CardStore = {};
    for (const id of Object.keys(parsed)) {
      store[id] = reviveCard(parsed[id]);
    }
    return store;
  } catch {
    // повреждённые данные — стартуем с чистого листа, не роняем приложение
    return {};
  }
}

async function saveStore(cat: Category, store: CardStore): Promise<void> {
  try {
    await AsyncStorage.setItem(SRS_KEY(cat), JSON.stringify(store));
  } catch {
    // прототип: сбой записи не критичен, молча пропускаем
  }
}

// Оценить ответ и пересчитать следующий срок повторения вопроса.
export async function gradeCard(cat: Category, questionId: string, correct: boolean): Promise<void> {
  const store = await loadStore(cat);
  const card = store[questionId] ?? createEmptyCard();
  const rating = correct ? Rating.Good : Rating.Again;
  const { card: next } = scheduler.next(card, new Date(), rating);
  store[questionId] = next;
  await saveStore(cat, store);
}

// Очередь на повторение: просроченные (due <= now) + добор новых до дневного лимита.
export async function getDueQuestionIds(
  cat: Category,
  questions: Question[],
  now: Date = new Date(),
  newLimit: number = NEW_PER_DAY,
): Promise<string[]> {
  const store = await loadStore(cat);
  const due: string[] = [];
  const fresh: string[] = [];
  for (const q of questions) {
    const card = store[q.id];
    if (!card) {
      if (fresh.length < newLimit) fresh.push(q.id);
    } else if (card.due.getTime() <= now.getTime()) {
      due.push(q.id);
    }
  }
  return [...due, ...fresh];
}

export async function getDueCount(
  cat: Category,
  questions: Question[],
  now: Date = new Date(),
  newLimit: number = NEW_PER_DAY,
): Promise<number> {
  const ids = await getDueQuestionIds(cat, questions, now, newLimit);
  return ids.length;
}

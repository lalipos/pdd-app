import { Answer } from '../types';

const STOP_WORDS = new Set([
  'в', 'на', 'для', 'с', 'по', 'из', 'к', 'о', 'об', 'до', 'от', 'за', 'при',
  'без', 'под', 'над', 'про', 'через', 'между', 'после', 'перед', 'около',
  'во', 'со', 'из-за', 'из-под', 'вне', 'вдоль', 'вместо', 'вокруг',
  'и', 'или', 'но', 'а', 'да', 'однако', 'зато', 'либо', 'то', 'ни',
  'что', 'если', 'когда', 'как', 'так', 'не', 'же', 'ли', 'бы',
  'это', 'этот', 'эта', 'эти', 'тот', 'та', 'те', 'там', 'тут',
  'мой', 'твой', 'свой', 'наш', 'ваш', 'им', 'их', 'его', 'её',
  'который', 'которая', 'которое', 'которые',
  'все', 'всё', 'весь', 'вся', 'он', 'она', 'оно', 'они',
  'я', 'ты', 'мы', 'вы', 'вам', 'нам', 'вас', 'нас', 'вас',
  'можно', 'нельзя', 'должен', 'должна', 'должны',
  'будет', 'было', 'была', 'были', 'есть', 'быть',
  'при', 'этом', 'том', 'тем', 'той', 'того', 'данного',
  'один', 'одна', 'одно', 'одни', 'такой', 'такая', 'такие',
  'любой', 'любая', 'любые', 'каждый', 'каждая', 'каждые',
  'этой', 'того', 'тому', 'чтобы', 'потому', 'поэтому',
  'уже', 'ещё', 'только', 'лишь', 'даже', 'хотя',
  'более', 'менее', 'очень', 'весьма', 'совсем',
]);

export interface Token {
  text: string;
  isBlueFirst: boolean;
  isCaps: boolean;
  isWord: boolean;
}

export interface FlatToken {
  text: string;
  style: 'normal' | 'blue' | 'caps';
}

function splitIntoChunks(text: string): string[] {
  return text.match(/[а-яёА-ЯЁa-zA-Z0-9]+|[^а-яёА-ЯЁa-zA-Z0-9]+/g) || [];
}

export function findKeyword(text: string): string | null {
  const chunks = splitIntoChunks(text);
  const words = chunks
    .filter(c => /[а-яёА-ЯЁ]/.test(c))
    .map(w => w.toLowerCase());

  const candidates = words.filter(w => w.length >= 5 && !STOP_WORDS.has(w));
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.length - a.length);
  return candidates[0];
}

export function parseText(text: string, keyword: string | null): FlatToken[] {
  const chunks = splitIntoChunks(text);
  const result: FlatToken[] = [];
  let wordIndex = 0;

  for (const chunk of chunks) {
    const isWord = /[а-яёА-ЯЁa-zA-Z]/.test(chunk);

    if (!isWord) {
      result.push({ text: chunk, style: 'normal' });
      continue;
    }

    const isFirstFive = wordIndex < 5;
    const chunkLower = chunk.toLowerCase();
    const isKeyword = keyword !== null && chunkLower === keyword.toLowerCase();
    wordIndex++;

    const displayText = isKeyword ? chunk.toUpperCase() : chunk;

    if (isFirstFive && displayText.length > 0) {
      result.push({ text: displayText[0], style: 'blue' });
      if (displayText.length > 1) {
        result.push({ text: displayText.slice(1), style: isKeyword ? 'caps' : 'normal' });
      }
    } else {
      result.push({ text: displayText, style: isKeyword ? 'caps' : 'normal' });
    }
  }

  return result;
}

export type LengthMarker = 'long' | 'short' | null;

// Палочку ставим, только если правильный ответ — реальный экстремум по длине
// (самый длинный или самый короткий из всех), с заметным отрывом от ближайшего
// конкурента. Так триггер «самый длинный/короткий» совпадает с тем, что видит глаз.
const LENGTH_THRESHOLD = 0.25;

export function getLengthMarker(answers: Answer[]): LengthMarker {
  const correct = answers.find(a => a.is_correct);
  if (!correct) return null;

  const correctLen = correct.answer_text.length;
  const otherLengths = answers.filter(a => !a.is_correct).map(a => a.answer_text.length);
  if (otherLengths.length === 0) return null;

  const maxOther = Math.max(...otherLengths);
  const minOther = Math.min(...otherLengths);

  if (maxOther > 0 && (correctLen - maxOther) / maxOther > LENGTH_THRESHOLD) return 'long';
  if (minOther > 0 && (correctLen - minOther) / minOther < -LENGTH_THRESHOLD) return 'short';
  return null;
}

export function getImageUrl(imagePath: string, category: 'AB' | 'CD'): string | null {
  if (!imagePath || imagePath.includes('no_image')) return null;
  const catPath = category === 'AB' ? 'A_B' : 'C_D';
  const match = imagePath.match(/([a-f0-9]{32}\.jpg)$/i);
  if (!match) return null;
  return `https://raw.githubusercontent.com/etspring/pdd_russia/master/images/${catPath}/${match[1]}`;
}

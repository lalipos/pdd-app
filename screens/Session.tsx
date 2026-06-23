import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Image, ActivityIndicator, FlatList,
  NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { Question, Category, SessionMode, Screen } from '../types';
import StyledText from '../components/StyledText';
import AnswerOption from '../components/AnswerOption';
import QuestionStrip from '../components/QuestionStrip';
import { getImageUrl } from '../utils/textProcessing';
import { getHint } from '../utils/hints';
import { recordAnswer } from '../utils/storage';
import { getDueQuestionIds, gradeCard } from '../utils/srs';

interface Props {
  questions: Question[];
  category: Category;
  mode: SessionMode;
  ticketNumber?: number;
  onNavigate: (screen: Screen) => void;
}

type AnswerRecord = { selectedIdx: number; correct: boolean };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getStaticQuestions(questions: Question[], mode: SessionMode, ticketNumber?: number): Question[] {
  if (mode === 'ticket' && ticketNumber !== undefined) {
    return questions.filter(q => q.ticket_number === `Билет ${ticketNumber}`);
  }
  if (mode === 'exam') return shuffle(questions).slice(0, 20);
  if (mode === 'cram') return questions;
  return shuffle(questions);
}

const EXAM_SECONDS = 20 * 60;

export default function Session({ questions, category, mode, ticketNumber, onNavigate }: Props) {
  const isExam = mode === 'exam';
  const isTicket = mode === 'ticket';
  const isCram = mode === 'cram';
  const isCountdown = isExam || isTicket;

  const [sessionQuestions, setSessionQuestions] = useState<Question[] | null>(
    () => (mode === 'review' ? null : getStaticQuestions(questions, mode, ticketNumber)),
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, AnswerRecord>>({});
  const [examCorrect, setExamCorrect] = useState(0);
  const [examWrong, setExamWrong] = useState(0);
  const [finished, setFinished] = useState(false);
  const [timerValue, setTimerValue] = useState(isCountdown ? EXAM_SECONDS : 0);
  const [boxW, setBoxW] = useState(0);
  const [boxH, setBoxH] = useState(0);

  const carouselRef = useRef<FlatList<Question>>(null);

  useEffect(() => {
    if (mode !== 'review') return;
    let alive = true;
    getDueQuestionIds(category, questions).then(ids => {
      const byId = new Map(questions.map(q => [q.id, q]));
      const list = ids.map(id => byId.get(id)).filter((q): q is Question => !!q);
      if (alive) setSessionQuestions(list);
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (finished) return;
    const timer = setInterval(() => {
      setTimerValue(t => (isCountdown ? t - 1 : t + 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [finished, isCountdown]);

  useEffect(() => {
    if (isCountdown && timerValue <= 0 && !finished) setFinished(true);
  }, [isCountdown, timerValue, finished]);

  const total = sessionQuestions?.length ?? 0;

  const handleSelect = useCallback(async (itemIndex: number, ansIdx: number, q: Question) => {
    if (answers[itemIndex] !== undefined) return;
    const correct = q.answers[ansIdx].is_correct;
    setAnswers(prev => ({ ...prev, [itemIndex]: { selectedIdx: ansIdx, correct } }));
    await recordAnswer(category, q.id, correct);
    if (mode === 'review') await gradeCard(category, q.id, correct);
    if (isCountdown) {
      if (correct) setExamCorrect(c => c + 1);
      else setExamWrong(w => w + 1);
    }
  }, [answers, category, mode, isCountdown]);

  const handleNext = useCallback((itemIndex: number) => {
    const next = itemIndex + 1;
    if (next >= total) { setFinished(true); return; }
    carouselRef.current?.scrollToIndex({ index: next, animated: true });
    setCurrentIndex(next);
  }, [total]);

  const handleJump = useCallback((target: number) => {
    carouselRef.current?.scrollToIndex({ index: target, animated: true });
    setCurrentIndex(target);
  }, []);

  const handleScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (boxW <= 0) return;
    const idx = Math.round(e.nativeEvent.contentOffset.x / boxW);
    setCurrentIndex(idx);
  }, [boxW]);

  const formatTime = (s: number): string => {
    const abs = Math.max(0, s);
    return `${Math.floor(abs / 60).toString().padStart(2, '0')}:${(abs % 60).toString().padStart(2, '0')}`;
  };

  const currentQ = sessionQuestions && total > 0
    ? sessionQuestions[Math.min(currentIndex, total - 1)]
    : null;

  const headerTitle = (): string => {
    if (!currentQ) return '';
    if (mode === 'exam') return 'Экзамен';
    if (mode === 'ticket') return `Билет ${ticketNumber}`;
    const t = currentQ.ticket_number;
    const q = currentQ.title;
    return t && q ? `${t} · ${q}` : (t ?? '');
  };

  const renderItem = useCallback(({ item: q, index: i }: { item: Question; index: number }) => {
    const answer = answers[i];
    const isRevealed = isCram || answer !== undefined;
    const selIdx = answer?.selectedIdx ?? null;
    const imageUrl = getImageUrl(q.image, category);
    const hint = getHint(category, q);
    const isLast = i + 1 >= total;

    return (
      <View style={{ width: boxW, height: boxH }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          automaticallyAdjustContentInsets={false}
        >
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
          ) : (
            <View style={styles.noImageRow}>
              <Text style={styles.noImageText}>Вопрос без изображения</Text>
              <View style={styles.noImageLine} />
            </View>
          )}

          <StyledText text={q.question} baseStyle={styles.question} />

          <View>
            {q.answers.map((ans, j) => (
              <AnswerOption
                key={j}
                answer={ans}
                allAnswers={q.answers}
                selected={selIdx === j}
                revealed={isRevealed}
                onPress={() => handleSelect(i, j, q)}
              />
            ))}
          </View>

          {isRevealed && hint && (
            <View style={styles.hintBox}>
              <Text style={styles.hintLabel}>🧠 Как запомнить</Text>
              <Text style={styles.hintText}>
                {hint.split(/(\*\*[^*]+\*\*)/).map((part, idx) =>
                  part.startsWith('**') && part.endsWith('**')
                    ? <Text key={idx} style={{ fontWeight: 'bold' }}>{part.slice(2, -2)}</Text>
                    : part
                )}
              </Text>
            </View>
          )}
        </ScrollView>

        {isRevealed && (
          <View style={styles.nextBar}>
            <TouchableOpacity style={styles.nextBtn} onPress={() => handleNext(i)}>
              <Text style={styles.nextBtnText}>{isLast ? 'Завершить' : 'Следующий'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }, [answers, isCram, total, category, handleSelect, handleNext, boxW, boxH]);

  if (sessionQuestions === null) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1a1a1a" />
        </View>
      </SafeAreaView>
    );
  }

  if (total === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>На сегодня всё повторено 👍</Text>
          <TouchableOpacity style={styles.finishBtn} onPress={() => onNavigate({ name: 'home' })}>
            <Text style={styles.finishBtnText}>На главную</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (finished) {
    const isExamLike = isExam || isTicket;
    const passed = isExamLike ? examWrong <= 2 : null;
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.finishContainer}>
          {isExamLike ? (
            <>
              <Text style={[styles.finishResult, { color: passed ? '#16A34A' : '#DC2626' }]}>
                {passed ? 'Сдал' : 'Не сдал'}
              </Text>
              <Text style={styles.finishStat}>Правильных: {examCorrect} / {total}</Text>
              <Text style={styles.finishStat}>Ошибок: {examWrong}</Text>
            </>
          ) : (
            <Text style={styles.finishResult}>Завершено</Text>
          )}
          <TouchableOpacity style={styles.finishBtn} onPress={() => onNavigate({ name: 'home' })}>
            <Text style={styles.finishBtnText}>На главную</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => onNavigate({ name: 'home' })} style={styles.topBarSide}>
          <Text style={styles.back}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{headerTitle()}</Text>
        <View style={styles.topBarSide}>
          <Text style={[styles.timer, isCountdown && timerValue < 60 && styles.timerRed]}>
            {formatTime(timerValue)}
          </Text>
        </View>
      </View>

      <QuestionStrip
        total={total}
        currentIndex={currentIndex}
        answers={answers}
        onJump={handleJump}
      />

      <View
        style={{ flex: 1 }}
        onLayout={e => {
          const { width, height } = e.nativeEvent.layout;
          if (width > 0 && Math.abs(width - boxW) > 1) setBoxW(width);
          if (height > 0 && Math.abs(height - boxH) > 1) setBoxH(height);
        }}
      >
        {boxW > 0 && boxH > 0 && (
          <FlatList
            ref={carouselRef}
            data={sessionQuestions}
            keyExtractor={q => q.id}
            renderItem={renderItem}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            getItemLayout={(_, index) => ({
              length: boxW,
              offset: boxW * index,
              index,
            })}
            onMomentumScrollEnd={handleScrollEnd}
            onScrollToIndexFailed={({ index: i }) => {
              setTimeout(() => {
                carouselRef.current?.scrollToIndex({ index: i, animated: true });
              }, 100);
            }}
            windowSize={3}
            initialNumToRender={1}
            extraData={answers}
            style={{ flex: 1 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  topBarSide: { width: 72 },
  back: { fontSize: 18, color: '#1a1a1a' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  timer: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  timerRed: { color: '#DC2626' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 },
  image: { width: '100%', height: 180, marginBottom: 16 },
  noImageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  noImageText: { color: '#9CA3AF', fontSize: 13, fontStyle: 'italic', marginRight: 12 },
  noImageLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  question: {
    fontSize: 18,
    color: '#1a1a1a',
    lineHeight: 26,
    marginBottom: 20,
    fontWeight: '500',
  },
  hintBox: {
    marginTop: 14,
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  hintLabel: { fontSize: 13, fontWeight: '700', color: '#B45309', marginBottom: 4 },
  hintText: { fontSize: 15, color: '#1a1a1a', lineHeight: 21 },
  nextBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    backgroundColor: '#fff',
  },
  nextBtn: {
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextBtnText: { fontSize: 16, fontWeight: '500', color: '#1a1a1a' },
  finishContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  finishResult: { fontSize: 48, fontWeight: '700', marginBottom: 24, color: '#1a1a1a' },
  finishStat: { fontSize: 20, color: '#444', marginBottom: 8 },
  emptyText: { fontSize: 22, fontWeight: '600', color: '#1a1a1a', textAlign: 'center', marginBottom: 32 },
  finishBtn: {
    marginTop: 40,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  finishBtnText: { fontSize: 16, fontWeight: '500', color: '#1a1a1a' },
});

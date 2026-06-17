import React, { useRef, useEffect } from 'react';
import { FlatList, TouchableOpacity, Text, StyleSheet } from 'react-native';

const CELL_W = 40;
const CELL_M = 2;
const CELL_TOTAL = CELL_W + CELL_M * 2;

type AnswerRecord = { selectedIdx: number; correct: boolean };

interface Props {
  total: number;
  currentIndex: number;
  answers: Record<number, AnswerRecord>;
  onJump: (index: number) => void;
}

export default function QuestionStrip({ total, currentIndex, answers, onJump }: Props) {
  const listRef = useRef<FlatList<number>>(null);

  useEffect(() => {
    if (total === 0) return;
    const safe = Math.min(currentIndex, total - 1);
    // Для первого вопроса не центрируем — иначе единичка уезжает за левый край.
    // Просто стоим в начале ленты (offset 0), единичка целиком слева.
    if (safe <= 0) {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
      return;
    }
    listRef.current?.scrollToIndex({ index: safe, animated: true, viewPosition: 0.5 });
  }, [currentIndex, total]);

  return (
    <FlatList
      ref={listRef}
      data={Array.from({ length: total }, (_, i) => i)}
      horizontal
      keyExtractor={i => String(i)}
      getItemLayout={(_, index) => ({
        length: CELL_TOTAL,
        offset: CELL_TOTAL * index,
        index,
      })}
      showsHorizontalScrollIndicator={false}
      onScrollToIndexFailed={({ index }) => {
        setTimeout(() => {
          listRef.current?.scrollToIndex({
            index: Math.min(index, total - 1),
            animated: false,
            viewPosition: 0.5,
          });
        }, 100);
      }}
      renderItem={({ item: i }) => {
        const ans = answers[i];
        const isCurrent = i === currentIndex;
        const bg = ans
          ? ans.correct ? '#16A34A' : '#DC2626'
          : isCurrent ? '#1a1a1a' : '#E5E7EB';
        const textColor = ans || isCurrent ? '#fff' : '#6B7280';
        return (
          <TouchableOpacity
            onPress={() => onJump(i)}
            style={[styles.cell, { backgroundColor: bg }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.cellText, { color: textColor }]}>{i + 1}</Text>
          </TouchableOpacity>
        );
      }}
      extraData={answers}
      style={styles.strip}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  strip: { flexGrow: 0, height: 48 },
  list: { paddingLeft: 12, paddingRight: 8, paddingVertical: 8, alignItems: 'center' },
  cell: {
    width: CELL_W,
    height: 32,
    marginHorizontal: CELL_M,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: { fontSize: 12, fontWeight: '600' },
});

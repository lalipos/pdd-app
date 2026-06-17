import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { Category, Screen, Stats as StatsType } from '../types';
import { getStats, clearStats } from '../utils/storage';

interface Props {
  category: Category;
  questions: { id: string; question: string; ticket_number: string }[];
  onNavigate: (screen: Screen) => void;
  onStatsCleared: () => void;
}

export default function Stats({ category, questions, onNavigate, onStatsCleared }: Props) {
  const [stats, setStats] = useState<StatsType | null>(null);

  useEffect(() => {
    getStats(category).then(setStats);
  }, [category]);

  const percent = stats && stats.totalAnswered > 0
    ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100)
    : 0;

  const wrongQuestions = stats
    ? questions.filter(q => stats.wrongQuestionIds.includes(q.id))
    : [];

  const handleClear = () => {
    Alert.alert('Сбросить статистику?', 'Все данные о прогрессе будут удалены.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Сбросить',
        style: 'destructive',
        onPress: async () => {
          await clearStats(category);
          setStats({ totalAnswered: 0, totalCorrect: 0, wrongQuestionIds: [] });
          onStatsCleared();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate({ name: 'home' })}>
          <Text style={styles.back}>← Назад</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Статистика</Text>
        <TouchableOpacity onPress={handleClear}>
          <Text style={styles.resetBtn}>Сброс</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.percent}>{percent}%</Text>
        <Text style={styles.sub}>
          {stats?.totalCorrect ?? 0} из {stats?.totalAnswered ?? 0} ответов правильно
        </Text>

        {wrongQuestions.length > 0 && (
          <>
            <Text style={styles.wrongTitle}>Вопросы с ошибками ({wrongQuestions.length})</Text>
            {wrongQuestions.map(q => (
              <View key={q.id} style={styles.wrongItem}>
                <Text style={styles.wrongTicket}>{q.ticket_number}</Text>
                <Text style={styles.wrongQ} numberOfLines={2}>{q.question}</Text>
              </View>
            ))}
          </>
        )}

        {wrongQuestions.length === 0 && stats && stats.totalAnswered > 0 && (
          <Text style={styles.allCorrect}>Все вопросы решены без ошибок</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  back: { fontSize: 16, color: '#2563EB' },
  title: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
  resetBtn: { fontSize: 15, color: '#DC2626' },
  content: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  percent: {
    fontSize: 72,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  sub: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  wrongTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  wrongItem: {
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
    paddingVertical: 12,
  },
  wrongTicket: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  wrongQ: {
    fontSize: 15,
    color: '#333',
    lineHeight: 20,
  },
  allCorrect: {
    fontSize: 16,
    color: '#16A34A',
  },
});

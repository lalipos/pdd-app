import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Category, Screen } from '../types';

interface Props {
  category: Category;
  percent: number;
  dueCount: number;
  onNavigate: (screen: Screen) => void;
}

export default function Home({ category, percent, dueCount, onNavigate }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.catLabel}>Категория {category === 'AB' ? 'A / B' : 'C / D'}</Text>
          <TouchableOpacity onPress={() => onNavigate({ name: 'category' })}>
            <Text style={styles.changeBtn}>сменить</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.btnAccent} onPress={() => onNavigate({ name: 'session', mode: 'review' })}>
          <Text style={styles.btnTitle}>Повторение</Text>
          <Text style={styles.btnSub}>
            {dueCount > 0 ? `${dueCount} на сегодня` : 'на сегодня всё повторено'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={() => onNavigate({ name: 'session', mode: 'cram' })}>
          <Text style={styles.btnTitle}>Зубрёжка</Text>
          <Text style={styles.btnSub}>вопрос + ответ + крючок сразу</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={() => onNavigate({ name: 'session', mode: 'train' })}>
          <Text style={styles.btnTitle}>Тренировка</Text>
          <Text style={styles.btnSub}>случайные вопросы</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={() => onNavigate({ name: 'tickets' })}>
          <Text style={styles.btnTitle}>Билеты</Text>
          <Text style={styles.btnSub}>40 билетов по 20 вопросов</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={() => onNavigate({ name: 'session', mode: 'exam' })}>
          <Text style={styles.btnTitle}>Экзамен</Text>
          <Text style={styles.btnSub}>20 вопросов · 20 минут</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statsBtn} onPress={() => onNavigate({ name: 'stats' })}>
          <Text style={styles.statsText}>Статистика · {percent}% правильных</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  catLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  changeBtn: {
    fontSize: 15,
    color: '#2563EB',
  },
  btn: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  btnAccent: {
    borderWidth: 1.5,
    borderColor: '#1a1a1a',
    borderRadius: 12,
    backgroundColor: '#f7f7f7',
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  btnTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  btnSub: {
    fontSize: 14,
    color: '#888',
  },
  statsBtn: {
    marginTop: 24,
    paddingVertical: 12,
  },
  statsText: {
    fontSize: 14,
    color: '#666',
  },
});

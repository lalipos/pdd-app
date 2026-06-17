import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Category } from '../types';

interface Props {
  onSelect: (cat: Category) => void;
}

export default function CategorySelect({ onSelect }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Категория прав</Text>
        <TouchableOpacity style={styles.card} onPress={() => onSelect('AB')}>
          <Text style={styles.cardTitle}>A / B</Text>
          <Text style={styles.cardSub}>Мотоциклы и легковые</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => onSelect('CD')}>
          <Text style={styles.cardTitle}>C / D</Text>
          <Text style={styles.cardSub}>Грузовые и автобусы</Text>
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
    paddingTop: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 40,
  },
  card: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  cardSub: {
    fontSize: 15,
    color: '#666',
  },
});

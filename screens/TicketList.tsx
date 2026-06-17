import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Screen } from '../types';

interface Props {
  onNavigate: (screen: Screen) => void;
}

export default function TicketList({ onNavigate }: Props) {
  const tickets = Array.from({ length: 40 }, (_, i) => i + 1);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate({ name: 'home' })}>
          <Text style={styles.back}>← Назад</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Билеты</Text>
      </View>
      <ScrollView contentContainerStyle={styles.grid}>
        {tickets.map(n => (
          <TouchableOpacity
            key={n}
            style={styles.cell}
            onPress={() => onNavigate({ name: 'session', mode: 'ticket', ticketNumber: n })}
          >
            <Text style={styles.cellText}>{n}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 16,
  },
  back: {
    fontSize: 16,
    color: '#2563EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  cell: {
    width: '22%',
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1a1a1a',
  },
});

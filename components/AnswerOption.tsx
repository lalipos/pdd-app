import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Answer } from '../types';
import { getLengthMarker, LengthMarker, parseText, findKeyword, FlatToken } from '../utils/textProcessing';

interface Props {
  answer: Answer;
  allAnswers: Answer[];
  selected: boolean;
  revealed: boolean;
  onPress: () => void;
}

function renderTokens(tokens: FlatToken[]) {
  return tokens.map((token, i) => {
    if (token.style === 'blue') {
      return <Text key={i} style={{ color: '#2563EB', fontWeight: '700' }}>{token.text}</Text>;
    }
    return <Text key={i}>{token.text}</Text>;
  });
}

export default function AnswerOption({ answer, allAnswers, selected, revealed, onPress }: Props) {
  const marker: LengthMarker = answer.is_correct ? getLengthMarker(allAnswers) : null;

  const keyword = answer.is_correct ? findKeyword(answer.answer_text) : null;
  const tokens = parseText(answer.answer_text, keyword);

  let bgColor = '#fff';
  let borderColor = '#e0e0e0';
  if (revealed) {
    if (answer.is_correct) {
      bgColor = '#f0fdf4';
      borderColor = '#16A34A';
    } else if (selected && !answer.is_correct) {
      bgColor = '#fef2f2';
      borderColor = '#DC2626';
    }
  } else if (selected) {
    bgColor = '#f0f4ff';
    borderColor = '#2563EB';
  }

  const showBrackets = answer.is_correct && marker !== null;
  const barStyle = marker === 'long' ? styles.barLong : styles.barShort;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: bgColor, borderColor }]}
      onPress={onPress}
      disabled={revealed}
      activeOpacity={0.75}
    >
      <View style={styles.row}>
        {showBrackets && <View style={[styles.bar, barStyle]} />}
        <Text style={[styles.text, styles.textFlex]}>
          {answer.is_correct ? renderTokens(tokens) : answer.answer_text}
        </Text>
        {showBrackets && <View style={[styles.bar, barStyle]} />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  text: {
    fontSize: 16,
    color: '#1a1a1a',
    lineHeight: 22,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textFlex: {
    flex: 1,
  },
  bar: {
    width: 3,
    borderRadius: 1.5,
    backgroundColor: '#1a1a1a',
    marginHorizontal: 8,
  },
  barLong: {
    height: 18,
  },
  barShort: {
    height: 9,
  },
});

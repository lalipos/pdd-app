import React from 'react';
import { Text, TextStyle } from 'react-native';
import { parseText, findKeyword } from '../utils/textProcessing';

interface Props {
  text: string;
  baseStyle?: TextStyle;
  usePatterns?: boolean;
}

export default function StyledText({ text, baseStyle, usePatterns = true }: Props) {
  if (!usePatterns) {
    return <Text style={baseStyle}>{text}</Text>;
  }

  const keyword = findKeyword(text);
  const tokens = parseText(text, keyword);

  return (
    <Text style={baseStyle}>
      {tokens.map((token, i) => {
        if (token.style === 'blue') {
          return (
            <Text key={i} style={{ color: '#2563EB', fontWeight: '700' }}>
              {token.text}
            </Text>
          );
        }
        return <Text key={i}>{token.text}</Text>;
      })}
    </Text>
  );
}

import React from "react";
import { StyleProp, StyleSheet, Text, TextStyle } from "react-native";

import { findHighlightSegments } from "../services/search";

interface HighlightedTextProps {
  text: string;
  query: string;
  style?: StyleProp<TextStyle>;
  highlightStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

export default function HighlightedText({
  text,
  query,
  style,
  highlightStyle,
  numberOfLines,
}: HighlightedTextProps) {
  const segments = findHighlightSegments(text || "", query);

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {segments.map((segment, index) => (
        <Text
          key={index}
          style={segment.highlight ? [styles.highlight, highlightStyle] : undefined}
        >
          {segment.text}
        </Text>
      ))}
    </Text>
  );
}

const styles = StyleSheet.create({
  highlight: {
    backgroundColor: "#fde047",
    color: "#0f172a",
  },
});

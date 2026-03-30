import React, { useEffect, useState } from 'react';

function normalizeWordKey(word) {
  return typeof word === 'string'
    ? word.replace(/^\ufeff/, '').trim().toLowerCase()
    : '';
}

function extractWordFromCsvLine(line) {
  const normalizedLine = typeof line === 'string' ? line.replace(/^\ufeff/, '') : '';
  const firstCommaIndex = normalizedLine.indexOf(',');

  if (firstCommaIndex === -1) {
    return normalizedLine.trim();
  }

  return normalizedLine.slice(0, firstCommaIndex).trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function highlightWordInSentence(sentence, word) {
  const text = typeof sentence === 'string' ? sentence : '';
  const targetWord = typeof word === 'string' ? word.trim() : '';

  if (!text || !targetWord) {
    return text;
  }

  const pattern = new RegExp(`(^|[^A-Za-z])(${escapeRegExp(targetWord)})(?=[^A-Za-z]|$)`, 'gi');
  const parts = [];
  let lastIndex = 0;
  let match;
  let matchKey = 0;

  while ((match = pattern.exec(text)) !== null) {
    const prefix = match[1] || '';
    const matchedWord = match[2];
    const wordStartIndex = match.index + prefix.length;

    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (prefix) {
      parts.push(prefix);
    }

    parts.push(
      <strong key={`${normalizeWordKey(targetWord)}-${wordStartIndex}-${matchKey}`}>
        {matchedWord}
      </strong>
    );

    lastIndex = wordStartIndex + matchedWord.length;
    matchKey += 1;
  }

  if (parts.length === 0) {
    return text;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export default function useAwlExampleSentences() {
  const [exampleSentenceMap, setExampleSentenceMap] = useState(() => new Map());

  useEffect(() => {
    let isCancelled = false;

    const loadExampleSentences = async () => {
      try {
        const [csvResponse, sentencesResponse] = await Promise.all([
          fetch('/AWL/AWL.csv'),
          fetch('/AWL/AWL_example_sentences.txt'),
        ]);

        if (!csvResponse.ok || !sentencesResponse.ok) {
          throw new Error('Failed to load AWL example sentence assets.');
        }

        const [csvText, sentencesText] = await Promise.all([
          csvResponse.text(),
          sentencesResponse.text(),
        ]);

        const csvLines = csvText.replace(/^\ufeff/, '').split(/\r?\n/);
        const sentenceLines = sentencesText.replace(/^\ufeff/, '').split(/\r?\n/);
        const nextMap = new Map();

        csvLines.forEach((line, index) => {
          if (!line.trim()) {
            return;
          }

          const word = extractWordFromCsvLine(line);
          const sentence = sentenceLines[index]?.trim();

          if (word && sentence) {
            nextMap.set(normalizeWordKey(word), sentence);
          }
        });

        if (!isCancelled) {
          setExampleSentenceMap(nextMap);
        }
      } catch (error) {
        console.error('Failed to load AWL example sentences:', error);
      }
    };

    loadExampleSentences();

    return () => {
      isCancelled = true;
    };
  }, []);

  const getExampleSentence = (word, fallbackSentence = '') => {
    const directSentence = typeof fallbackSentence === 'string' ? fallbackSentence.trim() : '';

    if (directSentence) {
      return directSentence;
    }

    return exampleSentenceMap.get(normalizeWordKey(word)) || '';
  };

  return {
    getExampleSentence,
  };
}

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'preferred_word_accent';

export const WORD_ACCENT_OPTIONS = [
  {
    key: 'us',
    label: 'American',
    shortLabel: 'US',
    lang: 'en-US',
    menuLabel: 'Play American accent',
  },
  {
    key: 'uk',
    label: 'British',
    shortLabel: 'UK',
    lang: 'en-GB',
    menuLabel: 'Play British accent',
  },
];

const WORD_ACCENT_MAP = Object.fromEntries(
  WORD_ACCENT_OPTIONS.map((option) => [option.key, option])
);

const ACCENT_VOICE_PATTERNS = {
  us: [
    /^en[-_]us$/i,
    /english \(united states\)/i,
    /american/i,
    /united states/i,
  ],
  uk: [
    /^en[-_](gb|uk)$/i,
    /english \(united kingdom\)/i,
    /british/i,
    /great britain/i,
    /united kingdom/i,
  ],
};

function normalizeAccentKey(accentKey) {
  return accentKey === 'uk' ? 'uk' : 'us';
}

function readStoredAccent() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const storedAccent = window.localStorage.getItem(STORAGE_KEY);
    return storedAccent === 'us' || storedAccent === 'uk' ? storedAccent : null;
  } catch {
    return null;
  }
}

export function getWordAccentOption(accentKey) {
  return WORD_ACCENT_MAP[normalizeAccentKey(accentKey)];
}

function findVoiceForAccent(voices, accentKey) {
  const patterns = ACCENT_VOICE_PATTERNS[normalizeAccentKey(accentKey)] || [];

  return (
    voices.find((voice) => patterns.some((pattern) => pattern.test(voice.lang || ''))) ||
    voices.find((voice) => patterns.some((pattern) => pattern.test(voice.name || ''))) ||
    null
  );
}

export default function useWordPronunciation(defaultAccent = 'us') {
  const [selectedAccent, setSelectedAccentState] = useState(
    () => readStoredAccent() || normalizeAccentKey(defaultAccent)
  );
  const [voices, setVoices] = useState([]);

  const isSupported = (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window
  );

  useEffect(() => {
    if (!isSupported || typeof window.speechSynthesis.getVoices !== 'function') {
      return undefined;
    }

    const syncVoices = () => {
      const nextVoices = window.speechSynthesis.getVoices();
      setVoices(Array.isArray(nextVoices) ? nextVoices : []);
    };

    syncVoices();

    if (typeof window.speechSynthesis.addEventListener === 'function') {
      window.speechSynthesis.addEventListener('voiceschanged', syncVoices);

      return () => {
        window.speechSynthesis.removeEventListener?.('voiceschanged', syncVoices);
      };
    }

    const previousHandler = window.speechSynthesis.onvoiceschanged;
    window.speechSynthesis.onvoiceschanged = syncVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = previousHandler;
    };
  }, [isSupported]);

  const setSelectedAccent = (accentKey) => {
    const normalizedAccent = normalizeAccentKey(accentKey);
    setSelectedAccentState(normalizedAccent);

    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, normalizedAccent);
    } catch {
      // Ignore storage failures and keep the in-memory selection.
    }
  };

  const speak = (text, accentKey = selectedAccent) => {
    const normalizedText = typeof text === 'string' ? text.trim() : '';

    if (
      !normalizedText ||
      !isSupported ||
      typeof window.speechSynthesis.speak !== 'function'
    ) {
      return false;
    }

    const accent = getWordAccentOption(accentKey);
    const utterance = new window.SpeechSynthesisUtterance(normalizedText);
    const matchingVoice = findVoiceForAccent(voices, accent.key);

    utterance.lang = accent.lang;
    utterance.rate = 0.8;

    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    window.speechSynthesis.cancel?.();
    window.speechSynthesis.speak(utterance);
    return true;
  };

  return {
    accentOptions: WORD_ACCENT_OPTIONS,
    isSupported,
    selectedAccent,
    setSelectedAccent,
    speak,
  };
}

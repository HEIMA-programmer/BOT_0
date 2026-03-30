import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import WordPronunciationControl from './WordPronunciationControl';
import { renderWithProviders } from '../test/renderWithProviders';

describe('WordPronunciationControl', () => {
  it('renders compact mode with play button and accent label', () => {
    const onSpeak = vi.fn();
    const onAccentChange = vi.fn();

    renderWithProviders(
      <WordPronunciationControl
        text="hypothesis"
        selectedAccent="us"
        onAccentChange={onAccentChange}
        onSpeak={onSpeak}
      />
    );

    expect(screen.getByText('US')).toBeTruthy();
  });

  it('renders learning mode with segmented accent selector', () => {
    const onSpeak = vi.fn();
    const onAccentChange = vi.fn();

    renderWithProviders(
      <WordPronunciationControl
        text="hypothesis"
        mode="learning"
        selectedAccent="us"
        onAccentChange={onAccentChange}
        onSpeak={onSpeak}
      />
    );

    expect(screen.getByRole('radio', { name: /American/i })).toBeTruthy();
    expect(screen.getByRole('radio', { name: /British/i })).toBeTruthy();
  });

  it('calls onSpeak when play button is clicked', () => {
    const onSpeak = vi.fn();

    renderWithProviders(
      <WordPronunciationControl
        text="analysis"
        mode="learning"
        selectedAccent="uk"
        onAccentChange={vi.fn()}
        onSpeak={onSpeak}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Listen/i }));
    expect(onSpeak).toHaveBeenCalledWith('analysis', 'uk');
  });
});

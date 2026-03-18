import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DailyWords from './DailyWords';
import { renderWithProviders } from '../test/renderWithProviders';

const { mockDailyLearningAPI, mockWordBankAPI } = vi.hoisted(() => ({
  mockDailyLearningAPI: {
    getToday: vi.fn(),
    updateWordStatus: vi.fn(),
    getReviewWords: vi.fn(),
    getMasteredWords: vi.fn(),
    getAllWords: vi.fn(),
    getStats: vi.fn(),
    markMastered: vi.fn(),
    addToBank: vi.fn(),
  },
  mockWordBankAPI: {
    getAll: vi.fn(),
  },
}));

vi.mock('../api', () => ({
  dailyLearningAPI: mockDailyLearningAPI,
  wordBankAPI: mockWordBankAPI,
}));

describe('DailyWords page', () => {
  beforeEach(() => {
    Object.values(mockDailyLearningAPI).forEach((fn) => fn.mockReset());
    Object.values(mockWordBankAPI).forEach((fn) => fn.mockReset());
    localStorage.clear();
  });

  it('loads today data and renders sprint 1 vocabulary stats', async () => {
    mockDailyLearningAPI.getToday.mockResolvedValue({
      data: {
        date: '2026-03-18',
        words: [
          {
            id: 11,
            word_id: 1,
            text: 'hypothesis',
            definition: 'A proposed explanation.',
            part_of_speech: 'noun',
            status: 'pending',
          },
        ],
        review_count: 2,
        mastered_count: 1,
        total_words: 12,
      },
    });
    mockWordBankAPI.getAll.mockResolvedValue({ data: { words: [{ word_id: 99 }] } });

    renderWithProviders(<DailyWords />);

    expect(await screen.findByText('Daily Words')).toBeTruthy();
    await waitFor(() => expect(mockDailyLearningAPI.getToday).toHaveBeenCalledWith(10));
    expect(mockWordBankAPI.getAll).toHaveBeenCalled();
    expect(screen.getByText('2026-03-18')).toBeTruthy();
    expect(screen.getByText('1 words to learn today')).toBeTruthy();
    expect(screen.getByText('2 words to review')).toBeTruthy();
    expect(screen.getByText('1 words mastered')).toBeTruthy();
    expect(screen.getByText('View All Words (12)')).toBeTruthy();
  });

  it('opens all words modal and marks a word as mastered', async () => {
    mockDailyLearningAPI.getToday.mockResolvedValue({
      data: {
        date: '2026-03-18',
        words: [],
        review_count: 0,
        mastered_count: 0,
        total_words: 1,
      },
    });
    mockDailyLearningAPI.getAllWords.mockResolvedValue({
      data: {
        words: [
          {
            id: 5,
            text: 'empirical',
            definition: 'Based on observation.',
            progress_status: null,
            in_word_bank: false,
          },
        ],
        total: 1,
        page: 1,
        per_page: 50,
      },
    });
    mockDailyLearningAPI.markMastered.mockResolvedValue({ data: {} });
    mockWordBankAPI.getAll.mockResolvedValue({ data: { words: [] } });

    renderWithProviders(<DailyWords />);

    fireEvent.click(await screen.findByText('View All Words (1)'));

    expect(await screen.findByText('All Words (1)')).toBeTruthy();
    expect(await screen.findByText('empirical')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Mastered/ }));

    await waitFor(() => expect(mockDailyLearningAPI.markMastered).toHaveBeenCalledWith(5));
    expect(await screen.findByText('mastered')).toBeTruthy();
  });
});

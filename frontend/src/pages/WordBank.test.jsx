import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import WordBank from './WordBank';
import { renderWithProviders } from '../test/renderWithProviders';

const { mockWordBankAPI, mockDailyLearningAPI } = vi.hoisted(() => ({
  mockWordBankAPI: {
    getAll: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
    updateMastery: vi.fn(),
    review: vi.fn(),
    getStats: vi.fn(),
  },
  mockDailyLearningAPI: {
    addToBank: vi.fn(),
    getAllWords: vi.fn(),
    getReviewWords: vi.fn(),
    getMasteredWords: vi.fn(),
    markMastered: vi.fn(),
  },
}));

vi.mock('../api', () => ({
  wordBankAPI: mockWordBankAPI,
  dailyLearningAPI: mockDailyLearningAPI,
}));

describe('WordBank page', () => {
  beforeEach(() => {
    Object.values(mockWordBankAPI).forEach((fn) => fn.mockReset());
    Object.values(mockDailyLearningAPI).forEach((fn) => fn.mockReset());
  });

  it('renders saved words and filters them by search term', async () => {
    mockWordBankAPI.getAll.mockResolvedValue({
      data: {
        words: [
          {
            id: 1,
            word_id: 11,
            text: 'hypothesis',
            definition: 'A proposed explanation.',
            added_at: '2026-03-18T10:00:00',
            difficulty_level: 'intermediate',
            part_of_speech: 'noun',
          },
          {
            id: 2,
            word_id: 12,
            text: 'empirical',
            definition: 'Based on observation.',
            added_at: '2026-03-17T10:00:00',
            difficulty_level: 'advanced',
            part_of_speech: 'adjective',
          },
        ],
      },
    });

    renderWithProviders(<WordBank />);

    expect(await screen.findByText('My Word Bank')).toBeTruthy();
    expect(await screen.findByText('hypothesis')).toBeTruthy();
    expect(await screen.findByText('empirical')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('Search words or definitions...'), {
      target: { value: 'hypo' },
    });

    await waitFor(() => {
      expect(screen.getByText('hypothesis')).toBeTruthy();
      expect(screen.queryByText('empirical')).toBeNull();
    });
  });

  it('refreshes the word bank when the refresh button is clicked', async () => {
    mockWordBankAPI.getAll
      .mockResolvedValueOnce({ data: { words: [] } })
      .mockResolvedValueOnce({
        data: {
          words: [
            {
              id: 1,
              word_id: 11,
              text: 'rubric',
              definition: 'A scoring guide.',
              added_at: '2026-03-18T10:00:00',
            },
          ],
        },
      });

    renderWithProviders(<WordBank />);

    expect(await screen.findByText('No words saved yet. Add words from Daily Words!')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Refresh/ }));

    await waitFor(() => expect(mockWordBankAPI.getAll).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('rubric')).toBeTruthy();
  });
});

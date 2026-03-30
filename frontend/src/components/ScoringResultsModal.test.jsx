import React from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ScoringResultsModal from './ScoringResultsModal';
import { renderWithProviders } from '../test/renderWithProviders';

describe('ScoringResultsModal', () => {
  it('shows loading state when scoring', async () => {
    renderWithProviders(
      <ScoringResultsModal
        open={true}
        onClose={vi.fn()}
        scores={null}
        scoringStatus="scoring"
      />
    );

    expect(await screen.findByText(/AI is evaluating/i)).toBeTruthy();
  });

  it('renders scores and feedback when done', async () => {
    const scores = {
      overall_score: 7.5,
      dimensions: {
        grammar: 8,
        vocabulary: 7,
        fluency: 7,
        coherence: 8,
        task_completion: 7,
      },
      strengths: ['Good grammar usage', 'Clear structure'],
      improvements: ['Expand vocabulary range'],
      suggested_phrases: ['In my opinion', 'Furthermore'],
    };

    renderWithProviders(
      <ScoringResultsModal
        open={true}
        onClose={vi.fn()}
        scores={scores}
        scoringStatus="done"
      />
    );

    expect(await screen.findByText('7.5')).toBeTruthy();
    expect(screen.getByText('Good grammar usage')).toBeTruthy();
    expect(screen.getByText('Expand vocabulary range')).toBeTruthy();
  });

  it('does not render when closed', () => {
    renderWithProviders(
      <ScoringResultsModal
        open={false}
        onClose={vi.fn()}
        scores={null}
        scoringStatus="done"
      />
    );

    expect(screen.queryByText(/score/i)).toBeNull();
  });
});

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Listening from './Listening';
import { renderWithProviders } from '../test/renderWithProviders';

const { mockListeningAPI } = vi.hoisted(() => ({
  mockListeningAPI: {
    getCatalog: vi.fn(),
  },
}));

vi.mock('../api', () => ({
  listeningAPI: mockListeningAPI,
}));

describe('Listening page', () => {
  beforeEach(() => {
    mockListeningAPI.getCatalog.mockReset();
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue();
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();
  });

  it('loads listening catalog and lets the user switch level and scenario', async () => {
    mockListeningAPI.getCatalog.mockResolvedValue({
      data: {
        source_count: 10,
        levels: [
          {
            id: 'beginner',
            label: 'Beginner',
            description: 'Build confidence first.',
            clip_count: 4,
            scenarios: [
              {
                id: 'lecture-clips',
                label: 'Lecture Clips',
                description: 'Short lecture excerpts.',
                clip_count: 1,
                clips: [
                  {
                    id: 'beginner-lecture-campus-welcome',
                    title: 'Campus Welcome Lecture',
                    audio_url: '/api/listening/audio/campus-welcome',
                    transcript_preview: 'Welcome to your first lecture...',
                  },
                ],
              },
              {
                id: 'group-discussion',
                label: 'Group Discussion',
                description: 'Follow multiple speakers.',
                clip_count: 1,
                clips: [
                  {
                    id: 'beginner-group-study-circle',
                    title: 'Study Circle Conversation',
                    audio_url: '/api/listening/audio/study-circle',
                    transcript_preview: 'Today our group is comparing ideas...',
                  },
                ],
              },
              {
                id: 'qa-session',
                label: 'Q&A Session',
                description: 'Practice quick questions.',
                clip_count: 1,
                clips: [
                  {
                    id: 'beginner-qa-library-help',
                    title: 'Library Help Desk Q&A',
                    audio_url: '/api/listening/audio/library-help',
                    transcript_preview: 'Can you explain where to find...',
                  },
                ],
              },
              {
                id: 'office-hour',
                label: 'Office Hour',
                description: 'One-on-one support.',
                clip_count: 1,
                clips: [
                  {
                    id: 'beginner-office-advice',
                    title: 'Office Hour Basics',
                    audio_url: '/api/listening/audio/office-basics',
                    transcript_preview: 'Let us review your outline together...',
                  },
                ],
              },
            ],
          },
          {
            id: 'intermediate',
            label: 'Intermediate',
            description: 'Longer and richer clips.',
            clip_count: 4,
            scenarios: [
              {
                id: 'lecture-clips',
                label: 'Lecture Clips',
                description: 'Short lecture excerpts.',
                clip_count: 1,
                clips: [
                  {
                    id: 'intermediate-lecture-research',
                    title: 'Research Methods Overview',
                    audio_url: '/api/listening/audio/research-methods',
                    transcript_preview: 'Methodology helps us compare...',
                  },
                ],
              },
              {
                id: 'group-discussion',
                label: 'Group Discussion',
                description: 'Follow multiple speakers.',
                clip_count: 1,
                clips: [
                  {
                    id: 'intermediate-group-roundtable',
                    title: 'Roundtable on Evidence',
                    audio_url: '/api/listening/audio/evidence-roundtable',
                    transcript_preview: 'I think the evidence is strong because...',
                  },
                ],
              },
              {
                id: 'qa-session',
                label: 'Q&A Session',
                description: 'Practice quick questions.',
                clip_count: 1,
                clips: [
                  {
                    id: 'intermediate-qa-followup',
                    title: 'Seminar Follow-up Questions',
                    audio_url: '/api/listening/audio/seminar-followup',
                    transcript_preview: 'Could you clarify the sample size...',
                  },
                ],
              },
              {
                id: 'office-hour',
                label: 'Office Hour',
                description: 'One-on-one support.',
                clip_count: 1,
                clips: [
                  {
                    id: 'intermediate-office-feedback',
                    title: 'Feedback on Your Draft',
                    audio_url: '/api/listening/audio/draft-feedback',
                    transcript_preview: 'Your argument is clear, but...',
                  },
                ],
              },
            ],
          },
          {
            id: 'advanced',
            label: 'Advanced',
            description: 'Denser academic audio.',
            clip_count: 4,
            scenarios: [
              {
                id: 'lecture-clips',
                label: 'Lecture Clips',
                description: 'Short lecture excerpts.',
                clip_count: 1,
                clips: [
                  {
                    id: 'advanced-lecture-theory',
                    title: 'Theory in Practice',
                    audio_url: '/api/listening/audio/theory-practice',
                    transcript_preview: 'The framework becomes useful when...',
                  },
                ],
              },
              {
                id: 'group-discussion',
                label: 'Group Discussion',
                description: 'Follow multiple speakers.',
                clip_count: 1,
                clips: [
                  {
                    id: 'advanced-group-panel',
                    title: 'Panel Debate on Ethics',
                    audio_url: '/api/listening/audio/panel-ethics',
                    transcript_preview: 'My concern is how we define consent...',
                  },
                ],
              },
              {
                id: 'qa-session',
                label: 'Q&A Session',
                description: 'Practice quick questions.',
                clip_count: 1,
                clips: [
                  {
                    id: 'advanced-qa-colloquium',
                    title: 'Colloquium Question Time',
                    audio_url: '/api/listening/audio/colloquium',
                    transcript_preview: 'How would this apply across contexts...',
                  },
                ],
              },
              {
                id: 'office-hour',
                label: 'Office Hour',
                description: 'One-on-one support.',
                clip_count: 1,
                clips: [
                  {
                    id: 'advanced-office-supervisor',
                    title: 'Supervisor Feedback Session',
                    audio_url: '/api/listening/audio/supervisor-feedback',
                    transcript_preview: 'Your literature review needs a tighter scope...',
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    renderWithProviders(<Listening />);

    expect(await screen.findByText('10 complete audio-transcript pairs')).toBeTruthy();
    await waitFor(() => expect(mockListeningAPI.getCatalog).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Campus Welcome Lecture')).toBeTruthy();

    fireEvent.click(screen.getByText('Advanced'));
    fireEvent.click(screen.getByText('Office Hour'));

    expect((await screen.findAllByText('Supervisor Feedback Session')).length).toBeGreaterThan(0);
    expect(screen.getByText('Questions are coming next')).toBeTruthy();
  });
});

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import Listening from './Listening';

const { mockListeningAPI } = vi.hoisted(() => ({
  mockListeningAPI: {
    getCatalog: vi.fn(),
    getPractice: vi.fn(),
    submitPractice: vi.fn(),
  },
}));

vi.mock('../api', () => ({
  listeningAPI: mockListeningAPI,
}));

const catalogPayload = {
  source_count: 10,
  levels: [
    {
      id: 'beginner',
      label: 'Beginner',
      description: 'Build confidence first.',
      is_available: true,
      clip_count: 2,
      scenarios: [
        {
          id: 'lecture-clips',
          label: 'Lecture Clips',
          description: 'Short lecture excerpts.',
          is_available: true,
          coming_soon: false,
          clip_count: 2,
          clips: [
            {
              id: 'beginner-lecture-campus-welcome',
              title: 'Campus Welcome Lecture',
              audio_url: '/api/listening/audio/campus-welcome',
              source_slug: 'campus-welcome',
              transcript_preview: 'Welcome to your first lecture...',
            },
            {
              id: 'beginner-lecture-library-tour',
              title: 'Library Orientation',
              audio_url: '/api/listening/audio/library-tour',
              source_slug: 'library-tour',
              transcript_preview: 'The library team is here to help...',
            },
          ],
        },
        {
          id: 'group-discussion',
          label: 'Group Discussion',
          description: 'Follow multiple speakers.',
          is_available: false,
          coming_soon: true,
          clip_count: 0,
          clips: [],
        },
        {
          id: 'qa-session',
          label: 'Q&A Session',
          description: 'Practice quick questions.',
          is_available: false,
          coming_soon: true,
          clip_count: 0,
          clips: [],
        },
        {
          id: 'office-hour',
          label: 'Office Hour',
          description: 'One-on-one support.',
          is_available: false,
          coming_soon: true,
          clip_count: 0,
          clips: [],
        },
      ],
    },
    {
      id: 'intermediate',
      label: 'Intermediate',
      description: 'Longer and richer clips.',
      is_available: true,
      clip_count: 1,
      scenarios: [
        {
          id: 'lecture-clips',
          label: 'Lecture Clips',
          description: 'Short lecture excerpts.',
          is_available: true,
          coming_soon: false,
          clip_count: 1,
          clips: [
            {
              id: 'intermediate-lecture-research',
              title: 'Research Methods Overview',
              audio_url: '/api/listening/audio/research-methods',
              source_slug: 'research-methods',
              transcript_preview: 'Methodology helps us compare...',
            },
          ],
        },
        {
          id: 'group-discussion',
          label: 'Group Discussion',
          description: 'Follow multiple speakers.',
          is_available: false,
          coming_soon: true,
          clip_count: 0,
          clips: [],
        },
        {
          id: 'qa-session',
          label: 'Q&A Session',
          description: 'Practice quick questions.',
          is_available: false,
          coming_soon: true,
          clip_count: 0,
          clips: [],
        },
        {
          id: 'office-hour',
          label: 'Office Hour',
          description: 'One-on-one support.',
          is_available: false,
          coming_soon: true,
          clip_count: 0,
          clips: [],
        },
      ],
    },
    {
      id: 'advanced',
      label: 'Advanced',
      description: 'Denser academic audio.',
      is_available: false,
      clip_count: 0,
      scenarios: [
        {
          id: 'lecture-clips',
          label: 'Lecture Clips',
          description: 'Short lecture excerpts.',
          is_available: false,
          coming_soon: true,
          clip_count: 0,
          clips: [],
        },
        {
          id: 'group-discussion',
          label: 'Group Discussion',
          description: 'Follow multiple speakers.',
          is_available: false,
          coming_soon: true,
          clip_count: 0,
          clips: [],
        },
        {
          id: 'qa-session',
          label: 'Q&A Session',
          description: 'Practice quick questions.',
          is_available: false,
          coming_soon: true,
          clip_count: 0,
          clips: [],
        },
        {
          id: 'office-hour',
          label: 'Office Hour',
          description: 'One-on-one support.',
          is_available: false,
          coming_soon: true,
          clip_count: 0,
          clips: [],
        },
      ],
    },
  ],
};

const beginnerPracticePayload = {
  level: { id: 'beginner', label: 'Beginner' },
  scenario: { id: 'lecture-clips', label: 'Lecture Clips' },
  clip: {
    id: 'beginner-lecture-campus-welcome',
    title: 'Campus Welcome Lecture',
    audio_url: '/api/listening/audio/campus-welcome',
    source_slug: 'campus-welcome',
  },
  instructions: 'Listen to the lecture clip and answer the multiple-choice questions.',
  question_count: 2,
  questions: [
    {
      id: 'beginner-campus-welcome-multiple-choice-1',
      number: 1,
      type: 'multiple_choice',
      section_label: 'Multiple choice',
      prompt: 'Who is speaking at the start of the lecture?',
      options: [
        { key: 'A', text: 'A student ambassador' },
        { key: 'B', text: 'A teacher' },
        { key: 'C', text: 'A librarian' },
        { key: 'D', text: 'A visitor' },
      ],
    },
    {
      id: 'beginner-campus-welcome-multiple-choice-2',
      number: 2,
      type: 'multiple_choice',
      section_label: 'Multiple choice',
      prompt: 'What is the main focus of this clip?',
      options: [
        { key: 'A', text: 'Sports schedules' },
        { key: 'B', text: 'Campus orientation' },
        { key: 'C', text: 'Dining hall menus' },
        { key: 'D', text: 'Scholarship forms' },
      ],
    },
  ],
};

const beginnerSubmitPayload = {
  score: 50,
  correct_count: 1,
  total_count: 2,
  transcript: 'Welcome to your first lecture. Today we will cover campus orientation basics.',
  results: [
    {
      id: 'beginner-campus-welcome-multiple-choice-1',
      number: 1,
      type: 'multiple_choice',
      section_label: 'Multiple choice',
      prompt: 'Who is speaking at the start of the lecture?',
      user_response: 'A',
      is_correct: true,
      correct_answer: 'A. A student ambassador',
      explanation: 'The introduction identifies the speaker as a student ambassador.',
      correct_option: 'A',
      options: beginnerPracticePayload.questions[0].options,
    },
    {
      id: 'beginner-campus-welcome-multiple-choice-2',
      number: 2,
      type: 'multiple_choice',
      section_label: 'Multiple choice',
      prompt: 'What is the main focus of this clip?',
      user_response: 'D',
      is_correct: false,
      correct_answer: 'B. Campus orientation',
      explanation: 'The speaker explains orientation activities for new students.',
      correct_option: 'B',
      options: beginnerPracticePayload.questions[1].options,
    },
  ],
};

const intermediatePracticePayload = {
  level: { id: 'intermediate', label: 'Intermediate' },
  scenario: { id: 'lecture-clips', label: 'Lecture Clips' },
  clip: {
    id: 'intermediate-lecture-research',
    title: 'Research Methods Overview',
    audio_url: '/api/listening/audio/research-methods',
    source_slug: 'research-methods',
  },
  instructions: 'Listen carefully, then complete the fill-in-the-blank and short-answer tasks.',
  question_count: 2,
  questions: [
    {
      id: 'intermediate-research-fill-1',
      number: 1,
      type: 'fill_in_the_blank',
      section_label: 'Fill in the blank',
      prompt: 'The professor says research begins with a clear ____.',
    },
    {
      id: 'intermediate-research-short-2',
      number: 2,
      type: 'short_answer',
      section_label: 'Short answer',
      prompt: 'Why does the professor compare surveys and interviews?',
    },
  ],
};

const intermediateSubmitPayload = {
  score: 100,
  correct_count: 2,
  total_count: 2,
  transcript: 'Research begins with a clear question. Surveys and interviews reveal different kinds of evidence.',
  results: [
    {
      id: 'intermediate-research-fill-1',
      number: 1,
      type: 'fill_in_the_blank',
      section_label: 'Fill in the blank',
      prompt: 'The professor says research begins with a clear ____.',
      user_response: 'question',
      is_correct: true,
      correct_answer: 'question',
      explanation: 'The clip states that every study starts with a clear question.',
    },
    {
      id: 'intermediate-research-short-2',
      number: 2,
      type: 'short_answer',
      section_label: 'Short answer',
      prompt: 'Why does the professor compare surveys and interviews?',
      user_response: 'Because they reveal different kinds of evidence.',
      is_correct: true,
      correct_answer: 'Because they reveal different kinds of evidence.',
      explanation: 'The comparison highlights the strengths of each method.',
    },
  ],
};

function renderListening(initialEntry = '/listening') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AntdApp>
        <Routes>
          <Route path="/listening" element={<Listening />} />
          <Route path="/listening/:levelId" element={<Listening />} />
        </Routes>
      </AntdApp>
    </MemoryRouter>
  );
}

describe('Listening page', () => {
  beforeEach(() => {
    mockListeningAPI.getCatalog.mockReset();
    mockListeningAPI.getPractice.mockReset();
    mockListeningAPI.submitPractice.mockReset();

    mockListeningAPI.getCatalog.mockResolvedValue({ data: catalogPayload });
    mockListeningAPI.getPractice.mockImplementation((levelId) => Promise.resolve({
      data: levelId === 'intermediate' ? intermediatePracticePayload : beginnerPracticePayload,
    }));
    mockListeningAPI.submitPractice.mockImplementation((levelId) => Promise.resolve({
      data: levelId === 'intermediate' ? intermediateSubmitPayload : beginnerSubmitPayload,
    }));

    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue();
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();
  });

  it('loads the landing page and navigates into the beginner level detail view', async () => {
    renderListening('/listening');

    expect(await screen.findByText('Choose your listening level')).toBeTruthy();
    fireEvent.click(screen.getByText('Beginner'));

    expect(await screen.findByText('Beginner Listening Practice')).toBeTruthy();
    expect(await screen.findByText('Who is speaking at the start of the lecture?')).toBeTruthy();

    await waitFor(() => {
      expect(mockListeningAPI.getPractice).toHaveBeenCalledWith(
        'beginner',
        'lecture-clips',
        'campus-welcome'
      );
    });
  });

  it('submits beginner multiple-choice answers and shows results with the transcript', async () => {
    renderListening('/listening/beginner');

    expect(await screen.findByText('Who is speaking at the start of the lecture?')).toBeTruthy();

    fireEvent.click(screen.getByText('A. A student ambassador'));
    fireEvent.click(screen.getByText('D. Scholarship forms'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit answers' }));

    await waitFor(() => {
      expect(mockListeningAPI.submitPractice).toHaveBeenCalledWith(
        'beginner',
        'lecture-clips',
        'campus-welcome',
        {
          'beginner-campus-welcome-multiple-choice-1': 'A',
          'beginner-campus-welcome-multiple-choice-2': 'D',
        }
      );
    });

    expect(await screen.findByText('Score')).toBeTruthy();
    expect(
      await screen.findByText((_, node) => node?.textContent === '50%')
    ).toBeTruthy();
    expect(screen.getAllByText('A. A student ambassador').length).toBeGreaterThan(0);
    expect(screen.getAllByText('B. Campus orientation').length).toBeGreaterThan(0);
    expect(screen.getByText('Transcript')).toBeTruthy();
    expect(screen.getAllByText(/Welcome to your first lecture/).length).toBeGreaterThan(0);
  });

  it('handles intermediate fill-in-the-blank and short-answer submission', async () => {
    renderListening('/listening/intermediate');

    expect(await screen.findByText('The professor says research begins with a clear ____.')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('Type your answer here'), {
      target: { value: 'question' },
    });
    fireEvent.change(screen.getByPlaceholderText('Write a short answer'), {
      target: { value: 'Because they reveal different kinds of evidence.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit answers' }));

    await waitFor(() => {
      expect(mockListeningAPI.submitPractice).toHaveBeenCalledWith(
        'intermediate',
        'lecture-clips',
        'research-methods',
        {
          'intermediate-research-fill-1': 'question',
          'intermediate-research-short-2': 'Because they reveal different kinds of evidence.',
        }
      );
    });

    expect(
      await screen.findByText((_, node) => node?.textContent === '100%')
    ).toBeTruthy();
    expect(
      screen.getAllByText('Because they reveal different kinds of evidence.').length
    ).toBeGreaterThan(0);
    expect(screen.getByText(/Research begins with a clear question/)).toBeTruthy();
  });
});

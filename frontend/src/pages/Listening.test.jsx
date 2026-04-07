import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import Listening from './Listening';

const { mockListeningAPI, mockProgressAPI } = vi.hoisted(() => ({
  mockListeningAPI: {
    getCatalog: vi.fn(),
    getPractice: vi.fn(),
    submitPractice: vi.fn(),
  },
  mockProgressAPI: {
    getDashboard: vi.fn(),
    trackTime: vi.fn(),
  },
}));

vi.mock('../api', () => ({
  listeningAPI: mockListeningAPI,
  progressAPI: mockProgressAPI,
}));

const catalogPayload = {
  source_count: 10,
  levels: [
    {
      id: 'beginner',
      label: 'Beginner',
      description: 'Build confidence first.',
      is_available: true,
      clip_count: 5,
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
          is_available: true,
          coming_soon: false,
          clip_count: 1,
          clips: [
            {
              id: 'beginner-group-discussion-best-way-to-learn-english',
              title: 'Best Way To Learn English',
              audio_url: '/api/listening/audio/best-way-to-learn-english',
              source_slug: 'best-way-to-learn-english',
              transcript_preview: 'Tom says the best way to learn English is to live in an English country...',
            },
          ],
        },
        {
          id: 'qa-session',
          label: 'Q&A Session',
          description: 'Practice quick questions.',
          is_available: true,
          coming_soon: false,
          clip_count: 1,
          clips: [
            {
              id: 'beginner-qa-session-big-family',
              title: 'Big Family',
              audio_url: '/api/listening/audio/big-family',
              source_slug: 'big-family',
              transcript_preview: 'Mark asks Sorie about growing up in a big family...',
            },
          ],
        },
        {
          id: 'office-hour',
          label: 'Office Hour',
          description: 'One-on-one support.',
          is_available: true,
          coming_soon: false,
          clip_count: 1,
          clips: [
            {
              id: 'beginner-office-hour-grades',
              title: 'Grades',
              audio_url: '/api/listening/audio/grades',
              source_slug: 'grades',
              transcript_preview: 'Todd asks Nydja whether there should be no grades...',
            },
          ],
        },
      ],
    },
    {
      id: 'intermediate',
      label: 'Intermediate',
      description: 'Longer and richer clips.',
      is_available: true,
      clip_count: 4,
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
          is_available: true,
          coming_soon: false,
          clip_count: 1,
          clips: [
            {
              id: 'intermediate-group-discussion-best-way-to-learn-english',
              title: 'Best Way To Learn English',
              audio_url: '/api/listening/audio/best-way-to-learn-english',
              source_slug: 'best-way-to-learn-english',
              transcript_preview: 'Tom says the best way to learn English is to live in an English country...',
            },
          ],
        },
        {
          id: 'qa-session',
          label: 'Q&A Session',
          description: 'Practice quick questions.',
          is_available: true,
          coming_soon: false,
          clip_count: 1,
          clips: [
            {
              id: 'intermediate-qa-session-big-family',
              title: 'Big Family',
              audio_url: '/api/listening/audio/big-family',
              source_slug: 'big-family',
              transcript_preview: 'Mark asks Sorie about growing up in a big family...',
            },
          ],
        },
        {
          id: 'office-hour',
          label: 'Office Hour',
          description: 'One-on-one support.',
          is_available: true,
          coming_soon: false,
          clip_count: 1,
          clips: [
            {
              id: 'intermediate-office-hour-grades',
              title: 'Grades',
              audio_url: '/api/listening/audio/grades',
              source_slug: 'grades',
              transcript_preview: 'Todd asks Nydja whether there should be no grades...',
            },
          ],
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
  instructions: 'Listen to the recording and answer the multiple-choice questions.',
  question_count: 2,
  saved_attempt: null,
  attempt_history: [],
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

const libraryPracticePayload = {
  level: { id: 'beginner', label: 'Beginner' },
  scenario: { id: 'lecture-clips', label: 'Lecture Clips' },
  clip: {
    id: 'beginner-lecture-library-tour',
    title: 'Library Orientation',
    audio_url: '/api/listening/audio/library-tour',
    source_slug: 'library-tour',
  },
  instructions: 'Listen to the recording and answer the multiple-choice questions.',
  question_count: 1,
  saved_attempt: null,
  attempt_history: [],
  questions: [
    {
      id: 'beginner-library-tour-multiple-choice-1',
      number: 1,
      type: 'multiple_choice',
      section_label: 'Multiple choice',
      prompt: 'Who leads the library tour?',
      options: [
        { key: 'A', text: 'A professor' },
        { key: 'B', text: 'A librarian' },
        { key: 'C', text: 'A classmate' },
        { key: 'D', text: 'A coach' },
      ],
    },
  ],
};

const groupDiscussionPracticePayload = {
  level: { id: 'beginner', label: 'Beginner' },
  scenario: { id: 'group-discussion', label: 'Group Discussion' },
  clip: {
    id: 'beginner-group-discussion-best-way-to-learn-english',
    title: 'Best Way To Learn English',
    audio_url: '/api/listening/audio/best-way-to-learn-english',
    source_slug: 'best-way-to-learn-english',
  },
  instructions: 'Listen to the recording and answer the multiple-choice questions.',
  question_count: 1,
  saved_attempt: null,
  attempt_history: [],
  questions: [
    {
      id: 'beginner-best-way-to-learn-english-multiple-choice-1',
      number: 1,
      type: 'multiple_choice',
      section_label: 'Multiple choice',
      prompt: 'According to Tom, what is the best way to learn English?',
      options: [
        { key: 'A', text: 'Only memorize grammar rules' },
        { key: 'B', text: 'Live in an English-speaking country and make English friends' },
        { key: 'C', text: 'Watch one movie every month' },
        { key: 'D', text: 'Study alone without speaking' },
      ],
    },
  ],
};

const officeHourPracticePayload = {
  level: { id: 'beginner', label: 'Beginner' },
  scenario: { id: 'office-hour', label: 'Office Hour' },
  clip: {
    id: 'beginner-office-hour-grades',
    title: 'Grades',
    audio_url: '/api/listening/audio/grades',
    source_slug: 'grades',
  },
  instructions: 'Listen to the recording and answer the multiple-choice questions.',
  question_count: 1,
  saved_attempt: null,
  attempt_history: [],
  questions: [
    {
      id: 'beginner-grades-multiple-choice-1',
      number: 1,
      type: 'multiple_choice',
      section_label: 'Multiple choice',
      prompt: 'How does Todd describe the idea of having no grades?',
      options: [
        { key: 'A', text: 'As a very competitive system' },
        { key: 'B', text: 'As a binary system of achievement' },
        { key: 'C', text: 'As a way to earn extra credit' },
        { key: 'D', text: 'As a system only for colleges' },
      ],
    },
  ],
};

const beginnerSubmitPayload = {
  score: 50,
  correct_count: 1,
  total_count: 2,
  transcript: 'Welcome to your first lecture. Today we will cover campus orientation basics.',
  attempt_history: [
    {
      id: 101,
      score: 50,
      completed_at: '2026-04-08T10:30:00Z',
    },
  ],
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
  saved_attempt: null,
  attempt_history: [],
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
  attempt_history: [
    {
      id: 201,
      score: 100,
      completed_at: '2026-04-08T11:00:00Z',
    },
  ],
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

async function selectAudioPractice() {
  const audioCard = await screen.findByText('Audio Practice');
  fireEvent.click(audioCard);
}

describe('Listening page', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockListeningAPI.getCatalog.mockReset();
    mockListeningAPI.getPractice.mockReset();
    mockListeningAPI.submitPractice.mockReset();
    mockProgressAPI.trackTime.mockReset();

    mockListeningAPI.getCatalog.mockResolvedValue({ data: catalogPayload });
    mockListeningAPI.getPractice.mockImplementation((levelId, scenarioId, sourceSlug) => {
      if (scenarioId === 'office-hour') {
        return Promise.resolve({ data: officeHourPracticePayload });
      }
      if (scenarioId === 'group-discussion') {
        return Promise.resolve({ data: groupDiscussionPracticePayload });
      }
      if (levelId === 'intermediate') {
        return Promise.resolve({ data: intermediatePracticePayload });
      }
      if (sourceSlug === 'library-tour') {
        return Promise.resolve({ data: libraryPracticePayload });
      }
      return Promise.resolve({ data: beginnerPracticePayload });
    });
    mockListeningAPI.submitPractice.mockImplementation((levelId) => Promise.resolve({
      data: levelId === 'intermediate' ? intermediateSubmitPayload : beginnerSubmitPayload,
    }));

    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue();
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();
  });

  it('loads the landing page and navigates into the beginner level detail view', async () => {
    renderListening('/listening');
    await selectAudioPractice();

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

  it('shows Beginner and Advanced on the landing page and uses intermediate data for Advanced', async () => {
    renderListening('/listening');
    await selectAudioPractice();

    expect(await screen.findByText('Choose your listening level')).toBeTruthy();
    expect(screen.getByText('Beginner')).toBeTruthy();
    expect(screen.getByText('Advanced')).toBeTruthy();
    expect(screen.queryByText('Intermediate')).toBeNull();

    fireEvent.click(screen.getByText('Advanced'));

    expect(await screen.findByText('Advanced Listening Practice')).toBeTruthy();

    await waitFor(() => {
      expect(mockListeningAPI.getPractice).toHaveBeenCalledWith(
        'intermediate',
        'lecture-clips',
        'research-methods'
      );
    });
  });

  it('switches to the group discussion scenario and loads its practice questions', async () => {
    renderListening('/listening/beginner?type=audio');

    expect(await screen.findByText('Who is speaking at the start of the lecture?')).toBeTruthy();

    fireEvent.click(screen.getAllByText('Group Discussion')[0]);

    expect(
      await screen.findByText('According to Tom, what is the best way to learn English?')
    ).toBeTruthy();

    await waitFor(() => {
      expect(mockListeningAPI.getPractice).toHaveBeenLastCalledWith(
        'beginner',
        'group-discussion',
        'best-way-to-learn-english'
      );
    });
  });

  it('switches to the office hour scenario and loads its practice questions', async () => {
    renderListening('/listening/beginner?type=audio');

    expect(await screen.findByText('Who is speaking at the start of the lecture?')).toBeTruthy();

    fireEvent.click(screen.getAllByText('Office Hour')[0]);

    expect(
      await screen.findByText('How does Todd describe the idea of having no grades?')
    ).toBeTruthy();

    await waitFor(() => {
      expect(mockListeningAPI.getPractice).toHaveBeenLastCalledWith(
        'beginner',
        'office-hour',
        'grades'
      );
    });
  });

  it('submits beginner multiple-choice answers and shows results with the transcript', async () => {
    renderListening('/listening/beginner?type=audio');

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
    renderListening('/listening/intermediate?type=audio');

    expect(await screen.findByText('Advanced Listening Practice')).toBeTruthy();
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

  it('shows attempt history for the selected recording in English', async () => {
    mockListeningAPI.getPractice.mockResolvedValueOnce({
      data: {
        ...beginnerPracticePayload,
        attempt_history: [
          {
            id: 301,
            score: 80,
            completed_at: '2026-04-07T09:30:00Z',
          },
          {
            id: 302,
            score: 60,
            completed_at: '2026-04-05T08:15:00Z',
          },
        ],
      },
    });

    renderListening('/listening/beginner?type=audio');

    expect(await screen.findByText('Who is speaking at the start of the lecture?')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /History/i }));

    expect(await screen.findByText('Attempt history')).toBeTruthy();
    expect(screen.getByText('Accuracy 80%')).toBeTruthy();
    expect(screen.getByText('Accuracy 60%')).toBeTruthy();
    expect(screen.getByText('Previous scores for this recording.')).toBeTruthy();
  });

  it('preserves answers when switching between clips and restores prior submission results', async () => {
    renderListening('/listening/beginner?type=audio');

    expect(await screen.findByText('Who is speaking at the start of the lecture?')).toBeTruthy();

    fireEvent.click(screen.getByText('A. A student ambassador'));
    fireEvent.click(screen.getByText('D. Scholarship forms'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit answers' }));

    expect(await screen.findByText((_, node) => node?.textContent === '50%')).toBeTruthy();

    fireEvent.click(screen.getByText('Library Orientation'));
    expect(await screen.findByText('Who leads the library tour?')).toBeTruthy();

    fireEvent.click(screen.getByText('Campus Welcome Lecture'));
    expect(await screen.findByText('Who is speaking at the start of the lecture?')).toBeTruthy();
    expect(screen.getByText((_, node) => node?.textContent === '50%')).toBeTruthy();

    const selectedOption = document.querySelector('input[value="A"]');
    expect(selectedOption?.checked).toBe(true);
  });

  it('restores saved answers and results after leaving the page and coming back', async () => {
    const firstRender = renderListening('/listening/beginner?type=audio');

    expect(await screen.findByText('Who is speaking at the start of the lecture?')).toBeTruthy();

    fireEvent.click(screen.getByText('A. A student ambassador'));
    fireEvent.click(screen.getByText('D. Scholarship forms'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit answers' }));

    expect(await screen.findByText((_, node) => node?.textContent === '50%')).toBeTruthy();

    firstRender.unmount();

    renderListening('/listening/beginner?type=audio');

    expect(await screen.findByText('Who is speaking at the start of the lecture?')).toBeTruthy();
    expect(await screen.findByText((_, node) => node?.textContent === '50%')).toBeTruthy();

    const selectedOption = document.querySelector('input[value="A"]');
    expect(selectedOption?.checked).toBe(true);
  });

  it('restores saved submission data returned by the backend', async () => {
    mockListeningAPI.getPractice.mockResolvedValueOnce({
      data: {
        ...beginnerPracticePayload,
        attempt_history: [
          {
            id: 401,
            score: 50,
            completed_at: '2026-04-08T10:30:00Z',
          },
        ],
        saved_attempt: {
          answers: {
            'beginner-campus-welcome-multiple-choice-1': 'A',
            'beginner-campus-welcome-multiple-choice-2': 'D',
          },
          score: 50,
          correct_count: 1,
          total_count: 2,
          transcript: beginnerSubmitPayload.transcript,
          results: beginnerSubmitPayload.results,
        },
      },
    });

    renderListening('/listening/beginner?type=audio');

    expect(await screen.findByText('Who is speaking at the start of the lecture?')).toBeTruthy();
    expect(await screen.findByText((_, node) => node?.textContent === '50%')).toBeTruthy();

    const selectedOption = document.querySelector('input[value="A"]');
    expect(selectedOption?.checked).toBe(true);
  });
});

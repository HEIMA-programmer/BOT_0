// Mock data for development — used before backend is ready

export const mockDailyWords = {
  date: new Date().toISOString().split('T')[0],
  words: [
    {
      id: 1,
      text: 'hypothesis',
      definition: 'A supposition or proposed explanation made on the basis of limited evidence as a starting point for further investigation.',
      example_sentence: 'The researcher proposed a new hypothesis about climate change.',
      part_of_speech: 'noun',
      difficulty_level: 'intermediate',
      audio_available: true,
    },
    {
      id: 2,
      text: 'methodology',
      definition: 'A system of methods used in a particular area of study or activity.',
      example_sentence: 'The paper outlines the methodology used for data collection.',
      part_of_speech: 'noun',
      difficulty_level: 'intermediate',
      audio_available: true,
    },
    {
      id: 3,
      text: 'empirical',
      definition: 'Based on, concerned with, or verifiable by observation or experience rather than theory.',
      example_sentence: 'The study provides empirical evidence supporting the theory.',
      part_of_speech: 'adjective',
      difficulty_level: 'advanced',
      audio_available: true,
    },
    {
      id: 4,
      text: 'paradigm',
      definition: 'A typical example or pattern of something; a model.',
      example_sentence: 'This discovery led to a paradigm shift in the field of physics.',
      part_of_speech: 'noun',
      difficulty_level: 'advanced',
      audio_available: true,
    },
    {
      id: 5,
      text: 'synthesize',
      definition: 'To combine a number of things into a coherent whole.',
      example_sentence: 'The literature review aims to synthesize existing research on the topic.',
      part_of_speech: 'verb',
      difficulty_level: 'intermediate',
      audio_available: true,
    },
  ],
};

export const mockWordBank = {
  words: [
    {
      id: 1,
      word_id: 1,
      text: 'hypothesis',
      definition: 'A supposition or proposed explanation made on the basis of limited evidence.',
      added_at: '2026-03-15T10:00:00',
      mastery_level: 0,
    },
    {
      id: 2,
      word_id: 3,
      text: 'empirical',
      definition: 'Based on observation or experience rather than theory.',
      added_at: '2026-03-15T10:05:00',
      mastery_level: 1,
    },
  ],
};

export const mockUser = {
  id: 1,
  username: 'demo_user',
  email: 'demo@example.com',
};

import axios from 'axios';

const baseURL = import.meta.env.DEV
  ? '/api'
  : (import.meta.env.VITE_API_BASE_URL || '/api');

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

// Daily Words APIs (legacy)
export const dailyWordsAPI = {
  getWords: (date) => api.get('/daily-words', { params: { date } }),
};

// Daily Learning APIs
export const dailyLearningAPI = {
  getToday: (count) => api.get('/daily-learning/today', { params: { count } }),
  updateWordStatus: (progressId, status) =>
    api.post('/daily-learning/word-status', { progress_id: progressId, status }),
  getReviewWords: () => api.get('/daily-learning/review-words'),
  getMasteredWords: () => api.get('/daily-learning/mastered-words'),
  getAllWords: (page, perPage, search) =>
    api.get('/daily-learning/all-words', { params: { page, per_page: perPage, search } }),
  getStats: () => api.get('/daily-learning/stats'),
  markMastered: (wordId) => api.post('/daily-learning/mark-mastered', { word_id: wordId }),
  addToBank: (wordId) => api.post('/daily-learning/add-to-bank', { word_id: wordId }),
};

// Word Bank APIs
export const wordBankAPI = {
  getAll: () => api.get('/word-bank'),
  add: (wordData) => api.post('/word-bank', wordData),
  remove: (entryId) => api.delete(`/word-bank/${entryId}`),
  updateMastery: (entryId, level) =>
   api.patch(`/word-bank/${entryId}`, { mastery_level: level }),
  review: (entryId, knewIt) =>
   api.post(`/word-bank/${entryId}/review`, { knew_it: knewIt }),
  getStats: () => api.get('/word-bank/stats'),
};

// Listening APIs
export const listeningAPI = {
  getCatalog: () => api.get('/listening/clips'),
  getPractice: (levelId, scenarioId, sourceSlug) =>
    api.get(`/listening/quiz/${levelId}/${scenarioId}/${sourceSlug}`),
  submitPractice: (levelId, scenarioId, sourceSlug, answers) =>
    api.post(`/listening/quiz/${levelId}/${scenarioId}/${sourceSlug}/submit`, { answers }),
};

export default api;

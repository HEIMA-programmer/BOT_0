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
  submitPractice: (levelId, scenarioId, sourceSlug, answers, timeSpent) =>
    api.post(`/listening/quiz/${levelId}/${scenarioId}/${sourceSlug}/submit`, {
      answers,
      time_spent: timeSpent,
    }),
};

// Forum APIs
export const forumAPI = {
  getPosts: (params) => api.get('/forum/posts', { params }),
  getPost: (id) => api.get(`/forum/posts/${id}`),
  createPost: (formData) =>
    api.post('/forum/posts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deletePost: (id) => api.delete(`/forum/posts/${id}`),
  addComment: (postId, content) =>
    api.post(`/forum/posts/${postId}/comments`, { content }),
  deleteComment: (commentId) => api.delete(`/forum/comments/${commentId}`),
  forwardPost: (postId, comment) =>
    api.post(`/forum/posts/${postId}/forward`, { comment }),
  getMyPosts: (params) => api.get('/forum/my-posts', { params }),
};

export const progressAPI = {
  getDashboard: () => api.get('/progress/dashboard'),
  trackTime: (payload) => api.post('/progress/track-time', payload),
};

// Follow Along APIs
export const followAlongAPI = {
  wordPractice: (audio, word, mimeType) =>
    api.post('/follow-along/word', { audio, word, mimeType }),
  sentencePractice: (audio, sentence, mimeType) =>
    api.post('/follow-along/sentence', { audio, sentence, mimeType }),
  getRecords: () => api.get('/follow-along/records'),
  getStats: () => api.get('/follow-along/stats'),
  checkConfig: () => api.get('/follow-along/config-check'),
};

export default api;

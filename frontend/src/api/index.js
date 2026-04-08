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
  updateUsername: (username) => api.patch('/auth/username', { username }),
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
  updatePost: (id, data) => api.patch(`/forum/posts/${id}`, data),
  deletePost: (id) => api.delete(`/forum/posts/${id}`),
  addComment: (postId, content) =>
    api.post(`/forum/posts/${postId}/comments`, { content }),
  deleteComment: (commentId) => api.delete(`/forum/comments/${commentId}`),
  forwardPost: (postId, comment, zone) =>
    api.post(`/forum/posts/${postId}/forward`, { comment, zone }),
  getMyPosts: (params) => api.get('/forum/my-posts', { params }),
  getPendingPosts: (params) => api.get('/forum/admin/pending-posts', { params }),
  reviewPost: (id, data) => api.post(`/forum/admin/posts/${id}/review`, data),
  pinPost: (id, isPinned) => api.post(`/forum/admin/posts/${id}/pin`, { is_pinned: isPinned }),
  getRejectionReasons: () => api.get('/forum/admin/rejection-reasons'),
};

export const progressAPI = {
  getDashboard: () => api.get('/progress/dashboard'),
  trackTime: (payload) => api.post('/progress/track-time', payload),
};

// Chat History APIs
export const chatHistoryAPI = {
  createSession: (data) => api.post('/chat-history/sessions', data),
  getSessions: (params) => api.get('/chat-history/sessions', { params }),
  getSession: (sessionId) => api.get(`/chat-history/sessions/${sessionId}`),
  saveMessages: (sessionId, messages) =>
    api.post(`/chat-history/sessions/${sessionId}/messages`, { messages }),
  endSession: (sessionId, report) =>
    api.put(`/chat-history/sessions/${sessionId}/end`, { report }),
  getScenarioOptions: (scenarioType) =>
    api.get(`/chat-history/scenarios/${scenarioType}`),
  getScenarioPrompt: (data) => api.post('/chat-history/scenario-prompt', data),
};

// Room APIs
export const roomAPI = {
  list:       (params)  => api.get('/rooms', { params }),
  create:     (data)    => api.post('/rooms', data),
  join:       (code)    => api.post('/rooms/join', { invite_code: code }),
  getRoom:    (roomId)  => api.get(`/rooms/${roomId}`),
  leave:      (roomId, data) => api.delete(`/rooms/${roomId}/members/me`, { data }),
  getRecords: ()        => api.get('/rooms/records'),
  getAgoraToken: (roomId) => api.get(`/rooms/${roomId}/agora-token`),
  getGameQuestions: (type, count) => api.get('/rooms/game-questions', { params: { type, count } }),
  getGameRecord: (recordId) => api.get(`/rooms/game-records/${recordId}`),
};

// Friends APIs
export const friendsAPI = {
  list: () => api.get('/friends/'),
  getRequests: () => api.get('/friends/requests'),
  search: (email) => api.get('/friends/search', { params: { email } }),
  sendRequest: (receiverEmail) => api.post('/friends/request', { receiver_email: receiverEmail }),
  accept: (requestId) => api.post('/friends/accept', { request_id: requestId }),
  reject: (requestId) => api.post('/friends/reject', { request_id: requestId }),
  remove: (friendUserId) => api.delete(`/friends/${friendUserId}`),
};

// Structured Speaking history APIs
export const speakingAPI = {
  getSessions: (params) => api.get('/speaking/sessions', { params }),
  getSession: (id) => api.get(`/speaking/sessions/${id}`),
  deleteSession: (id) => api.delete(`/speaking/sessions/${id}`),
};

export default api;

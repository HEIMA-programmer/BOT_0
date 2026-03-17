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

// Daily Words APIs
export const dailyWordsAPI = {
  getWords: (date) => api.get('/daily-words', { params: { date } }),
};

// Export getDailyWords function for DailyWords component
export const getDailyWords = async (date) => {
  try {
    const response = await dailyWordsAPI.getWords(date);
    return response;
  } catch (error) {
    console.error('Error in getDailyWords:', error);
    throw error;
  }
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

export default api;

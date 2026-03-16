import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true
});

export const getWordBank = () => {
  return API.get("/word-bank");
};

export const addWord = (word_id) => {
  return API.post("/word-bank", {
    word_id: word_id
  });
};

export const removeWord = (id) => {
  return API.delete(`/word-bank/${id}`);
};
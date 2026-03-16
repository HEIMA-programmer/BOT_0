# Sprint 1 API Contracts

Base URL: `http://localhost:5000/api`

All requests/responses use `Content-Type: application/json`.

---

## Authentication APIs

### POST /api/auth/register

Create a new user account.

**Request:**
```json
{
  "username": "sarah_chen",
  "email": "sarah@example.com",
  "password": "securepass123"
}
```

**Response 201:**
```json
{
  "id": 1,
  "username": "sarah_chen",
  "email": "sarah@example.com",
  "created_at": "2026-03-16T10:00:00"
}
```

**Response 400:**
```json
{ "error": "Username already exists" }
```

---

### POST /api/auth/login

Log in with email and password. Sets session cookie.

**Request:**
```json
{
  "email": "sarah@example.com",
  "password": "securepass123"
}
```

**Response 200:**
```json
{
  "id": 1,
  "username": "sarah_chen",
  "email": "sarah@example.com",
  "created_at": "2026-03-16T10:00:00"
}
```

**Response 401:**
```json
{ "error": "Invalid credentials" }
```

---

### POST /api/auth/logout

Log out current user. Clears session.

**Response 200:**
```json
{ "message": "Logged out" }
```

---

### GET /api/auth/me

Get current authenticated user info.

**Response 200:**
```json
{
  "id": 1,
  "username": "sarah_chen",
  "email": "sarah@example.com",
  "created_at": "2026-03-16T10:00:00"
}
```

**Response 401:**
```json
{ "error": "Not authenticated" }
```

---

## Daily Words APIs

### GET /api/daily-words

Get today's daily academic words (5-8 words).

**Query Params:**
- `date` (optional): ISO date string, defaults to today. e.g. `?date=2026-03-16`

**Response 200:**
```json
{
  "date": "2026-03-16",
  "words": [
    {
      "id": 1,
      "text": "hypothesis",
      "definition": "A supposition or proposed explanation made on the basis of limited evidence as a starting point for further investigation.",
      "example_sentence": "The researcher proposed a new hypothesis about climate change.",
      "part_of_speech": "noun",
      "difficulty_level": "intermediate",
      "audio_available": true
    },
    {
      "id": 2,
      "text": "methodology",
      "definition": "A system of methods used in a particular area of study or activity.",
      "example_sentence": "The paper outlines the methodology used for data collection.",
      "part_of_speech": "noun",
      "difficulty_level": "intermediate",
      "audio_available": true
    }
  ]
}
```

---

## Word Bank APIs

### GET /api/word-bank

Get all words in the current user's word bank.

**Auth:** Required (session cookie)

**Response 200:**
```json
{
  "words": [
    {
      "id": 1,
      "word_id": 5,
      "text": "hypothesis",
      "definition": "A supposition or proposed explanation...",
      "added_at": "2026-03-15T10:00:00",
      "mastery_level": 0
    }
  ]
}
```

**Response 401:**
```json
{ "error": "Not authenticated" }
```

---

### POST /api/word-bank

Add a word to the current user's word bank.

**Auth:** Required

**Request:**
```json
{ "word_id": 5 }
```

**Response 201:**
```json
{
  "id": 1,
  "word_id": 5,
  "text": "hypothesis",
  "definition": "A supposition or proposed explanation...",
  "added_at": "2026-03-16T10:30:00",
  "mastery_level": 0
}
```

**Response 409:**
```json
{ "error": "Word already in bank" }
```

---

### DELETE /api/word-bank/{id}

Remove a word from the user's word bank.

**Auth:** Required

**Response 200:**
```json
{ "message": "Removed from word bank" }
```

**Response 404:**
```json
{ "error": "Not found" }
```

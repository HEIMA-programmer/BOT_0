# Database Schema

## ER Diagram (Text)

```
users 1──────< word_bank >──────1 words
  │
  ├──────< speaking_sessions
  │
  ├──────< chat_sessions 1──────< chat_messages
  │
  └──────< progress

listening_clips (standalone, linked via progress)
```

## Tables

### users
| Column        | Type         | Constraints              |
|---------------|-------------|--------------------------|
| id            | INTEGER     | PRIMARY KEY, AUTOINCREMENT|
| username      | VARCHAR(80) | UNIQUE, NOT NULL          |
| email         | VARCHAR(120)| UNIQUE, NOT NULL          |
| password_hash | VARCHAR(256)| NOT NULL                  |
| created_at    | DATETIME    | DEFAULT NOW              |

### words
| Column           | Type         | Constraints              |
|------------------|-------------|--------------------------|
| id               | INTEGER     | PRIMARY KEY, AUTOINCREMENT|
| text             | VARCHAR(100)| NOT NULL                  |
| definition       | TEXT        | NOT NULL                  |
| example_sentence | TEXT        | NULLABLE                  |
| part_of_speech   | VARCHAR(20) | NULLABLE                  |
| difficulty_level | VARCHAR(20) | DEFAULT 'intermediate'    |
| created_at       | DATETIME    | DEFAULT NOW              |

### word_bank
| Column        | Type     | Constraints                          |
|---------------|---------|--------------------------------------|
| id            | INTEGER | PRIMARY KEY, AUTOINCREMENT            |
| user_id       | INTEGER | FK → users.id, NOT NULL              |
| word_id       | INTEGER | FK → words.id, NOT NULL              |
| added_at      | DATETIME| DEFAULT NOW                          |
| mastery_level | INTEGER | DEFAULT 0 (0=New, 1=Learning, 2=Familiar, 3=Mastered) |
| UNIQUE        |         | (user_id, word_id)                   |

### listening_clips (Sprint 2)
| Column           | Type         | Constraints              |
|------------------|-------------|--------------------------|
| id               | INTEGER     | PRIMARY KEY, AUTOINCREMENT|
| title            | VARCHAR(200)| NOT NULL                  |
| audio_url        | VARCHAR(500)| NOT NULL                  |
| transcript       | TEXT        | NOT NULL                  |
| difficulty_level | VARCHAR(20) | DEFAULT 'beginner'        |
| duration         | INTEGER     | seconds                   |
| created_at       | DATETIME    | DEFAULT NOW              |

### speaking_sessions (Sprint 3)
| Column      | Type     | Constraints              |
|-------------|---------|--------------------------|
| id          | INTEGER | PRIMARY KEY, AUTOINCREMENT|
| user_id     | INTEGER | FK → users.id, NOT NULL  |
| topic       | VARCHAR(200)| NOT NULL              |
| transcript  | TEXT    | NULLABLE                  |
| ai_feedback | TEXT    | NULLABLE (JSON string)    |
| score       | FLOAT   | NULLABLE                  |
| created_at  | DATETIME| DEFAULT NOW              |

### chat_sessions (Sprint 3)
| Column        | Type         | Constraints              |
|---------------|-------------|--------------------------|
| id            | INTEGER     | PRIMARY KEY, AUTOINCREMENT|
| user_id       | INTEGER     | FK → users.id, NOT NULL  |
| scenario_type | VARCHAR(50) | NOT NULL (e.g. 'office_hours', 'seminar') |
| started_at    | DATETIME    | DEFAULT NOW              |
| ended_at      | DATETIME    | NULLABLE                  |
| report        | TEXT        | NULLABLE (JSON string)    |

### chat_messages (Sprint 3)
| Column     | Type     | Constraints              |
|------------|---------|--------------------------|
| id         | INTEGER | PRIMARY KEY, AUTOINCREMENT|
| session_id | INTEGER | FK → chat_sessions.id, NOT NULL |
| role       | VARCHAR(20)| NOT NULL ('user' or 'assistant') |
| content    | TEXT    | NOT NULL                  |
| created_at | DATETIME| DEFAULT NOW              |

### progress (Sprint 4)
| Column        | Type         | Constraints              |
|---------------|-------------|--------------------------|
| id            | INTEGER     | PRIMARY KEY, AUTOINCREMENT|
| user_id       | INTEGER     | FK → users.id, NOT NULL  |
| module        | VARCHAR(50) | NOT NULL (vocab/listening/speaking/chat) |
| activity_type | VARCHAR(50) | NOT NULL                  |
| score         | FLOAT       | NULLABLE                  |
| time_spent    | INTEGER     | seconds                   |
| completed_at  | DATETIME    | DEFAULT NOW              |

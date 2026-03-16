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
| created_at    | DATETIME    | NOT NULL, DEFAULT NOW     |

Relationship notes:
- `users` cascades to `word_bank`, `speaking_sessions`, `chat_sessions`, and `progress`

### words
| Column           | Type         | Constraints              |
|------------------|-------------|--------------------------|
| id               | INTEGER     | PRIMARY KEY, AUTOINCREMENT|
| text             | VARCHAR(100)| NOT NULL                  |
| definition       | TEXT        | NOT NULL                  |
| example_sentence | TEXT        | NULLABLE                  |
| part_of_speech   | VARCHAR(20) | NULLABLE                  |
| difficulty_level | VARCHAR(20) | NOT NULL, DEFAULT 'intermediate', CHECK in (`beginner`, `intermediate`, `advanced`) |
| created_at       | DATETIME    | NOT NULL, DEFAULT NOW     |

### word_bank
| Column        | Type     | Constraints                          |
|---------------|---------|--------------------------------------|
| id            | INTEGER | PRIMARY KEY, AUTOINCREMENT            |
| user_id       | INTEGER | FK → users.id, NOT NULL, ON DELETE CASCADE |
| word_id       | INTEGER | FK → words.id, NOT NULL, ON DELETE CASCADE |
| added_at      | DATETIME| NOT NULL, DEFAULT NOW                 |
| mastery_level | INTEGER | NOT NULL, DEFAULT 0, CHECK 0-3 (0=New, 1=Learning, 2=Familiar, 3=Mastered) |
| UNIQUE        |         | (`user_id`, `word_id`)                |

### listening_clips (Sprint 2)
| Column           | Type         | Constraints              |
|------------------|-------------|--------------------------|
| id               | INTEGER     | PRIMARY KEY, AUTOINCREMENT|
| title            | VARCHAR(200)| NOT NULL                  |
| audio_url        | VARCHAR(500)| NOT NULL                  |
| transcript       | TEXT        | NOT NULL                  |
| difficulty_level | VARCHAR(20) | NOT NULL, DEFAULT 'beginner', CHECK in (`beginner`, `intermediate`, `advanced`) |
| duration         | INTEGER     | NULLABLE, CHECK `duration >= 0` |
| created_at       | DATETIME    | NOT NULL, DEFAULT NOW     |

### speaking_sessions (Sprint 3)
| Column      | Type     | Constraints              |
|-------------|---------|--------------------------|
| id          | INTEGER | PRIMARY KEY, AUTOINCREMENT|
| user_id     | INTEGER | FK → users.id, NOT NULL, ON DELETE CASCADE |
| topic       | VARCHAR(200)| NOT NULL              |
| transcript  | TEXT    | NULLABLE                  |
| ai_feedback | TEXT    | NULLABLE (JSON string)    |
| score       | FLOAT   | NULLABLE, CHECK `score >= 0` |
| created_at  | DATETIME| NOT NULL, DEFAULT NOW     |

### chat_sessions (Sprint 3)
| Column        | Type         | Constraints              |
|---------------|-------------|--------------------------|
| id            | INTEGER     | PRIMARY KEY, AUTOINCREMENT|
| user_id       | INTEGER     | FK → users.id, NOT NULL, ON DELETE CASCADE |
| scenario_type | VARCHAR(50) | NOT NULL (e.g. 'office_hours', 'seminar') |
| started_at    | DATETIME    | NOT NULL, DEFAULT NOW     |
| ended_at      | DATETIME    | NULLABLE                  |
| report        | TEXT        | NULLABLE (JSON string)    |

### chat_messages (Sprint 3)
| Column     | Type     | Constraints              |
|------------|---------|--------------------------|
| id         | INTEGER | PRIMARY KEY, AUTOINCREMENT|
| session_id | INTEGER | FK → chat_sessions.id, NOT NULL, ON DELETE CASCADE |
| role       | VARCHAR(20)| NOT NULL, CHECK in (`user`, `assistant`) |
| content    | TEXT    | NOT NULL                  |
| created_at | DATETIME| NOT NULL, DEFAULT NOW     |

### progress (Sprint 4)
| Column        | Type         | Constraints              |
|---------------|-------------|--------------------------|
| id            | INTEGER     | PRIMARY KEY, AUTOINCREMENT|
| user_id       | INTEGER     | FK → users.id, NOT NULL, ON DELETE CASCADE |
| module        | VARCHAR(50) | NOT NULL, CHECK in (`vocab`, `listening`, `speaking`, `chat`) |
| activity_type | VARCHAR(50) | NOT NULL                  |
| score         | FLOAT       | NULLABLE, CHECK `score >= 0` |
| time_spent    | INTEGER     | NULLABLE, CHECK `time_spent >= 0` |
| completed_at  | DATETIME    | NOT NULL, DEFAULT NOW     |

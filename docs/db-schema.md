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

<<<<<<< HEAD
=======
Current note:
- `listening_clips` is intentionally content-only in the current schema.
- `progress` stores module/activity completion data and does not yet foreign-key to a specific `listening_clip`.
- If per-clip tracking is needed later, add a dedicated reference field or module-specific progress table in a future sprint.

>>>>>>> main
## Tables

### users
| Column        | Type         | Constraints              |
|---------------|-------------|--------------------------|
| id            | INTEGER     | PRIMARY KEY, AUTOINCREMENT|
<<<<<<< HEAD
| username      | VARCHAR(80) | UNIQUE, NOT NULL          |
| email         | VARCHAR(120)| UNIQUE, NOT NULL          |
| password_hash | VARCHAR(256)| NOT NULL                  |
| created_at    | DATETIME    | DEFAULT NOW              |
=======
| username      | VARCHAR(80) | UNIQUE, NOT NULL, CHECK length 3-80 |
| email         | VARCHAR(120)| UNIQUE, NOT NULL, stored lowercase, CHECK length <= 120 |
| password_hash | VARCHAR(256)| NOT NULL                  |
| created_at    | DATETIME    | NOT NULL, DEFAULT NOW     |

Relationship notes:
- `users` cascades to `word_bank`, `speaking_sessions`, `chat_sessions`, and `progress`
>>>>>>> main

### words
| Column           | Type         | Constraints              |
|------------------|-------------|--------------------------|
| id               | INTEGER     | PRIMARY KEY, AUTOINCREMENT|
| text             | VARCHAR(100)| NOT NULL                  |
| definition       | TEXT        | NOT NULL                  |
| example_sentence | TEXT        | NULLABLE                  |
| part_of_speech   | VARCHAR(20) | NULLABLE                  |
<<<<<<< HEAD
| difficulty_level | VARCHAR(20) | DEFAULT 'intermediate'    |
| created_at       | DATETIME    | DEFAULT NOW              |
=======
| difficulty_level | VARCHAR(20) | NOT NULL, DEFAULT 'intermediate', CHECK in (`beginner`, `intermediate`, `advanced`) |
| created_at       | DATETIME    | NOT NULL, DEFAULT NOW     |
>>>>>>> main

### word_bank
| Column        | Type     | Constraints                          |
|---------------|---------|--------------------------------------|
| id            | INTEGER | PRIMARY KEY, AUTOINCREMENT            |
<<<<<<< HEAD
| user_id       | INTEGER | FK → users.id, NOT NULL              |
| word_id       | INTEGER | FK → words.id, NOT NULL              |
| added_at      | DATETIME| DEFAULT NOW                          |
| mastery_level | INTEGER | DEFAULT 0 (0=New, 1=Learning, 2=Familiar, 3=Mastered) |
| UNIQUE        |         | (user_id, word_id)                   |
=======
| user_id       | INTEGER | FK → users.id, NOT NULL, ON DELETE CASCADE |
| word_id       | INTEGER | FK → words.id, NOT NULL, ON DELETE CASCADE |
| added_at      | DATETIME| NOT NULL, DEFAULT NOW                 |
| mastery_level | INTEGER | NOT NULL, DEFAULT 0, CHECK 0-3 (0=New, 1=Learning, 2=Familiar, 3=Mastered) |
| UNIQUE        |         | (`user_id`, `word_id`)                |
>>>>>>> main

### listening_clips (Sprint 2)
| Column           | Type         | Constraints              |
|------------------|-------------|--------------------------|
| id               | INTEGER     | PRIMARY KEY, AUTOINCREMENT|
| title            | VARCHAR(200)| NOT NULL                  |
| audio_url        | VARCHAR(500)| NOT NULL                  |
| transcript       | TEXT        | NOT NULL                  |
<<<<<<< HEAD
| difficulty_level | VARCHAR(20) | DEFAULT 'beginner'        |
| duration         | INTEGER     | seconds                   |
| created_at       | DATETIME    | DEFAULT NOW              |
=======
| difficulty_level | VARCHAR(20) | NOT NULL, DEFAULT 'beginner', CHECK in (`beginner`, `intermediate`, `advanced`) |
| duration         | INTEGER     | NULLABLE, CHECK `duration >= 0` |
| created_at       | DATETIME    | NOT NULL, DEFAULT NOW     |
>>>>>>> main

### speaking_sessions (Sprint 3)
| Column      | Type     | Constraints              |
|-------------|---------|--------------------------|
| id          | INTEGER | PRIMARY KEY, AUTOINCREMENT|
<<<<<<< HEAD
| user_id     | INTEGER | FK → users.id, NOT NULL  |
| topic       | VARCHAR(200)| NOT NULL              |
| transcript  | TEXT    | NULLABLE                  |
| ai_feedback | TEXT    | NULLABLE (JSON string)    |
| score       | FLOAT   | NULLABLE                  |
| created_at  | DATETIME| DEFAULT NOW              |
=======
| user_id     | INTEGER | FK → users.id, NOT NULL, ON DELETE CASCADE |
| topic       | VARCHAR(200)| NOT NULL              |
| transcript  | TEXT    | NULLABLE                  |
| ai_feedback | TEXT    | NULLABLE (JSON string)    |
| score       | FLOAT   | NULLABLE, CHECK `score >= 0` |
| created_at  | DATETIME| NOT NULL, DEFAULT NOW     |

Implementation note:
- `ai_feedback` is stored as `TEXT` and should be serialized/deserialized with `json.dumps()` / `json.loads()` in the service or route layer.
>>>>>>> main

### chat_sessions (Sprint 3)
| Column        | Type         | Constraints              |
|---------------|-------------|--------------------------|
| id            | INTEGER     | PRIMARY KEY, AUTOINCREMENT|
<<<<<<< HEAD
| user_id       | INTEGER     | FK → users.id, NOT NULL  |
| scenario_type | VARCHAR(50) | NOT NULL (e.g. 'office_hours', 'seminar') |
| started_at    | DATETIME    | DEFAULT NOW              |
| ended_at      | DATETIME    | NULLABLE                  |
| report        | TEXT        | NULLABLE (JSON string)    |

=======
| user_id       | INTEGER     | FK → users.id, NOT NULL, ON DELETE CASCADE |
| scenario_type | VARCHAR(50) | NOT NULL (e.g. 'office_hours', 'seminar') |
| started_at    | DATETIME    | NOT NULL, DEFAULT NOW     |
| ended_at      | DATETIME    | NULLABLE                  |
| report        | TEXT        | NULLABLE (JSON string)    |

Implementation note:
- `report` is stored as `TEXT` and should be serialized/deserialized with `json.dumps()` / `json.loads()` in the service or route layer.

>>>>>>> main
### chat_messages (Sprint 3)
| Column     | Type     | Constraints              |
|------------|---------|--------------------------|
| id         | INTEGER | PRIMARY KEY, AUTOINCREMENT|
<<<<<<< HEAD
| session_id | INTEGER | FK → chat_sessions.id, NOT NULL |
| role       | VARCHAR(20)| NOT NULL ('user' or 'assistant') |
| content    | TEXT    | NOT NULL                  |
| created_at | DATETIME| DEFAULT NOW              |
=======
| session_id | INTEGER | FK → chat_sessions.id, NOT NULL, ON DELETE CASCADE |
| role       | VARCHAR(20)| NOT NULL, CHECK in (`user`, `assistant`) |
| content    | TEXT    | NOT NULL                  |
| created_at | DATETIME| NOT NULL, DEFAULT NOW     |
>>>>>>> main

### progress (Sprint 4)
| Column        | Type         | Constraints              |
|---------------|-------------|--------------------------|
| id            | INTEGER     | PRIMARY KEY, AUTOINCREMENT|
<<<<<<< HEAD
| user_id       | INTEGER     | FK → users.id, NOT NULL  |
| module        | VARCHAR(50) | NOT NULL (vocab/listening/speaking/chat) |
| activity_type | VARCHAR(50) | NOT NULL                  |
| score         | FLOAT       | NULLABLE                  |
| time_spent    | INTEGER     | seconds                   |
| completed_at  | DATETIME    | DEFAULT NOW              |
=======
| user_id       | INTEGER     | FK → users.id, NOT NULL, ON DELETE CASCADE |
| module        | VARCHAR(50) | NOT NULL, CHECK in (`vocab`, `listening`, `speaking`, `chat`) |
| activity_type | VARCHAR(50) | NOT NULL                  |
| score         | FLOAT       | NULLABLE, CHECK `score >= 0` |
| time_spent    | INTEGER     | NULLABLE, CHECK `time_spent >= 0` |
| completed_at  | DATETIME    | NOT NULL, DEFAULT NOW     |

SQLite note:
- SQLite requires `PRAGMA foreign_keys=ON` for `ON DELETE CASCADE` to take effect. The backend app now enables this during database connection setup.
>>>>>>> main

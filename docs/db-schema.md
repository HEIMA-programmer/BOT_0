# Database Schema

## ER Diagram (Text)

```
users 1──────< word_bank >──────1 words
  │                                │
  ├──────< user_word_progress >────┘
  │
  ├──────< speaking_sessions
  │
  ├──────< chat_sessions 1──────< chat_messages
  │
  ├──────< progress
  │
  ├──────< listening_attempts
  │
  ├──────< forum_posts 1──────< forum_comments
  │           │
  │           ├──────< forum_post_pins
  │           │
  │           └──────< forum_forwards
  │
  ├──────< rooms 1──────< room_members
  │          │
  │          ├──────< room_records
  │          │
  │          └──────< game_records
  │
  ├──────< friendships
  │
  └──────< friend_requests

listening_clips (standalone, linked via progress)
review_history ──> word_bank
```

## Tables

### users
| Column        | Type         | Constraints                            |
|---------------|-------------|----------------------------------------|
| id            | INTEGER     | PRIMARY KEY, AUTOINCREMENT              |
| username      | VARCHAR(80) | UNIQUE, NOT NULL, CHECK length 3-80     |
| email         | VARCHAR(120)| UNIQUE, NOT NULL, stored lowercase, CHECK length <= 120 |
| password_hash | VARCHAR(255)| NOT NULL                                |
| is_admin      | BOOLEAN     | NOT NULL, DEFAULT FALSE                 |
| created_at    | DATETIME    | NOT NULL, DEFAULT NOW                   |

Relationship notes:
- `users` cascades to `word_bank`, `user_word_progress`, `speaking_sessions`, `chat_sessions`, `progress`, `listening_attempts`, `forum_posts`, `rooms`, `friendships`, `friend_requests`

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
| last_reviewed | DATETIME| NULLABLE                              |
| UNIQUE        |         | (`user_id`, `word_id`)                |

### user_word_progress
| Column        | Type        | Constraints                          |
|---------------|------------|--------------------------------------|
| id            | INTEGER    | PRIMARY KEY, AUTOINCREMENT            |
| user_id       | INTEGER    | FK → users.id, NOT NULL, ON DELETE CASCADE |
| word_id       | INTEGER    | FK → words.id, NOT NULL, ON DELETE CASCADE |
| status        | VARCHAR(20)| NOT NULL, DEFAULT 'pending', CHECK in (`pending`, `review`, `mastered`) |
| assigned_date | DATE       | NOT NULL, DEFAULT today               |
| updated_at    | DATETIME   | NOT NULL, DEFAULT NOW, ON UPDATE NOW  |
| UNIQUE        |            | (`user_id`, `word_id`)                |

### listening_clips
| Column           | Type         | Constraints              |
|------------------|-------------|--------------------------|
| id               | INTEGER     | PRIMARY KEY, AUTOINCREMENT|
| title            | VARCHAR(200)| NOT NULL                  |
| audio_url        | VARCHAR(500)| NOT NULL                  |
| transcript       | TEXT        | NOT NULL                  |
| difficulty_level | VARCHAR(20) | NOT NULL, DEFAULT 'beginner', CHECK in (`beginner`, `intermediate`, `advanced`) |
| duration         | INTEGER     | NULLABLE, CHECK `duration >= 0` |
| created_at       | DATETIME    | NOT NULL, DEFAULT NOW     |

### listening_attempts
| Column        | Type         | Constraints              |
|---------------|-------------|--------------------------|
| id            | INTEGER     | PRIMARY KEY, AUTOINCREMENT|
| user_id       | INTEGER     | FK → users.id, NOT NULL, ON DELETE CASCADE |
| level_id      | VARCHAR(20) | NOT NULL                  |
| scenario_id   | VARCHAR(50) | NOT NULL                  |
| source_slug   | VARCHAR(200)| NOT NULL                  |
| answers_json  | TEXT        | NOT NULL                  |
| results_json  | TEXT        | NOT NULL                  |
| transcript    | TEXT        | NOT NULL                  |
| score         | FLOAT       | NOT NULL                  |
| correct_count | INTEGER     | NOT NULL                  |
| total_count   | INTEGER     | NOT NULL                  |
| updated_at    | DATETIME    | NOT NULL, DEFAULT NOW, ON UPDATE NOW |
| UNIQUE        |             | (`user_id`, `level_id`, `scenario_id`, `source_slug`) |

### speaking_sessions
| Column      | Type     | Constraints              |
|-------------|---------|--------------------------|
| id          | INTEGER | PRIMARY KEY, AUTOINCREMENT|
| user_id     | INTEGER | FK → users.id, NOT NULL, ON DELETE CASCADE |
| topic       | VARCHAR(200)| NOT NULL              |
| transcript  | TEXT    | NULLABLE                  |
| ai_feedback | TEXT    | NULLABLE (JSON string)    |
| score       | FLOAT   | NULLABLE, CHECK `score >= 0` |
| created_at  | DATETIME| NOT NULL, DEFAULT NOW     |

Implementation note:
- `ai_feedback` is stored as `TEXT` and should be serialized/deserialized with `json.dumps()` / `json.loads()`.

### chat_sessions
| Column        | Type         | Constraints              |
|---------------|-------------|--------------------------|
| id            | INTEGER     | PRIMARY KEY, AUTOINCREMENT|
| user_id       | INTEGER     | FK → users.id, NOT NULL, ON DELETE CASCADE |
| scenario_type | VARCHAR(50) | NOT NULL (e.g. 'office_hours', 'seminar', 'free_conversation') |
| started_at    | DATETIME    | NOT NULL, DEFAULT NOW     |
| ended_at      | DATETIME    | NULLABLE                  |
| report        | TEXT        | NULLABLE (JSON string)    |

Implementation note:
- `report` is stored as `TEXT` and should be serialized/deserialized with `json.dumps()` / `json.loads()`.

### chat_messages
| Column     | Type     | Constraints              |
|------------|---------|--------------------------|
| id         | INTEGER | PRIMARY KEY, AUTOINCREMENT|
| session_id | INTEGER | FK → chat_sessions.id, NOT NULL, ON DELETE CASCADE |
| role       | VARCHAR(20)| NOT NULL, CHECK in (`user`, `assistant`) |
| content    | TEXT    | NOT NULL                  |
| created_at | DATETIME| NOT NULL, DEFAULT NOW     |

### progress
| Column        | Type         | Constraints              |
|---------------|-------------|--------------------------|
| id            | INTEGER     | PRIMARY KEY, AUTOINCREMENT|
| user_id       | INTEGER     | FK → users.id, NOT NULL, ON DELETE CASCADE |
| module        | VARCHAR(50) | NOT NULL, CHECK in (`vocab`, `listening`, `speaking`, `chat`) |
| activity_type | VARCHAR(50) | NOT NULL                  |
| score         | FLOAT       | NULLABLE, CHECK `score >= 0` |
| time_spent    | INTEGER     | NULLABLE, CHECK `time_spent >= 0` |
| completed_at  | DATETIME    | NOT NULL, DEFAULT NOW     |

### review_history
| Column             | Type     | Constraints              |
|--------------------|---------|--------------------------|
| id                 | INTEGER | PRIMARY KEY, AUTOINCREMENT|
| user_id            | INTEGER | FK → users.id, NOT NULL, ON DELETE CASCADE |
| word_bank_entry_id | INTEGER | FK → word_bank.id, NOT NULL, ON DELETE CASCADE |
| review_date        | DATETIME| NOT NULL, DEFAULT NOW     |
| knew_it            | BOOLEAN | NOT NULL, DEFAULT TRUE    |

### forum_posts
| Column           | Type         | Constraints              |
|------------------|-------------|--------------------------|
| id               | INTEGER     | PRIMARY KEY, AUTOINCREMENT|
| user_id          | INTEGER     | FK → users.id, NOT NULL, ON DELETE CASCADE |
| zone             | VARCHAR(10) | NOT NULL, DEFAULT 'public' |
| tag              | VARCHAR(30) | NOT NULL                  |
| title            | VARCHAR(200)| NOT NULL                  |
| content          | TEXT        | NOT NULL                  |
| file_url         | VARCHAR(500)| NULLABLE                  |
| file_name        | VARCHAR(200)| NULLABLE                  |
| video_url        | VARCHAR(500)| NULLABLE                  |
| status           | VARCHAR(20) | NOT NULL, DEFAULT 'pending' |
| is_pinned        | BOOLEAN     | NOT NULL, DEFAULT FALSE   |
| rejection_reason | VARCHAR(120)| NULLABLE                  |
| review_note      | VARCHAR(255)| NULLABLE                  |
| reviewed_by      | INTEGER     | FK → users.id, NULLABLE   |
| reviewed_at      | DATETIME    | NULLABLE                  |
| created_at       | DATETIME    | NOT NULL, DEFAULT NOW     |
| updated_at       | DATETIME    | NOT NULL, DEFAULT NOW, ON UPDATE NOW |

### forum_comments
| Column     | Type     | Constraints              |
|------------|---------|--------------------------|
| id         | INTEGER | PRIMARY KEY, AUTOINCREMENT|
| post_id    | INTEGER | FK → forum_posts.id, NOT NULL, ON DELETE CASCADE |
| user_id    | INTEGER | FK → users.id, NOT NULL, ON DELETE CASCADE |
| content    | TEXT    | NOT NULL                  |
| created_at | DATETIME| NOT NULL, DEFAULT NOW     |

### forum_post_pins
| Column     | Type     | Constraints              |
|------------|---------|--------------------------|
| id         | INTEGER | PRIMARY KEY, AUTOINCREMENT|
| user_id    | INTEGER | FK → users.id, NOT NULL, ON DELETE CASCADE |
| post_id    | INTEGER | FK → forum_posts.id, NOT NULL, ON DELETE CASCADE |
| created_at | DATETIME| NOT NULL, DEFAULT NOW     |
| UNIQUE     |         | (`user_id`, `post_id`)    |

### forum_forwards
| Column           | Type        | Constraints              |
|------------------|------------|--------------------------|
| id               | INTEGER    | PRIMARY KEY, AUTOINCREMENT|
| user_id          | INTEGER    | FK → users.id, NOT NULL, ON DELETE CASCADE |
| original_post_id | INTEGER    | FK → forum_posts.id, NOT NULL, ON DELETE CASCADE |
| zone             | VARCHAR(10)| NOT NULL, DEFAULT 'public' |
| comment          | TEXT       | NULLABLE                  |
| created_at       | DATETIME   | NOT NULL, DEFAULT NOW     |

### rooms
| Column      | Type        | Constraints              |
|-------------|------------|--------------------------|
| id          | INTEGER    | PRIMARY KEY, AUTOINCREMENT|
| name        | VARCHAR(80)| NOT NULL                  |
| room_type   | VARCHAR(20)| NOT NULL (game, speaking, watch) |
| status      | VARCHAR(20)| NOT NULL, DEFAULT 'waiting' |
| visibility  | VARCHAR(10)| NOT NULL, DEFAULT 'public' |
| invite_code | VARCHAR(8) | UNIQUE, NOT NULL, INDEXED  |
| max_players | INTEGER    | NOT NULL, DEFAULT 4        |
| host_id     | INTEGER    | FK → users.id, NOT NULL, ON DELETE CASCADE |
| created_at  | DATETIME   | NOT NULL, DEFAULT NOW      |
| ended_at    | DATETIME   | NULLABLE                   |

### room_members
| Column    | Type        | Constraints              |
|-----------|------------|--------------------------|
| id        | INTEGER    | PRIMARY KEY, AUTOINCREMENT|
| room_id   | INTEGER    | FK → rooms.id, NOT NULL, ON DELETE CASCADE |
| user_id   | INTEGER    | FK → users.id, NOT NULL, ON DELETE CASCADE |
| role      | VARCHAR(10)| NOT NULL, DEFAULT 'member' |
| is_ready  | BOOLEAN    | NOT NULL, DEFAULT FALSE    |
| joined_at | DATETIME   | NOT NULL, DEFAULT NOW      |
| UNIQUE    |            | (`room_id`, `user_id`)     |

### room_records
| Column       | Type        | Constraints              |
|-------------|------------|--------------------------|
| id           | INTEGER    | PRIMARY KEY, AUTOINCREMENT|
| room_id      | INTEGER    | FK → rooms.id, NULLABLE, ON DELETE SET NULL |
| user_id      | INTEGER    | FK → users.id, NOT NULL, ON DELETE CASCADE |
| room_name    | VARCHAR(80)| NOT NULL                  |
| room_type    | VARCHAR(20)| NOT NULL                  |
| summary      | VARCHAR(255)| NULLABLE                 |
| duration_secs| INTEGER    | NULLABLE                  |
| created_at   | DATETIME   | NOT NULL, DEFAULT NOW     |

### game_records
| Column       | Type        | Constraints              |
|-------------|------------|--------------------------|
| id           | INTEGER    | PRIMARY KEY, AUTOINCREMENT|
| room_id      | INTEGER    | FK → rooms.id, NULLABLE, ON DELETE SET NULL |
| user_id      | INTEGER    | FK → users.id, NOT NULL, ON DELETE CASCADE |
| game_type    | VARCHAR(30)| NOT NULL                  |
| score        | INTEGER    | NOT NULL, DEFAULT 0       |
| total_rounds | INTEGER    | NOT NULL, DEFAULT 0       |
| placement    | INTEGER    | NULLABLE                  |
| rounds_data  | TEXT       | NULLABLE (JSON string)    |
| duration_secs| INTEGER    | NULLABLE                  |
| created_at   | DATETIME   | NOT NULL, DEFAULT NOW     |

Implementation note:
- `rounds_data` stores per-round game data as JSON text.

### friendships
| Column     | Type     | Constraints              |
|------------|---------|--------------------------|
| id         | INTEGER | PRIMARY KEY, AUTOINCREMENT|
| user_id    | INTEGER | FK → users.id, NOT NULL, ON DELETE CASCADE |
| friend_id  | INTEGER | FK → users.id, NOT NULL, ON DELETE CASCADE |
| created_at | DATETIME| NOT NULL, DEFAULT NOW     |
| UNIQUE     |         | (`user_id`, `friend_id`)  |

### friend_requests
| Column      | Type        | Constraints              |
|-------------|------------|--------------------------|
| id          | INTEGER    | PRIMARY KEY, AUTOINCREMENT|
| sender_id   | INTEGER    | FK → users.id, NOT NULL, ON DELETE CASCADE |
| receiver_id | INTEGER    | FK → users.id, NOT NULL, ON DELETE CASCADE |
| status      | VARCHAR(20)| NOT NULL, DEFAULT 'pending' |
| created_at  | DATETIME   | NOT NULL, DEFAULT NOW     |
| updated_at  | DATETIME   | NOT NULL, DEFAULT NOW, ON UPDATE NOW |
| UNIQUE      |            | (`sender_id`, `receiver_id`) |

---

SQLite note:
- SQLite requires `PRAGMA foreign_keys=ON` for `ON DELETE CASCADE` to take effect. The backend app now enables this during database connection setup.
- All `DATETIME` columns use timezone-aware UTC timestamps.
- JSON data fields (`ai_feedback`, `report`, `rounds_data`, `answers_json`, `results_json`) are stored as `TEXT` and serialized/deserialized in the service or route layer.

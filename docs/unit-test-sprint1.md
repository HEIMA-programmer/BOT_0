# Sprint 1 Unit Test Document

## 1. Document Information

- Project: Academic English Practice App
- Sprint: Sprint 1 - Vocabulary and Listening Foundation
- Scope: Authentication, Daily Words, Word Bank, Daily Learning, Listening, Progress Dashboard
- Verification date: 2026-03-19
- Repository root: `.`

## 2. Purpose

This document records the completed unit testing work for the current Sprint 1 implementation in the repository. The scope reflects the latest Sprint 1 codebase rather than the earlier sprint plan only.

The tested Sprint 1 user-facing capabilities are:

- register and log in
- access authenticated learning features
- view daily words
- manage word learning progress
- add, review, update, and remove words in the word bank
- browse listening levels and lecture clips
- complete listening practice and submit answers
- restore saved listening progress for the same authenticated user
- aggregate profile progress statistics from persisted backend records

## 3. References

Project documents referenced in this test document:

- [README.md](../README.md)
- [docs/api-sprint1.md](./api-sprint1.md)
- [docs/architecture.md](./architecture.md)
- [docs/db-schema.md](./db-schema.md)
- [docs/meetings/sprint1/sprint1_planning.md](./meetings/sprint1/sprint1_planning.md)

## 4. Features Under Test

Sprint 1 features covered by unit tests:

1. Authentication
2. Daily Words API
3. Word Bank API
4. Daily Learning API used by Daily Words and Word Bank pages
5. Listening API
6. Progress Dashboard API
7. Frontend Sprint 1 pages and shared audio component

Main implementation files:

- [backend/app/routes/auth.py](../backend/app/routes/auth.py)
- [backend/app/routes/daily_words.py](../backend/app/routes/daily_words.py)
- [backend/app/routes/word_bank.py](../backend/app/routes/word_bank.py)
- [backend/app/routes/daily_learning.py](../backend/app/routes/daily_learning.py)
- [backend/app/routes/listening.py](../backend/app/routes/listening.py)
- [backend/app/routes/progress.py](../backend/app/routes/progress.py)
- [frontend/src/pages/Login.jsx](../frontend/src/pages/Login.jsx)
- [frontend/src/pages/Register.jsx](../frontend/src/pages/Register.jsx)
- [frontend/src/pages/DailyWords.jsx](../frontend/src/pages/DailyWords.jsx)
- [frontend/src/pages/WordBank.jsx](../frontend/src/pages/WordBank.jsx)
- [frontend/src/pages/Listening.jsx](../frontend/src/pages/Listening.jsx)
- [frontend/src/pages/Profile.jsx](../frontend/src/pages/Profile.jsx)
- [frontend/src/components/AudioPlayer.jsx](../frontend/src/components/AudioPlayer.jsx)

## 5. Test Environment and Tools

### Backend

- Language: Python
- Framework: Flask
- Database: SQLite
- Unit test framework: `pytest`
- Coverage tool: `pytest-cov`

### Frontend

- Framework: React + Vite + Ant Design
- Unit test framework: `Vitest`
- DOM environment: `jsdom`
- Render utility: Testing Library

## 6. Test Strategy

The unit testing strategy for Sprint 1 is:

- test each API endpoint independently
- cover happy path, validation failure, duplicate data, unsupported input, and unauthorized access
- verify JSON response structure and core business rules
- isolate backend tests with a clean test database for each test case
- test frontend pages at component level with mocked API boundaries
- verify page rendering, validation, submission, navigation, and key user actions
- retest previously covered Sprint 1 features after integrating the new listening functionality

Backend fixture support is implemented in [backend/tests/conftest.py](../backend/tests/conftest.py). Frontend test setup is implemented in [frontend/src/test/setupTests.js](../frontend/src/test/setupTests.js) and [frontend/src/test/renderWithProviders.jsx](../frontend/src/test/renderWithProviders.jsx).

## 7. Implemented Test Files

### Backend

- [backend/tests/test_auth.py](../backend/tests/test_auth.py)
- [backend/tests/test_daily_words.py](../backend/tests/test_daily_words.py)
- [backend/tests/test_word_bank.py](../backend/tests/test_word_bank.py)
- [backend/tests/test_daily_learning.py](../backend/tests/test_daily_learning.py)
- [backend/tests/test_listening.py](../backend/tests/test_listening.py)
- [backend/tests/test_progress.py](../backend/tests/test_progress.py)

### Frontend

- [frontend/src/pages/Login.test.jsx](../frontend/src/pages/Login.test.jsx)
- [frontend/src/pages/Register.test.jsx](../frontend/src/pages/Register.test.jsx)
- [frontend/src/pages/DailyWords.test.jsx](../frontend/src/pages/DailyWords.test.jsx)
- [frontend/src/pages/WordBank.test.jsx](../frontend/src/pages/WordBank.test.jsx)
- [frontend/src/pages/Listening.test.jsx](../frontend/src/pages/Listening.test.jsx)
- [frontend/src/pages/Profile.test.jsx](../frontend/src/pages/Profile.test.jsx)
- [frontend/src/components/AudioPlayer.test.jsx](../frontend/src/components/AudioPlayer.test.jsx)

## 8. Detailed Test Coverage

### 8.1 Authentication

Covered cases:

- register with valid input
- normalize email before storing
- reject duplicate username
- reject duplicate email case-insensitively
- reject short password
- reject invalid email
- reject short username
- login with valid credentials
- login with normalized email
- reject missing email/password
- reject invalid credentials
- return current user via `/me`
- clear session on logout
- reject unauthenticated `/me`

### 8.2 Daily Words API

Covered cases:

- return empty list when there are no words
- return available words without duplication when total words are fewer than five
- return 5 to 8 words when enough words exist
- return deterministic selection for the same date
- return full word JSON fields

Note:

- During test implementation, a real defect was found in [backend/app/routes/daily_words.py](../backend/app/routes/daily_words.py) where fewer than 5 source words caused duplicate results. This was fixed so the endpoint now returns only available unique words.

### 8.3 Word Bank API

Covered cases:

- authentication required for access
- add word by `word_id`
- add word by `word_text`
- reject missing word identifier
- reject nonexistent `word_id`
- reject duplicate word in bank
- return only current user's word bank entries
- delete own entry
- reject missing delete target
- update valid mastery level
- reject invalid mastery level
- return word bank statistics
- review word and increase mastery
- review word without increasing mastery when `knew_it` is false
- reject missing review target

### 8.4 Daily Learning API

Covered cases:

- authentication required
- assign today's pending words
- include carry-over pending words from previous day
- validate status update payload
- update progress status
- return review words only
- return mastered words only
- return all words with progress status and in-bank flag
- only search by word text for all-words lookup
- return learning statistics
- mark word as mastered
- reject missing word when marking mastered
- add word to bank from learning flow
- reject duplicate add-to-bank request
- avoid same-day over-assignment after completing carry-over words
- hide excess same-day pending words when the daily limit is reduced

### 8.5 Listening API

Covered cases:

- return listening catalog with all configured levels
- expose lecture-clip scenarios for currently supported levels
- keep unsupported scenarios marked as coming soon
- stream audio content for an available clip
- return `404` for unknown audio clip
- return beginner multiple-choice practice questions
- reject unsupported level/scenario combinations with coming-soon response
- return `404` when requested practice material does not exist
- reject invalid submission payload when `answers` is not an object
- return intermediate practice results with score, correctness, and transcript
- persist listening submission results for the current user
- return saved listening attempt data when the same user revisits a clip

### 8.6 Progress Dashboard API

Covered cases:

- create persisted study-time progress records
- return real dashboard metrics for words learned, listening done, speaking session count, and total time
- count listening completions by distinct clip activity rather than raw submission count

### 8.7 Frontend Pages and Components

#### Login Page

- submit valid login form
- normalize email to lowercase before API call
- call `onLogin` with API response
- navigate to previous route after login
- show validation errors on empty submission

#### Register Page

- submit valid registration form
- normalize email before API call
- call `onLogin` with API response
- navigate to home after registration
- block submission when passwords do not match

#### Daily Words Page

- load today's word data and word bank state
- render date and summary counts
- open all-words modal
- mark word as mastered from the modal

#### Word Bank Page

- load saved words
- filter words by word text only
- refresh word bank list

#### Listening Page

- load listening landing page
- navigate into a selected level
- load practice questions for a clip
- submit beginner multiple-choice answers
- submit intermediate fill-in-the-blank and short-answer answers
- render score and transcript after submission
- preserve answers when switching between clips
- restore saved listening results after leaving and returning
- restore saved listening results returned by the backend

#### Profile Page

- load persisted dashboard statistics
- render words learned, listening completions, speaking sessions, and total time

#### AudioPlayer Component

- toggle play and pause state with mocked media methods

## 9. Representative Unit Test Cases

The following table provides representative unit test cases in a standard test case specification format. These cases are selected from the implemented Sprint 1 test suite and focus on the most important backend and frontend behaviors.

| Test ID | Module / Component | Scenario / Objective | Input / Test Data | Expected Result | Status |
|---|---|---|---|---|---|
| AUTH-01 | Authentication API | Verify successful user registration | `username=testuser`, `email=test@example.com`, `password=password123` | API returns `201 Created`; user record is stored; password is hashed; response contains user information | Pass |
| AUTH-02 | Authentication API | Verify duplicate username handling | Existing user `testuser`; new registration with same username and different email | API returns `409`; error indicates username already exists | Pass |
| AUTH-03 | Authentication API | Verify duplicate email handling regardless of case | Existing user email `Test@Example.com`; new registration email `test@example.com` | API returns `409`; error indicates email already registered | Pass |
| AUTH-04 | Authentication API | Verify successful login with normalized email | Registered user; login input `email=Test@Example.com`, `password=password123` | API returns `200 OK`; authenticated user is returned and session is created | Pass |
| AUTH-05 | Frontend Login Page | Verify empty-form validation | Click `Sign In` without entering email or password | Validation errors are displayed; login API is not called | Pass |
| AUTH-06 | Frontend Register Page | Verify password confirmation validation | `password=password123`, `confirmPassword=password456` | Validation error `Passwords do not match`; register API is not called | Pass |
| DW-01 | Daily Words API | Verify behavior when no words exist in database | Empty `words` table; request `GET /api/daily-words` | API returns `200 OK`; `words` is an empty array | Pass |
| DW-02 | Daily Words API | Verify unique results when word count is below five | Database contains 3 words; request `GET /api/daily-words?date=2026-03-18` | API returns exactly the 3 available unique words without duplication | Pass |
| DW-03 | Frontend Daily Words Page | Verify daily word summary rendering | Mock response with `date=2026-03-18`, `1` pending word, `2` review words, `1` mastered word | Page displays date and correct summary counts | Pass |
| WB-01 | Word Bank API | Verify adding a word by `word_id` | Authenticated user; request `POST /api/word-bank` with an existing `word_id` | API returns `201 Created`; word bank entry is stored and returned | Pass |
| WB-02 | Word Bank API | Verify duplicate add protection | Same authenticated user adds the same `word_id` twice | Second request returns `409`; error indicates word already in bank | Pass |
| WB-03 | Word Bank API | Verify review action updates mastery and history | Authenticated user; entry with `mastery_level=1`; request review with `knew_it=true` | API returns `200 OK`; mastery becomes `2`; review history record is created | Pass |
| WB-04 | Frontend Word Bank Page | Verify search filtering | Mock word bank contains `hypothesis` and `empirical`; search keyword `hypo` | Only matching word remains visible after filtering | Pass |
| DL-01 | Daily Learning API | Verify same-day limit is not refilled after carry-over is completed | User completes carry-over words and re-requests `/daily-learning/today` with same limit | API returns no new pending words beyond the configured daily cap | Pass |
| DL-02 | Daily Learning API | Verify reducing daily limit hides excess same-day pending words | User expands from `10` to `20`, receives more words, then reduces back to `10` | API hides the extra same-day pending words and returns no additional today list items | Pass |
| LISTEN-01 | Listening API | Verify listening catalog structure | Authenticated request `GET /api/listening/clips` | API returns level list, scenario list, supported lecture clips, and audio URLs | Pass |
| LISTEN-02 | Listening API | Verify beginner practice question format | Authenticated request for beginner lecture practice | API returns beginner questions as multiple choice only; no answers are exposed in public payload | Pass |
| LISTEN-03 | Listening API | Verify intermediate practice submission grading | Submit intermediate answers to quiz endpoint | API returns score, correct count, per-question results, and transcript | Pass |
| LISTEN-04 | Listening API | Verify invalid submission payload handling | Submit listening answers as an array instead of an object | API returns `400`; error indicates answers must be provided as an object | Pass |
| LISTEN-05 | Listening API | Verify unsupported practice path handling | Request `beginner/group-discussion` or submit `advanced/lecture-clips` practice | API returns `404`; error indicates the practice path is coming soon | Pass |
| LISTEN-06 | Listening API | Verify saved listening progress is returned for the same user | Submit answers, then request the same clip again while logged in as the same user | API returns `saved_attempt` with prior answers and graded results | Pass |
| PROG-01 | Progress Dashboard API | Verify dashboard metrics aggregation | Authenticated user with word progress, listening records, study time, and speaking session rows | API returns correct words learned, distinct listening completions, speaking session count, and total time | Pass |
| PROG-02 | Frontend Profile Page | Verify persisted profile statistics rendering | Mock dashboard response with live counts and time | Profile page renders the returned values correctly | Pass |
| LISTEN-07 | Frontend Listening Page | Verify level navigation and practice loading | Open `/listening`, click `Beginner` | Page navigates to level detail and loads beginner practice questions | Pass |
| LISTEN-08 | Frontend Listening Page | Verify beginner submission flow | Select beginner answers and click `Submit answers` | Submission API is called; page shows score and transcript | Pass |
| LISTEN-09 | Frontend Listening Page | Verify answer/result restoration after switching clips | Submit one clip, switch to another clip, then switch back | Previous answers and graded results are restored | Pass |
| LISTEN-10 | Frontend Listening Page | Verify backend-saved listening results are restored | Listening practice payload includes `saved_attempt` | Page restores prior answers and score without requiring local cache only | Pass |
| AUDIO-01 | AudioPlayer Component | Verify playback toggle behavior | Render player with valid `src`, click play button twice | First click calls `play`, second click calls `pause`, component toggles playback state | Pass |

## 10. Execution Commands

### Backend

```bash
pytest backend/tests
```

Coverage command:

```bash
pytest backend/tests --cov=backend/app --cov-report=term-missing
```

### Frontend

```bash
cd frontend
npm test
```

## 11. Execution Results

### Backend Result

Execution date: 2026-03-19

- `62` tests passed
- `0` tests failed
- backend app total coverage: `90%`

Important Sprint 1 route coverage from the coverage report:

- `auth.py`: `91%`
- `daily_learning.py`: `96%`
- `daily_words.py`: `100%`
- `word_bank.py`: `98%`
- `listening.py`: `88%`
- `progress.py`: `91%`

### Frontend Result

Execution date: 2026-03-19

- `7` test files passed
- `17` tests passed
- `0` tests failed

Covered Sprint 1 frontend pages and components:

- Login
- Register
- DailyWords
- WordBank
- Listening
- Profile
- AudioPlayer

## 12. Coverage Assessment

Sprint 1 feature coverage is complete for the current implemented Sprint 1 functionality in this repository.

### Fully Covered

- authentication backend logic
- daily words backend logic
- word bank backend logic
- daily learning backend logic used by vocabulary pages
- listening backend logic for currently supported flows
- persisted listening-attempt restore logic for the same user
- progress dashboard aggregation logic
- listening backend error handling for unsupported and invalid requests
- core frontend behavior for login, register, daily words, word bank, listening, profile, and audio playback

### Residual Gaps

- Some non-Sprint-1 models and AI service code remain outside Sprint 1 scope and reduce global application coverage
- The listening route includes multiple parsing and fallback branches that are only partially exercised because some scenarios are intentionally marked as coming soon
- Current frontend tests focus on main user flows rather than every visual branch

These residual gaps do not affect Sprint 1 feature completeness.

## 13. Risks and Notes

1. Coverage output shows SQLAlchemy `Query.get()` legacy warnings in existing route code. These warnings do not break tests but should later be refactored to `db.session.get(...)`.
2. Ant Design emits deprecation warnings during frontend tests, but all tested UI flows still pass successfully.
3. Vitest emits a benign localstorage-file warning in this environment; it did not cause test failures.
4. Listening content depends on the project’s `Audio`, `output`, and `generated_questions_md` folders being present and aligned by source name.

## 14. Final Evaluation

Sprint 1 unit testing is complete for the current implemented Sprint 1 functionality.

- Backend tests cover all current Sprint 1 APIs and listening flows.
- Frontend tests cover all current Sprint 1 pages, the profile dashboard page, and the shared audio player.
- Previously implemented vocabulary tests were re-run after the listening integration.
- All backend and frontend tests pass on the latest codebase.
- Additional listening persistence tests were added for saved-attempt restoration and clip-switch continuity.
- Additional daily-learning tests were added for daily-limit adjustment edge cases.
- Additional progress tests were added for dashboard aggregation and persisted study-time records.

Final status:

- Backend: `62/62` tests passed
- Frontend: `17/17` tests passed
- Backend application coverage: `90%`

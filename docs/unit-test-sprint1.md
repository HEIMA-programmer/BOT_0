# Sprint 1 Unit Test Document

## 1. Document Information

- Project: Academic English Practice App
- Sprint: Sprint 1 - Vocabulary Module
- Scope: Authentication, Daily Words, Word Bank
- Verification date: 2026-03-18
- Repository: `/Users/huruoqi/Desktop/BOT_0`

## 2. Purpose

This document records the completed unit testing work for Sprint 1. It covers the current implemented Sprint 1 code in the repository, not only the original sprint plan. The goal is to verify that users can:

- register and log in
- access authenticated vocabulary features
- view daily words
- manage word learning progress
- add, review, update, and remove words in the word bank

## 3. References

- [project guide.pdf](project guide.pdf)
- [docs/api-sprint1.md](docs/unit-test-sprint1.md)
- [backend/tests/test_auth.py](backend/tests/test_auth.py)
- [backend/tests/test_daily_words.py](backend/tests/test_daily_words.py)
- [backend/tests/test_word_bank.py](backend/tests/test_word_bank.py)
- [backend/tests/test_daily_learning.py](backend/tests/test_daily_learning.py)
- [frontend/src/pages/Login.test.jsx](frontend/src/pages/Login.test.jsx)
- [frontend/src/pages/Register.test.jsx](frontend/src/pages/Register.test.jsx)
- [frontend/src/pages/DailyWords.test.jsx](frontend/src/pages/DailyWords.test.jsx)
- [frontend/src/pages/WordBank.test.jsx](frontend/src/pages/WordBank.test.jsx)

## 4. Features Under Test

Sprint 1 features covered by unit tests:

1. Authentication
2. Daily Words API
3. Word Bank API
4. Daily Learning API used by current Daily Words and Word Bank pages
5. Frontend Sprint 1 pages

Main implementation files:

- [backend/app/routes/auth.py](backend/app/routes/auth.py)
- [backend/app/routes/daily_words.py](backend/app/routes/daily_words.py)
- [backend/app/routes/word_bank.py](backend/app/routes/word_bank.py)
- [backend/app/routes/daily_learning.py](backend/app/routes/daily_learning.py)
- [frontend/src/pages/Login.jsx](frontend/src/pages/Login.jsx)
- [frontend/src/pages/Register.jsx](frontend/src/pages/Register.jsx)
- [frontend/src/pages/DailyWords.jsx](frontend/src/pages/DailyWords.jsx)
- [frontend/src/pages/WordBank.jsx](frontend/src/pages/WordBank.jsx)

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
- cover happy path, validation failure, duplicate data, and unauthorized access
- verify JSON response structure and business rules
- isolate each backend test with a clean test database
- test frontend pages at component level with mocked API boundaries
- verify page rendering, validation, submission, and key user actions

Backend fixture support is implemented in [backend/tests/conftest.py](backend/tests/conftest.py). Frontend test setup is implemented in [frontend/src/test/setupTests.js](frontend/src/test/setupTests.js) and [frontend/src/test/renderWithProviders.jsx](frontend/src/test/renderWithProviders.jsx).

## 7. Implemented Test Files

### Backend

- [backend/tests/test_auth.py](backend/tests/test_auth.py)
- [backend/tests/test_daily_words.py](backend/tests/test_daily_words.py)
- [backend/tests/test_word_bank.py](backend/tests/test_word_bank.py)
- [backend/tests/test_daily_learning.py](backend/tests/test_daily_learning.py)

### Frontend

- [frontend/src/pages/Login.test.jsx](frontend/src/pages/Login.test.jsx)
- [frontend/src/pages/Register.test.jsx](frontend/src/pages/Register.test.jsx)
- [frontend/src/pages/DailyWords.test.jsx](frontend/src/pages/DailyWords.test.jsx)
- [frontend/src/pages/WordBank.test.jsx](frontend/src/pages/WordBank.test.jsx)

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

- During test implementation, a real defect was found in [backend/app/routes/daily_words.py](backend/app/routes/daily_words.py) where fewer than 5 source words caused duplicate results. This was fixed so the endpoint now returns only available unique words.

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
- return learning statistics
- mark word as mastered
- reject missing word when marking mastered
- add word to bank from learning flow
- reject duplicate add-to-bank request

### 8.5 Frontend Pages

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
- filter words by search term
- refresh word bank list

## 9. Representative Unit Test Cases

The following table provides representative unit test cases in a more standard test case specification format. These cases are selected from the implemented Sprint 1 test suite and focus on the most critical backend and frontend behaviors.

| Test ID | Module / Component | Scenario / Objective | Input / Test Data | Expected Result | Status |
|---|---|---|---|---|---|
| AUTH-01 | Authentication API | Verify that a new user can register successfully with valid data | `username=testuser`, `email=test@example.com`, `password=password123` | API returns `201 Created`; user record is stored; password is hashed; returned JSON includes user info | Pass |
| AUTH-02 | Authentication API | Verify duplicate username handling | Existing user: `testuser`; new request with same username and different email | API returns `409`; error message indicates username already exists | Pass |
| AUTH-03 | Authentication API | Verify duplicate email handling regardless of case | Existing user email `Test@Example.com`; new request email `test@example.com` | API returns `409`; error message indicates email already registered | Pass |
| AUTH-04 | Authentication API | Verify successful login with normalized email | Registered user; login input `email=Test@Example.com`, `password=password123` | API returns `200 OK`; authenticated user is returned; session is created | Pass |
| AUTH-05 | Frontend Login Page | Verify empty-form validation on login page | Click `Sign In` without entering email or password | Validation errors are shown; login API is not called | Pass |
| AUTH-06 | Frontend Register Page | Verify password confirmation validation | `password=password123`, `confirmPassword=password456` | Validation error `Passwords do not match`; register API is not called | Pass |
| DW-01 | Daily Words API | Verify behavior when no words exist in database | Empty `words` table; request `GET /api/daily-words` | API returns `200 OK`; `words` is an empty array | Pass |
| DW-02 | Daily Words API | Verify unique results when total word count is below five | Database contains 3 words; request `GET /api/daily-words?date=2026-03-18` | API returns exactly the 3 available unique words without duplication | Pass |
| DW-03 | Daily Words API | Verify deterministic selection for the same date | Same request date sent twice with populated word table | Both responses contain the same selected word set | Pass |
| DW-04 | Frontend Daily Words Page | Verify daily word summary renders correctly | Mock API response with `date=2026-03-18`, `1` pending word, `2` review words, `1` mastered word | Page displays date and correct summary counts | Pass |
| WB-01 | Word Bank API | Verify adding a word by `word_id` | Authenticated user; existing word `id=1`; request `POST /api/word-bank` with `word_id=1` | API returns `201 Created`; word bank entry is stored and returned | Pass |
| WB-02 | Word Bank API | Verify duplicate add protection | Same authenticated user adds same `word_id` twice | Second request returns `409`; error indicates word already in bank | Pass |
| WB-03 | Word Bank API | Verify deletion of existing word bank entry | Authenticated user; existing entry id | API returns `200 OK`; entry is removed from database | Pass |
| WB-04 | Word Bank API | Verify mastery update validation | Authenticated user; request `PATCH /api/word-bank/<id>` with `mastery_level=4` | API returns `400`; error indicates invalid mastery level | Pass |
| WB-05 | Word Bank API | Verify review action updates mastery and history | Authenticated user; entry with `mastery_level=1`; request review with `knew_it=true` | API returns `200 OK`; mastery becomes `2`; review history record is created | Pass |
| WB-06 | Frontend Word Bank Page | Verify saved word list is rendered and searchable | Mock word bank contains `hypothesis` and `empirical`; search keyword `hypo` | Page filters results and only matching word remains visible | Pass |
| WB-07 | Frontend Word Bank Page | Verify refresh action reloads word bank data | First mocked response empty; second mocked response contains `rubric`; click `Refresh` | Page reloads data and displays updated word list | Pass |

## 10. Execution Commands

### Backend

```bash
PYTHONPATH="/tmp/bot0_pydeps:/Users/huruoqi/Desktop/BOT_0/backend" python3 -m pytest backend/tests -q
```

Coverage command used for verification:

```bash
PYTHONPATH="/tmp/bot0_pydeps:/Users/huruoqi/Desktop/BOT_0/backend" python3 -m pytest backend/tests --cov=app --cov-report=term-missing
```

### Frontend

```bash
cd frontend
npm test
```

## 11. Execution Results

### Backend Result

Execution date: 2026-03-18

- `47` tests passed
- `0` tests failed
- backend app total coverage: `90%`

Important Sprint 1 route coverage from the coverage report:

- `auth.py`: `91%`
- `daily_learning.py`: `95%`
- `daily_words.py`: `100%`
- `word_bank.py`: `98%`

### Frontend Result

Execution date: 2026-03-18

- `4` test files passed
- `8` tests passed
- `0` tests failed

Covered Sprint 1 frontend pages:

- Login
- Register
- DailyWords
- WordBank

## 12. Coverage Assessment

Sprint 1 feature coverage is now complete for the current implemented functionality in this repository.

### Fully Covered

- authentication backend logic
- daily words backend logic
- word bank backend logic
- daily learning backend logic currently used by Sprint 1 pages
- core frontend page behavior for login, register, daily words, and word bank

### Residual Gaps

- Some non-Sprint-1 models and AI service code remain outside Sprint 1 scope and reduce global application coverage
- Current frontend tests focus on main user flows rather than every UI branch

These residual gaps do not affect Sprint 1 feature completeness.

## 13. Risks and Notes

1. Backend test execution currently relies on installed Python dependencies. For this verification run, dependencies were installed into `/tmp/bot0_pydeps`.
2. Coverage output shows SQLAlchemy `Query.get()` legacy warnings in existing route code. These warnings do not break tests but should be refactored later to `db.session.get(...)`.
3. Ant Design emits deprecation warnings during frontend tests, but all Sprint 1 tests still pass successfully.

## 14. Final Evaluation

Sprint 1 unit testing is complete for the current implemented Sprint 1 functionality.

- Backend tests cover all current Sprint 1 APIs and related learning flows.
- Frontend tests cover all current Sprint 1 pages.
- All newly added backend and frontend tests pass.
- A real defect in the daily words API was identified and fixed during testing.

Final status:

- Backend: `47/47` tests passed
- Frontend: `8/8` tests passed
- Backend application coverage: `90%`

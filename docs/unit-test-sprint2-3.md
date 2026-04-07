# Sprint 2-3 Unit Test Document

## 1. Document Information

- Project: Academic English Practice App
- Sprint: Sprint 2-3
- Scope: AI Conversation, Forum, Room & Games, Chat History
- Verification date: 2026-04-07
- Repository root: `.`

## 2. Purpose

This document records the completed unit testing work for Sprint 2-3 implementation in the repository.

The tested Sprint 2-3 user-facing capabilities are:

- create and manage AI conversation sessions
- save and retrieve conversation history
- browse and moderate forum content with role-based visibility
- verify room game question generation behavior
- validate Sprint 2-3 frontend pages and components related to conversation, forum, and speaking navigation

## 3. References

Project documents referenced in this test document:

- [README.md](../README.md)
- [docs/unit-test-sprint1.md](./unit-test-sprint1.md)
- [docs/architecture.md](./architecture.md)
- [docs/db-schema.md](./db-schema.md)

## 4. Features Under Test

Sprint 2-3 features covered by unit tests:

1. Chat History API
2. Forum API (user/admin visibility, search, pinning, forwarding)
3. Room & Games service behavior
4. Sprint 2-3 frontend pages and components

Main implementation files (representative):

- [backend/app/routes/chat_history.py](../backend/app/routes/chat_history.py)
- [backend/app/routes/forum.py](../backend/app/routes/forum.py)
- [backend/app/routes/room.py](../backend/app/routes/room.py)
- [frontend/src/components/ConversationView.jsx](../frontend/src/components/ConversationView.jsx)
- [frontend/src/components/NavBar.jsx](../frontend/src/components/NavBar.jsx)
- [frontend/src/components/ScoringResultsModal.jsx](../frontend/src/components/ScoringResultsModal.jsx)
- [frontend/src/components/VoiceSelector.jsx](../frontend/src/components/VoiceSelector.jsx)
- [frontend/src/components/WordPronunciationControl.jsx](../frontend/src/components/WordPronunciationControl.jsx)
- [frontend/src/pages/AIChat.jsx](../frontend/src/pages/AIChat.jsx)
- [frontend/src/pages/ConversationHistory.jsx](../frontend/src/pages/ConversationHistory.jsx)
- [frontend/src/pages/Forum.jsx](../frontend/src/pages/Forum.jsx)
- [frontend/src/pages/Home.jsx](../frontend/src/pages/Home.jsx)
- [frontend/src/pages/Speaking.jsx](../frontend/src/pages/Speaking.jsx)

## 5. Test Environment and Tools

### Backend

- Language: Python
- Framework: Flask
- Database: SQLite
- Unit test framework: `pytest`
- Coverage tool: `pytest-cov`
- Runtime used for verification: Python `3.11.9`

### Frontend

- Framework: React + Vite + Ant Design
- Unit test framework: `Vitest`
- DOM environment: `jsdom`
- Render utility: Testing Library

## 6. Test Strategy

The unit testing strategy for Sprint 2-3 is:

- test each new Sprint 2-3 backend endpoint/service behavior independently
- cover happy path, role/permission checks, search/filter behavior, and unauthorized access
- verify JSON response structure and key business rules
- isolate backend tests with fixture-based clean test data
- test Sprint 2-3 frontend pages/components with mocked API boundaries
- verify core rendering, interaction callbacks, state transitions, and navigation behavior

Backend fixture support is implemented in [backend/tests/conftest.py](../backend/tests/conftest.py). Frontend test setup is implemented in [frontend/src/test/setupTests.js](../frontend/src/test/setupTests.js) and [frontend/src/test/renderWithProviders.jsx](../frontend/src/test/renderWithProviders.jsx).

## 7. Implemented Test Files

### Backend (Sprint 2-3 focus)

- [backend/tests/test_chat_history.py](../backend/tests/test_chat_history.py)
- [backend/tests/test_forum.py](../backend/tests/test_forum.py)
- [backend/tests/test_room_games.py](../backend/tests/test_room_games.py)

### Frontend (Sprint 2-3新增)

- [frontend/src/components/ConversationView.test.jsx](../frontend/src/components/ConversationView.test.jsx)
- [frontend/src/components/NavBar.test.jsx](../frontend/src/components/NavBar.test.jsx)
- [frontend/src/components/ScoringResultsModal.test.jsx](../frontend/src/components/ScoringResultsModal.test.jsx)
- [frontend/src/components/VoiceSelector.test.jsx](../frontend/src/components/VoiceSelector.test.jsx)
- [frontend/src/components/WordPronunciationControl.test.jsx](../frontend/src/components/WordPronunciationControl.test.jsx)
- [frontend/src/pages/AIChat.test.jsx](../frontend/src/pages/AIChat.test.jsx)
- [frontend/src/pages/ConversationHistory.test.jsx](../frontend/src/pages/ConversationHistory.test.jsx)
- [frontend/src/pages/Forum.test.jsx](../frontend/src/pages/Forum.test.jsx)
- [frontend/src/pages/Home.test.jsx](../frontend/src/pages/Home.test.jsx)
- [frontend/src/pages/Speaking.test.jsx](../frontend/src/pages/Speaking.test.jsx)

## 8. Detailed Test Coverage

### 8.1 Chat History API (`backend/tests/test_chat_history.py`)

Covered cases:

- `test_create_session`: create a new conversation session successfully
- `test_get_sessions`: return session list for current user
- `test_get_session_detail`: return full detail for a specific session
- `test_save_messages`: persist conversation messages into a session
- `test_end_session`: mark session as ended correctly
- `test_get_scenario_options`: return scenario options for valid type
- `test_get_scenario_options_unknown_type`: handle unknown scenario type safely
- `test_requires_login`: reject unauthenticated access

### 8.2 Forum API (`backend/tests/test_forum.py`)

Covered cases:

- `test_regular_user_only_sees_approved_posts`: regular user only sees approved posts
- `test_admin_can_filter_posts_by_status`: admin can filter posts by review status
- `test_posts_can_be_searched_by_title_or_tag`: support searching by title or tag
- `test_admin_all_posts_includes_approved_friend_zone_posts`: admin all-posts view includes friend-zone approved posts
- `test_admin_cannot_pin_friend_zone_posts`: admin cannot pin friend-zone posts improperly
- `test_friend_zone_pins_are_user_specific`: friend-zone pin behavior is user-specific
- `test_regular_user_cannot_pin_invisible_friend_zone_post`: regular users cannot pin posts they cannot see
- `test_friend_zone_excludes_forwards_from_non_friends`: non-friend forwards are excluded from friend-zone visibility
- `test_forward_can_target_friend_zone_and_is_visible_to_friends`: forwards to friend-zone are visible to friends
- `test_forward_can_target_public_zone`: forwards can target and appear in public zone

### 8.3 Room Games (`backend/tests/test_room_games.py`)

Covered cases:

- `test_generate_context_guesser_questions_uses_progressive_awl_blanks`: context guesser generation follows progressive AWL blanking rule
- `test_generate_word_duel_questions_preserves_definition_answer_shape`: word duel generation preserves expected definition-answer data shape

### 8.4 Frontend Sprint 2-3 Components and Pages

#### `frontend/src/components/ConversationView.test.jsx` (4 tests)

- verify connecting/loading state rendering
- verify message bubbles render correctly
- verify end conversation button click handler
- verify read-only mode behavior

#### `frontend/src/components/NavBar.test.jsx` (1 test)

- verify logo, menu items, and avatar are rendered correctly

#### `frontend/src/components/ScoringResultsModal.test.jsx` (3 tests)

- verify loading state rendering
- verify score values are displayed correctly
- verify closed/hidden modal state behavior

#### `frontend/src/components/VoiceSelector.test.jsx` (2 tests)

- verify voice options are rendered
- verify `onChange` callback is fired with selected value

#### `frontend/src/components/WordPronunciationControl.test.jsx` (3 tests)

- verify compact mode rendering
- verify learning mode rendering
- verify speak button click callback

#### `frontend/src/pages/AIChat.test.jsx` (1 test)

- verify scenario cards render with coming-soon status

#### `frontend/src/pages/ConversationHistory.test.jsx` (2 tests)

- verify session list loads and renders
- verify empty state rendering when no sessions

#### `frontend/src/pages/Forum.test.jsx` (5 tests)

- verify approved posts rendering for regular users
- verify admin review queue rendering
- verify admin all-posts view rendering
- verify search behavior
- verify pagination behavior (including empty later page handling)

#### `frontend/src/pages/Home.test.jsx` (2 tests)

- verify welcome banner rendering
- verify module cards rendering/navigation behavior

#### `frontend/src/pages/Speaking.test.jsx` (2 tests)

- verify speaking modes render and navigation to structured speaking
- verify AI conversation tab switching/navigation

## 9. Representative Unit Test Cases

| Test ID | Module / Component | Scenario / Objective | Input / Test Data | Expected Result | Status |
|---|---|---|---|---|---|
| CH-01 | Chat History API | Create conversation session | Authenticated request with session payload | Session created successfully and returned | Pass |
| CH-02 | Chat History API | Save conversation messages | Existing session + message list | Messages persisted and linked to session | Pass |
| CH-03 | Chat History API | Unauthenticated access control | Request without login session | API rejects request as unauthorized | Pass |
| FORUM-01 | Forum API | Regular user visibility control | Regular user queries post list | Only approved/visible posts returned | Pass |
| FORUM-02 | Forum API | Admin status filter | Admin filters by pending/approved | Filtered results match status condition | Pass |
| FORUM-03 | Forum API | Search by title/tag | Query with keyword/tag | Matching posts are returned | Pass |
| FORUM-04 | Forum API | Forward to friend zone visibility | Friend-zone forward test data | Visible to friends only | Pass |
| GAME-01 | Room Games | Context Guesser question shape | AWL source data | Progressive blank generation rule is preserved | Pass |
| GAME-02 | Room Games | Word Duel question shape | Definition/answer source data | Output shape matches expected contract | Pass |
| FE-CHAT-01 | ConversationView | End button interaction | Render component + click end button | End callback triggered | Pass |
| FE-FORUM-01 | Forum Page | Admin queue rendering | Mock admin role + queued posts | Admin queue appears with expected entries | Pass |
| FE-AICHAT-01 | AIChat Page | Coming-soon scenario cards | Render AIChat page | Scenario cards display correct coming-soon state | Pass |

## 10. Execution Commands

### Backend

```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v --cov=app --cov-report=term-missing
```

### Frontend

```bash
cd frontend
npm install
npx vitest run
```

## 11. Execution Results

### Backend Result

Execution date: 2026-04-07

- `86` tests passed
- `0` tests failed
- backend app total coverage: `50%`

Notes:

- Verified under Python `3.11.9`
- Initial run under Python `3.13.x` failed due to `audioop` removal compatibility; rerun with Python 3.11.9 succeeded

### Frontend Result

Execution date: 2026-04-07

- `17` test files passed
- `47` tests passed
- `0` tests failed

## 12. Coverage Assessment

The new target features introduced in Sprint 2–3 have been covered by valid unit tests, in particular:

### Covered Well

- chat history session lifecycle and access control
- forum role-based visibility, moderation filter, search, forward/pin behavior
- room game question generation core logic
- key Sprint 2-3 frontend pages/components interactions

### Residual Gaps

- global backend coverage is `50%`, because large non-Sprint-2-3 modules (e.g., websocket-heavy flows, some AI service internals, and real-time room paths) are not fully unit-tested in this cycle
- frontend run includes broader project tests; this document focuses on New test files and scenarios added in Sprint 2-3
- deprecation warnings exist in dependencies/UI library usage but do not block test pass status

These residual gaps do not invalidate Sprint 2-3 unit test completion for the targeted scope.

## 13. Risks and Notes

1. Python runtime compatibility matters for backend test stability (`3.11.x` recommended in current setup).
2. Frontend test output includes Ant Design deprecation warnings; these are non-blocking but should be cleaned in future refactors.
3. Some legacy SQLAlchemy `Query.get()` warning paths are still present and should be migrated to `Session.get()` later.

## 14. Final Evaluation

Sprint 2-3 unit testing is complete for the defined scope in this document.

- Backend Sprint 2-3 target suites pass completely
- Frontend Sprint 2-3 target test files pass
- Execution evidence is captured from local test runs on 2026-04-07

Final status:

- Backend: `86/86` tests passed
- Frontend: `47/47` tests passed
- Backend application coverage: `50%`
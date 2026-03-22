# Sprint 1 Planning Meeting

**Date:** 2026-03-16
**Time:** 10:00 – 12:00 (2 hours)
**Attendees:** Yanbin Xu, Yanshuo Liu, Junfan Zhou, Yupei Yang, Ruoqi Hu, Weike Jin, Chenxi Huang
**Facilitator (SM):** Yanshuo Liu
**Product Owner:** Yanbin Xu

---

## Sprint Goal

> Deliver functional Vocabulary Hub (daily words, word bank, auth) and establish the Listening Lab foundation (beginner + intermediate lecture clips with practice questions).

---

## Selected User Stories

The following User Stories were selected from the Product Backlog for this sprint:

| ID | User Story | Priority | Points |
|---|---|---|---|
| US01 | User authentication (register/login/logout) | Must | 3 |
| US02 | Daily academic words with definitions, examples, audio | Must | 5 |
| US03 | Save words to personal bank for later review | Must | 3 |
| US04 | Listening Comprehension (audio player + questions + grading) | Must | 8 |
| US05 | Listening Difficulty Levels (Beginner/Intermediate/Advanced UI) | Should | 2 |

**Total Story Points: 21**

**Note:**
- US01 was separated from US02/US03 during sprint planning to better reflect authentication scope.
- US04 combines audio playback infrastructure and question/grading functionality. Sprint 1 delivers beginner + intermediate levels (T1.8 backend + T1.9 frontend); remaining scenarios and advanced level continue in Sprint 2.
- US05 focuses on difficulty level UI/UX differentiation and will be implemented in Sprint 2 (T2.1 + T2.3).

---

## Capacity

| Member | Available Hours |
|---|---|
| Yanbin Xu | 25h |
| Yanshuo Liu | 25h |
| Junfan Zhou | 25h |
| Yupei Yang | 25h |
| Ruoqi Hu | 25h |
| Weike Jin | 25h |
| Chenxi Huang | 25h |
| **Total** | **175h** |

---

## API Contracts

Defined at the start of Sprint Planning (30 min). Full contracts documented in `docs/api-sprint1.md`.

Endpoints agreed upon:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/daily-words`
- `GET /api/word-bank`
- `POST /api/word-bank`
- `DELETE /api/word-bank/{id}`

Frontend developers will use mock data matching this contract immediately. Backend developers build to match the same contract. Integration is seamless when both sides are ready.

---

## Task Selection & Estimates

Estimation method: **Planning Poker** — each team member voted independently, discussed differences, and reached consensus.

| ID | Task | Assignee | Estimate | Dependencies |
|---|---|---|---|---|
| T1.0 | Frontend project setup (React+Vite, router, Ant Design, API module with mock) | Yanbin Xu | 8h | — |
| T1.1 | Database schema design & implementation (SQLAlchemy models for all modules) | Junfan Zhou | 8h | — |
| T1.2 | Backend Flask API framework + route structure + config | Yanbin Xu | 8h | T1.1 |
| T1.3 | User authentication (register/login/logout, Flask-Login sessions) [US01] | Ruoqi Hu | 6h | T1.2 |
| T1.4 | Daily Words feature (API + display page + browser TTS) [US02] | Weike Jin | 8h | T1.0, T1.2 |
| T1.5 | Word Bank feature (add/remove/list/review CRUD) [US03] | Chenxi Huang | 8h | T1.2, T1.3 |
| T1.6 | CI/CD pipeline (GitHub Actions: lint + test on PR, branch protection) | Yanshuo Liu | 6h | — |
| T1.7 | Vocabulary module optimisation | Yanbin Xu | 6h | T1.4, T1.5 |
| T1.8 | Listening backend: catalog API, audio streaming, question markdown parser, answer grading engine [US04] | Junfan Zhou | 10h | T1.1, T1.2 |
| T1.9 | Listening frontend: level/scenario/clip selection, audio player, practice UI, submission + result display [US04] | Junfan Zhou | 6h | T1.0, T1.8 |
| T1.10 | Integration testing (register → login → daily words → word bank → listening quiz → submit) | Yupei Yang | 8h | T1.7, T1.8 |
| T1.11 | Unit tests for auth, daily-words, word-bank, listening, progress APIs | Ruoqi Hu | 4h | T1.7, T1.8 |

**Total planned: 86h / 175h capacity (49% utilisation) — significant buffer retained for learning curve and unexpected issues.**

**Note:** T1.2 was initially assigned to Yupei Yang but reassigned to Yanbin Xu on Day 2 when Yupei shifted focus to T1.10.

---

## Acceptance Criteria

| Task | Acceptance Criteria |
|---|---|
| T1.0 | React app runs locally; routing works; Ant Design components render; API module returns mock data |
| T1.1 | All models defined in SQLAlchemy; migrations run without error; tables created in SQLite/PostgreSQL |
| T1.2 | Flask server starts; all endpoints return correct status codes; connects to database |
| T1.3 | User can register with email/password; login returns session; invalid credentials return 401; logout clears session |
| T1.4 | `/api/daily-words` returns word list; frontend displays words with definitions; TTS plays pronunciation |
| T1.5 | User can add/remove/list words in word bank; data persists across sessions; requires authentication |
| T1.6 | GitHub Actions runs lint + tests on every PR; branch protection blocks merge if CI fails |
| T1.7 | Enhanced learning and knowledge management logic implemented; vocabulary features optimised |
| T1.8 | Listening catalog API works; audio streams correctly; question parser handles markdown; grading engine returns scores |
| T1.9 | Listening page displays level/scenario/clip selection; audio player works; practice UI functional; results display correctly |
| T1.10 | End-to-end flow works: register → login → view daily words → save to word bank → listening quiz → submit |
| T1.11 | Unit tests cover ≥80% of auth, vocabulary, listening API code; all tests pass |

---

## Workload Check

| Member | Assigned Hours | Within 25h cap? |
|---|---|---|
| Yanbin Xu | 8h + 8h + 6h = 22h | yes |
| Yanshuo Liu | 6h | yes |
| Junfan Zhou | 8h + 10h + 6h = 24h | yes |
| Yupei Yang | 8h | yes |
| Ruoqi Hu | 6h + 4h = 10h | yes |
| Weike Jin | 8h | yes |
| Chenxi Huang | 8h | yes |

**Total assigned: 86h / 175h capacity (49% utilisation)**

Note: Significant buffer retained for first sprint learning curve and unexpected issues. T1.2 was initially assigned to Yupei Yang but reassigned to Yanbin Xu on Day 2.

---

## Day-by-Day Plan

| Day | Key Focus |
|---|---|
| Mon (3/16) | Sprint Planning (2h). T1.0, T1.1, T1.6 start immediately (no dependencies). T1.2 starts Flask skeleton. Others: build frontend pages with mock data. |
| Tue (3/17) | T1.0 and T1.1 finish and submit PRs. Yanbin Xu reviews T1.1, merges, continues T1.2. T1.8 (Listening backend) can start after T1.1/T1.2 merge. |
| Wed (3/18) | T1.2 finishes. T1.3, T1.4, T1.5 fully unblocked. Three devs work in parallel on auth, daily words, word bank. T1.7 (vocabulary optimisation) begins. T1.8 continues. |
| Thu (3/19) | T1.3, T1.4, T1.5, T1.7 submit PRs. Cross-review. T1.9 (Listening frontend) starts. Begin integration testing. |
| Fri (3/20) | T1.10 integration tests + T1.11 unit tests. Bug fixes. Sprint Review + Retrospective. All tests + fixes merged. Sprint complete. |

---

## Team Commitments

- All members commit to the Sprint Goal above.
- Each member is responsible for updating their task status on the GitHub Project board daily.
- SM (Yanshuo Liu) will post the daily standup prompt each morning and update the burndown chart.
- Any blocker must be raised in the standup the same day it is discovered — not at the end of the sprint.

---

## Definition of Done

All tasks follow the Definition of Done defined in `docs/team_working_agreement.md`.

---

## Risks & Assumptions

| Type | Description | Mitigation |
|---|---|---|
| Assumption | All team members have local dev environment ready | Verified during Sprint 0 |
| Assumption | API contracts are stable and won't change mid-sprint | Contracts documented in `docs/api-sprint1.md` |
| Risk | T1.1 or T1.2 delay would block 3+ downstream tasks | These tasks start Day 1 with highest priority |
| Risk | Code review bottleneck on Thu/Fri | Reviewers assigned in advance; async reviews encouraged |
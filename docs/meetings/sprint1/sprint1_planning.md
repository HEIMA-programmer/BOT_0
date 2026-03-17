# Sprint 1 Planning Meeting

**Date:** 2026-03-16
**Time:** 10:00 – 12:00 (2 hours)
**Attendees:** Yanbin Xu, Yanshuo Liu, Junfan Zhou, Yupei Yang, Ruoqi Hu, Weike Jin, Chenxi Huang
**Facilitator (SM):** Yanshuo Liu
**Product Owner:** Yanbin Xu

---

## Sprint Goal

> Deliver a functional Vocabulary Hub — users can register/login, see daily words, and save to personal word bank.

---

## Selected User Stories

The following User Stories were selected from the Product Backlog for this sprint:

| ID | User Story | Priority | Points |
|---|---|---|---|
| US01 | Daily academic words with definitions, examples, audio | Must | 5 |
| US02 | Save words to personal bank for later review | Must | 3 |

**Total Story Points: 8**

---

## Capacity

| Member | Available Hours |
|---|---|
| Yanbin Xu | 10h |
| Yanshuo Liu | 10h |
| Junfan Zhou | 10h |
| Yupei Yang | 10h |
| Ruoqi Hu | 10h |
| Weike Jin | 10h |
| Chenxi Huang | 10h |
| **Total** | **70h** |

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
| T1.1 | Database schema design & implementation (SQLAlchemy models) | Junfan Zhou | 8h | — |
| T1.2 | Backend Flask API framework + route structure | Yupei Yang | 8h | T1.1 |
| T1.3 | User authentication (register/login, Flask-Login sessions) | Ruoqi Hu | 6h | T1.2 |
| T1.4 | Daily Words feature (API + display page + browser TTS) | Weike Jin | 8h | T1.0, T1.2 |
| T1.5 | Word Bank feature (add/remove/list/review) | Chenxi Huang | 8h | T1.2, T1.3 |
| T1.6 | CI/CD pipeline (GitHub Actions: lint + test on PR, branch protection) | Yanshuo Liu | 6h | — |
| T1.7 | Unit tests for vocabulary APIs | Junfan Zhou | 4h | T1.4, T1.5 |
| T1.8 | Integration testing (end-to-end flow) | Yupei Yang | 4h | T1.7 |

**Total planned: 60h / 70h capacity (86% utilisation) — 10h buffer retained for unexpected issues.**

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
| T1.7 | Unit tests cover ≥80% of vocabulary API code; all tests pass |
| T1.8 | End-to-end flow works: register → login → view daily words → save to word bank → logout |

---

## Workload Check

| Member | Assigned Hours | Within 10h cap? |
|---|---|---|
| Yanbin Xu | 8h | yes |
| Yanshuo Liu | 6h | yes |
| Junfan Zhou | 8h + 4h = 12h |  Discussed — split if needed |
| Yupei Yang | 8h + 4h = 12h |  Discussed — T1.8 is end-of-sprint, low-risk overflow |
| Ruoqi Hu | 6h | yes |
| Weike Jin | 8h | yes |
| Chenxi Huang | 8h | yes |

Note: Junfan and Yupei have slightly over 10h due to test tasks being short and end-of-sprint. Team agreed this is acceptable given the buffer.

---

## Day-by-Day Plan

| Day | Key Focus |
|---|---|
| Mon (3/16) | Sprint Planning (2h). T1.0, T1.1, T1.6 start immediately (no dependencies). T1.2 starts Flask skeleton. Others: build frontend pages with mock data. |
| Tue (3/17) | T1.0 and T1.1 finish and submit PRs. Yupei Yang reviews T1.1 immediately, merges, continues T1.2. |
| Wed (3/18) | T1.2 finishes. T1.3, T1.4, T1.5 fully unblocked. Three devs work in parallel on auth, daily words, word bank. |
| Thu (3/19) | T1.3, T1.4, T1.5 submit PRs. Cross-review. Begin integration: pull all into main, test full flow. |
| Fri (3/20) | T1.7 unit tests + T1.8 integration tests. Bug fixes. Sprint Review + Retrospective. All tests + fixes merged. Sprint complete. |

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
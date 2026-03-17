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
| Mon (3/16) | Sprint Planning. T1.0, T1.1, T1.6 start immediately. Others start mock-based frontend pages. |
| Tue (3/17) | T1.0 and T1.1 PRs submitted. Review and merge. T1.2 starts Flask skeleton, connects DB after T1.1 merges. |
| Wed (3/18) | T1.2 merges. T1.3, T1.4, T1.5 fully unblocked. Three devs work in parallel. |
| Thu (3/19) | T1.3, T1.4, T1.5 PRs submitted. Cross-review. Begin integration testing. |
| Fri (3/20) | T1.7 unit tests + T1.8 integration tests. Bug fixes. Sprint Review + Retrospective. |

---

## Team Commitments

- All members commit to the Sprint Goal above.
- Each member is responsible for updating their task status on the GitHub Project board daily.
- SM (Yanshuo Liu) will post the daily standup prompt each morning and update the burndown chart.
- Any blocker must be raised in the standup the same day it is discovered — not at the end of the sprint.
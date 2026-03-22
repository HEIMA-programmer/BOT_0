# Sprint 1 Review

**Date:** 2026-03-20 (Friday)
**Attendees:** Full team 
**Facilitator:** Yanshuo Liu (Scrum Master)
**Product Owner:** Yanbin Xu (Product Owner)

---

## Sprint Goal

> Deliver functional Vocabulary Hub (daily words, word bank, auth) and establish
> the Listening Lab foundation (beginner + intermediate lecture clips with practice questions).

**Result:  Core Vocabulary Hub delivered one day ahead of schedule. Listening Lab foundation started (In Progress).**

---

## Completed User Stories

| US | Story | Points | Status |
|----|-------|--------|--------|
| US01 | User Registration & Login | 3 |  Done |
| US02 | Daily academic words with definitions | 5 |  Done |
| US03 | Save words to personal word bank | 3 |  Done |
| US04 | Listening Comprehension (audio player + questions + grading) | 8 |  In Progress |

**Total: 11 story points delivered (Done). 8 story points in progress (US04 started ahead of schedule).**

**Note:** US05 (Listening Difficulty Levels, 2 points) is planned for Sprint 2 and not started in Sprint 1.

### US02: Daily Academic Words - Task Breakdown
- T1.0 - Frontend project setup #16
- T1.1 - Database schema design & implementation #17
- T1.2 - Backend Flask API framework + route structure #18
- T1.3 - User authentication #19
- T1.4 - Daily Words feature (API + display page + browser TTS) #20
- T1.6 - CI pipeline (GitHub Actions: test on PR) #21
- T1.7 - Vocabulary function overall refinement #45
- T1.11 - Unit tests for vocabulary APIs #22
- T1.10 - Integration testing (end-to-end flow) #23

### US03: Personal Word Bank - Task Breakdown
- T1.0 - Frontend project setup #25
- T1.1 - Database schema design & implementation #26
- T1.2 - Backend Flask API framework + route structure #27
- T1.3 - User authentication #28
- T1.5 - Word Bank feature (add/remove/list/learn) #29
- T1.6 - CI pipeline (GitHub Actions: test on PR) #30
- T1.7 - Refine overall vocabulary function #45
- T1.11 - Unit tests for vocabulary APIs #31
- T1.10 - Integration testing (end-to-end flow) #32

### US04: Listening Comprehension - Task Breakdown (In Progress)
- T1.8 - Listening backend: catalog API, audio streaming, question parser, grading engine #48  Done
- T1.9 - Listening frontend: level/scenario/clip selection, audio player, practice UI #55  Done
- Remaining work: Additional scenarios and advanced level content (to be completed in Sprint 2)

---

## Completed Tasks

| Task | Assignee | Status |
|------|----------|--------|
| T1.0 Frontend project setup | Yanbin Xu |  Done |
| T1.1 Database schema | Junfan Zhou |  Done |
| T1.2 Flask API framework | Yanbin Xu |  Done |
| T1.3 User authentication | Ruoqi Hu |  Done |
| T1.4 Daily Words feature | Weike Jin |  Done |
| T1.5 Word Bank feature | Chenxi Huang |  Done |
| T1.6 CI/CD pipeline | Yanshuo Liu |  Done |
| T1.7 Vocabulary optimisation | Yanbin Xu |  Done |
| T1.8 Listening backend | Junfan Zhou |  Done |
| T1.9 Listening frontend | Junfan Zhou |  Done |
| T1.10 Integration testing | Yupei Yang |  Done |
| T1.11 Unit tests | Ruoqi Hu |  Done |

---

## Application Summary

1. **User Registration & Login** — Register with email/password, login,
   session persists, logout clears session. (Ruoqi Hu)
2. **Daily Words** — Browse today's academic words with definitions and
   browser TTS pronunciation. (Weike Jin)
3. **Word Bank** — Add/remove words, list saved words, persists across
   sessions, requires authentication. (Chenxi Huang)
4. **CI/CD** — GitHub Actions runs lint + tests on every PR; merge blocked
   if CI fails. (Yanshuo Liu)
5. **Listening Comprehension Foundation** — Backend infrastructure (T1.8) and frontend UI (T1.9)
   for beginner + intermediate lecture clips with audio playback, comprehension questions,
   and grading feedback. Started ahead of schedule, to be completed in Sprint 2. (Junfan Zhou)

---

## PO Acceptance

| US | Accepted? | Notes |
|----|-----------|-------|
| US01 |  Yes | All acceptance criteria met |
| US02 |  Yes | All acceptance criteria met |
| US03 |  Yes | All acceptance criteria met |
| US04 |  Partial | T1.8 and T1.9 completed (beginner + intermediate levels); remaining scenarios and advanced level to be added in Sprint 2 |

---

## Notes on Backlog Changes

During Sprint 1, the PO refined the backlog structure:

**Story Points Evolution:**
- **Original Planning:** 8 story points total
  - US01: Daily academic words (5 points)
  - US02: Save words to personal word bank (3 points)

- **Refined Structure:** 21 story points total
  - US01: User Registration & Login (3 points) — newly separated
  - US02: Daily academic words with definitions (5 points)
  - US03: Save words to personal word bank (3 points)
  - US04: Listening Comprehension (8 points) — combines audio playback + questions + grading
  - US05: Listening Difficulty Levels (2 points) — planned for Sprint 2

- **Rationale:** User Authentication was originally embedded within US01 and US02
  (estimated at ~0.5 time units each). After Sprint Planning, the PO separated
  it into a standalone story (US01) with 3 story points to better reflect its
  scope and enable clearer acceptance criteria. US04 combines the complete Listening
  Comprehension feature as described in the project guide.

- Sprint 1 planning document remains unchanged as a historical record.
- Updated structure will be carried forward into Sprint 2 planning.
- According to the feedback, we may refine some backlogs in Sprint 2 :).
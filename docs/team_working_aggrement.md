# Team Working Agreement

**Project:** Academic English Practice App
**Team Members:** Yanbin Xu, Yanshuo Liu, Junfan Zhou, Yupei Yang, Ruoqi Hu, Weike Jin, Chenxi Huang
**Established:** 2026-03-16 (Sprint 0 / Sprint 1 Planning)

---

## 1. Roles & Responsibilities

- **Product Owner (PO):** Owns and orders the Product Backlog; accepts or rejects Sprint deliverables against acceptance criteria. Rotates each sprint.
- **Scrum Master (SM):** Facilitates all Scrum ceremonies, posts daily standup prompts, maintains the burndown chart, removes blockers. Rotates each sprint.
- **Developers:** All remaining members each sprint. Everyone is responsible for building, testing, and integrating. QA is a shared responsibility — there is no dedicated QA role.

| Sprint | PO | SM |
|---|---|---|
| Sprint 1 | Yanbin Xu | Yanshuo Liu |
| Sprint 2 | Junfan Zhou | Yupei Yang |
| Sprint 3 | Ruoqi Hu | Weike Jin |
| Sprint 4 | Chenxi Huang | Yanbin Xu |

---

## 2. Working Hours & Capacity

- Each member commits a maximum of **10 hours per sprint**.
- If a member anticipates being unable to meet their hours (exam, illness, etc.), they must notify the SM **at least 24 hours in advance** so tasks can be redistributed.
- We show up to all Scrum ceremonies unless a valid reason is communicated early.

---

## 3. Communication

**Primary channel:** WeChat group (Academic English App Team)
**Secondary channel:** GitHub PR comments and Issues (for technical discussions)

| Situation | Expected Response Time |
|---|---|
| General messages in WeChat | Within 4 hours during core hours |
| PR review requests | Within 24 hours |
| Blocker / urgent issue | Same day |
| Absence notification | At least 24 hours in advance |

Daily standup messages are posted in the WeChat group every morning by each member in this format:
1. What did I complete since last standup?
2. What will I work on next?
3. Any blockers? (tag the person who can unblock you)

---

## 4. Git & GitHub Rules

- **No direct pushes to `main`.** All changes go through a Pull Request.
- Every PR must have **at least 1 teammate review and approve** before merging.
- **CI must pass** (GitHub Actions green check) before merging is allowed.
- After merging, **delete the remote branch** to keep the repo clean.
- Commit message format: `type: short description`
  - Types: `feat`, `fix`, `test`, `docs`, `chore`, `refactor`
  - Example: `feat: add daily words API endpoint`
- Branch naming: `feature/T1.x-task-name` or `fix/short-description`

---

## 5. Meetings & Ceremonies

| Ceremony | Duration | When | Who Runs |
|---|---|---|---|
| Sprint Planning | 2 hours | Day 1 of sprint | SM |
| Daily Standup | Async (text) | Every morning | SM prompts, all reply |
| Backlog Refinement | 30–60 min | Mid-sprint | PO + SM |
| Sprint Review | 1 hour | Last day | PO |
| Sprint Retrospective | 1 hour | Last day | SM |

All ceremony notes are recorded in `docs/meetings/` and committed to the repository.

---

## 6. Definition of Done

A task is only "Done" when ALL of the following are true:

| Criterion | Standard |
|---|---|
| Code Complete | All code written, follows conventions, merged to main via PR |
| Code Reviewed | At least 1 team member reviewed and approved the PR |
| CI Passed | GitHub Actions green check — lint + tests pass |
| Unit Tested | ≥80% coverage on new code, all tests pass |
| Integration Tested | Works correctly with other modules |
| UI/UX Verified | Matches Figma design, responsive down to tablet width |
| Browser Tested | Works on Chrome + Firefox minimum |
| Documentation | Code comments and API docs updated as needed |
| No Critical Bugs | Zero P1 bugs; P2 bugs documented in GitHub Issues |
| PO Accepted | Meets acceptance criteria; PO signs off |

---

## 7. Conflict Resolution

- **Technical disagreements:** Discuss in PR comments or WeChat. If no consensus after 24 hours, SM makes the call.
- **Unequal workload:** Raise during Sprint Planning before committing. Tasks are redistributed on the spot.
- **Personal conflicts:** Address privately first. If unresolved, escalate to the course instructor.
- **Missed deadlines:** Raise in standup the same day — not at the end of the sprint.

---

## 8. AI Usage Policy

- Use of AI tools (e.g. GitHub Copilot, ChatGPT, Claude) to assist with coding and documentation is permitted.
- All AI-generated code must be **personally reviewed and understood** by the submitting member before committing.
- AI-generated content used in assessed deliverables must be **disclosed** — add a comment in the code or a note in the PR description.
- We do not submit AI-generated work as our own without disclosure. Doing so violates the team's integrity standards and course policy.

---

## 9. Accessibility & Inclusion

- We design inclusively: check keyboard navigation, colour contrast, and alt text on all UI components.
- We communicate respectfully in all channels. No dismissive or disrespectful language.
- We credit all third-party libraries, assets, and sources in the README or relevant documentation.
- We show up, communicate absences early, and rebalance work transparently.

---

## 10. Signatures

By participating in this project, all team members agree to the above.

| Member | Agreed |
|---|---|
| Yanbin Xu | Agree |
| Yanshuo Liu | Agree |
| Junfan Zhou | Agree |
| Yupei Yang | Agree |
| Ruoqi Hu | Agree |
| Weike Jin | Agree |
| Chenxi Huang | Agree |
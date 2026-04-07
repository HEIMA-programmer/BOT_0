# Sprint 2-3 Integration Test Report

## 1. Document Information

- Project: Academic English Practice App  
- Sprint: Sprint 2-3  
- Document Type: Integration Test Report  
- Test Date: 2026-04-07  
- Tester: Manual QA session (single tester, multi-account workflow)  
- Environment: Local development environment (Web + Mobile browser spot checks)

---

## 2. Purpose

This document records cross-module integration validation for Sprint 2-3 features.  
The objective is to verify that newly delivered modules not only work in isolation, but also work correctly when chained together in realistic user flows.

Primary Sprint 2-3 integration focus:

- AI Conversation lifecycle and history persistence
- Forum publishing and Admin moderation workflow
- Room/Game lifecycle and post-game sharing
- Friend relationship and friend-only visibility linkage
- Video learning note sharing
- Schedule tracking and completion status propagation
- Speaking room real-time audio/video behavior

---

## 3. Test Approach

- Manual end-to-end interaction with role switching (regular user/admin, user A/user B).
- Validation criteria include:
  - data persistence across pages
  - cross-page consistency
  - role/permission correctness
  - state update behavior without manual refresh
  - user experience quality in real interactions
- Findings include both:
  - functional defects (incorrect behavior)
  - usability/interaction defects (flow friction, weak feedback)

---

## 4. Test Scenarios and Results

### 1. AI Conversation → History Save → History Review

**Objective:**  
Validate that a speaking conversation can be created, completed, scored, stored, and later replayed from history with content consistency.

**Steps:**
1. Log in with a regular user account.
2. Open **Speaking** and select **Free Conversation**.
3. Conduct at least 3 rounds of interaction with AI.
4. End the conversation and view scoring panel (fluency / accuracy / logic).
5. Navigate to **Conversation History**.
6. Verify the newly completed conversation appears in the session list.
7. Open the session detail and compare content with the actual conversation.

**Expected Result:**  
- Messages should render round-by-round in real time.
- User utterances should match displayed transcript.
- Scoring should be generated correctly based on the actual conversation.
- Conversation should be fully persisted and viewable in history detail.

**Actual Result:**  
Partially passed.  
- History persistence and detail replay are generally correct.
- However, during live conversation, intermittent UI/recognition inconsistencies were observed:
  - multiple turns occasionally appear visually collapsed/merged
  - displayed user text can deviate from the user’s actual speech
  - in some runs, current user speech text did not render, while AI still responded as if input was received
- These inconsistencies may affect scoring reliability for the active session.

**Issues Found:**  
- Real-time conversation rendering occasionally merges turns or misaligns message boundaries.
- Speech-to-display consistency is unstable in certain runs.
- Scoring trustworthiness may degrade when visible transcript and captured input diverge.

---

### 2. Forum Posting → Admin Moderation Workflow

**Objective:**  
Validate the revised moderation model: sensitive-word pre-check, direct publish vs pending review, admin approval/rejection, and post visibility behavior.

**Steps:**
1. Log in as a regular user and create a normal post without sensitive terms.
2. Confirm whether it is directly published.
3. Create another post containing suspected sensitive content.
4. Confirm whether it enters pending review.
5. Log in as admin (`admin@example.com`), open admin review queue.
6. Locate and review the pending post.
7. Approve the post and verify it becomes visible to regular users.
8. Repeat with a rejection path and verify user can find/edit rejected content.
9. Add a comment containing sensitive content and verify comment rejection behavior.

**Expected Result:**  
- Non-sensitive post is published directly.
- Sensitive post is routed to admin review.
- Approved post becomes visible in forum.
- Rejected post remains editable by author from their own post management view.
- Sensitive comment is rejected immediately.

**Actual Result:**  
Mostly passed.  
- Sensitive content gating works in most tested cases.
- Admin review flow is functional.
- Sensitive comments are blocked.
- Improvement opportunity identified: current flow is heavily moderation-dependent and could provide stronger pre-submit user guidance.

**Issues Found:**  
- UX gap: users are not proactively guided enough when potentially sensitive content is detected.
- Suggested enhancement: provide immediate inline warning and allow direct re-edit before entering full admin queue, reducing moderation overhead and user waiting time.

---

### 3. Room Creation → Game Session → Result Sharing

**Objective:**  
Verify full room collaboration path: room creation, joining, gameplay, ranking/result generation, sharing to forum, and record persistence.

**Steps:**
1. User A creates a game room.
2. User B joins via invitation code.
3. Start **Word Duel** or **Context Guesser**.
4. Complete the game and view ranking/result.
5. Click **Share to Forum**.
6. Open forum and verify shared game record appears.
7. Open **My Records** and verify history entry is stored.

**Expected Result:**  
- Room can be created/joined reliably.
- Game flow completes with correct timing and result stats.
- Share-to-forum posts correctly.
- Personal game history persists.

**Actual Result:**  
Partially passed.  
Core flow works, but multiple quality/consistency defects were found:
- Room “Recent” cards do not have consistent size.
- Word Duel submit button has low visual prominence.
- Completion time occasionally displays as `0s` despite non-zero real duration.
- Invitation behavior is overly strict: once an invite is sent, re-invitation is blocked without a cooldown strategy.

**Issues Found:**  
- Inconsistent room card sizing.
- Game completion duration tracking bug (`0s` anomaly).
- Invitation policy should support cooldown-based retry instead of hard lock.
- Submit action visibility in Word Duel should be improved for usability.

---

### 4. Friend System Integration

**Objective:**  
Validate end-to-end friend request lifecycle and verify friendship state propagation to visibility-based features.

**Steps:**
1. User A sends a friend request to User B.
2. User B opens incoming requests and accepts.
3. Verify both users’ friend lists contain each other.
4. Test friend-only forum visibility behavior using friend-restricted content.
5. Check list updates immediately after acceptance (without page reload).

**Expected Result:**  
- Friend request lifecycle completes successfully.
- Both lists update correctly.
- Friend-only content visibility aligns with relationship state.
- UI updates without requiring manual refresh.

**Actual Result:**  
Partially passed.  
Relationship creation succeeds, but list synchronization is not fully reactive.

**Issues Found:**  
- `My Friends` list does not always update immediately after acceptance unless the page is refreshed.

---

### 5. Video Listening ��� Notes → Forum Sharing

**Objective:**  
Validate the integration between video learning notes and forum publishing.

**Steps:**
1. Open **Video Listening** and select a video.
2. Write notes during playback.
3. Click **Share to Forum**.
4. Verify a new forum post is created from the note content.

**Expected Result:**  
Notes are correctly converted into a forum post and visible according to publication rules.

**Actual Result:**  
Passed in tested runs. No blocking issue observed in this flow.

**Issues Found:**  
None in this test pass.

---

### 6. Schedule Setup → Learning Completion Tracking

**Objective:**  
Verify schedule target creation and completion tracking behavior across repeated and daily tasks.

**Steps:**
1. Open **Schedule** and create a daily target (e.g., 10 words, 1 listening session).
2. Complete corresponding learning activities.
3. Return to Schedule and verify completion markers/calendar status.
4. Create duplicate/similar schedule items for the same day.
5. Complete one and then attempt completing subsequent duplicate items.

**Expected Result:**  
- Task completion markers should update correctly.
- Duplicate tasks should be independently completable.
- Scheduling should support efficient recurring setup.

**Actual Result:**  
Partially passed.  
- Basic daily setup and completion tracking works.
- Product flexibility is limited to one-by-one daily creation.
- Duplicate entries can exist, but follow-up duplicates may not complete correctly unless manually marked.

**Issues Found:**  
- Missing weekly/monthly batch scheduling capability.
- Duplicate schedule completion state handling appears inconsistent.

---

### 7. Speaking Room Audio/Video (if testable)

**Objective:**  
Validate real-time AV interoperability and control behavior in a multi-user speaking room.

**Steps:**
1. User A creates a speaking room.
2. User B joins.
3. Verify two-way audio/video stream behavior.
4. Toggle microphone and camera states for both users.
5. Compare behavior between desktop and mobile browser clients.

**Expected Result:**  
- AV streams are mutually visible/audible.
- Mic/camera toggles work reliably.
- Desktop and mobile display are consistent.

**Actual Result:**  
Partially passed.  
Desktop-side flow is generally usable, but cross-device consistency issue observed.

**Issues Found:**  
- Mobile camera display appears inconsistent with desktop view in some sessions.

---

## 5. Additional Cross-Module Observations

These findings were observed during broader exploratory integration usage:

1. **Draft resilience issue in post creation**  
   If users accidentally leave the post editor, current content is not reliably recoverable (high rewrite cost).

2. **Timezone/format consistency concern**  
   Displayed time format appears non-local for target users in some screens; configurable timezone (or user-local auto format) would improve clarity.

3. **Login security/UX concern**  
   Switching email account on login does not automatically clear password input, which may cause accidental credential reuse or privacy risk on shared devices.

---

## 6. Overall Assessment

- All 7 target integration scenarios are executable.
- Core business chains are mostly functional.
- Multiple medium-priority issues remain in:
  - real-time conversation rendering consistency
  - reactive UI updates (friends list)
  - schedule duplicate completion behavior
  - room/game UX and timing correctness
  - cross-device AV consistency

**Conclusion:**  
Sprint 2-3 integration is **functionally viable**, but requires targeted stabilization and UX improvements before considering the cross-module experience fully production-ready.

---

## 7. Suggested Follow-up Priority

**High Priority**
1. Fix real-time AI conversation transcript/render consistency.
2. Fix Word Duel completion time recording (`0s` issue).
3. Ensure friend list updates reactively after relationship changes.

**Medium Priority**
1. Improve moderation UX with pre-submit sensitive-content guidance and edit-first flow.
2. Add weekly/monthly schedule creation options.
3. Add invitation cooldown logic for room invites (instead of strict lockout).

**Low Priority**
1. Standardize room card sizing and improve submit button prominence.
2. Harmonize timezone display and provide user-facing format/timezone preference.
3. Auto-clear password on account/email switch in login form.
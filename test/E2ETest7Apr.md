# Sprint 2-3 End-to-End (E2E) Test Report

## 1. Document Information

- Project: Academic English Practice App  
- Sprint: Sprint 2-3  
- Document Type: End-to-End User Experience Test Report  
- Test Date: 2026-04-07  
- Tester Persona: New user (first-time full journey)  
- Test Platform: Web (desktop) + partial mobile browser checks

---

## 2. Purpose

This report evaluates Sprint 2-3 features from a **new user perspective**.  
Unlike integration testing (module-to-module validation), this E2E report focuses on:

- first-time usability and learning flow continuity
- user-facing consistency across modules
- friction points in real product usage
- practical improvement suggestions

The test path follows a realistic onboarding-to-daily-use journey.

---

## 3. End-to-End Test Journey

## 3.1 Registration and Login

### Actions Performed
1. Registered a new account.
2. Logged in using the new credentials.
3. Opened profile page after login.

### Expected
- Registration and login should be straightforward.
- Session should be established correctly.
- Profile page should load baseline user data.

### Actual
- Basic registration and login flow worked.
- Profile page opened successfully.
- One usability/security issue observed during repeated login trials.

### Issues
- When switching login email accounts, the password field does not automatically clear.

### Suggestions
- Auto-clear password when email input changes.
- Add optional “show/hide password” and account-switch safety hint.

---

## 3.2 Vocabulary Learning Full Flow

Path tested:
- Daily Words → mark Mastered/Need Review → add to Word Bank → review in Word Bank → check All Words

### Expected
- Daily study actions should persist.
- Word Bank should reflect updates immediately.
- User should complete loop without confusion.

### Actual
- Core flow was usable.
- No blocking failure in the main vocabulary loop.
- General UX is acceptable for new users.

### Issues
- No critical blocking issue found in this pass.

### Suggestions
- Continue improving UI consistency and feedback microcopy for first-time learners.

### Status
- **Test Passed (core path)**

---

## 3.3 Listening Full Flow

Path tested:
- Listening → select level → select scenario → play audio → answer → submit → view score

### Expected
- Smooth transition from level selection to practice.
- Accurate scoring and result rendering.
- Clear completion feedback.

### Actual
- Main listening flow worked.
- Results and score were displayed as expected.

### Issues
- No major blocking issue found in this pass.

### Suggestions
- Consider adding clearer “next recommended practice” CTA after completion.

### Status
- **Test Passed (core path)**

---

## 3.4 Video Listening → Notes → Share

### Actions Performed
1. Opened Video Listening.
2. Selected a video and wrote notes.
3. Used Share-to-Forum action.

### Expected
- Notes should be publishable as forum content.
- New user should understand posting outcome clearly.

### Actual
- Main share path worked in tested runs.
- Posting outcome was mostly consistent.

### Issues
- No blocking error in this pass.

### Suggestions
- Add stronger confirmation text after sharing (e.g., “View your post” quick link).

### Status
- **Test Passed (core path)**

---

## 3.5 Speaking Practice (Structured / Free / Guided)

### Actions Performed
1. Entered Speaking module.
2. Tested mode navigation across structured/free/guided tabs.
3. Performed free conversation interaction with AI.

### Expected
- Mode switching should be clear and responsive.
- Real-time conversation transcript should match user speech.
- AI scoring should reflect real conversation.

### Actual
- Navigation between speaking modes generally worked.
- Real-time conversation had intermittent display/transcript quality issues:
  - multiple messages occasionally appeared merged
  - displayed user text could differ from spoken content
  - in some runs, user-side text did not render but AI still responded

### Issues
- Real-time transcript consistency and rendering stability are not reliable enough for a first-time user.
- Scoring credibility may be affected when visible transcript and actual speech diverge.

### Suggestions
- Stabilize real-time transcript rendering pipeline.
- Add explicit “speech recognized text” preview before scoring calculation.
- Provide fallback retry when transcript confidence is low.

---

## 3.6 AI Conversation → Score → History

### Actions Performed
1. Completed a full AI conversation session.
2. Viewed scoring panel.
3. Opened Conversation History and reviewed session details.

### Expected
- Session should be fully stored and replayable.
- History should match what happened in live conversation.

### Actual
- History persistence worked well.
- Session details were mostly complete in history view.
- Mismatch risk exists because live conversation display can be inconsistent.

### Issues
- Live display inconsistencies can reduce confidence in whether the score represents the true conversation.

### Suggestions
- Add a “final transcript confirmation” before final scoring submission.
- Display scoring source transcript explicitly in result view.

---

## 3.7 Forum Experience (Browse / Post / Comment / Forward / Search)

### Actions Performed
1. Browsed posts as regular user.
2. Created posts (normal + potentially sensitive content).
3. Tested search behavior.
4. Tested moderation behavior and comment restrictions.

### Expected
- Normal content should publish smoothly.
- Sensitive content should be moderated clearly with transparent feedback.
- Search and browsing should be easy for first-time users.

### Actual
- Sensitive-word moderation generally worked.
- Sensitive comments were blocked as expected.
- Core browse/search flow worked.
- UX friction observed in post authoring and moderation feedback.

### Issues
1. Post editor does not reliably preserve draft state if user leaves accidentally.
2. Moderation feedback could be more proactive:
   - currently users may wait for admin decisions when they could self-correct first.

### Suggestions
- Add autosave draft/recovery in post editor.
- Add pre-submit warning: “Potential sensitive content detected. Edit now or submit for review.”
- Provide direct “Edit and resubmit” shortcut when content is rejected.

---

## 3.8 Room System (Game Room / Word Duel / Invite / Recent)

### Actions Performed
1. Created/joined room with two users.
2. Played Word Duel.
3. Checked result display, timing, and share behavior.
4. Reviewed room-related card UI and invite behavior.

### Expected
- Room game flow should be smooth and fair.
- Result timing should be accurate.
- Invite interaction should be understandable and flexible.

### Actual
- Core room/game flow is usable.
- Several UX/functional issues observed:
  - Room recent cards have inconsistent visual sizing
  - Word Duel submit button is not visually prominent
  - completion time sometimes displayed as `0s` unexpectedly
  - invitation behavior is overly strict after one invite attempt

### Issues
- Result time tracking defect (`0s` anomaly).
- Invitation retry policy feels restrictive for normal user behavior.

### Suggestions
- Normalize card dimensions in Room recent list.
- Improve submit button contrast/priority.
- Fix time measurement pipeline.
- Replace hard invite lock with cooldown-based retry.

---

## 3.9 Friend System

### Actions Performed
1. Sent and accepted friend request across two accounts.
2. Checked My Friends list on both sides.
3. Verified friend-only visibility behavior.

### Expected
- Friendship status should synchronize immediately.
- New friend should appear without manual refresh.

### Actual
- Relationship creation worked.
- UI state was not always reactive.

### Issues
- My Friends list may require manual refresh to show newly accepted friends.

### Suggestions
- Trigger real-time state refresh after accept action.
- Add optimistic update on friend list UI.

---

## 3.10 Schedule and Learning Completion Tracking

### Actions Performed
1. Added daily schedule goals.
2. Completed related learning activities.
3. Returned to schedule/calendar to verify completion marks.
4. Added repeated similar tasks for same day and tested completion behavior.

### Expected
- Completion marks should update reliably.
- Repeated tasks should each be independently completable.
- New users should be able to plan weekly/monthly easily.

### Actual
- Basic daily setup works.
- Product currently feels day-by-day and manual.
- Repeated same-day task completion behavior can be inconsistent after first completion.

### Issues
1. Missing weekly/monthly schedule batch creation.
2. Repeated schedule items may not auto-complete correctly after the first one (manual marking sometimes needed).

### Suggestions
- Add recurrence options (daily/weekly/monthly templates).
- Fix repeated-task completion state logic.

---

## 3.11 Speaking Room AV (Desktop vs Mobile Spot Check)

### Actions Performed
1. Created speaking room.
2. Joined from second client.
3. Checked camera/microphone behavior.
4. Compared desktop and mobile display.

### Expected
- Consistent AV rendering across platforms.
- Reliable device toggle behavior.

### Actual
- Desktop flow is mostly usable.
- Mobile view inconsistency observed in camera display.

### Issues
- Camera content display on mobile does not fully match desktop behavior in tested runs.

### Suggestions
- Standardize media rendering logic and aspect handling across platforms.
- Add mobile-specific QA checks before release.

---

## 4. Cross-Module UX Observations

1. **Time format and timezone clarity**
   - Some timestamps appear non-local from user perspective.
   - Consider local-time rendering by default or timezone selector.

2. **Consistency of feedback language**
   - Error/feedback messages should guide users to next action, not just state failure.

3. **Recoverability**
   - New users are sensitive to data loss (e.g., post draft). Recovery patterns should be prioritized.

---

## 5. Overall Evaluation (New User Perspective)

### What Worked Well
- Core account setup and major learning paths are accessible.
- Most module entry points are discoverable.
- Forum moderation baseline and history persistence are functionally present.

### What Broke Trust / Flow
- Real-time AI transcript inconsistency and scoring confidence risk.
- Draft loss risk in post creation.
- Repeated schedule completion inconsistency.
- Room/game timing and invite behavior friction.
- Reactive UI gaps (friends list refresh).
- Mobile/desktop AV mismatch.

### Final Verdict
Sprint 2-3 is **usable for core flows**, but from a new-user perspective it is **not yet friction-free**.  
The product would benefit significantly from stability and UX hardening in conversation reliability, task tracking consistency, and state synchronization.

---

## 6. Recommended Priority Fixes

### High Priority
1. Real-time AI conversation transcript/render consistency and scoring alignment.
2. Word Duel completion timing bug (`0s`) fix.
3. Post draft autosave/recovery.
4. Repeated schedule completion logic fix.

### Medium Priority
1. Friend list real-time refresh after acceptance.
2. Moderation UX enhancement (pre-submit warning + immediate self-edit path).
3. Room invite cooldown strategy.
4. Mobile/desktop speaking room video consistency improvement.

### Low Priority
1. Room card visual normalization.
2. Submit button prominence tuning.
3. Timezone display option.
4. Login password auto-clear on account switch.
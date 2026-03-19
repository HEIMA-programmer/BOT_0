# Integration Test Document

## Overview
This document describes integration test cases for the Academic English Practice application.  
The focus is on verifying interactions between modules (Vocabulary Learning, Word Bank, Listening, and Lecture Clips) and ensuring UI consistency.

---

## Test Cases

### 1. Vocabulary Limit Update
**Objective:** Verify that changing the daily vocabulary limit updates the counter correctly.  
**Steps:**
1. Set daily limit to 10.
2. Change limit to 50.
3. Change limit back to 10.
4. Check the counter in *Start Learning*.  
**Expected Result:** Counter should reflect the latest limit (10).

---

### 2. Word Status Synchronization
**Objective:** Ensure UI updates correctly when words are marked as *mastered* or added to *word bank*.  
**Steps:**
1. Mark a word as *mastered*.  
2. Verify UI updates immediately.  
3. Add another word to *word bank*.  
4. Verify UI updates immediately.  
5. Click *Add to Bank* again.  
**Expected Result:**  
- *Mastered* status is irreversible and UI updates automatically.  
- *Word bank* status is reversible, UI should update instantly.

---

### 3. Word Review Pagination
**Objective:** Verify that single-page word review respects pagination limits.  
**Steps:**
1. Navigate to *Review Words*.  
2. Check number of words displayed per page.  
**Expected Result:**  
- Pagination should limit words per page.  
- If many *mastered* words exist, UI should not overload a single page.

---

### 4. View All Words Pagination Button
**Objective:** Ensure pagination button works in *View All Words*.  
**Steps:**
1. Navigate to *View All Words*.  
2. Click pagination button to limit words per page.  
**Expected Result:** Button should correctly limit words per page.

---

### 5. Listening Module Answer Persistence
**Objective:** Verify that answers are preserved when switching views.  
**Steps:**
1. Answer a question in *Listening*.  
2. Switch to another module.  
3. Return to *Listening*.  
**Expected Result:** Previous answer should remain recorded.

---

### 6. Listening Module Navigation
**Objective:** Ensure navigation buttons are visible and functional.  
**Steps:**
1. Choose a level in *Listening*.  
2. Locate the *Return to Listening Level* button.  
**Expected Result:** Button should be clearly visible (with border styling) and functional.

---

### 7. Lecture Clips UI Stability
**Objective:** Verify UI stability when switching cards after scrolling.  
**Steps:**
1. Scroll to the bottom of *Lecture Clips*.  
2. Switch to another card.  
**Expected Result:** UI should remain stable without jumping.

---

## Summary
These integration tests cover:
- **State synchronization** (limits, word status).  
- **UI consistency** (pagination, buttons, updates).  
- **Data persistence** (listening answers).  
- **User experience stability** (lecture clips navigation).  

---

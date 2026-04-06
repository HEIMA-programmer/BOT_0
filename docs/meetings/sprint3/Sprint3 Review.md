# Sprint 2 Review

**Date:** 2026-04-03 (Friday)  
**Attendees:** Full team  
**Facilitator:** Weike Jin (Scrum Master)  
**Product Owner:** Ruoqi Hu  

---

## Sprint Goal
Deliver Room System and listening video feature and Schedule feature, improve forum feature.
---

## Completed User Stories

| US | Story | Points | Status |
|----|-------|--------|--------|
| US10 | Video Listening Module | 8 | Partial |
| US11 | Vocabulary Enhancements | / | Partial |
| US13 | Forum Enhancements (Admin + Major Guides)  | / | Done |
| US15 | Learning Schedule / Calendar | / | Done |
| US16 | US16 — Room System | / | Done |
| US18 | Listening Note-Taking & Forum Integration | / | Done |
---

### US10: Video Listening Module - Task Breakdown (Partial)
- T-US13.1Design video content data model (video URL, accent tag, difficulty, transcript, duration)#111 | Weike Jin |
- T-US13.3Build video player page with embedded note-taking panel#113 | Weike Jin |
- T-US13.4Implement note saving to user's personal notes#114 | Weike Jin |
- T-US13.5Add "Share to Forum" button that creates a forum post linked to the video#115 | Weike Jin |
- T-US13.6Seed initial video content (embed YouTube/Bilibili links with metadata)#116 | Weike Jin |

### US11: Vocabulary Enhancements - Task Breakdown (Partial)
- T-US14.1Add example sentences to word display in daily learning, word bank, and all-words views#118 | Yanbin Xu |
- T-US14.2Enhance word card UI to prominently display example sentence#119 | Junfan Zhou |

### US13: Forum Enhancements - Task Breakdown
- Implement forum database and ui#164 | Weike Jin |
- Add external url to enable post external video and preview in the iframe#165 | Yanbin Xu |
- Allow uploading local file of different types#166 | Yanbin Xu |
- T-US16.1Add role field to User model (user/admin)#136 | Ruoqi Hu |
- T-US16.2Build admin moderation API (approve, reject, delete any post/comment)#138 | Ruoqi Hu |
- T-US16.3Build admin dashboard UI for content review#140 | Ruoqi Hu |
- T-US16.4Add discipline-specific forum tags (cs, civil_eng, transport, applied_math, mechanical)#142 | Ruoqi Hu |
- T-US16.5Create pinned guide posts for each discipline (e.g., "How to use GitHub for CS students")#144 | Ruoqi Hu |
- T-US16.6Add pinned/featured post support#146 | Ruoqi Hu |



### US15: Learning Schedule / Calendar - Task Breakdown
- T-US18.1Design schedule data model (planned activities, completion status, date)#125 | Chenxi Huang |
- T-US18.2Build calendar UI component showing daily learning plan#126 | Chenxi Huang |
- T-US18.3Allow users to set daily goals (e.g., 10 words, 1 listening, 1 speaking)#127 | Chenxi Huang |
- T-US18.4Show completion status (checkmarks) on calendar days#129 | Chenxi Huang |

### US16: Room System - Task Breakdown
- T-US19.1Design room data model (room type, host, participants, status, linked content)#134 | Yanshuo Liu |
- T-US19.2Build room creation and joining API#135 | Yanshuo Liu |
- T-US19.3Build listening room: synchronized video/audio playback with chat#137 | Yanshuo Liu |
- T-US19.4Build speaking room: voice chat practice room#139 | Yanshuo Liu |
- T-US19.5Build game room: vocabulary quiz PK mode#141 | Junfan Zhou |
- T-US19.6Record room activity history for progress tracking#143 | Yanshuo Liu |
- T-US19.7Build room lobby UI (browse/create/join)#145 | Yanshuo Liu |

### US18: Listening Note-Taking & Forum Integration - Task Breakdown
- T-US21.1Add note-taking panel to audio listening practice page#160 | Weike Jin |
- T-US21.2Build notes API (CRUD, linked to clip/video)#161 | Weike Jin |
- T-US21.3Add "Post to Forum" action from notes#162 | Weike Jin |

---

## Application Summary

1. **Listening Lab** — Video listening module functional and share to forum feature implemented.  
2. **Room System** — Three room types functional.  
3. **Schedule Feature / Calendar** — Schedule feature functional.
4. **Forum Enhancements** — friend zone and public zone implemented and Add external url to enable post external video and preview in the iframe.
5. **Bug Fixes** — Sprint 2 issues resolved.  

---

## PO Acceptance

| US | Accepted? | Notes |
|----|-----------|-------|
| US10 | Yes | Video listening module functional and share to forum feature implemented. |
| US10 | Yes | Video Listening Module | 
| US11 | Yes | Vocabulary Enhancements | 
| US13 | Yes | Forum Enhancements (Admin + Major Guides)  | 
| US15 | Yes | Learning Schedule / Calendar | 
| US16 | Yes | US16 — Room System |
| US18 | Yes | Listening Note-Taking & Forum Integration |
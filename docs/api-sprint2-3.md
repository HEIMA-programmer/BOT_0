# Sprint 2-3 API Contracts

Base URL: `http://localhost:5000/api`

All requests/responses use `Content-Type: application/json` unless otherwise noted.

---

## Daily Learning APIs

### GET /api/daily-learning/today

Get today's learning words (carry-over pending + new words).

**Auth:** Required

**Query Params:**
- `count` (optional, int): Daily word count, default 10, max 50

**Response 200:**
```json
{
  "date": "2026-04-05",
  "words": [
    {
      "id": 1,
      "user_id": 123,
      "word_id": 456,
      "status": "pending",
      "assigned_date": "2026-04-05",
      "updated_at": "2026-04-05T10:00:00Z"
    }
  ],
  "pending_count": 5,
  "review_count": 3,
  "mastered_count": 10,
  "total_words": 1000
}
```

---

### POST /api/daily-learning/word-status

Update a word's learning status.

**Auth:** Required

**Request:**
```json
{
  "progress_id": 123,
  "status": "review"
}
```

**Response 200:** Updated word progress object

**Response 400:** `{ "error": "Missing progress_id or invalid status" }`

---

### GET /api/daily-learning/review-words

Get all words marked for review.

**Auth:** Required

**Response 200:**
```json
{
  "words": [...],
  "count": 5
}
```

---

### GET /api/daily-learning/mastered-words

Get all mastered words.

**Auth:** Required

**Response 200:**
```json
{
  "words": [...],
  "count": 10
}
```

---

### GET /api/daily-learning/all-words

Get all available words with user's progress status.

**Auth:** Required

**Query Params:**
- `page` (optional, int): Default 1
- `per_page` (optional, int): Default 50
- `search` (optional, str): Search word text

**Response 200:**
```json
{
  "words": [
    {
      "id": 1,
      "text": "hypothesis",
      "progress_status": "pending",
      "in_word_bank": false
    }
  ],
  "total": 1000,
  "page": 1,
  "per_page": 50
}
```

---

### GET /api/daily-learning/stats

Get learning statistics for home page.

**Auth:** Required

**Response 200:**
```json
{
  "mastered": 10,
  "review": 3,
  "pending": 5,
  "total_learned": 13,
  "total_words": 1000,
  "word_bank_count": 5
}
```

---

### POST /api/daily-learning/mark-mastered

Mark a word as mastered.

**Auth:** Required

**Request:**
```json
{ "word_id": 456 }
```

**Response 200:** Updated progress object

---

### POST /api/daily-learning/add-to-bank

Add a word to the word bank from daily learning.

**Auth:** Required

**Request:**
```json
{ "word_id": 456 }
```

**Response 201:** New word bank entry

**Response 409:** `{ "error": "Word already in bank" }`

---

## Word Bank Extensions

### PATCH /api/word-bank/{id}

Update word bank entry mastery level.

**Auth:** Required

**Request:**
```json
{ "mastery_level": 2 }
```

**Response 200:** Updated entry

**Response 400:** `{ "error": "Invalid mastery level (must be 0-3)" }`

---

### POST /api/word-bank/{id}/review

Record a word review.

**Auth:** Required

**Request:**
```json
{ "knew_it": true }
```

**Response 200:** Updated entry

---

### GET /api/word-bank/stats

Get word bank statistics.

**Auth:** Required

**Response 200:**
```json
{
  "total": 50,
  "new": 20,
  "learning": 15,
  "familiar": 10,
  "mastered": 5,
  "today_reviewed": 3,
  "review_history": [
    { "date": "2026-04-05", "count": 5 }
  ]
}
```

---

## Auth Extension

### PATCH /api/auth/username

Update current user's username.

**Auth:** Required

**Request:**
```json
{ "username": "newusername" }
```

**Response 200:** Updated user object

**Response 400:** `{ "error": "Username must be 3-80 characters" }`

**Response 409:** `{ "error": "Username already exists" }`

---

## Listening APIs

### GET /api/listening/clips

Get the listening practice catalog organized by level and scenario.

**Auth:** Required

**Response 200:**
```json
{
  "levels": [
    {
      "id": "beginner",
      "label": "Beginner",
      "is_available": true,
      "clip_count": 10,
      "scenarios": [
        {
          "id": "lecture-clips",
          "label": "Lecture Clips",
          "is_available": true,
          "clip_count": 5,
          "clips": [...]
        }
      ]
    }
  ],
  "source_count": 30
}
```

---

### GET /api/listening/audio/{source_slug}

Stream an audio file.

**Auth:** Required

**Response 200:** MP3 audio stream

**Response 404:** `{ "error": "Clip not found" }`

---

### GET /api/listening/quiz/{level_id}/{scenario_id}/{source_slug}

Get listening practice questions for a specific clip.

**Auth:** Required

**Response 200:**
```json
{
  "level": { "id": "beginner", "label": "Beginner" },
  "scenario": { "id": "lecture-clips", "label": "Lecture Clips" },
  "clip": {...},
  "instructions": "Listen carefully...",
  "question_count": 5,
  "questions": [
    {
      "id": "beginner-lecture-multiple-choice-1",
      "number": 1,
      "type": "multiple_choice",
      "prompt": "What is...?",
      "options": [
        { "key": "A", "text": "option1" },
        { "key": "B", "text": "option2" }
      ]
    }
  ],
  "saved_attempt": null
}
```

---

### POST /api/listening/quiz/{level_id}/{scenario_id}/{source_slug}/submit

Submit listening practice answers.

**Auth:** Required

**Request:**
```json
{
  "answers": {
    "beginner-lecture-multiple-choice-1": "A"
  },
  "time_spent": 300
}
```

**Response 200:**
```json
{
  "score": 80.0,
  "correct_count": 4,
  "total_count": 5,
  "results": [
    {
      "id": "...",
      "number": 1,
      "type": "multiple_choice",
      "prompt": "...",
      "user_response": "A",
      "is_correct": true,
      "correct_answer": "A",
      "explanation": "..."
    }
  ],
  "transcript": "full transcript text"
}
```

---

## Chat History APIs

### POST /api/chat-history/scenario-prompt

Get scenario prompt for conversation.

**Auth:** Required

**Request:**
```json
{
  "scenario_type": "free_conversation",
  "sub_scenario": "casual",
  "custom_context": "optional context"
}
```

**Response 200:**
```json
{ "prompt": "system prompt text" }
```

---

### GET /api/chat-history/scenarios/{scenario_type}

Get scenario options for a given type.

**Auth:** Required

**Response 200:**
```json
{ "options": ["option1", "option2"] }
```

---

### POST /api/chat-history/sessions

Create a new chat session.

**Auth:** Required

**Request:**
```json
{ "scenario_type": "free_conversation" }
```

**Response 201:**
```json
{
  "id": 1,
  "user_id": 123,
  "scenario_type": "free_conversation",
  "started_at": "2026-04-05T10:00:00Z",
  "ended_at": null,
  "report": null
}
```

---

### GET /api/chat-history/sessions

List chat sessions with pagination.

**Auth:** Required

**Query Params:**
- `page` (optional, int): Default 1
- `per_page` (optional, int): Default 20
- `scenario_type` (optional, str): Filter by type

**Response 200:**
```json
{
  "sessions": [
    {
      "id": 1,
      "scenario_type": "free_conversation",
      "overall_score": 85.5,
      "message_count": 10
    }
  ],
  "total": 100,
  "page": 1,
  "pages": 5
}
```

---

### GET /api/chat-history/sessions/{session_id}

Get a single session with messages.

**Auth:** Required

**Response 200:**
```json
{
  "id": 1,
  "scenario_type": "free_conversation",
  "messages": [
    { "id": 1, "role": "user", "content": "Hello" }
  ],
  "report": { "overall_score": 85.5 }
}
```

---

### POST /api/chat-history/sessions/{session_id}/messages

Save messages to a session.

**Auth:** Required

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi there!" }
  ]
}
```

**Response 201:**
```json
{ "saved": 2 }
```

---

### PUT /api/chat-history/sessions/{session_id}/end

End a chat session and save report.

**Auth:** Required

**Request:**
```json
{
  "report": {
    "overall_score": 85.5,
    "fluency": 8,
    "accuracy": 7
  }
}
```

**Response 200:** Updated session object

---

## Forum APIs

### GET /api/forum/posts

Get forum posts visible to current user.

**Auth:** Required

**Query Params:**
- `tag` (optional): Filter by tag
- `search` (optional): Search posts
- `user_id` (optional): Filter by user
- `status` (optional): Filter by status (admin only)
- `zone` (optional): `public` or `friend`
- `include_forwards` (optional, bool): Include forwards in feed
- `page` (optional, int): Default 1
- `per_page` (optional, int): Default 20

**Response 200:**
```json
{
  "posts": [
    {
      "id": 1,
      "user_id": 123,
      "title": "Post Title",
      "content": "Post content",
      "tag": "skills",
      "zone": "public",
      "status": "approved",
      "type": "post",
      "can_delete": true,
      "can_edit": false,
      "can_forward": true
    }
  ],
  "total": 100,
  "page": 1,
  "pages": 5
}
```

---

### POST /api/forum/posts

Create a new forum post.

**Auth:** Required

**Request (JSON or multipart/form-data):**
```json
{
  "title": "Post Title",
  "content": "Post content",
  "tag": "skills",
  "zone": "public",
  "video_url": "https://example.com/video"
}
```

Optional file attachment via `file` field (multipart).

**Response 201:**
```json
{
  "post": {...},
  "message": "Post published"
}
```

Note: Admin posts are auto-approved. Regular user posts go through moderation (`status: "pending"`).

---

### GET /api/forum/posts/{id}

Get a single post with comments.

**Auth:** Required

**Response 200:** Post with comments array

---

### PATCH /api/forum/posts/{id}

Update a forum post.

**Auth:** Required (author only, rejected posts only)

**Request:**
```json
{
  "title": "Updated Title",
  "content": "Updated content"
}
```

**Response 200:** Updated post (resubmitted for review if previously rejected)

---

### DELETE /api/forum/posts/{id}

Delete a forum post.

**Auth:** Required (author or admin)

**Response 200:** `{ "message": "Post deleted" }`

---

### POST /api/forum/posts/{id}/comments

Add a comment to an approved post.

**Auth:** Required

**Request:**
```json
{ "content": "Comment text" }
```

**Response 201:** New comment object

---

### DELETE /api/forum/comments/{id}

Delete a comment.

**Auth:** Required (comment author or admin)

**Response 200:** `{ "message": "Comment deleted" }`

---

### POST /api/forum/posts/{id}/forward

Forward (repost) an approved post.

**Auth:** Required

**Request:**
```json
{
  "comment": "optional comment",
  "zone": "public"
}
```

**Response 201:** New forward object

**Response 409:** `{ "error": "Already forwarded" }`

---

### GET /api/forum/my-posts

Get current user's posts and forwards combined.

**Auth:** Required

**Query Params:** `page`, `per_page`

**Response 200:** Paginated items list

---

### GET /api/forum/admin/pending-posts

Get posts pending admin review.

**Auth:** Required (admin only)

**Response 200:** Paginated pending posts

---

### GET /api/forum/admin/rejection-reasons

Get list of standard rejection reasons.

**Auth:** Required (admin only)

**Response 200:**
```json
{
  "reasons": [
    "The post contains inaccurate or misleading information",
    "..."
  ]
}
```

---

### POST /api/forum/admin/posts/{id}/review

Approve or reject a post.

**Auth:** Required (admin only)

**Request:**
```json
{
  "action": "approve",
  "rejection_reason": "reason (required if rejecting)",
  "review_note": "optional note"
}
```

**Response 200:** Updated post object

---

### POST /api/forum/admin/posts/{id}/pin

Pin or unpin a post (toggle personal pin).

**Auth:** Required

**Request:**
```json
{ "is_pinned": true }
```

**Response 200:** Updated post object

---

### GET /api/forum/uploads/{filename}

Serve uploaded forum attachment files.

**Auth:** Required

**Response 200:** File with 7-day cache headers

---

## Room APIs

### GET /api/rooms

List public rooms.

**Auth:** Required

**Query Params:**
- `type` (optional): Filter by room type (`game`, `speaking`, `watch`)

**Response 200:**
```json
{
  "rooms": [
    {
      "id": 1,
      "name": "Room Name",
      "room_type": "speaking",
      "max_players": 4,
      "visibility": "public",
      "status": "waiting",
      "members": [...]
    }
  ]
}
```

---

### POST /api/rooms

Create a new room.

**Auth:** Required

**Request:**
```json
{
  "name": "Room Name",
  "room_type": "speaking",
  "max_players": 4,
  "visibility": "public"
}
```

**Response 201:**
```json
{
  "room": {...},
  "member": {...}
}
```

---

### POST /api/rooms/join

Join a room using invite code.

**Auth:** Required

**Request:**
```json
{ "invite_code": "ABC123" }
```

**Response 200:** Room and member objects

**Response 404:** `{ "error": "Invalid code" }`

**Response 409:** `{ "error": "Room is full" }`

---

### GET /api/rooms/{room_id}

Get room details with members.

**Auth:** Required

**Response 200:**
```json
{
  "room": {...},
  "members": [...]
}
```

---

### DELETE /api/rooms/{room_id}/members/me

Leave a room.

**Auth:** Required

**Response 200:** `{ "message": "Left room" }`

---

### GET /api/rooms/{room_id}/agora-token

Generate Agora RTC token for a speaking room.

**Auth:** Required (room member only)

**Response 200:**
```json
{
  "token": "agora_token_string",
  "app_id": "app_id",
  "channel": "room_123",
  "uid": 456
}
```

**Response 500:** `{ "error": "Agora not configured" }`

---

### GET /api/rooms/game-questions

Generate random game questions.

**Auth:** Required

**Query Params:**
- `type` (optional): `word_duel` or `context_guesser`, default `word_duel`
- `count` (optional, int): 3-30, default 5

**Response 200:**
```json
{
  "questions": [
    { "id": 1, "question": "...", "answer": "..." }
  ]
}
```

---

### GET /api/rooms/records

Get current user's room session history.

**Auth:** Required

**Response 200:**
```json
{
  "records": [
    {
      "id": 1,
      "room_name": "Room Name",
      "room_type": "speaking",
      "duration_secs": 600,
      "created_at": "2026-04-05T10:00:00Z"
    }
  ]
}
```

---

### GET /api/rooms/game-records/{record_id}

Get detailed game record.

**Auth:** Required (record owner only)

**Response 200:** Game record with rounds data

---

## Friends APIs

### GET /api/friends/

List current user's friends.

**Auth:** Required

**Response 200:**
```json
{
  "friends": [
    {
      "id": 1,
      "user_id": 123,
      "friend_id": 456,
      "username": "friend_name"
    }
  ]
}
```

---

### GET /api/friends/search

Search for users by email.

**Auth:** Required

**Query Params:**
- `email` (required, min 2 chars)

**Response 200:**
```json
{
  "users": [
    {
      "id": 123,
      "username": "username",
      "email": "user@example.com",
      "is_friend": false,
      "has_pending_request": false
    }
  ]
}
```

---

### POST /api/friends/request

Send a friend request.

**Auth:** Required

**Request:**
```json
{ "receiver_email": "friend@example.com" }
```

**Response 201:**
```json
{
  "message": "Friend request sent",
  "request": {...}
}
```

**Response 409:** `{ "error": "Already friends or pending request exists" }`

---

### GET /api/friends/requests

List pending friend requests (received and sent).

**Auth:** Required

**Response 200:**
```json
{
  "received": [...],
  "sent": [...]
}
```

---

### POST /api/friends/accept

Accept a friend request.

**Auth:** Required

**Request:**
```json
{ "request_id": 123 }
```

**Response 200:** `{ "message": "Friend request accepted" }`

---

### POST /api/friends/reject

Reject a friend request.

**Auth:** Required

**Request:**
```json
{ "request_id": 123 }
```

**Response 200:** `{ "message": "Friend request rejected" }`

---

### DELETE /api/friends/{friend_user_id}

Remove a friend.

**Auth:** Required

**Response 200:** `{ "message": "Friend removed" }`

---

## Progress Extension

### POST /api/progress/track-time

Track time spent on learning activities.

**Auth:** Required

**Request:**
```json
{
  "module": "vocab",
  "activity_type": "practice_quiz",
  "time_spent": 300
}
```

Supported modules: `vocab`, `listening`, `speaking`, `chat`

**Response 201:** Progress record

---

## WebSocket Events

### Speaking WebSocket (Default Namespace `/`)

**Client → Server:**
- `submit_audio`: `{ audio: "base64", topic: "speaking_topic", mimeType: "audio/webm" }`

**Server → Client:**
- `connected`: `{ status: "success" }`
- `progress`: `{ stage: "start"|"converting"|"recognizing"|"scoring", message: "..." }`
- `result`: `{ transcript: "...", pronunciation: {...}, content: {...} }`
- `error`: `{ message: "..." }`

---

### Conversation WebSocket (Namespace `/conversation`)

**Client → Server:**
- `start_conversation`: `{ system_prompt: "...", voice_name: "...", db_session_id: 123, scenario_type: "free_conversation" }`
- `audio_chunk`: `{ audio: "base64" }`
- `end_conversation`: End the conversation
- `request_scoring`: `{ sub_scenario: "optional" }`

**Server → Client:**
- `connected`, `ready`: Connection status
- `ai_audio_chunk`: `{ audio: "base64" }`
- `user_transcript`: `{ text: "partial transcript" }`
- `user_final`: `{ text: "final transcript" }`
- `ai_transcript`: `{ text: "AI response text" }`
- `ai_speaking_end`: End of AI turn
- `scoring_started`, `scoring_complete`: `{ scores: {...} }` or `{ error: "..." }`
- `error`: `{ message: "..." }`

---

### Room WebSocket (Namespace `/room`)

**Client → Server:**
- `join_lobby` / `leave_lobby`: Lobby presence
- `join_waiting_room`: `{ room_id: 1 }`
- `set_ready`: `{ room_id: 1, is_ready: true }`
- `transfer_host`: `{ room_id: 1, new_host_user_id: 456 }`
- `start_game`: `{ room_id: 1, game_type: "word_duel", question_count: 5 }`
- `submit_answer`: `{ room_id: 1, answer: "answer" }`
- `select_content`: `{ room_id: 1, title: "...", video_url: "..." }`
- `sync_playback`: `{ room_id: 1, is_playing: true, position: 100.5 }`
- `send_comment`: `{ room_id: 1, text: "comment text" }`
- `set_topic`: `{ room_id: 1, topic: "speaking topic" }`
- `toggle_media`: `{ room_id: 1, mic_on: true, camera_on: false }`
- `kick_member`: `{ room_id: 1, target_user_id: 456 }`
- `invite_friend`: `{ room_id: 1, target_user_id: 456 }`

**Server → Client:**
- `member_joined` / `member_left` / `member_kicked`: Member events
- `ready_changed`: `{ user_id: 123, is_ready: true }`
- `host_changed`: `{ new_host_user_id: 456 }`
- `game_started`: `{ room_id: 1, game_type: "word_duel", questions: [...] }`
- `next_round` / `round_ended` / `game_over`: Game lifecycle
- `answer_result` / `player_answered`: Game answers
- `content_selected` / `playback_synced`: Watch-together
- `comment_received`: `{ user_id: 123, username: "...", text: "...", time: "HH:MM" }`
- `topic_changed` / `media_state_changed`: Speaking room state
- `room_invitation`: `{ room_id: 1, room_name: "...", invite_code: "..." }`
- `rooms_updated`: Lobby rooms list refresh
- `room_error`: `{ message: "..." }`

---

## Common Error Format

All error responses follow:
```json
{ "error": "Error message description" }
```

Common HTTP status codes:
- `200` Success
- `201` Created
- `400` Bad Request (invalid input)
- `401` Not Authenticated
- `403` Forbidden (not authorized)
- `404` Not Found
- `409` Conflict (duplicate entry)
- `500` Server Error

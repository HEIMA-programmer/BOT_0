# Game Record System - Data Flow Analysis

## Overview
The game record system captures, stores, and displays detailed game session data for Word Duel and Context Guesser games played in multiplayer rooms.

---

## 1. GameRecord Model

**Location:** `backend\app\models\game_record.py`

### Fields:
```python
- id: Integer (primary key)
- room_id: Integer (FK to rooms.id, nullable, CASCADE on delete)
- user_id: Integer (FK to users.id, non-null, CASCADE on delete)
- game_type: String(30) - 'word_duel' or 'context_guesser'
- score: Integer - points earned (default 0)
- total_rounds: Integer - number of rounds played (default 0)
- placement: Integer - 1st, 2nd, 3rd place (nullable)
- rounds_data: Text - **JSON string containing array of round objects**
- duration_secs: Integer - total game duration in seconds
- created_at: DateTime - timestamp with timezone
```

### to_dict() Method:
Serializes all fields including the raw `rounds_data` JSON string (no parsing at model level).

### Key Design:
- `rounds_data` is stored as a **JSON string**, not parsed at the database level
- Frontend is responsible for parsing and rendering the JSON
- One GameRecord per player per game session

---

## 2. Data Flow: Saving Game Records in `_end_game()`

**Location:** `backend\app\routes\room_ws.py` (lines 578-667)

### Round Logging Process:

#### During Game (in `_end_round()` function, lines 462-575):
Each round adds a log entry to `state['rounds_log']` array:

**Word Duel Round Log:**
```python
{
    'round': 0,
    'question': "Definition text",
    'correct_answer': "word",
    'winner_user_id': 123,  # user_id of winner or None
    'answers': {
        'user_id': {
            'answer': "submitted_text",
            'correct': boolean,
            'timestamp': float(seconds)
        }
    }
}
```

**Context Guesser Round Log:**
```python
{
    'round': 0,
    'question': "Sentence with _____ blanks",
    'revealed_sentence': "Full sentence without blanks",
    'correct_answer': "word1, word2",
    'correct_answers': ["word1", "word2"],  # list form
    'winner_user_id': 123,
    'answers': {
        'str(user_id)': {
            'answers': ["submitted1", "submitted2"],
            'correct_mask': [true, false],
            'correct_count': 1,
            'response_ms': 5000,  # milliseconds elapsed
        }
    },
    'points': {
        'user_id': points_earned
    }
}
```

#### Final Storage (in `_end_game()`, lines 618-646):
For each player in the game:
```python
game_record = GameRecord(
    room_id=room_id,
    user_id=uid,
    game_type=state['game_type'],
    score=scores[uid],
    total_rounds=state['total_rounds'],
    placement=placements[uid],
    rounds_data=json.dumps(state['rounds_log']),  # <-- Entire log serialized
    duration_secs=duration_secs,
)
db.session.add(game_record)
```

### Key Points:
- **All players share the same `rounds_log` data** - it's the same array for everyone
- Each GameRecord stores the complete game history in `rounds_data`
- `rounds_log` is built incrementally as each round ends
- The JSON serialization happens once at the end via `json.dumps(state['rounds_log'])`

---

## 3. Data Retrieval: Getting Records

### Frontend Fetching (MyRecords.jsx):

**Step 1: List all records (line 28-31)**
```javascript
useEffect(() => {
  roomAPI.getRecords()  // GET /api/rooms/records
    .then(res => setRecords(res.data.records || []))
    .catch(() => {})
    .finally(() => setLoading(false));
}, []);
```

Returns RoomRecord objects (lighter, summary-only records):
```javascript
{
  id: 123,
  room_name: "Game Room A",
  room_type: "game",
  summary: "Word Duel · 5 pts · 1st place",
  duration_secs: 120,
  created_at: "2026-04-02T14:30:00+00:00"
}
```

**Step 2: Fetch detailed game record (line 137-138)**
```javascript
roomAPI.getGameRecord(record.id)  // GET /api/rooms/game-records/{recordId}
```

This can accept either:
- A GameRecord ID (direct lookup)
- A RoomRecord ID (performs lookup to find matching GameRecord)

Returns the full GameRecord with `rounds_data` as a JSON string.

### Backend API (room.py, lines 560-581):

```python
@room_bp.route('/game-records/<int:record_id>', methods=['GET'])
def get_game_record(record_id):
    # Try GameRecord directly
    record = db.session.get(GameRecord, record_id)
    if not record:
        # Fall back to RoomRecord lookup
        room_record = db.session.get(RoomRecord, record_id)
        if room_record and room_record.room_type == 'game':
            record = GameRecord.query.filter_by(
                room_id=room_record.room_id,
                user_id=room_record.user_id,
            ).order_by(GameRecord.created_at.desc()).first()
    
    if not record:
        return jsonify({'error': 'Record not found'}), 404
    
    # Auth check
    if record.user_id != current_user.id and not getattr(current_user, 'is_admin', False):
        return jsonify({'error': 'Not authorized'}), 403
    
    return jsonify(record.to_dict()), 200
```

---

## 4. Frontend Display: MyRecords.jsx Game Detail View

**Location:** `frontend\src\pages\room\MyRecords.jsx`

### Header Display (lines 167-176):
```jsx
<Space style={{ marginBottom: 16 }}>
  <Tag color="blue">{gameDetailData.game_type?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Game'}</Tag>
  <Text>Score: <Text strong>{gameDetailData.score}</Text> pts</Text>
  <Text>Rounds: <Text strong>{gameDetailData.total_rounds}</Text></Text>
  <Text>Placement: <Text strong>#{gameDetailData.placement}</Text></Text>
  {gameDetailData.duration_secs ? (
    <Text>Time: <Text strong>{Math.max(gameDetailData.duration_secs, 0)}s</Text></Text>
  ) : null}
</Space>
```

### Rounds Data Parsing & Display (lines 177-220):

```jsx
{gameDetailData.rounds_data && (() => {
  try {
    const rounds = JSON.parse(gameDetailData.rounds_data);  // Parse JSON string
    return (
      <List
        dataSource={rounds}
        renderItem={(round, idx) => (
          <List.Item>
            <div style={{ width: '100%' }}>
              <Text strong>Round {idx + 1}</Text>
              <div style={{ marginTop: 4 }}>
                {/* Question (word_duel) or sentence (context_guesser) */}
                <Text type="secondary">Q: {round.question || round.sentence}</Text>
              </div>
              
              {/* Context Guesser Only: revealed sentence */}
              {round.revealed_sentence ? (
                <div style={{ marginTop: 4 }}>
                  <Text type="secondary">Sentence: {round.revealed_sentence}</Text>
                </div>
              ) : null}
              
              {/* Answer Display */}
              <div style={{ marginTop: 4 }}>
                <Text>
                  Answer:{' '}
                  <Text code>
                    {Array.isArray(round.correct_answers)
                      ? round.correct_answers.join(', ')
                      : round.correct_answer}
                  </Text>
                </Text>
                
                {/* Winner Tag */}
                {round.winner_user_id ? (
                  <Tag color="green" style={{ marginLeft: 8 }}>
                    Won by user #{round.winner_user_id}
                  </Tag>
                ) : (
                  <Tag color="default" style={{ marginLeft: 8 }}>
                    No winner
                  </Tag>
                )}
              </div>
            </div>
          </List.Item>
        )}
      />
    );
  } catch {
    return <Text type="secondary">Round data unavailable</Text>;
  }
})()}
```

### Rendering Logic:
1. Attempts to parse `rounds_data` as JSON
2. Maps over each round in the array
3. Displays common fields: round number, question/sentence
4. For Context Guesser: also shows `revealed_sentence`
5. For answers: handles both string format (Word Duel) and array format (Context Guesser)
6. Shows winner tag if `winner_user_id` is present, else "No winner"
7. Gracefully falls back to "Round data unavailable" on parse error

---

## 5. rounds_log Structure Summary

### Array of Round Objects:
```javascript
state['rounds_log'] = [
  {
    // Common fields
    'round': 0,               // 0-indexed round number
    'question': string,       // word_duel: definition | context_guesser: masked sentence
    'winner_user_id': int,    // null if no winner (timeout) or context_guesser (multi-answer)
    
    // Word Duel Specific
    'correct_answer': string,
    'answers': {              // Non-serialized: user_id → submission object
      'user_id': {
        'answer': string,
        'correct': boolean,
        'timestamp': float
      }
    },
    
    // Context Guesser Specific
    'revealed_sentence': string,
    'correct_answers': [string],  // Multiple possible answers
    'correct_answer': string,     // Comma-joined format
    'answers': {                  // Serialized: str(user_id) → submission object
      'str(user_id)': {
        'answers': [string],
        'correct_mask': [boolean],
        'correct_count': int,
        'response_ms': int
      }
    },
    'points': {               // Context Guesser only
      'user_id': points
    }
  }
]
```

### Key Differences Between Game Types:

| Feature | Word Duel | Context Guesser |
|---------|-----------|-----------------|
| Question Field | `question` | `sentence` |
| Answers Field | `answers` object with user_id keys | Serialized str(user_id) keys |
| Answer Format | Single string (`answer`) | Array of strings (`answers`) |
| Correct Format | `correct_answer` (string) | `correct_answers` (array) + `correct_answer` (joined) |
| Metadata | `correct` bool, `timestamp` | `correct_mask`, `correct_count`, `response_ms` |
| Winner Logic | First correct answer wins | Highest score (correct_count) + fastest (response_ms) |
| Revealed Sentence | None | Present (full sentence without blanks) |

---

## 6. Data Files

### Backend Models:
- `backend\app\models\game_record.py` - GameRecord schema
- `backend\app\models\room_record.py` - RoomRecord schema (summary records)

### Backend Routes:
- `backend\app\routes\room_ws.py` - WebSocket handlers (game logic, rounds building)
- `backend\app\routes\room.py` - REST API endpoints for records (lines 276-287 for get_records, 560-581 for get_game_record)

### Frontend:
- `frontend\src\pages\room\MyRecords.jsx` - Display component
- `frontend\src\api\index.js` - API client (roomAPI.getRecords line 115, roomAPI.getGameRecord line 118)

### Tests:
- `backend\tests\test_room_games.py` - Game question generation tests

---

## 7. Complete Data Flow Diagram

```
GAME IN PROGRESS (room_ws.py)
    ↓
state['rounds_log'] array built incrementally
    ↓
Each round ends → round object added to rounds_log
    ↓
GAME ENDS (_end_game function)
    ↓
For each player:
  GameRecord created with rounds_data = json.dumps(state['rounds_log'])
    ↓
FRONTEND REQUESTS RECORD
    ↓
MyRecords.jsx calls roomAPI.getGameRecord(record.id)
    ↓
Backend returns GameRecord.to_dict() with rounds_data as JSON string
    ↓
Frontend parses: const rounds = JSON.parse(gameDetailData.rounds_data)
    ↓
Renders each round with all available data
```

---

## 8. Important Notes

1. **Shared Data**: All players in a game receive the same `rounds_log` - there's only one game history, not per-player variations
2. **Serialization Point**: JSON serialization happens once at game end, not during play
3. **User ID Key Variation**: 
   - Word Duel: user_id as integer key (before serialization)
   - Context Guesser: str(user_id) as string key (for JSON)
4. **Authorization**: Frontend can only view their own game records (checked in backend)
5. **Fallback Display**: Frontend gracefully handles missing rounds_data or parse errors
6. **Field Polymorphism**: Frontend checks for different fields based on game type (question vs sentence, correct_answer vs correct_answers)

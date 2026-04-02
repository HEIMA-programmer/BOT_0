# Agora RTC Integration Analysis - SpeakingRoom.jsx

## Overview
The SpeakingRoom.jsx implements Agora Real-Time Communication (RTC) for video/audio conferencing. The implementation uses `agora-rtc-react` library hooks and manages WebSocket communication via Socket.IO for room state synchronization.

---

## 1. Agora Client Initialization & Channel Joining

### Location: SpeakingRoom.jsx Lines 28-51, 70-185

### Initialization Flow:

#### A. Wrapper Component (SpeakingRoomWrapper) - Lines 28-82
```
Purpose: Create fresh Agora client per mount to handle React StrictMode
- Creates new AgoraRTC client each time: AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
- Fetches Agora credentials from backend via roomAPI.getAgoraToken(roomId)
- Returns: token, app_id, channel (name), uid
```

#### B. Token Acquisition - Lines 42-51
```javascript
useEffect(() => {
  if (!roomId) return;
  roomAPI.getAgoraToken(roomId)
    .then(res => {
      setAgoraToken(res.data.token);
      setAgoraAppId(res.data.app_id);
      setChannel(res.data.channel);
    })
    .catch(err => setFetchError(...))
}, [roomId]);
```

**Backend Token Generation**: `backend/app/routes/room.py` Lines 267-305
- Uses `agora_token_builder` library to generate RTC token
- Channel name format: `room_{room_id}` (ensures unique channel per room)
- Token valid for 24 hours
- User UID = current user's DB user ID (critical for matching)

#### C. AgoraRTCProvider - Lines 70-80
Wraps the main SpeakingRoom component with Agora context

#### D. Channel Join - Lines 180-185
```javascript
useJoin({
  appid: agoraAppId,
  channel: channel,
  token: agoraToken,
  uid: userId, // Match our DB user_id
}, true);  // ready=true, join immediately
```

**Key Detail**: The second parameter `true` means "join now" (ready condition)

---

## 2. Remote Users' Audio/Video Track Subscription & Rendering

### Location: SpeakingRoom.jsx Lines 196-409

### A. Remote Users Retrieval - Line 197
```javascript
const remoteUsers = useRemoteUsers();
```
Returns array of `AgoraRTCRemoteUser` objects connected to the channel.
Each remote user has:
- `uid`: user ID
- `hasVideo`: boolean (video track enabled)
- `hasAudio`: boolean (audio track enabled)
- `audioTrack`: MediaStreamTrack object
- `videoTrack`: MediaStreamTrack object

### B. Remote User Matching - Lines 360-366
```javascript
const rtcUser = isMe ? null : remoteUsers.find(u => Number(u.uid) === member.user_id);
const hasVideo = isMe ? cameraEnabled : !!rtcUser?.hasVideo;
const hasAudio = isMe ? micEnabled : !!rtcUser?.hasAudio;
```

**CRITICAL**: Converts both `u.uid` and `member.user_id` to numbers for comparison

### C. RemoteUser Component Rendering - Lines 401-409
```javascript
{!isMe && rtcUser && (
  <div style={{ position: 'absolute', inset: 0 }}>
    <RemoteUser
      user={rtcUser}
      playVideo={hasVideo}
      playAudio={true}
    />
  </div>
)}
```

**Important Note**: RemoteUser is **ALWAYS rendered** when rtcUser exists, regardless of hasVideo state:
- `playVideo={hasVideo}`: Controls whether video is displayed (false = shows avatar)
- `playAudio={true}`: Audio always plays if user has microphone enabled
- **If RemoteUser wasn't rendered, Agora wouldn't subscribe to that user's tracks**

---

## 3. User Media State Tracking & Communication

### A. Local Media State - Lines 93-94
```javascript
const [micEnabled, setMicEnabled]         = useState(true);
const [cameraEnabled, setCameraEnabled]   = useState(true);
```

### B. Track Enabling/Disabling - Lines 202-212
```javascript
// Mic
useEffect(() => {
  if (localMicrophoneTrack) {
    localMicrophoneTrack.setEnabled(micEnabled);
  }
}, [micEnabled, localMicrophoneTrack]);

// Camera
useEffect(() => {
  if (localCameraTrack) {
    localCameraTrack.setEnabled(cameraEnabled);
  }
}, [cameraEnabled, localCameraTrack]);
```

**Critical Design Decision**: Uses `setEnabled()` NOT `setMuted()`
- `setEnabled(false)`: Stops sending media stream to remote peers (what we want)
- `setMuted(false)`: Only silences locally, remote peers still receive it
- Tracks are ALWAYS created (`ready=true` on line 190-191) and published (line 194)
- Muting only controls the stream, not the track lifecycle

### C. UI Controls - Lines 490-520
```javascript
// Mic Toggle
onClick={() => setMicEnabled(v => !v)}

// Camera Toggle
onClick={() => setCameraEnabled(v => !v)}
```

### D. UI Display of Media State - Lines 365-366, 412-421, 441-450
```javascript
// Display indicators based on rtcUser properties
const hasVideo = isMe ? cameraEnabled : !!rtcUser?.hasVideo;
const hasAudio = isMe ? micEnabled : !!rtcUser?.hasAudio;

// Avatar shown when no video
{!hasVideo && <Avatar ... />}

// Muted indicator (red icon)
{!hasAudio && <div>...</div>}
```

---

## 4. UI Rendering of Remote Users' Video/Audio

### Location: SpeakingRoom.jsx Lines 349-480

### Grid Layout - Lines 250-251, 350-359
```javascript
const gridCols = members.length <= 1 ? 1 : 2;
const tileSize = members.length <= 2 ? 280 : 200;

<div style={{
  display: 'grid',
  gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
  gap: 8,
  ...
}}>
```

Responsive grid: 1→1 col, 2→2 cols, 3-4→2x2 grid

### Per-User Tile - Lines 360-478
Each member gets a tile containing:

1. **Local User Rendering** (Lines 385-395)
   ```javascript
   {isMe && (
     <LocalUser
       audioTrack={localMicrophoneTrack}
       videoTrack={localCameraTrack}
       cameraOn={cameraEnabled}
       micOn={micEnabled}
       playAudio={false} // Don't hear own audio feedback
       playVideo={cameraEnabled}
     />
   )}
   ```

2. **Remote User Rendering** (Lines 401-409)
   ```javascript
   {!isMe && rtcUser && (
     <RemoteUser
       user={rtcUser}
       playVideo={hasVideo}
       playAudio={true}
     />
   )}
   ```

3. **Avatar Fallback** (Lines 412-421)
   ```javascript
   {!hasVideo && (
     <Avatar
       size={72}
       style={{ background: getAvatarColor(member.username), ... }}
     >
       {member.username.charAt(0).toUpperCase()}
     </Avatar>
   )}
   ```

4. **Name & Role Badge** (Lines 424-438)
   ```javascript
   <div style={{ position: 'absolute', bottom: 10, left: 10, ... }}>
     {member.role === 'host' && <CrownOutlined />}
     <Text>{member.username}{isMe ? ' (You)' : ''}</Text>
   </div>
   ```

5. **Muted Indicator** (Lines 441-450)
   ```javascript
   {!hasAudio && (
     <div style={{ position: 'absolute', top: 10, right: 10, ... }}>
       <AudioMutedOutlined /> {/* Red badge */}
     </div>
   )}
   ```

6. **Host Kick Button** (Lines 453-476)
   Only visible to host, only for non-host members

---

## 5. Event Listeners

### A. Agora-Level (Implicit in agora-rtc-react hooks)

The following events are **automatically handled** by `useRemoteUsers()`:
- **user-published**: Remote user publishes audio/video track → rtcUser added to remoteUsers
- **user-unpublished**: Remote user stops publishing → track removed
- **user-joined**: User joins channel (before publishing)
- **user-left**: User leaves channel

The library abstracts away manual event registration.

### B. Socket.IO Events (backend/app/routes/room_ws.py)

**Lines 136-142**: Member joined/left
```python
socket.on('member_joined', ({ member }) => {
  setMembers(prev => [...prev, member]);
});

socket.on('member_left', ({ user_id }) => {
  setMembers(prev => prev.filter(m => m.user_id !== user_id));
});
```

**Lines 144-150**: Host changed
```python
socket.on('host_changed', ({ new_host_user_id }) => {
  setMembers(prev => prev.map(m => ({
    ...m,
    role: m.user_id === new_host_user_id ? 'host' : ...
  })));
});
```

**Lines 153**: Topic changed
```python
socket.on('topic_changed', ({ topic: newTopic }) => setTopic(newTopic));
```

**Lines 155-160**: Member kicked
```python
socket.on('member_kicked', ({ user_id: kickedId }) => {
  if (kickedId === user?.id) {
    isLeavingRef.current = true;
    navigate('/room');
  }
});
```

### C. Socket.IO Registration (Lines 127-164)
Socket connection happens in useEffect with dependencies `[roomId, userId]`:
- Emits `join_waiting_room` on connect
- Listens for all events
- Cleanup disconnects socket on unmount

---

## 6. Local Tracks Publishing

### Location: SpeakingRoom.jsx Lines 190-194

### Track Creation - Lines 190-191
```javascript
const { localMicrophoneTrack } = useLocalMicrophoneTrack(true);  // ready=true
const { localCameraTrack } = useLocalCameraTrack(true);          // ready=true
```

- `true` parameter = create track immediately
- Tracks are created regardless of micEnabled/cameraEnabled state
- Allows muting without destroying the track

### Track Publishing - Line 194
```javascript
usePublish([localMicrophoneTrack, localCameraTrack]);
```

Once tracks exist, `usePublish` automatically publishes them to the channel.

### Track Lifecycle
1. **Created**: Lines 190-191 (once on mount, never recreated)
2. **Published**: Line 194 (once created)
3. **Enabled/Disabled**: Lines 202-212 (via setEnabled based on micEnabled/cameraEnabled)
4. **Unpublished**: Automatic when usePublish hook unmounts

---

## IDENTIFIED BUGS & POTENTIAL ISSUES

### BUG #1: Missing Track Subscription/Unsubscription Event Handlers

**Severity**: MEDIUM-HIGH

**Location**: Lines 196-197 - useRemoteUsers() hook doesn't have explicit event listeners

**Issue**: 
The code relies entirely on the `agora-rtc-react` library's `useRemoteUsers()` hook to track remote users and their track states. However, there are NO explicit event listeners registered for Agora events:
- No `client.on('user-published', ...)`
- No `client.on('user-unpublished', ...)`
- No `client.on('user-joined', ...)`
- No `client.on('user-left', ...)`

**Risk**: If `useRemoteUsers()` doesn't properly handle rapid connect/disconnect cycles, or if there's a race condition in track subscription, users might appear offline even when online.

**Mitigation Check**: The code assumes `agora-rtc-react` internally handles all subscription. This works IF the library properly:
1. Subscribes to tracks when `user-published` fires
2. Unsubscribes when `user-unpublished` fires
3. Properly tracks hasVideo/hasAudio state

---

### BUG #2: Room Members List vs Agora Remote Users Mismatch

**Severity**: MEDIUM

**Location**: Lines 360-366 (matching logic)

**Issue**:
```javascript
const rtcUser = remoteUsers.find(u => Number(u.uid) === member.user_id);
```

The code matches Agora `remoteUsers` array with the `members` array from Socket.IO. These can get out of sync:

1. **Member joined Socket.IO but not yet in Agora**: Member appears in members list but `rtcUser` is undefined
   - Result: Only shows avatar, no media attempts
   
2. **Member left Socket.IO but still in Agora**: Member removed from members, but Agora still has the user
   - Result: rtcUser orphaned, never rendered
   
3. **Agora connection slower than Socket.IO**: Common in fast networks
   - Result: Black screen for newly joined members briefly

**Example Scenario**:
- User A joins room
- Socket.IO fires member_joined event immediately
- Agora channel subscription takes 200ms
- During those 200ms, rtcUser is undefined
- UI shows avatar instead of video briefly

**Mitigation**: The current design handles this by showing avatar as fallback. However, no explicit sync or retry logic exists.

---

### BUG #3: Remote User Video/Audio State Not Reflected Immediately

**Severity**: LOW-MEDIUM

**Location**: Lines 365-366

**Issue**:
```javascript
const hasVideo = isMe ? cameraEnabled : !!rtcUser?.hasVideo;
const hasAudio = isMe ? micEnabled : !!rtcUser?.hasAudio;
```

The UI reads `rtcUser.hasVideo` and `rtcUser.hasAudio` from Agora state. However:

1. When a remote user toggles their camera:
   - Client calls `localCameraTrack.setEnabled(false)` 
   - Agora event fires: `user-unpublished` 
   - `useRemoteUsers()` updates the rtcUser object
   - Component re-renders showing avatar

2. **Timing Issue**: There can be a 100-300ms delay between:
   - Remote user toggling camera OFF
   - Local UI updating to show avatar
   - Remote user toggling camera ON
   - Local UI showing video again

3. **No explicit "video-enabled-changed" event**: The code listens implicitly through `useRemoteUsers()` hook

**Current Behavior**: Works correctly, just with latency

**Potential Issue**: If `useRemoteUsers()` doesn't trigger re-render on track state change, UI won't update

---

### BUG #4: Missing Error Handling for Agora Operations

**Severity**: MEDIUM

**Location**: Lines 180-194 (useJoin, useLocalMicrophoneTrack, useLocalCameraTrack, usePublish)

**Issue**:
```javascript
useJoin({ appid, channel, token, uid }, true);
const { localMicrophoneTrack } = useLocalMicrophoneTrack(true);
const { localCameraTrack } = useLocalCameraTrack(true);
usePublish([localMicrophoneTrack, localCameraTrack]);
```

No error handling for:
- Failed channel join (invalid token, network error)
- Failed camera/mic initialization (permissions denied, device unavailable)
- Failed track publication

**Consequences**:
- User sees empty room with no error message
- Thinks everyone else is offline when actually their local connection failed
- No feedback that camera/mic permission was denied

**Test Case**: Deny camera permission → application silently fails

---

### BUG #5: Member List Not Synced on Component Mount

**Severity**: MEDIUM

**Location**: Lines 118-124

**Issue**:
```javascript
useEffect(() => {
  if (!roomId) return;
  roomAPI.getRoom(roomId)
    .then(res => setMembers(res.data.members || []))
    .catch(() => navigate('/room'));
}, [roomId]);
```

The member list is fetched from the REST API, but this creates a potential race condition:

1. User enters room
2. Initial render uses `initialMembers` from location.state (could be stale)
3. REST call fetches fresh members list
4. Meanwhile, Socket.IO connects and fires member_joined events

**Scenario**:
- User navigates from lobby with 3 members in state
- Another user joins before REST call completes
- REST returns 4 members
- Socket.IO fires member_joined for 5th user
- Brief consistency issues possible

**Mitigation**: REST call happens early, usually fast enough. But ordering isn't guaranteed.

---

### BUG #6: Missing Dependency in handleLeave Callback

**Severity**: LOW

**Location**: Lines 221-229

**Issue**:
```javascript
const handleLeave = useCallback(async () => {
  if (isHost && members.length > 1) {
    setShowLeave(true);
  } else {
    // ... leave logic
  }
}, [isHost, members.length, roomId, navigate, topic]);
```

The function depends on `isHost` which is computed from `members`:
```javascript
const isHost = members.find(m => m.user_id === userId)?.role === 'host';
```

If `members` changes, `isHost` changes, but the callback re-creates. This is correct behavior but verbose. Minor issue, not a bug.

---

### BUG #7: LocalUser playAudio={false} Could Cause Issues

**Severity**: LOW

**Location**: Line 392

**Issue**:
```javascript
<LocalUser
  audioTrack={localMicrophoneTrack}
  videoTrack={localCameraTrack}
  cameraOn={cameraEnabled}
  micOn={micEnabled}
  playAudio={false} // Don't play own audio
  playVideo={cameraEnabled}
/>
```

The `playAudio={false}` prevents the user from hearing their own voice (good). However:

1. The `micOn={micEnabled}` parameter might be confusing to the LocalUser component
2. If LocalUser component logic is: "if micOn=true, set playAudio=true", it could cause feedback
3. Unclear if this is the correct parameter (might be `audioOn` instead)

**Risk**: Low, assuming agora-rtc-react LocalUser respects playAudio parameter

---

### BUG #8: Race Condition on Room Leave

**Severity**: MEDIUM

**Location**: Lines 221-235

**Issue**:
When user leaves:
1. `isLeavingRef.current = true` is set (line 225, 232)
2. REST call to `roomAPI.leave()` is made
3. Socket.IO receives member_left event
4. Handler fires `member_left` which calls `setMembers()`
5. Meanwhile, navigate() is queued

**Race Condition**: 
- If navigate happens before member_left handler fires, component unmounts
- Socket.IO event arrives after component is unmounted
- State update on unmounted component (React warning)
- If member_left fires first, setMembers might trigger re-render after navigate

**Current Mitigation**: 
- `isLeavingRef` prevents browser back-button cleanup from interfering
- But no synchronization between REST leave and Socket.IO events

---

### BUG #9: Topic Sync Issue on Join

**Severity**: LOW

**Location**: Lines 214-215 (room_ws.py), Lines 153 (SpeakingRoom.jsx)

**Issue**:
When a user joins, the backend emits current topic:
```python
elif room.room_type == 'speaking' and room_id in room_topics:
  emit('topic_changed', {'topic': room_topics[room_id]})
```

But `room_topics` is a **runtime dictionary** in room_ws.py - not persisted:
- If room restarts or process crashes: all topics lost
- If user refreshes page: topic lost (unless stored in DB)

**Current Behavior**: Works fine for session lifetime, but not persistent across restarts

---

### BUG #10: No Validation of Channel Name in useJoin

**Severity**: LOW

**Location**: Line 182

**Issue**:
```javascript
useJoin({
  appid: agoraAppId,
  channel: channel,  // Could be undefined
  token: agoraToken, // Could be undefined
  uid: userId,       // Could be 0
}, true);
```

If any of these are falsy when useJoin runs:
- agoraAppId: empty string
- channel: null or undefined
- agoraToken: null or undefined
- userId: 0 or undefined

useJoin will fail silently (assumed handled by agora-rtc-react).

**Current Guard**: Lines 61-67 show loading spinner until agoraToken is set, so this shouldn't happen in practice.

---

## SUMMARY OF FINDINGS

### Working Correctly:
✓ Agora client initialization with proper token
✓ Channel joining with correct UID matching
✓ Local track creation and muting (using setEnabled)
✓ Remote user rendering with fallback avatars
✓ Responsive grid layout
✓ Socket.IO member list sync
✓ Host role management
✓ Topic changing (runtime)

### Critical Issues (Fix Immediately):
1. **Missing error handling** for Agora operations (could fail silently)
2. **Member list / Agora users mismatch** (can cause sync issues)
3. **Implicit event handling** without explicit event listeners (relies on library behavior)

### Medium Issues (Should Fix):
1. **Race condition on room leave** (potential state update after unmount)
2. **Member list sync timing** on initial mount
3. **No persistent topic storage** (topics lost on process restart)

### Low Priority:
1. Minor timing delays in video/audio state updates (normal for RTC)
2. Room_topics dictionary not persisted
3. No explicit error messages for failed operations

---

## RECOMMENDED FIXES

### Fix #1: Add Explicit Agora Event Listeners
```javascript
useEffect(() => {
  const client = useRTCClient();
  
  client.on('user-published', async (user, mediaType) => {
    await client.subscribe(user, mediaType);
  });
  
  client.on('user-unpublished', (user) => {
    // Track automatically removed from remoteUsers
  });
  
  return () => {
    // Cleanup
  };
}, [client]);
```

### Fix #2: Add Error Handling
```javascript
useEffect(() => {
  if (!agoraToken) return;
  
  const client = useRTCClient();
  client.join(agoraAppId, channel, agoraToken, userId)
    .catch(err => {
      setFetchError(`Failed to join call: ${err.message}`);
    });
}, [agoraToken]);
```

### Fix #3: Sync Member List on Join
```javascript
useEffect(() => {
  socket.on('member_joined', ({ member }) => {
    setMembers(prev => {
      // Avoid duplicates
      if (prev.find(m => m.user_id === member.user_id)) return prev;
      return [...prev, member];
    });
  });
}, []);
```

### Fix #4: Add Loading State for Local Tracks
```javascript
const [localTracksReady, setLocalTracksReady] = useState(false);

useEffect(() => {
  if (localMicrophoneTrack && localCameraTrack) {
    setLocalTracksReady(true);
  }
}, [localMicrophoneTrack, localCameraTrack]);
```

---

## FILE REFERENCES

### Frontend:
- **Main Component**: `frontend/src/pages/room/SpeakingRoom.jsx`
- **API Client**: `frontend/src/api/index.js`
- **Utilities**: `frontend/src/utils/roomUtils.js`
- **Imports**: `agora-rtc-react` v6.x (assumed)

### Backend:
- **Token Generation**: `backend/app/routes/room.py` (lines 267-305)
- **WebSocket Events**: `backend/app/routes/room_ws.py` (lines 169-216)
- **Models**: `backend/app/models/room.py`
- **Config**: `backend/app/config.py` (AGORA_APP_ID, AGORA_APP_CERTIFICATE)

---

## AGORA CONFIGURATION

From `backend/app/config.py`:
```python
AGORA_APP_ID = os.getenv('AGORA_APP_ID', '')
AGORA_APP_CERTIFICATE = os.getenv('AGORA_APP_CERTIFICATE', '')
```

These must be set in .env file for token generation to work.

Token is valid for 24 hours and uses VP8 codec.

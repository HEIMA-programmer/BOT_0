# Architecture Document

## 1. System Overview

Academic English Practice App is a web application that helps incoming university students transition from everyday English to academic English. The system follows a client-server architecture with multiple AI integrations and real-time communication.

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Browser)                        │
│  ┌────────────────────────────────────────────────────────┐  │
│  │           React 19 + Vite 8 + Ant Design 6             │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌───────────────┐   │  │
│  │  │ Pages  │ │ Comps  │ │ Hooks  │ │ API Module    │   │  │
│  │  │ (25+)  │ │        │ │        │ │ (axios+mock)  │   │  │
│  │  └────────┘ └────────┘ └────────┘ └───────────────┘   │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌─────────────────┐ ┌───────────────┐ ┌─────────────────┐  │
│  │ Web Speech API  │ │ MediaRecorder │ │ Agora RTC SDK   │  │
│  │ (TTS + STT)     │ │ (Recording)   │ │ (Video/Audio)   │  │
│  └─────────────────┘ └───────────────┘ └─────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Socket.IO Client (Real-time)                │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────┬──────────────────┬──────────────┬─────────────┘
               │ HTTP/JSON        │ WebSocket     │ Agora RTC
               │ (proxy 5173→5000)│ (Socket.IO)   │ (Media)
┌──────────────▼──────────────────▼──────────────────────────────┐
│                  Flask Backend (port 5000)                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            REST Route Handlers (Blueprints)               │   │
│  │  /api/auth/*        /api/daily-words    /api/word-bank    │   │
│  │  /api/daily-learning /api/listening     /api/speaking     │   │
│  │  /api/chat/*        /api/forum/*        /api/room/*       │   │
│  │  /api/friends/*     /api/progress/*                       │   │
│  └────────────────────────┬─────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            WebSocket Namespaces (Socket.IO)               │   │
│  │  / (speaking)     /conversation     /room                 │   │
│  └────────────────────────┬─────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Service Layer                           │   │
│  │  AIService │ ConversationService │ ScoringService         │   │
│  │  SpeakingService │ Business Logic                         │   │
│  └────────────────────────┬─────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              SQLAlchemy ORM + Models (20+)                │   │
│  └────────────────────────┬─────────────────────────────────┘   │
└───────────────────────────┼─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                      SQLite Database                             │
│  users │ words │ word_bank │ user_word_progress │ ...            │
│  forum_posts │ rooms │ game_records │ friendships │ ...          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    External Services                             │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────────┐  │
│  │ OpenAI   │ │ Google   │ │ Anthropic │ │ Azure Speech     │  │
│  │ gpt-4o-  │ │ Gemini   │ │ Claude    │ │ Services         │  │
│  │ mini     │ │          │ │           │ │ (TTS + assess.)  │  │
│  └──────────┘ └──────────┘ └───────────┘ └──────────────────┘  │
│  ┌──────────┐ ┌────────────────────────────────────────────┐   │
│  │ DeepSeek │ │ Agora.io (Real-time video/audio infra)     │   │
│  └──────────┘ └────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 3. Technology Stack

| Layer      | Technology                            | Purpose                              |
|------------|---------------------------------------|--------------------------------------|
| Frontend   | React 19 + Vite 8                     | SPA framework + dev server           |
| UI         | Ant Design 6                          | Component library                    |
| Routing    | React Router 7                        | Client-side routing                  |
| HTTP       | Axios                                 | API requests with mock support       |
| Real-time  | Socket.IO Client                      | WebSocket communication              |
| Video      | Agora RTC SDK                         | Real-time video/audio in rooms       |
| Backend    | Flask 3.1 + Flask-SocketIO            | REST API + WebSocket server          |
| ORM        | SQLAlchemy 3.1                        | Database abstraction                 |
| Auth       | Flask-Login                           | Session-based authentication         |
| Database   | SQLite                                | File-based relational database       |
| AI (Quiz)  | OpenAI (gpt-4o-mini)                  | Quiz generation, speaking feedback   |
| AI (Voice) | Google Gemini                         | Real-time voice conversations        |
| AI (Score) | Anthropic Claude, DeepSeek            | Content scoring and analysis         |
| Voice      | Azure Speech Services                 | Pronunciation assessment             |
| Voice      | Web Speech API (browser)              | TTS + speech recognition (free)      |
| CI/CD      | GitHub Actions                        | Lint + test on every PR              |
| Deploy     | Docker + Nginx + ECS                  | Containerized production deployment  |

## 4. Page Routing Plan

| Path                                   | Page Component       | Description                      | Auth Required |
|----------------------------------------|---------------------|----------------------------------|---------------|
| `/`                                    | Home                | Landing page with module cards   | No            |
| `/login`                               | Login               | User login form                  | No            |
| `/register`                            | Register            | User registration form           | No            |
| `/daily-words/:count`                  | DailyWords          | Today's vocabulary words         | No            |
| `/word-bank`                           | WordBank            | Personal saved words             | Yes           |
| `/listening/:levelId`                  | Listening           | Listening comprehension lab      | No            |
| `/listening/video/:categoryId/:videoId`| VideoPlayer         | TED Talk / video playback        | No            |
| `/speaking/:scenario/:type`            | Speaking            | Pronunciation & speaking         | No            |
| `/speaking/structured`                 | StructuredSpeaking  | Guided speaking exercises        | No            |
| `/speaking/free-conversation`          | FreeConversation    | Open conversation practice       | Yes           |
| `/speaking/office-hours`               | GuidedConversation  | Office hours scenario            | Yes           |
| `/speaking/seminar-discussion`         | GuidedConversation  | Seminar discussion scenario      | Yes           |
| `/speaking/history`                    | ConversationHistory | Past conversation review         | Yes           |
| `/forum`                               | Forum               | Discussion board                 | Yes           |
| `/profile`                             | Profile             | User profile & progress          | Yes           |
| `/room`                                | RoomLobby           | Create/join multiplayer rooms    | Yes           |
| `/room/:id/waiting`                    | WaitingRoom         | Pre-session lobby                | Yes           |
| `/room/:id/watch`                      | WatchTogether       | Synchronized video watching      | Yes           |
| `/room/:id/speaking`                   | SpeakingRoom        | Agora RTC group speaking         | Yes           |
| `/room/:id/game`                       | GameRoom            | Competitive word games           | Yes           |
| `/room/records`                        | MyRecords           | Game & session history           | Yes           |
| `/schedule`                            | Schedule            | Activity scheduling              | Yes           |

## 5. API Structure

All API endpoints are prefixed with `/api/`.

**REST Endpoints:**
- **Auth**: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/username`
- **Daily Words**: `/api/daily-words`
- **Daily Learning**: `/api/daily-learning/today`, `/word-status`, `/review-words`, `/mastered-words`, `/all-words`, `/stats`, `/mark-mastered`, `/add-to-bank`
- **Word Bank**: `/api/word-bank` (GET, POST, DELETE, PATCH), `/stats`, `/:id/review`
- **Listening**: `/api/listening/clips`, `/audio/:slug`, `/quiz/:level/:scenario/:slug`, `/quiz/.../submit`
- **Speaking**: `/api/speaking/feedback`
- **Chat History**: `/api/chat-history/sessions` (GET, POST), `/sessions/:id`, `/sessions/:id/messages`, `/sessions/:id/end`, `/scenario-prompt`, `/scenarios/:type`
- **Forum**: `/api/forum/posts` (CRUD), `/comments`, `/forward`, `/my-posts`, `/admin/pending-posts`, `/admin/posts/:id/review`, `/admin/posts/:id/pin`
- **Room**: `/api/rooms` (GET, POST), `/join`, `/:id`, `/:id/members/me`, `/:id/agora-token`, `/game-questions`, `/records`, `/game-records/:id`
- **Friends**: `/api/friends/` (GET), `/search`, `/request`, `/requests`, `/accept`, `/reject`, `/:id` (DELETE)
- **Progress**: `/api/progress/dashboard`, `/track-time`

**WebSocket Namespaces (Socket.IO):**
- `/` (default) — Speaking practice feedback
- `/conversation` — AI voice conversation streaming
- `/room` — Room state sync, game rounds, lobby updates

Detailed contracts per sprint are in `docs/api-sprint1.md` and `docs/api-sprint2-3.md`.

## 6. Database Schema Overview

See `docs/db-schema.md` for full schema. Core tables (20+):

**User & Auth:**
- **users** — registered users with admin role support

**Vocabulary:**
- **words** — academic vocabulary pool (AWL, 1000+ words)
- **word_bank** — user's saved words with mastery tracking
- **user_word_progress** — daily spaced repetition progress
- **review_history** — word review tracking

**Learning Modules:**
- **listening_clips** — audio content for listening exercises
- **listening_attempts** — user listening practice scores
- **speaking_sessions** — speaking practice records with AI feedback
- **chat_sessions** / **chat_messages** — AI conversation history
- **progress** — cross-module progress tracking

**Forum & Social:**
- **forum_posts** — discussion posts with moderation workflow
- **forum_comments** — post comments
- **forum_post_pins** — user's pinned/favorited posts
- **forum_forwards** — post forwarding/resharing
- **friendships** — mutual friend connections
- **friend_requests** — pending friend invitations

**Multiplayer:**
- **rooms** — multiplayer room instances (game/speaking/watch)
- **room_members** — room membership and roles
- **room_records** — session activity logs
- **game_records** — game play history with round data

## 7. Key Design Decisions

1. **Monorepo**: Frontend and backend in one repo for simpler CI/CD and code review.
2. **API Proxy**: Vite dev server proxies `/api` and `/socket.io` to Flask, avoiding CORS issues in development.
3. **Mock-first frontend**: Frontend uses mock data by default so it can be developed independently of backend.
4. **Session auth**: Flask-Login with cookie sessions — simpler than JWT for this scope.
5. **SQLite**: Zero-config database, sufficient for prototype, migrable to PostgreSQL later.
6. **Browser APIs for voice**: Web Speech API (TTS + STT) and MediaRecorder are free and require no backend for basic voice features.
7. **Multi-AI backend**: Support for OpenAI, Google Gemini, Anthropic, DeepSeek, and Azure Speech to balance cost, capability, and availability.
8. **Agora RTC for rooms**: Real-time video/audio communication for multiplayer speaking and watch-together features.
9. **Socket.IO for state sync**: WebSocket namespaces for room state, game rounds, and conversation streaming.
10. **Docker + Nginx**: Multi-stage Docker build with Nginx reverse proxy for production deployment with SSL.

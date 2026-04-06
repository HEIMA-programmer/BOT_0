# Academic English Practice App

> **Live Demo: [https://diicsu.cn](https://diicsu.cn)** — Deployed on ECS with Docker + Nginx + HTTPS. Use Chrome for full voice features.

A web application that helps incoming university students transition from everyday English to academic English, enabling them to confidently participate in lectures, seminars, and academic discussions.

## Tech Stack

| Layer      | Technology                                              |
|------------|---------------------------------------------------------|
| Frontend   | React 19 + Vite 8 + Ant Design 6                       |
| Backend    | Python 3.11 + Flask 3.1 + Flask-SocketIO                |
| Database   | SQLite + SQLAlchemy                                     |
| AI         | OpenAI, Google Gemini, Anthropic Claude, DeepSeek       |
| Voice      | Web Speech API (browser native) + Azure Speech Services |
| Real-time  | Agora RTC (video/audio) + Socket.IO (WebSocket)         |
| Auth       | Flask-Login (session-based)                             |
| CI/CD      | GitHub Actions                                          |
| Deploy     | Docker + Nginx + ECS                                    |

## Prerequisites

- Node.js 18+
- Python 3.11+
- npm 9+

## Quick Start

### 1. Clone the repo

```bash
git clone <repo-url>
cd academic-english-app
```

### 2. Set up environment variables

```bash
cp .env.example .env
# Edit .env and fill in required API keys (see .env.example for all variables)
# At minimum: FLASK_SECRET_KEY, OPENAI_API_KEY, GOOGLE_API_KEY
```

### 3. Backend setup

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
python run.py
```

Backend runs at http://localhost:5000

### 4. Frontend setup (new terminal)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:5173 (proxies `/api` to backend)

### 5. Open in browser

Visit http://localhost:5173 — recommend **Chrome** for full voice features.

## Project Structure

```
├── frontend/                # React 19 + Vite 8
│   ├── src/pages/           # Page components (25+)
│   ├── src/components/      # Shared UI components
│   ├── src/hooks/           # Custom React hooks
│   ├── src/api/             # API request functions (mock-ready)
│   └── public/AWL/          # Academic Word List data
├── backend/                 # Flask + SocketIO
│   ├── app/routes/          # REST + WebSocket route handlers
│   ├── app/models/          # SQLAlchemy models (20+)
│   ├── app/services/        # Business logic, AI calls
│   └── tests/               # pytest tests
├── nginx/                   # Nginx reverse proxy config
├── docs/                    # API contracts, architecture, meeting notes
├── Audio/                   # Listening module audio content
├── GroupDiscussion/          # Group discussion scenarios
├── OfficeHour/              # Office hour scenarios
├── Q&ASession/              # Q&A session scenarios
├── .github/workflows/       # CI/CD config
├── Dockerfile               # Multi-stage Docker build
├── docker-compose.yml       # Production deployment
├── .env.example             # Environment variable template
└── README.md                # This file
```

## API Documentation

- [Architecture](docs/architecture.md)
- [Database Schema](docs/db-schema.md)
- [Sprint 1 API Contracts](docs/api-sprint1.md)
- [Sprint 2-3 API Contracts](docs/api-sprint2-3.md)

## Contributing

1. Create a feature branch from `main`: `git checkout -b feature/T1.x-task-name`
2. Commit with clear messages: `feat: add daily words API endpoint`
3. Push and open a PR. Tag a reviewer.
4. At least 1 teammate must review and approve before merging.
5. CI must pass (green check) before merging.
6. After merge, delete the remote branch.

## Browser Compatibility

- **Chrome**: Full support (recommended)
- **Firefox**: Full support
- **Edge**: Full support
- **Safari**: Limited — Web Speech API has limited support. Voice features show a graceful fallback message.

## AI Disclosure

> In accordance with our [Team Working Agreement (Section 8 - AI Usage Policy)](docs/team_working_agreement.md), we disclose all AI-assisted contributions in this project.
>
> **Claude (Anthropic)** appears in the contributors list solely due to a **non-functional infrastructure change** — switching the Dockerfile's Debian package mirror from `deb.debian.org` to `mirrors.aliyun.com` to resolve network issues during Docker builds. **No application features or business logic were involved.** While AI tools were used to assist development throughout the project, all AI-generated code was personally reviewed and understood by the submitting team member before committing, in compliance with our AI Usage Policy.

## Our Team

| GitHub Username | Real Name |
| :--- | :--- |
| HEIMA-programmer | Yanbin Xu |
| ColdFF | Junfan Zhou |
| RainYans | Yanshuo Liu |
| Lizzy-zhi | Weike Jin |
| 1294201870 | Yupei Yang |
| qwqsad11 | Chenxi Huang |
| KoCookie, kira Hu | Ruoqi Hu |

> **Note on commit distribution:** Yanbin Xu (HEIMA-programmer) has a higher commit count because, in addition to feature development, he handled cross-cutting responsibilities including PR code review, CI/CD pipeline configuration, production deployment (Docker, Nginx, ECS), release management, and debugging integration issues across sprints. Merge commits from reviewing and merging teammates' PRs also contribute to the count. Feature development was distributed across all team members through sprint-based task assignment with rotating Scrum roles (see [Team Working Agreement](docs/team_working_agreement.md)).

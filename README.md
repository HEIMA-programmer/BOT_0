# Academic English Practice App

A web application that helps incoming university students transition from everyday English to academic English, enabling them to confidently participate in lectures, seminars, and academic discussions.

## Tech Stack

| Layer    | Technology                     |
|----------|--------------------------------|
| Frontend | React + Vite + Ant Design      |
| Backend  | Python Flask                   |
| Database | SQLite + SQLAlchemy            |
| AI       | OpenAI Chat API                |
| Voice    | Web Speech API (browser native)|
| Auth     | Flask-Login (session-based)    |
| CI/CD    | GitHub Actions                 |
| Deploy   | Render (free tier)             |

## Prerequisites

- Node.js 18+
- Python 3.9+
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
# Edit .env and fill in your OPENAI_API_KEY and FLASK_SECRET_KEY
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
├── frontend/                # React + Vite
│   ├── src/pages/           # Page components
│   ├── src/components/      # Shared UI components
│   ├── src/api/             # API request functions (mock-ready)
│   └── src/assets/          # Images, icons
├── backend/                 # Flask
│   ├── app/routes/          # API route handlers
│   ├── app/models/          # SQLAlchemy models
│   ├── app/services/        # Business logic, AI calls
│   └── tests/               # pytest tests
├── docs/                    # API contracts, architecture, meeting notes
├── .github/workflows/       # CI/CD config
├── .env.example             # Environment variable template
└── README.md                # This file
```

## API Documentation

- [Architecture](docs/architecture.md)
- [Database Schema](docs/db-schema.md)
- [Sprint 1 API Contracts](docs/api-sprint1.md)

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

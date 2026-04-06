# ============================================================
# Stage 1: Build frontend
# ============================================================
FROM node:20-alpine AS frontend-build

WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ============================================================
# Stage 2: Python runtime
# ============================================================
FROM python:3.11-slim

# Use Aliyun mirror for faster package downloads in China
RUN sed -i 's|deb.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list.d/debian.sources

# System dependencies for Azure Speech SDK and general use
RUN apt-get update && apt-get install -y --no-install-recommends \
    libasound2 \
    libssl-dev \
    ca-certificates \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./backend/

# Copy built frontend into the location Flask expects
COPY --from=frontend-build /build/dist ./frontend/dist

# Copy AWL data needed for word seeding on first run
COPY frontend/public/AWL ./frontend/public/AWL

# Copy content directories needed by listening module
COPY Audio/ ./Audio/
COPY output/ ./output/
COPY generated_questions_md/ ./generated_questions_md/
COPY GroupDiscussion/ ./GroupDiscussion/
COPY Q&ASession/ ./Q&ASession/
COPY OfficeHour/ ./OfficeHour/

# Set working directory to backend for relative imports
WORKDIR /app/backend

ENV FLASK_ENV=production
EXPOSE 5000

CMD ["python", "-c", "import eventlet; eventlet.monkey_patch(); from app import create_app, socketio; app = create_app('production'); socketio.run(app, host='0.0.0.0', port=5000, debug=False)"]

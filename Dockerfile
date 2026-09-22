FROM python:3.11-slim

# Install Node.js 20 and system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python backend dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source and data files
COPY . .

# Set environment variables (Render automatically overrides PORT)
ENV PORT=10000
ENV PYTHON_API_BASE=http://127.0.0.1:8000
ENV PYTHONPATH=/app

EXPOSE 10000

# Start Python FastAPI backend in background on port 8000, then start Node.js server in foreground
CMD ["sh", "-c", "uvicorn bus_range_estimator.api:app --host 127.0.0.1 --port 8000 & exec node server.js"]

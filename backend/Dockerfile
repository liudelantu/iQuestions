FROM python:3.12-slim

WORKDIR /app

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY database ./database
COPY backend ./backend

ENV IQUESTIONS_DB_PATH=/app/data/iquestions.db \
    IQUESTIONS_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173 \
    PYTHONUNBUFFERED=1

WORKDIR /app/backend
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# OS deps for psycopg, lightgbm, scientific stack
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc libgomp1 build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
COPY agamotto ./agamotto
COPY migrations ./migrations
COPY alembic.ini ./

RUN pip install --upgrade pip && pip install -e .

EXPOSE 8000

CMD ["uvicorn", "agamotto.api.main:app", "--host", "0.0.0.0", "--port", "8000"]

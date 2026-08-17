FROM python:3.13-slim
WORKDIR /app
RUN apt-get update && apt-get install -y cifs-utils && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
COPY uv.lock .
COPY pyproject.toml .
RUN uv sync --frozen --no-dev --no-instal
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh
ENTRYPOINT ["./entrypoint.sh"]
EXPOSE 8000

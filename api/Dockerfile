# Imagem base: Linux enxuto já com Python
FROM python:3.12-slim

# ffmpeg: junta vídeo+áudio e converte para MP3
# nodejs: o yt-dlp usa um motor de JavaScript para ler o YouTube
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copia e instala as dependências primeiro (o Docker guarda em cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o restante do código
COPY . .

EXPOSE 8000

# 2 processos com 4 linhas de atendimento cada; timeout alto porque vídeo demora
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "--threads", "4", "--timeout", "300", "app:app"]
import os
import threading
from pathlib import Path

import maxminddb
import requests
from dotenv import load_dotenv
from flask import request

from platforms import detect_platform

load_dotenv()  # lê SUPABASE_URL e SUPABASE_KEY do arquivo api/.env

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

# Base de localização por IP (DB-IP City Lite), guardada no próprio servidor.
# Sem o arquivo (como no seu PC), as estatísticas seguem normais, só sem cidade.
GEO_FILE = Path(__file__).parent / "geo" / "dbip-city-lite.mmdb"
try:
    _geo = maxminddb.open_database(str(GEO_FILE))
except Exception:
    _geo = None


def _name(obj) -> str | None:
    """Pega o nome em português, se existir; senão, em inglês."""
    names = (obj or {}).get("names", {})
    return names.get("pt-BR") or names.get("en")


def detect_location(ip: str):
    """Descobre cidade, estado e país aproximados. O IP NÃO é guardado."""
    if not _geo or not ip:
        return None, None, None
    try:
        data = _geo.get(ip) or {}
    except Exception:
        return None, None, None  # IP inválido ou interno (ex.: 127.0.0.1)
    region = (data.get("subdivisions") or [{}])[0]
    country = (data.get("country") or {}).get("iso_code")  # ex.: "BR"
    return _name(data.get("city")), _name(region), country


def detect_device(user_agent: str) -> str:
    """Classifica o aparelho pelo texto que o navegador envia.
    Guardamos só a categoria, nunca o texto completo."""
    ua = (user_agent or "").lower()
    # tablets: iPad, ou Android sem a palavra "mobile"
    if "ipad" in ua or "tablet" in ua or ("android" in ua and "mobi" not in ua):
        return "tablet"
    if "mobi" in ua or "iphone" in ua:
        return "celular"
    return "computador"


def _send(row: dict):
    """Grava uma linha na tabela 'downloads'. Se falhar, ignora em silêncio."""
    try:
        requests.post(
            f"{SUPABASE_URL}/rest/v1/downloads",
            json=row,
            timeout=5,
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Prefer": "return=minimal",  # não precisa devolver a linha gravada
            },
        )
    except requests.RequestException:
        pass  # estatística nunca pode derrubar um download


def record(row: dict):
    """Anota um download em segundo plano, sem atrasar a resposta."""
    if not (SUPABASE_URL and SUPABASE_KEY):
        return  # sem configuração: simplesmente não anota
    threading.Thread(target=_send, args=(row,), daemon=True).start()


def init_stats(app):
    """Liga as estatísticas: roda depois de CADA resposta da API."""

    @app.after_request
    def _track(response):
        kind = None
        if request.path == "/download":
            kind = request.args.get("format", "mp4")
            if kind not in ("mp4", "mp3"):
                kind = None
        elif request.path == "/thumbnail":
            kind = "capa"
        elif request.path == "/media":
            if response.status_code >= 400:
                kind = "midia"  # falhou antes de saber se era foto ou vídeo
            elif response.mimetype.startswith("video"):
                kind = "video"
            else:
                kind = "foto"

        # 429 = bloqueado pelo limite de uso: não conta como download
        if kind and response.status_code != 429:
            platform = detect_platform(request.args.get("url", ""))
            if platform:
                # remote_addr já é o IP real do visitante (o ProxyFix no app.py cuida disso)
                city, region, country = detect_location(request.remote_addr)
                record({
                    "platform": platform,
                    "kind": kind,
                    "ok": response.status_code < 400,
                    "device": detect_device(request.headers.get("User-Agent", "")),
                    "city": city,
                    "region": region,
                    "country": country,
                })
        return response
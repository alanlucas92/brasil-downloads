import os
import threading

import requests
from dotenv import load_dotenv
from flask import request

from platforms import detect_platform

load_dotenv()  # lê SUPABASE_URL e SUPABASE_KEY do arquivo api/.env

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")


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


def record(platform: str, kind: str, ok: bool, device: str):
    """Anota um download em segundo plano, sem atrasar a resposta."""
    if not (SUPABASE_URL and SUPABASE_KEY):
        return  # sem configuração: simplesmente não anota
    row = {"platform": platform, "kind": kind, "ok": ok, "device": device}
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
                device = detect_device(request.headers.get("User-Agent", ""))
                record(platform, kind, response.status_code < 400, device)
        return response
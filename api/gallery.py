import json
import re
import subprocess
import sys
import time
from pathlib import Path

import requests
from flask import Blueprint, Response, jsonify, request

from platforms import detect_platform

gallery_bp = Blueprint("gallery", __name__)

BASE = Path(__file__).parent        # pasta api/
VIDEO_EXT = {"mp4", "webm", "mov", "m4v"}
IMAGE_EXT = {"jpg", "jpeg", "png", "webp", "heic"}
MAX_ITEMS = 20                      # no máximo 20 cards por link
CACHE_SECONDS = 600                 # guarda o resultado por 10 minutos
_cache = {}                         # memória: link -> (hora, resultado)


def list_media(url: str, platform: str):
    """Usa o gallery-dl para listar fotos/vídeos de um post.
    Retorna {"info": dados para o site, "files": endereços reais} ou None."""
    cached = _cache.get(url)
    if cached and time.time() - cached[0] < CACHE_SECONDS:
        return cached[1]  # já buscamos esse link há pouco: reaproveita

    # Monta o comando: o mesmo que você rodou no terminal, com -j (só listar)
    cmd = [sys.executable, "-m", "gallery_dl", "-j", "--range", f"1-{MAX_ITEMS}"]
    cookies = BASE / f"cookies-{platform}.txt"  # ex.: cookies-instagram.txt
    if cookies.exists():
        cmd += ["--cookies", str(cookies)]
    cmd.append(url)

    try:
        out = subprocess.run(
            cmd, capture_output=True, text=True,
            encoding="utf-8", errors="replace", timeout=90,
        )
        entries = json.loads(out.stdout or "[]")
    except (subprocess.TimeoutExpired, json.JSONDecodeError):
        return None

    files = []   # endereços reais (ficam só no servidor)
    items = []   # o que o site recebe
    meta = {}    # dados do post (autor, legenda...)
    for entry in entries:
        if entry[0] == -1:  # o gallery-dl avisou um erro
            print("gallery-dl:", entry[1].get("message"))
        if entry[0] != 3:   # 3 = "isto é um arquivo"
            continue
        file_url, data = entry[1], entry[2]
        ext = (data.get("extension") or "").lower()
        if ext in VIDEO_EXT:
            kind = "video"
        elif ext in IMAGE_EXT:
            kind = "image"
        else:
            continue
        if not meta:
            meta = data
        preview = data.get("display_url") or (file_url if kind == "image" else None)
        files.append({"url": file_url, "ext": ext})
        items.append({"index": len(items), "type": kind, "ext": ext, "preview": preview})

    if not items:
        return None

    # A data vem como "2026-11-13 15:00:00"; o site espera "20261113"
    date = str(meta.get("post_date") or meta.get("date") or "")[:10].replace("-", "")
    result = {
        "info": {
            "description": meta.get("description"),
            "author": meta.get("username"),
            "likes": meta.get("likes"),
            "comments": meta.get("comments"),
            "date": date if re.fullmatch(r"\d{8}", date) else None,
            "thumbnail": items[0]["preview"],
            "items": items,
        },
        "files": files,
    }
    _cache[url] = (time.time(), result)
    return result


@gallery_bp.get("/media")
def media():
    """Baixa UM card do post. Ex.: /media?url=LINK&index=0 (0 = primeiro)."""
    url = (request.args.get("url") or "").strip()
    platform = detect_platform(url)
    if not platform:
        return jsonify(error="Link inválido ou rede não suportada."), 400

    index = request.args.get("index", "0")
    data = list_media(url, platform)
    if not data or not index.isdigit() or int(index) >= len(data["files"]):
        return jsonify(error="Arquivo não encontrado nesse post."), 404
    file = data["files"][int(index)]

    try:
        # stream=True: vai repassando o arquivo aos poucos, sem encher a memória
        remote = requests.get(
            file["url"], stream=True, timeout=30,
            headers={"User-Agent": "Mozilla/5.0"},
        )
        remote.raise_for_status()
    except requests.RequestException:
        return jsonify(error="Não consegui baixar esse arquivo."), 502

    name = f"brasil-downloads-{int(index) + 1}.{file['ext']}"
    headers = {"Content-Disposition": f'attachment; filename="{name}"'}
    if remote.headers.get("Content-Length"):
        headers["Content-Length"] = remote.headers["Content-Length"]
    return Response(
        remote.iter_content(64 * 1024),
        mimetype=remote.headers.get("Content-Type", "application/octet-stream"),
        headers=headers,
    )
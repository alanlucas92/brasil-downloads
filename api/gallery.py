import json
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from flask import Blueprint, jsonify, request, send_file

from platforms import detect_platform
from video import ensure_h264  # garante vídeo que abre em qualquer celular

gallery_bp = Blueprint("gallery", __name__)

BASE = Path(__file__).parent        # pasta api/
VIDEO_EXT = {"mp4", "webm", "mov", "m4v"}
IMAGE_EXT = {"jpg", "jpeg", "png", "webp", "heic"}
MAX_ITEMS = 20                      # no máximo 20 cards por link
CACHE_SECONDS = 600                 # guarda a lista por 10 minutos
_cache = {}                         # memória: link -> (hora, resultado)


def gallery_cmd(platform: str, *args: str) -> list:
    """Monta o comando do gallery-dl, já com os cookies da rede, se existirem."""
    cmd = [sys.executable, "-m", "gallery_dl", *args]
    cookies = BASE / f"cookies-{platform}.txt"  # ex.: cookies-instagram.txt
    if cookies.exists():
        cmd += ["--cookies", str(cookies)]
    return cmd


def list_media(url: str, platform: str):
    """Usa o gallery-dl para LISTAR fotos/vídeos de um post (sem baixar).
    Retorna {"info": dados para o site} ou None."""
    cached = _cache.get(url)
    if cached and time.time() - cached[0] < CACHE_SECONDS:
        return cached[1]  # já buscamos esse link há pouco: reaproveita

    cmd = gallery_cmd(platform, "-j", "--range", f"1-{MAX_ITEMS}") + [url]
    try:
        out = subprocess.run(
            cmd, capture_output=True, text=True,
            encoding="utf-8", errors="replace", timeout=90,
        )
        entries = json.loads(out.stdout or "[]")
    except (subprocess.TimeoutExpired, json.JSONDecodeError):
        return None

    items = []  # o que o site recebe
    meta = {}   # dados do post (autor, legenda...)
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
    }
    _cache[url] = (time.time(), result)
    return result


@gallery_bp.get("/media")
def media():
    """Baixa UM card do post. Ex.: /media?url=LINK&index=0 (0 = primeiro).
    Quem baixa é o próprio gallery-dl, que sabe passar pelos bloqueios das redes."""
    url = (request.args.get("url") or "").strip()
    platform = detect_platform(url)
    if not platform:
        return jsonify(error="Link inválido ou rede não suportada."), 400

    index = request.args.get("index", "0")
    if not index.isdigit():
        return jsonify(error="Arquivo não encontrado nesse post."), 404
    number = int(index) + 1  # o gallery-dl conta a partir de 1

    # Pasta temporária só para este arquivo (apagada no final)
    tmp = tempfile.mkdtemp(prefix="bdm_")
    cmd = gallery_cmd(platform, "--range", str(number), "-D", tmp) + [url]

    try:
        out = subprocess.run(
            cmd, capture_output=True, text=True,
            encoding="utf-8", errors="replace", timeout=180,
        )
    except subprocess.TimeoutExpired:
        shutil.rmtree(tmp, ignore_errors=True)
        return jsonify(error="O download demorou demais. Tente de novo."), 504

    # Ignora arquivos incompletos (.part) que possam ter sobrado
    files = [f for f in Path(tmp).iterdir() if f.is_file() and f.suffix != ".part"]
    if not files:
        print("gallery-dl (media):", out.stderr[-500:])  # aparece no log da API
        shutil.rmtree(tmp, ignore_errors=True)
        return jsonify(error="Não consegui baixar esse arquivo."), 502

    file = files[0]
    if file.suffix.lstrip(".").lower() in VIDEO_EXT:
        file = ensure_h264(file)  # converte só se precisar
    ext = file.suffix.lstrip(".").lower() or "bin"
    response = send_file(
        file, as_attachment=True, download_name=f"brasil-downloads-{number}.{ext}"
    )
    # depois de enviar, apaga a pasta temporária para não encher o disco
    response.call_on_close(lambda: shutil.rmtree(tmp, ignore_errors=True))
    return response
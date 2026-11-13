from urllib.parse import urlparse

import yt_dlp
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # permite que o site (outro endereço) chame esta API

# Só aceitamos links destes domínios. Isso evita que usem
# nossa API para acessar qualquer endereço da internet.
ALLOWED = {
    "youtube.com": "youtube",
    "youtu.be": "youtube",
    "instagram.com": "instagram",
    "tiktok.com": "tiktok",
    "facebook.com": "facebook",
    "fb.watch": "facebook",
    "linkedin.com": "linkedin",
}


def detect_platform(url: str):
    """Descobre de qual rede é o link. Retorna None se não for suportada."""
    host = (urlparse(url).hostname or "").lower()
    for domain, name in ALLOWED.items():
        # aceita "instagram.com" e também "www.instagram.com"
        if host == domain or host.endswith("." + domain):
            return name
    return None


@app.get("/health")
def health():
    """Rota de teste: se responder, a API está no ar."""
    return jsonify(status="ok")


@app.route("/info", methods=["GET", "POST"])
def info():
    """Recebe um link e devolve os dados do vídeo, sem baixar."""
    body = request.get_json(silent=True) or {}
    # aceita o link pelo corpo (POST) ou pela URL (?url=...), útil para testar
    url = (body.get("url") or request.args.get("url") or "").strip()

    platform = detect_platform(url)
    if not platform:
        return jsonify(error="Link inválido ou rede não suportada."), 400

    options = {
        "quiet": True,          # não polui o terminal
        "skip_download": True,  # só lê as informações
        "noplaylist": True,     # ignora playlists inteiras
    }

    try:
        with yt_dlp.YoutubeDL(options) as ydl:
            data = ydl.extract_info(url, download=False)
    except yt_dlp.utils.DownloadError:
        return jsonify(error="Não consegui ler esse link. Ele é público?"), 422

    # Monta a lista de qualidades (ex.: 1080, 720, 480) sem repetir
    qualities = sorted(
        {
            f["height"]
            for f in data.get("formats", [])
            if f.get("height") and f.get("vcodec") != "none"
        },
        reverse=True,
    )

    return jsonify(
        platform=platform,
        title=data.get("title"),
        description=data.get("description"),  # legenda; None se não houver
        thumbnail=data.get("thumbnail"),      # capa do vídeo
        duration=data.get("duration"),        # em segundos
        qualities=qualities,
    )


if __name__ == "__main__":
    app.run(port=8000, debug=True)
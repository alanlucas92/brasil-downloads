import io
import re
import shutil
import tempfile
from pathlib import Path
from urllib.parse import urlparse

import yt_dlp
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS

from contact import contact_bp                  # formulário de contato
from gallery import gallery_bp, list_media      # fotos e carrossel
from platforms import detect_platform           # lista de redes aceitas

app = Flask(__name__)
CORS(app)  # permite que o site (outro endereço) chame esta API
app.config["MAX_CONTENT_LENGTH"] = 3 * 1024 * 1024  # recusa envios acima de 3 MB
app.register_blueprint(contact_bp)
app.register_blueprint(gallery_bp)


@app.get("/health")
def health():
    """Rota de teste: se responder, a API está no ar."""
    return jsonify(status="ok")


@app.route("/info", methods=["GET", "POST"])
def info():
    """Recebe um link e devolve os dados do post, sem baixar."""
    body = request.get_json(silent=True) or {}
    # aceita o link pelo corpo (POST) ou pela URL (?url=...), útil para testar
    url = (body.get("url") or request.args.get("url") or "").strip()

    platform = detect_platform(url)
    if not platform:
        return jsonify(error="Link inválido ou rede não suportada."), 400

    # Posts do Instagram com /p/ costumam ser foto ou carrossel:
    # nesses, pulamos o yt-dlp e vamos direto ao gallery-dl.
    gallery_first = platform == "instagram" and "/p/" in url

    data = None
    if not gallery_first:
        options = {
            "quiet": True,          # não polui o terminal
            "skip_download": True,  # só lê as informações
            "noplaylist": True,     # ignora playlists inteiras
        }
        try:
            with yt_dlp.YoutubeDL(options) as ydl:
                data = ydl.extract_info(url, download=False)
        except yt_dlp.utils.DownloadError:
            data = None  # o yt-dlp não leu: tentamos o gallery-dl abaixo

    # Sem vídeo? Tenta ler como foto/carrossel.
    if data is None or not data.get("formats"):
        gallery = list_media(url, platform)
        if gallery:
            return jsonify(
                platform=platform,
                kind="gallery",   # avisa o site que é foto/carrossel
                title=None,
                duration=None,
                qualities=[],
                **gallery["info"],
            )
        if data is None:
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
        kind="video",
        items=[],
        title=data.get("title"),
        description=data.get("description"),  # legenda; None se não houver
        thumbnail=data.get("thumbnail"),      # capa do vídeo
        duration=data.get("duration"),        # em segundos
        qualities=qualities,
        author=data.get("channel") or data.get("uploader"),  # quem postou
        likes=data.get("like_count"),         # curtidas (pode vir None)
        comments=data.get("comment_count"),   # nº de comentários (pode vir None)
        date=data.get("upload_date"),         # data no formato AAAAMMDD
    )


def safe_name(title: str) -> str:
    """Limpa o título para virar um nome de arquivo válido."""
    name = re.sub(r'[\\/*?:"<>|\n\r]', "", title).strip()
    return name[:80] or "arquivo"  # no máximo 80 letras


@app.get("/download")
def download():
    """Baixa o vídeo (mp4) ou só o áudio (mp3) e envia o arquivo."""
    url = (request.args.get("url") or "").strip()
    kind = request.args.get("format", "mp4")    # mp4 ou mp3
    quality = request.args.get("quality", "")   # ex.: 720

    if not detect_platform(url):
        return jsonify(error="Link inválido ou rede não suportada."), 400
    if kind not in ("mp4", "mp3"):
        return jsonify(error="Formato deve ser mp4 ou mp3."), 400

    # Pasta temporária só para este download (apagada no final)
    tmp = tempfile.mkdtemp(prefix="bd_")

    options = {
        "quiet": True,
        "noplaylist": True,
        "outtmpl": f"{tmp}/%(id)s.%(ext)s",  # onde salvar o arquivo
        "concurrent_fragment_downloads": 4,  # baixa 4 pedaços ao mesmo tempo
    }

    if kind == "mp3":
        # pega o melhor áudio e o ffmpeg converte para mp3
        options["format"] = "bestaudio/best"
        options["postprocessors"] = [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "192",  # kbps
        }]
    else:
        # se não informar qualidade, usa até 1080p
        h = int(quality) if quality.isdigit() else 1080
        # tenta mp4 pronto; se não tiver, pega o melhor disponível
        options["format"] = (
            f"bv*[height<={h}][ext=mp4]+ba[ext=m4a]/"
            f"b[height<={h}][ext=mp4]/"
            f"bv*[height<={h}]+ba/b[height<={h}]/b"
        )
        options["merge_output_format"] = "mp4"  # ffmpeg junta vídeo+áudio

    try:
        with yt_dlp.YoutubeDL(options) as ydl:
            data = ydl.extract_info(url, download=True)
    except yt_dlp.utils.DownloadError:
        shutil.rmtree(tmp, ignore_errors=True)
        return jsonify(error="Não consegui baixar esse link."), 422

    files = list(Path(tmp).iterdir())
    if not files:
        shutil.rmtree(tmp, ignore_errors=True)
        return jsonify(error="Arquivo não foi gerado."), 500

    filename = f"{safe_name(data.get('title') or 'video')}.{kind}"
    response = send_file(files[0], as_attachment=True, download_name=filename)

    # depois de enviar, apaga a pasta temporária para não encher o disco
    response.call_on_close(lambda: shutil.rmtree(tmp, ignore_errors=True))
    return response


@app.get("/thumbnail")
def thumbnail():
    """Baixa a capa do post e envia como arquivo de imagem."""
    url = (request.args.get("url") or "").strip()
    if not detect_platform(url):
        return jsonify(error="Link inválido ou rede não suportada."), 400

    options = {"quiet": True, "skip_download": True, "noplaylist": True}

    try:
        with yt_dlp.YoutubeDL(options) as ydl:
            data = ydl.extract_info(url, download=False)
            thumb_url = data.get("thumbnail")
            if not thumb_url:
                return jsonify(error="Esse post não tem capa."), 404
            # o próprio yt-dlp busca a imagem (ele sabe passar pelos bloqueios)
            image = ydl.urlopen(thumb_url).read()
    except Exception:
        return jsonify(error="Não consegui baixar a capa."), 422

    # descobre a extensão pelo endereço da imagem; se não achar, usa jpg
    ext = Path(urlparse(thumb_url).path).suffix.lstrip(".").lower()
    if ext not in ("jpg", "jpeg", "png", "webp"):
        ext = "jpg"
    mime = "image/jpeg" if ext in ("jpg", "jpeg") else f"image/{ext}"

    return send_file(
        io.BytesIO(image),  # envia direto da memória, sem salvar em disco
        mimetype=mime,
        as_attachment=True,
        download_name=f"capa.{ext}",
    )


if __name__ == "__main__":
    app.run(port=8000, debug=True)
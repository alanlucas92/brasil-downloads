import subprocess
from pathlib import Path


def video_codec(path: Path) -> str:
    """Descobre o codec da imagem do vídeo (ex.: 'h264', 'vp9', 'av1')."""
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=codec_name", "-of", "default=nw=1:nk=1", str(path)],
        capture_output=True, text=True, timeout=30,
    )
    return result.stdout.strip()


def ensure_h264(path: Path) -> Path:
    """Garante que o vídeo está em H.264, o formato que todo celular abre.
    Se já estiver, não mexe. Se não, converte e devolve o arquivo novo."""
    try:
        codec = video_codec(path)
    except subprocess.TimeoutExpired:
        return path
    if codec in ("h264", ""):  # "" = arquivo sem imagem (só áudio): nada a fazer
        return path

    out = path.with_name(path.stem + "-h264.mp4")
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(path),
             "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
             "-pix_fmt", "yuv420p",       # padrão de cor que todo player aceita
             "-c:a", "aac", "-b:a", "160k",
             "-movflags", "+faststart",   # começa a tocar antes de carregar tudo
             str(out)],
            capture_output=True, timeout=240,
        )
    except subprocess.TimeoutExpired:
        return path  # demorou demais: entrega o original mesmo

    if out.exists() and out.stat().st_size > 0:
        path.unlink(missing_ok=True)  # apaga o original, fica só o convertido
        return out
    return path
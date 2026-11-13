from urllib.parse import urlparse

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
    "lnkd.in": "linkedin",  # link curto do LinkedIn
}


def detect_platform(url: str):
    """Descobre de qual rede é o link. Retorna None se não for suportada."""
    host = (urlparse(url).hostname or "").lower()
    for domain, name in ALLOWED.items():
        # aceita "instagram.com" e também "www.instagram.com"
        if host == domain or host.endswith("." + domain):
            return name
    return None
import os
import re
import smtplib
from email.message import EmailMessage

from dotenv import load_dotenv
from flask import Blueprint, jsonify, request

load_dotenv()  # lê as configurações secretas do arquivo api/.env

# Blueprint = um "pedaço" da API guardado em arquivo separado
contact_bp = Blueprint("contact", __name__)

MAX_PNG = 2 * 1024 * 1024           # print de no máximo 2 MB
MAX_MSG = 2000                      # mensagem de no máximo 2000 letras
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"  # todo PNG de verdade começa assim
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
KINDS = ("Sugestão", "Reclamação", "Outro")


@contact_bp.app_errorhandler(413)
def too_large(_error):
    """Resposta quando o envio passa do tamanho permitido."""
    return jsonify(error="Arquivo muito grande. O limite é 2 MB."), 413


@contact_bp.post("/contact")
def contact():
    """Recebe o formulário de contato e envia por e-mail."""
    form = request.form

    # Campo-armadilha: pessoas não veem, robôs de spam preenchem
    if form.get("site"):
        return jsonify(ok=True)

    kind = form.get("tipo") if form.get("tipo") in KINDS else "Outro"
    message = (form.get("mensagem") or "").strip()
    email = (form.get("email") or "").strip()
    # no WhatsApp, mantém só números e símbolos de telefone
    whatsapp = re.sub(r"[^\d+() -]", "", form.get("whatsapp") or "")[:20]

    if not message:
        return jsonify(error="Escreva sua mensagem."), 400
    if len(message) > MAX_MSG:
        return jsonify(error=f"A mensagem pode ter até {MAX_MSG} caracteres."), 400
    if email and not EMAIL_RE.match(email):
        return jsonify(error="Confira o e-mail informado."), 400

    # Print opcional: só PNG e com limite de tamanho
    image = None
    file = request.files.get("print")
    if file and file.filename:
        image = file.read(MAX_PNG + 1)
        if len(image) > MAX_PNG:
            return jsonify(error="O print pode ter até 2 MB."), 413
        if not image.startswith(PNG_SIGNATURE):
            return jsonify(error="O print precisa ser um arquivo PNG."), 400

    to = os.getenv("CONTACT_TO")
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASS")
    if not (to and user and password):
        return jsonify(error="O formulário ainda não foi configurado."), 500

    mail = EmailMessage()
    mail["Subject"] = f"[Brasil Downloads] {kind}"
    mail["From"] = user
    mail["To"] = to
    if email:
        mail["Reply-To"] = email  # clicar em "Responder" já vai para a pessoa
    mail.set_content(
        f"Tipo: {kind}\n"
        f"E-mail: {email or 'não informado'}\n"
        f"WhatsApp: {whatsapp or 'não informado'}\n\n"
        f"{message}\n"
    )
    if image:
        mail.add_attachment(
            image, maintype="image", subtype="png", filename="print.png"
        )

    try:
        host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        with smtplib.SMTP_SSL(host, 465, timeout=20) as smtp:
            smtp.login(user, password)
            smtp.send_message(mail)
    except (smtplib.SMTPException, OSError):
        return jsonify(error="Não foi possível enviar agora. Tente mais tarde."), 502

    return jsonify(ok=True)
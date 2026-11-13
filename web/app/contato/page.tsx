"use client"; // formulário usa estado, então roda no navegador

import { useState } from "react";
import LegalPage from "../LegalPage";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const MAX_PNG = 2 * 1024 * 1024; // 2 MB, o mesmo limite da API

export default function Contato() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form); // junta todos os campos e o arquivo
    setError("");

    // Confere o print antes de enviar, para avisar na hora
    const file = data.get("print");
    if (file instanceof File && file.size > 0) {
      if (file.type !== "image/png") {
        setError("O print precisa ser um arquivo PNG.");
        return;
      }
      if (file.size > MAX_PNG) {
        setError("O print pode ter até 2 MB.");
        return;
      }
    }

    setSending(true);
    try {
      const res = await fetch(`${API}/contact`, { method: "POST", body: data });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Não foi possível enviar.");
      setSent(true);
      form.reset();
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Não foi possível conectar ao servidor. Tente de novo em instantes."
          : (err as Error).message
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <LegalPage title="Fale com a gente">
      {sent ? (
        <p className="enviado" role="status">
          Mensagem enviada. Obrigado por ajudar a melhorar o Brasil Downloads.
        </p>
      ) : (
        <form className="form-contato" onSubmit={handleSubmit}>
          <p>Envie uma sugestão de melhoria ou uma reclamação.</p>

          <label htmlFor="tipo">Assunto</label>
          <select id="tipo" name="tipo" defaultValue="Sugestão">
            <option>Sugestão</option>
            <option>Reclamação</option>
            <option>Outro</option>
          </select>

          <label htmlFor="mensagem">Mensagem</label>
          <textarea id="mensagem" name="mensagem" rows={6} maxLength={2000} required />

          <label htmlFor="email">E-mail (opcional)</label>
          <input id="email" name="email" type="email" autoComplete="email" />

          <label htmlFor="whatsapp">WhatsApp (opcional)</label>
          <input
            id="whatsapp"
            name="whatsapp"
            type="tel"
            placeholder="(43) 99999-9999"
            autoComplete="tel"
          />

          <label htmlFor="print">Print da tela (opcional, PNG de até 2 MB)</label>
          <input id="print" name="print" type="file" accept="image/png" />

          {/* Campo-armadilha contra robôs: fica invisível para pessoas */}
          <input
            name="site"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ display: "none" }}
          />

          {error && (
            <p className="erro" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn-buscar" disabled={sending}>
            {sending ? "Enviando…" : "Enviar mensagem"}
          </button>
        </form>
      )}
    </LegalPage>
  );
}
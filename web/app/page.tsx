"use client"; // esta página usa estado e cliques, então roda no navegador

import Link from "next/link";
import { useState } from "react";
import Galeria, { type Item } from "./Galeria";
import Secoes from "./Secoes";

// Endereço da API. No PC usa localhost; na Vercel vamos configurar a variável.
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Redes suportadas.
// LOGOS: ficam em web/public/logos/ com estes nomes:
// instagram.png, tiktok.png, facebook.png, linkedin.png, youtube.png
// (se usar .svg, troque a extensão em LOGO_EXT)
const LOGO_EXT = "png";
const NETWORKS = [
  { id: "instagram", name: "Instagram", match: ["instagram.com"] },
  { id: "tiktok", name: "TikTok", match: ["tiktok.com"] },
  { id: "facebook", name: "Facebook", match: ["facebook.com", "fb.watch"] },
  { id: "linkedin", name: "LinkedIn", match: ["linkedin.com", "lnkd.in"] },
  { id: "youtube", name: "YouTube", match: ["youtube.com", "youtu.be"] },
];

// Formato dos dados que a rota /info devolve
type Info = {
  platform: string;
  kind: "video" | "gallery"; // vídeo único, ou fotos/carrossel
  items: Item[];             // cards do carrossel (vazio quando é vídeo)
  title: string | null;
  description: string | null;
  thumbnail: string | null;
  duration: number | null;
  qualities: number[];
  author: string | null;
  likes: number | null;
  comments: number | null;
  date: string | null; // AAAAMMDD
};

// Transforma 95 segundos em "1:35"
function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Transforma "20261113" em "13/11/2026"
function formatDate(d: string) {
  return `${d.slice(6, 8)}/${d.slice(4, 6)}/${d.slice(0, 4)}`;
}

// Transforma 12500 em "12.500"
const formatNumber = (n: number) => new Intl.NumberFormat("pt-BR").format(n);

export default function Home() {
  const [url, setUrl] = useState(""); // o que está digitado no campo
  const [current, setCurrent] = useState(""); // link do resultado na tela
  const [info, setInfo] = useState<Info | null>(null);
  const [quality, setQuality] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false); // legenda aberta ou não
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<"mp4" | "mp3" | "capa" | null>(null);
  const [error, setError] = useState("");

  // Rede detectada pelo link digitado (acende o ícone dela)
  const detected = NETWORKS.find((n) => n.match.some((m) => url.includes(m)))?.id;

  // Traduz qualquer erro para uma mensagem que o usuário entende
  function showError(err: unknown) {
    if (err instanceof TypeError) {
      // TypeError no fetch = não conseguiu conectar na API
      setError("Não foi possível conectar ao servidor. Tente de novo em instantes.");
    } else if (err instanceof Error) {
      setError(err.message);
    } else {
      setError("Algo deu errado. Tente de novo.");
    }
  }

  // Busca os dados do link na rota /info da API
  async function search(link: string) {
    link = link.trim();
    if (!link) return;

    setLoading(true);
    setError("");
    setInfo(null);
    setExpanded(false);

    try {
      const res = await fetch(`${API}/info?url=${encodeURIComponent(link)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível ler esse link.");

      setInfo({ ...data, items: data.items ?? [] });
      setCurrent(link);
      setQuality(data.qualities[0] ?? null); // já deixa a melhor selecionada
    } catch (err) {
      showError(err);
    } finally {
      setLoading(false);
    }
  }

  // Colou um link (Ctrl+V ou botão)? Já preenche e busca sozinho.
  function pasteAndSearch(text: string) {
    text = text.trim();
    setUrl(text);
    if (text.startsWith("http")) search(text);
  }

  // Botão "Colar": pega o link da área de transferência
  async function handlePasteButton() {
    try {
      pasteAndSearch(await navigator.clipboard.readText());
    } catch {
      setError("O navegador bloqueou o acesso. Cole o link com Ctrl+V.");
    }
  }

  // Salva no computador do usuário um arquivo recebido da API
  function saveFile(blob: Blob, filename: string) {
    const link = document.createElement("a"); // link invisível
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // Botões de vídeo e MP3: chama /download
  async function handleDownload(format: "mp4" | "mp3") {
    if (!info) return;
    setDownloading(format);
    setError("");

    try {
      const params = new URLSearchParams({ url: current, format });
      if (format === "mp4" && quality) params.set("quality", String(quality));

      const res = await fetch(`${API}/download?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Não foi possível baixar esse arquivo.");
      }

      saveFile(await res.blob(), `${(info.title ?? "video").slice(0, 80)}.${format}`);
    } catch (err) {
      showError(err);
    } finally {
      setDownloading(null);
    }
  }

  // Botão "Baixar capa": chama /thumbnail
  async function handleCover() {
    if (!info) return;
    setDownloading("capa");
    setError("");

    try {
      const res = await fetch(`${API}/thumbnail?url=${encodeURIComponent(current)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Não foi possível baixar a capa.");
      }

      const blob = await res.blob();
      // "image/jpeg" vira "jpg"; "image/webp" vira "webp"
      const ext = (blob.type.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
      saveFile(blob, `capa.${ext}`);
    } catch (err) {
      showError(err);
    } finally {
      setDownloading(null);
    }
  }

  // É foto/carrossel? Então a tela mostra os cards em vez dos botões de vídeo
  const isGallery = (info?.items.length ?? 0) > 0;

  // No Instagram a legenda se chama "Copy"; nas outras redes, "Descrição"
  const descLabel = info?.platform === "instagram" ? "Copy" : "Descrição";
  // Só mostra "Ver tudo" se a legenda for longa
  const isLong =
    (info?.description?.length ?? 0) > 160 ||
    (info?.description?.split("\n").length ?? 0) > 4;

  return (
    <>
      <header className="hero">
        <div className="hero-inner">
          <p className="marca">
            <span className="marca-losango" aria-hidden="true" />
            Brasil Downloads
          </p>

          <h1>
            Cole o link.
            <br />
            Baixe o vídeo.
          </h1>
          <p className="sub">Grátis, sem anúncios e sem cadastro.</p>

          {/* Faixa das redes: a rede do link colado fica destacada */}
          <ul className="redes">
            {NETWORKS.map((n) => (
              <li key={n.id} className={detected === n.id ? "ativa" : ""}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/logos/${n.id}.${LOGO_EXT}`}
                  alt=""
                  // enquanto a logo não existir na pasta, só o nome aparece
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
                {n.name}
              </li>
            ))}
          </ul>

          <form
            className="busca"
            onSubmit={(e) => {
              e.preventDefault(); // impede a página de recarregar
              search(url);
            }}
          >
            <label htmlFor="link" className="so-leitor">
              Link do post
            </label>
            <input
              id="link"
              type="url"
              inputMode="url"
              placeholder="https://www.instagram.com/reel/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onPaste={(e) => {
                e.preventDefault();
                pasteAndSearch(e.clipboardData.getData("text"));
              }}
              required
            />
            <button type="button" className="btn-colar" onClick={handlePasteButton}>
              Colar
            </button>
            <button type="submit" className="btn-buscar" disabled={loading}>
              {loading ? "Buscando…" : "Buscar"}
            </button>

            {/* Aviso legal logo abaixo do campo */}
            <p className="aviso">
              Ao baixar, você concorda com os{" "}
              <Link href="/termos">Termos de uso</Link> e a{" "}
              <Link href="/privacidade">Política de privacidade</Link>.
            </p>
          </form>

          {error && (
            <p className="erro" role="alert">
              {error}
            </p>
          )}
        </div>
      </header>

      <main className="conteudo">
        {info ? (
          <section
            className={isGallery ? "cartao resultado modo-galeria" : "cartao resultado"}
            aria-live="polite"
          >
            {/* Capa grande: só para vídeo. No carrossel, cada card tem a sua. */}
            {!isGallery && info.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="capa"
                src={info.thumbnail}
                alt=""
                referrerPolicy="no-referrer"
                // se a rede bloquear a imagem, esconde em vez de mostrar quebrada
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            )}

            <div className="detalhes">
              <p className="origem">
                {NETWORKS.find((n) => n.id === info.platform)?.name ?? info.platform}
                {info.duration ? `, ${formatDuration(info.duration)}` : ""}
              </p>
              <h2>{info.author ? `@${info.author}` : info.title ?? "Post"}</h2>

              {/* Números do post: só aparecem os que a rede informar */}
              <ul className="numeros">
                {info.date && <li>Postado em {formatDate(info.date)}</li>}
                {info.likes != null && <li>{formatNumber(info.likes)} curtidas</li>}
                {info.comments != null && (
                  <li>{formatNumber(info.comments)} comentários</li>
                )}
              </ul>

              {info.description && (
                <div className="bloco-descricao">
                  <p className="rotulo">{descLabel}</p>
                  <p className={expanded ? "descricao aberta" : "descricao"}>
                    {info.description}
                  </p>
                  {isLong && (
                    <button
                      type="button"
                      className="ver-tudo"
                      aria-expanded={expanded}
                      onClick={() => setExpanded(!expanded)}
                    >
                      {expanded ? "Ver menos" : "Ver tudo"}
                    </button>
                  )}
                </div>
              )}

              {isGallery ? (
                /* Foto ou carrossel: um card para cada arquivo */
                <Galeria api={API} url={current} items={info.items} onError={setError} />
              ) : (
                /* Vídeo: qualidade, MP3 e capa */
                <>
                  {info.qualities.length > 0 && (
                    <div className="qualidades">
                      <p id="rotulo-qualidade">Qualidade do vídeo</p>
                      <div role="group" aria-labelledby="rotulo-qualidade">
                        {info.qualities.map((q) => (
                          <button
                            key={q}
                            type="button"
                            className="chip"
                            aria-pressed={quality === q}
                            onClick={() => setQuality(q)}
                          >
                            {q}p
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="acoes">
                    <button
                      type="button"
                      className="btn-video"
                      disabled={downloading !== null}
                      onClick={() => handleDownload("mp4")}
                    >
                      {downloading === "mp4" ? "Preparando o vídeo…" : "Baixar vídeo"}
                    </button>
                    <button
                      type="button"
                      className="btn-mp3"
                      disabled={downloading !== null}
                      onClick={() => handleDownload("mp3")}
                    >
                      {downloading === "mp3" ? "Preparando o áudio…" : "Baixar MP3"}
                    </button>
                    <button
                      type="button"
                      className="btn-capa"
                      disabled={downloading !== null}
                      onClick={handleCover}
                    >
                      {downloading === "capa" ? "Preparando a capa…" : "Baixar capa"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>
        ) : null}

        {/* Como baixar, por que usar, perguntas e rodapé */}
        <Secoes />
      </main>
    </>
  );
}
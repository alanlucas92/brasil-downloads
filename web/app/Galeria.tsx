"use client"; // usa estado e cliques, então roda no navegador

import { useState } from "react";

// Formato de cada card que a API devolve em "items"
export type Item = {
  index: number;
  type: "image" | "video";
  ext: string;
  preview: string | null;
};

export default function Galeria({
  api,
  url,
  items,
  onError,
}: {
  api: string;                     // endereço da API
  url: string;                     // link do post
  items: Item[];                   // cards do post
  onError: (msg: string) => void;  // avisa a página quando der erro
}) {
  // qual download está em andamento: o número do card, "todos" ou nenhum
  const [busy, setBusy] = useState<number | "todos" | null>(null);

  // Baixa um card pela rota /media da API
  async function download(item: Item) {
    const res = await fetch(
      `${api}/media?url=${encodeURIComponent(url)}&index=${item.index}`
    );
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error ?? "Não foi possível baixar esse arquivo.");
    }
    const blob = await res.blob();
    const link = document.createElement("a"); // link invisível
    link.href = URL.createObjectURL(blob);
    link.download = `brasil-downloads-${item.index + 1}.${item.ext}`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // Roda um download cuidando do estado e das mensagens de erro
  async function run(which: number | "todos", list: Item[]) {
    setBusy(which);
    onError("");
    try {
      for (const item of list) await download(item); // um de cada vez
    } catch (err) {
      onError(
        err instanceof TypeError
          ? "Não foi possível conectar ao servidor. Tente de novo em instantes."
          : (err as Error).message
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="galeria">
      <div className="galeria-topo">
        <p>
          {items.length} {items.length === 1 ? "arquivo" : "arquivos"} neste post
        </p>
        {items.length > 1 && (
          <button
            type="button"
            className="btn-todos"
            disabled={busy !== null}
            onClick={() => run("todos", items)}
          >
            {busy === "todos" ? "Baixando todos…" : `Baixar todos (${items.length})`}
          </button>
        )}
      </div>

      <ul className="galeria-grade">
        {items.map((item) => (
          <li key={item.index}>
            <div className="galeria-previa">
              {item.type === "video" ? "Vídeo" : "Foto"} {item.index + 1}
              {item.preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.preview}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  // se a rede bloquear a prévia, fica só o texto "Foto 1"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              )}
            </div>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => run(item.index, [item])}
            >
              {busy === item.index
                ? "Baixando…"
                : item.type === "video"
                  ? "Baixar vídeo"
                  : "Baixar foto"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
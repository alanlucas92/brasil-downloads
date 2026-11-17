"use client"; // usa eventos do navegador, então roda no navegador

import { useEffect, useState } from "react";

// Evento que o Chrome dispara quando o site pode ser instalado como app
type InstallEvent = Event & {
  prompt: () => Promise<void>;
};

export default function InstalarApp() {
  const [evento, setEvento] = useState<InstallEvent | null>(null);

  useEffect(() => {
    // O Chrome avisa que dá para instalar: guardamos o aviso para o nosso botão
    const guardar = (e: Event) => {
      e.preventDefault(); // não mostra o aviso padrão do Chrome
      setEvento(e as InstallEvent);
    };
    // Depois de instalado, o botão some
    const instalado = () => setEvento(null);

    window.addEventListener("beforeinstallprompt", guardar);
    window.addEventListener("appinstalled", instalado);
    return () => {
      window.removeEventListener("beforeinstallprompt", guardar);
      window.removeEventListener("appinstalled", instalado);
    };
  }, []);

  // Sem botão quando: já está instalado, ou o navegador não permite (ex.: iPhone)
  if (!evento) return null;

  return (
    <button
      type="button"
      className="btn-instalar"
      onClick={async () => {
        await evento.prompt(); // abre a janela "Instalar app?" do próprio Chrome
        setEvento(null);
      }}
    >
      Instalar o app
    </button>
  );
}
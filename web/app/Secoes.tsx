"use client"; // usa onError nas imagens, então roda no navegador

import Link from "next/link";

// LINKS: cole aqui quando o app e a extensão forem publicados.
// Enquanto estiver vazio (""), o link correspondente não aparece.
const APP_URL = "";
const EXTENSAO_URL = "";

// GUIAS "Como baixar".
// FOTOS: suba as imagens em web/public/passos/ com os nomes indicados em "foto".
// Tamanho recomendado: 800 x 600 (proporção 4:3), em PNG ou JPG.
const GUIAS = [
  {
    titulo: "No celular",
    link: { href: APP_URL, texto: "Baixar o aplicativo na Play Store" },
    passos: [
      {
        foto: "/passos/celular-1.png",
        titulo: "Encontre o post",
        texto: "Abra o aplicativo da rede social e vá até o vídeo ou a foto que você quer salvar.",
      },
      {
        foto: "/passos/celular-2.png",
        titulo: "Copie o link",
        texto: "Toque em Compartilhar e escolha Copiar link.",
      },
      {
        foto: "/passos/celular-3.png",
        titulo: "Cole e baixe",
        texto: "Abra o Brasil Downloads, cole o link e escolha vídeo, MP3 ou capa.",
      },
    ],
  },
  {
    titulo: "No computador",
    link: { href: "", texto: "" },
    passos: [
      {
        foto: "/passos/pc-1.png",
        titulo: "Abra o post",
        texto: "Entre na rede social pelo navegador e abra a publicação que você quer salvar.",
      },
      {
        foto: "/passos/pc-2.png",
        titulo: "Copie o endereço",
        texto: "Selecione o endereço na barra do navegador e copie com Ctrl+C.",
      },
      {
        foto: "/passos/pc-3.png",
        titulo: "Cole e baixe",
        texto: "Cole no campo no topo desta página. A busca começa sozinha e você escolhe o que baixar.",
      },
    ],
  },
  {
    titulo: "Como instalar a extensão no Chrome",
    link: { href: EXTENSAO_URL, texto: "Abrir a página da extensão" },
    passos: [
      {
        foto: "/passos/extensao-1.png",
        titulo: "Abra a página da extensão",
        texto: "Acesse a página do Brasil Downloads na Chrome Web Store.",
      },
      {
        foto: "/passos/extensao-2.png",
        titulo: "Adicione ao Chrome",
        texto: "Clique em Usar no Chrome e confirme em Adicionar extensão.",
      },
      {
        foto: "/passos/extensao-3.png",
        titulo: "Fixe e use",
        texto: "Clique no ícone de quebra-cabeça, fixe o Brasil Downloads e use o botão com o post aberto.",
      },
    ],
  },
];

// Motivos para usar: para mudar, edite o título e o texto
const MOTIVOS = [
  {
    titulo: "Sem anúncios",
    texto: "Nada de pop-up, redirecionamento ou botão falso de download.",
  },
  {
    titulo: "Sem cadastro",
    texto: "Você cola o link e baixa, sem informar e-mail nem senha.",
  },
  {
    titulo: "Vídeo, MP3 e capa",
    texto: "Salve o vídeo, só o áudio em MP3 ou apenas a imagem de capa.",
  },
  {
    titulo: "Você escolhe a qualidade",
    texto: "Veja as resoluções disponíveis e baixe a que preferir.",
  },
  {
    titulo: "No celular e no computador",
    texto: "Funciona direto no navegador, em qualquer tamanho de tela.",
  },
  {
    titulo: "Nada fica guardado",
    texto: "O arquivo é apagado do servidor logo depois do envio.",
  },
];

// Perguntas frequentes: para adicionar uma, copie um bloco e mude o texto
const FAQ = [
  {
    q: "O Brasil Downloads é gratuito?",
    a: "Sim. Você não paga nada e não precisa criar conta.",
  },
  {
    q: "Quais redes funcionam?",
    a: "No site: Instagram, TikTok, Facebook, LinkedIn e YouTube. No aplicativo e na extensão: Instagram, TikTok, Facebook e LinkedIn.",
  },
  {
    q: "Posso escolher a resolução do vídeo?",
    a: "Sim. Depois de colar o link, aparecem as qualidades que o vídeo original oferece.",
  },
  {
    q: "Em que formato os arquivos são baixados?",
    a: "Vídeo em MP4, áudio em MP3 e capa em imagem (JPG ou WebP).",
  },
  {
    q: "Consigo baixar de perfis privados?",
    a: "Não. Só funcionam links de posts públicos.",
  },
  {
    q: "Posso baixar qualquer vídeo?",
    a: "Baixe apenas conteúdo seu ou com autorização do autor. Os direitos do material continuam sendo de quem criou.",
  },
  {
    q: "Vocês guardam os vídeos que eu baixo?",
    a: "Não. O arquivo é preparado, enviado para você e apagado do servidor em seguida.",
  },
  {
    q: "Onde o arquivo fica salvo?",
    a: "Na pasta de downloads do seu navegador, no computador ou no celular.",
  },
];

export default function Secoes() {
  return (
    <>
      <section className="secao como">
        <h2>Como baixar</h2>

        {GUIAS.map((guia) => (
          <div className="guia" key={guia.titulo}>
            <h3>{guia.titulo}</h3>
            <ol className="guia-passos">
              {guia.passos.map((passo, i) => (
                <li key={passo.foto}>
                  {/* Espaço da foto: se o arquivo não existir, fica o quadro vazio */}
                  <div className="foto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={passo.foto}
                      alt=""
                      loading="lazy"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  </div>
                  <p className="passo-titulo">
                    <span>{i + 1}</span>
                    {passo.titulo}
                  </p>
                  <p>{passo.texto}</p>
                </li>
              ))}
            </ol>
            {guia.link.href && (
              <a className="guia-link" href={guia.link.href}>
                {guia.link.texto}
              </a>
            )}
          </div>
        ))}
      </section>

      <section className="secao">
        <h2>Por que usar o Brasil Downloads</h2>
        <ul className="motivos-grade">
          {MOTIVOS.map((m) => (
            <li key={m.titulo}>
              <strong>{m.titulo}</strong>
              {m.texto}
            </li>
          ))}
        </ul>
      </section>

      <section className="secao">
        <h2>Perguntas frequentes</h2>
        {FAQ.map((item) => (
          <details className="faq" key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </section>

      <footer className="rodape">
        <nav aria-label="Informações legais">
          <Link href="/termos">Termos de uso</Link>
          <Link href="/privacidade">Política de privacidade</Link>
          <Link href="/contato">Contato</Link>
        </nav>
        <p>
          O Brasil Downloads não tem vínculo com Instagram, TikTok, Facebook,
          LinkedIn ou YouTube.
        </p>
      </footer>
    </>
  );
}
import Link from "next/link";

// Moldura usada pelas páginas de Termos e Privacidade
export default function LegalPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="legal-topo">
        <Link href="/" className="marca">
          <span className="marca-losango" aria-hidden="true" />
          Brasil Downloads
        </Link>
      </header>
      <main className="legal">
        <article className="cartao">
          <h1>{title}</h1>
          {children}
          <p>
            <Link href="/">Voltar para a página inicial</Link>
          </p>
        </article>
      </main>
    </>
  );
}
import Link from "next/link";
import LegalPage from "../LegalPage";

export const metadata = { title: "Política de privacidade | Brasil Downloads" };

export default function Privacidade() {
  return (
    <LegalPage title="Política de privacidade">
      <p>Última atualização: 13 de novembro de 2026.</p>

      <h2>1. O que não coletamos</h2>
      <p>
        Você não cria conta, então não pedimos nome, e-mail ou senha para
        baixar. Não usamos anúncios nem cookies de publicidade.
      </p>

      <h2>2. O que é processado</h2>
      <p>
        O link que você cola é usado apenas para localizar o arquivo. O
        arquivo é preparado no servidor, enviado para você e apagado em
        seguida. Não guardamos histórico dos links.
      </p>

      <h2>3. Dados técnicos</h2>
      <p>
        Como em qualquer site, o servidor registra dados técnicos de acesso,
        como endereço IP, data e hora, para segurança e prevenção de abuso.
      </p>

      <h2>4. Estatísticas</h2>
      <p>
        Podemos registrar contagens anônimas de uso, como a rede social, o
        tipo de arquivo e a data do download. Essas contagens não identificam
        você.
      </p>

      <h2>5. Formulário de contato</h2>
      <p>
        Se você enviar uma mensagem pelo formulário, recebemos o texto, o
        print anexado e, se você informar, seu e-mail e WhatsApp. Usamos
        esses dados apenas para ler e responder a sua mensagem.
      </p>

      <h2>6. Compartilhamento</h2>
      <p>
        Não vendemos dados. As informações técnicas ficam com os provedores
        de hospedagem e de e-mail que mantêm o serviço no ar.
      </p>

      <h2>7. Seus direitos</h2>
      <p>
        Pela Lei Geral de Proteção de Dados (LGPD), você pode pedir
        informações ou a exclusão de dados ligados a você pelo{" "}
        <Link href="/contato">formulário de contato</Link>.
      </p>

      <h2>8. Mudanças nesta política</h2>
      <p>
        Esta política pode ser atualizada. A data no topo indica a versão em
        vigor.
      </p>
    </LegalPage>
  );
}
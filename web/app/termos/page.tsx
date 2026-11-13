import LegalPage from "../LegalPage";

export const metadata = { title: "Termos de uso | Brasil Downloads" };

import Link from "next/link";
const CONTATO = <Link href="/contato">nós pelo formulário de contato</Link>;

export default function Termos() {
  return (
    <LegalPage title="Termos de uso">
      <p>Última atualização: 13 de novembro de 2026.</p>

      <h2>1. O que é o serviço</h2>
      <p>
        O Brasil Downloads é uma ferramenta gratuita que ajuda você a salvar
        vídeos, áudios e imagens de posts públicos de redes sociais, a partir
        do link que você informa.
      </p>

      <h2>2. Uso permitido</h2>
      <p>
        Use o serviço apenas para baixar conteúdo que seja seu ou que você
        tenha autorização do autor para baixar. Você é responsável pelo uso
        que faz dos arquivos e por respeitar a lei de direitos autorais e os
        termos de cada rede social.
      </p>

      <h2>3. O que não é permitido</h2>
      <p>
        Não use o serviço para redistribuir ou vender conteúdo de terceiros
        sem autorização, para acessar conteúdo privado, nem para fazer
        downloads automatizados em massa.
      </p>

      <h2>4. Direitos sobre o conteúdo</h2>
      <p>
        Os direitos de cada vídeo, áudio ou imagem pertencem a quem o criou.
        O Brasil Downloads não hospeda esses conteúdos e não tem vínculo com
        Instagram, TikTok, Facebook, LinkedIn ou YouTube.
      </p>

      <h2>5. Disponibilidade</h2>
      <p>
        O serviço é oferecido como está. As redes sociais mudam com
        frequência, então alguns links podem não funcionar, e o serviço pode
        ficar fora do ar sem aviso.
      </p>

      <h2>6. Pedido de remoção</h2>
      <p>
        Se você é autor de um conteúdo e quer relatar um uso indevido,
        escreva para {CONTATO}.
      </p>

      <h2>7. Mudanças nestes termos</h2>
      <p>
        Estes termos podem ser atualizados. A data no topo indica a versão em
        vigor. Aplica-se a legislação brasileira.
      </p>
    </LegalPage>
  );
}
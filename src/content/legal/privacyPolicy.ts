// Transcrição integral e literal do documento oficial (v1.1).
// GERADO A PARTIR DO .DOCX — não editar manualmente: qualquer ajuste de
// texto deve nascer no documento oficial e ser retranscrito, com a
// `version` incrementada (a versão governa a reexibição do aceite).

import type { LegalDocument } from './index';

export const PRIVACY_POLICY: LegalDocument = {
  type: 'privacy_policy',
  title: "Política de Privacidade e Proteção de Dados Pessoais",
  version: '1.1',
  subtitle: "Versão 1.1 — Inclui disposições sobre uso de Inteligência Artificial — Em vigor a partir da data de aceite",
  footer: "Operador de Precisão — Política de Privacidade e Proteção de Dados v1.1 — Conforme Lei nº 13.709/2018 (LGPD)",
  sections: [
    {
      heading: "1. IDENTIFICAÇÃO DO CONTROLADOR",
      paragraphs: [
        "O aplicativo Operador de Precisão é desenvolvido e operado por Marcos Ernane, doravante denominado 'Controlador', responsável pelas decisões referentes ao tratamento de dados pessoais realizados por meio desta plataforma.",
        "Para exercer seus direitos ou entrar em contato sobre questões de privacidade, o usuário pode utilizar os canais disponibilizados dentro do próprio aplicativo ou pelo endereço de suporte indicado na loja de aplicativos.",
      ],
    },
    {
      heading: "2. ÂMBITO DE APLICAÇÃO",
      paragraphs: [
        "Esta Política de Privacidade se aplica a todos os usuários do aplicativo Operador de Precisão, disponível para dispositivos iOS, Android e web, independentemente do plano de acesso (gratuito ou pago). Ao criar uma conta, utilizar o aplicativo como visitante ou realizar qualquer interação com a plataforma, o usuário declara ter lido, compreendido e concordado com os termos desta política.",
      ],
    },
    {
      heading: "3. FUNDAMENTAÇÃO LEGAL — LEI GERAL DE PROTEÇÃO DE DADOS (LGPD)",
      paragraphs: [
        "O tratamento de dados pessoais realizado pelo Operador de Precisão está fundamentado nas seguintes bases legais previstas na Lei nº 13.709/2018 (LGPD):",
      ],
      bullets: [
        "Execução de contrato: dados necessários para criação de conta, autenticação e prestação dos serviços contratados pelo usuário.",
        "Legítimo interesse: dados comportamentais e de uso coletados para melhoria contínua da plataforma, desde que não violem os direitos e liberdades fundamentais do usuário.",
        "Consentimento: dados tratados com finalidades adicionais, como envio de comunicações por e-mail, quando aplicável. O consentimento pode ser revogado a qualquer momento.",
        "Cumprimento de obrigação legal: quando exigido por lei ou autoridade competente.",
      ],
    },
    {
      heading: "4. DADOS COLETADOS E FINALIDADES",
      paragraphs: [
      ],
    },
    {
      heading: "4.1 Dados de Cadastro e Autenticação",
      paragraphs: [
        "Coletados quando o usuário cria uma conta autenticada:",
      ],
      bullets: [
        "Endereço de e-mail: utilizado para autenticação, recuperação de senha e comunicações transacionais essenciais.",
        "Senha: armazenada de forma criptografada via Supabase Auth. O Controlador não tem acesso à senha em texto plano.",
        "Data e hora de criação da conta e de sessões ativas.",
      ],
      closingParagraphs: [
        "Usuários que utilizam o aplicativo sem criar conta (modo visitante) não transmitem dados de cadastro ao servidor. Todos os dados ficam armazenados localmente no dispositivo.",
      ],
    },
    {
      heading: "4.2 Dados Operacionais Inseridos pelo Usuário",
      paragraphs: [
        "São os dados que o próprio usuário insere nas funcionalidades do método COPA. Podem incluir informações sobre o negócio do usuário, situações operacionais, decisões, aprendizados e reflexões profissionais:",
      ],
      bullets: [
        "Registros de Captura: fatos observados, interpretações, hipóteses e cadeias de causa raiz.",
        "Registros de Organização: recursos disponíveis, ruídos, gargalos, inventários de cenário e filtros de ideias.",
        "Registros de Prova: intervenções mínimas viáveis, métricas, prazos, regras de corte, verificações éticas e análises de custo/benefício.",
        "Registros de Aferição: resultados de intervenções, princípios extraídos e próximos gargalos identificados.",
        "Princípios operacionais acumulados, decisões registradas e histórico de projetos.",
      ],
      closingParagraphs: [
        "Esses dados são tratados exclusivamente para prestar o serviço contratado e não são utilizados para fins publicitários, segmentação de perfil ou compartilhados com terceiros para fins comerciais.",
      ],
    },
    {
      heading: "4.3 Dados Comportamentais e de Uso",
      paragraphs: [
        "Coletados automaticamente durante o uso do aplicativo para fins de melhoria da plataforma:",
      ],
      bullets: [
        "Rotas acessadas dentro do aplicativo.",
        "Registros iniciados e abandonados (sem o conteúdo, apenas o evento).",
        "Tempo entre registros e hora local aproximada do uso.",
      ],
      closingParagraphs: [
        "Esses dados são pseudonimizados antes do armazenamento e não permitem a identificação direta do usuário sem informações adicionais.",
      ],
    },
    {
      heading: "4.4 Dados de Plano e Assinatura",
      paragraphs: [
      ],
      bullets: [
        "Status do plano (gratuito, trial, pago anual ou vitalício).",
        "Datas de início e término da assinatura, quando aplicável.",
        "Histórico de planos para fins de suporte e resolução de disputas.",
      ],
    },
    {
      heading: "5. USO DE INTELIGÊNCIA ARTIFICIAL",
      paragraphs: [
      ],
    },
    {
      heading: "5.1 Funcionalidades com IA",
      paragraphs: [
        "O Operador de Precisão utiliza modelos de linguagem da Anthropic (Claude) em funcionalidades específicas, todas de uso opcional e acionadas exclusivamente por ação explícita do usuário:",
      ],
      bullets: [
        "Central de Ajuda: responde perguntas sobre o aplicativo e o método COPA.",
        "Sugestões contextuais: orienta o usuário em momentos específicos do fluxo de registro.",
        "Clareza Operacional: organiza o raciocínio do ciclo atual em movimentos estruturados.",
        "Relatório Consultivo de Projeto: analisa o histórico do projeto e gera relatório com diagnóstico, críticas construtivas e sugestões.",
      ],
    },
    {
      heading: "5.2 Dados enviados à IA e limitações",
      paragraphs: [
        "Quando o usuário ativa uma funcionalidade com IA, parte do conteúdo do projeto é transmitida aos servidores da Anthropic. Esse conteúdo é composto exclusivamente por dados operacionais inseridos pelo próprio usuário, parcialmente resumidos e com datas anonimizadas. Não são enviados credenciais, dados de pagamento ou identificadores diretos como e-mail ou CPF.",
        "O usuário deve estar ciente de que o texto livre inserido nos registros pode conter nomes de pessoas ou empresas. Recomenda-se evitar inserir dados pessoais identificáveis de terceiros (clientes, colaboradores, fornecedores) nos campos de texto do aplicativo.",
      ],
    },
    {
      heading: "5.3 Retenção pela Anthropic e caráter orientativo",
      paragraphs: [
        "Nos termos da política de API da Anthropic vigente, os dados enviados não são utilizados para treinar modelos de IA e podem ser retidos temporariamente por até 30 dias para fins de segurança. O usuário pode consultar as condições atualizadas em anthropic.com.",
        "Todo conteúdo gerado pelas funcionalidades de IA tem caráter exclusivamente orientativo. Não substitui consultoria profissional de qualquer natureza. O usuário é responsável por avaliar criticamente o conteúdo gerado antes de utilizá-lo em decisões.",
      ],
    },
    {
      heading: "6. ARMAZENAMENTO E SEGURANÇA DOS DADOS",
      paragraphs: [
      ],
    },
    {
      heading: "6.1 Infraestrutura",
      paragraphs: [
        "Os dados dos usuários autenticados são armazenados na plataforma Supabase, com servidores localizados nos Estados Unidos, com certificação SOC 2 Type II e criptografia em trânsito (TLS) e em repouso.",
      ],
    },
    {
      heading: "6.2 Transferência Internacional",
      paragraphs: [
        "Ao utilizar o Operador de Precisão, o usuário consente com a transferência de seus dados para servidores da Supabase (EUA) e da Anthropic (EUA), ambos com cláusulas contratuais adequadas para proteção dos dados transferidos.",
      ],
    },
    {
      heading: "6.3 Dados Locais — Modo Visitante",
      paragraphs: [
        "Usuários sem autenticação têm todos os dados armazenados exclusivamente no dispositivo. Esses dados não estão sujeitos a backup automático. A perda ou formatação do dispositivo implica perda permanente dos dados, sendo responsabilidade do usuário.",
      ],
    },
    {
      heading: "6.4 Senhas",
      paragraphs: [
        "Senhas são armazenadas em formato hash irreversível. O Controlador não tem acesso à senha original do usuário em nenhuma circunstância.",
      ],
    },
    {
      heading: "7. PRAZO DE RETENÇÃO DOS DADOS",
      paragraphs: [
        "Os dados pessoais são mantidos pelo prazo necessário para a prestação do serviço e por até 5 (cinco) anos após o encerramento da conta, para fins de cumprimento de obrigações legais e resolução de disputas. Dados comportamentais anonimizados podem ser mantidos por prazo indeterminado para análise agregada de uso da plataforma. Após o prazo de retenção, os dados são excluídos de forma irreversível ou anonimizados definitivamente.",
      ],
    },
    {
      heading: "8. DIREITOS DO USUÁRIO — LGPD ART. 18",
      paragraphs: [
        "O usuário titular dos dados tem direito a:",
      ],
      bullets: [
        "Confirmação da existência de tratamento de dados pessoais.",
        "Acesso aos seus dados pessoais tratados pelo aplicativo.",
        "Correção de dados incompletos, inexatos ou desatualizados.",
        "Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a LGPD.",
        "Portabilidade: receber os dados em formato estruturado para uso em outro serviço.",
        "Eliminação dos dados tratados com base no consentimento, exceto nas hipóteses de guarda legal obrigatória.",
        "Informação sobre compartilhamento de dados com terceiros.",
        "Revogação do consentimento a qualquer momento, sem prejuízo da licitude do tratamento anterior.",
        "Oposição ao tratamento realizado com fundamento em legítimo interesse.",
      ],
      closingParagraphs: [
        "Solicitações serão respondidas em até 15 (quinze) dias úteis pelo canal de suporte do aplicativo.",
      ],
    },
    {
      heading: "9. COMPARTILHAMENTO COM TERCEIROS",
      paragraphs: [
        "O Operador de Precisão compartilha dados com terceiros exclusivamente nas seguintes hipóteses:",
      ],
      bullets: [
        "Supabase: operadora de infraestrutura de banco de dados e autenticação.",
        "Anthropic: operadora de processamento de IA, nas condições descritas na Seção 5.",
        "Stripe: operadora de processamento de pagamentos, para usuários do plano pago. O Stripe recebe dados de pagamento diretamente do usuário e está sujeito à sua própria política de privacidade.",
        "Hostinger: operadora de envio de e-mail para comunicações transacionais.",
        "Autoridades públicas: quando exigido por lei, ordem judicial ou regulação aplicável.",
      ],
      closingParagraphs: [
        "O Operador de Precisão não vende, aluga ou compartilha dados pessoais dos usuários com terceiros para fins publicitários ou comerciais.",
      ],
    },
    {
      heading: "10. COOKIES E ARMAZENAMENTO LOCAL",
      paragraphs: [
        "O Operador de Precisão não utiliza cookies de rastreamento publicitário. Os únicos mecanismos de armazenamento local são tokens de sessão para autenticação, preferências de interface do usuário e, para visitantes não autenticados, os dados operacionais inseridos pelo próprio usuário.",
      ],
    },
    {
      heading: "11. MENORES DE IDADE",
      paragraphs: [
        "O Operador de Precisão é destinado exclusivamente a usuários maiores de 18 (dezoito) anos. Caso o Controlador identifique que dados de um menor foram coletados sem o consentimento dos responsáveis legais, tais dados serão excluídos imediatamente.",
      ],
    },
    {
      heading: "12. ALTERAÇÕES NESTA POLÍTICA",
      paragraphs: [
        "Esta Política pode ser atualizada periodicamente. O usuário será notificado por aviso destacado dentro do aplicativo antes de qualquer alteração substancial entrar em vigor, com prazo mínimo de 15 (quinze) dias. A continuidade do uso após a entrada em vigor das alterações implica aceitação da nova versão.",
      ],
    },
    {
      heading: "13. ENCARREGADO PELO TRATAMENTO DE DADOS (DPO)",
      paragraphs: [
        "O canal de comunicação com a Autoridade Nacional de Proteção de Dados (ANPD) e com os titulares de dados é o endereço de suporte disponível nas configurações do aplicativo e na página de suporte da loja de aplicativos.",
      ],
    },
    {
      heading: "14. LEGISLAÇÃO E FORO",
      paragraphs: [
        "Esta Política é regida pela Lei nº 13.709/2018 (LGPD) e pela legislação brasileira aplicável. Eventuais disputas serão submetidas ao foro da comarca do domicílio do usuário, em conformidade com o art. 22 do Código de Defesa do Consumidor.",
      ],
    },
  ],
};

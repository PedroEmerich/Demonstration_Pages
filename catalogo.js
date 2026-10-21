/* ==========================================================================
   CONFIGURAÇÃO DA VITRINE
   Edite aqui o nome do estúdio, contatos e a lista de modelos.
   ========================================================================== */

window.ESTUDIO = {
  nome: "Seu Estúdio",
  slogan: "Landing pages que vendem",
  whatsapp: "5511999999999", // só números, com DDI + DDD
  email: "contato@seuestudio.com.br",
  instagram: "seuestudio",
};

/* --------------------------------------------------------------------------
   CATÁLOGO DE MODELOS
   Para adicionar um modelo:
     1. Crie uma pasta em  modelos/<nome-do-modelo>/
     2. Coloque o arquivo da landing como  index.html  dentro dela
     3. Adicione um bloco abaixo com o mesmo "pasta"

   Campos:
     pasta      -> nome da pasta dentro de /modelos (obrigatório)
     titulo     -> nome exibido no card
     segmento   -> categoria usada nos filtros (ex: "Arquitetura", "Saúde")
     descricao  -> uma ou duas frases sobre o modelo
     tags       -> destaques curtos (opcional)
     cor        -> cor de destaque do card (opcional)
     novo       -> true para exibir o selo "Novo" (opcional)
   -------------------------------------------------------------------------- */

window.MODELOS = [
  {
    pasta: "aura-arquitetura",
    titulo: "AURA — Arquitetura & Interiores",
    segmento: "Arquitetura",
    descricao: "Visual editorial e sofisticado para escritórios de arquitetura e design de interiores de alto padrão.",
    tags: ["Portfólio", "Galeria de projetos", "Alto padrão"],
    cor: "#c8a97e",
  },
  {
    pasta: "odontoral-prime",
    titulo: "Odontoral Prime — Clínica Odontológica",
    segmento: "Saúde",
    descricao: "Clínica de implantes e estética dental com antes e depois, simulador de tons e tratamentos em destaque.",
    tags: ["Antes e depois", "Interativo", "Agendamento"],
    cor: "#4a8fd9",
  },
  {
    pasta: "sbc-dev",
    titulo: "SBC Dev — Software Sob Medida",
    segmento: "Tecnologia",
    descricao: "Página moderna para empresa de desenvolvimento: serviços, stack, portfólio e contato.",
    tags: ["Tech", "Serviços B2B", "Dark mode"],
    cor: "#6c8cff",
  },
  {
    pasta: "seguranca-digital",
    titulo: "Segurança Digital",
    segmento: "Educação",
    descricao: "Página de campanha educativa com passo a passo, teste de força de senha e checklist interativo.",
    tags: ["Campanha", "Interativo", "Conteúdo"],
    cor: "#5cc8ec",
  },
  {
    pasta: "brasa-parrilla",
    titulo: "Brasa — Parrilla & Fogo de Chão",
    segmento: "Gastronomia",
    descricao: "Restaurante com brasas animadas, cortes em rolagem horizontal, seletor do ponto da carne, cardápio e reserva de mesa.",
    tags: ["Reservas", "Cardápio", "Interativo"],
    cor: "#ff6a1a",
    novo: true,
  },
  {
    pasta: "vasconcelos-advocacia",
    titulo: "Vasconcelos & Prado — Advocacia",
    segmento: "Advocacia",
    descricao: "Escritório de advocacia editorial e sóbrio, com áreas de atuação, sócios e avaliação do caso em 3 perguntas.",
    tags: ["Diagnóstico", "Credibilidade", "Captação"],
    cor: "#b08d57",
    novo: true,
  },
  {
    pasta: "pulso-academia",
    titulo: "PULSO — Performance Training",
    segmento: "Fitness",
    descricao: "Academia com visual intenso, modalidades em painéis, grade de horários, calculadora de IMC e planos.",
    tags: ["Calculadora", "Planos", "Aula grátis"],
    cor: "#ff3d2e",
    novo: true,
  },
  {
    pasta: "horizonte-imoveis",
    titulo: "Horizonte Imóveis",
    segmento: "Imobiliária",
    descricao: "Imobiliária de alto padrão com busca que filtra imóveis, favoritos, galeria e simulador de financiamento.",
    tags: ["Busca", "Simulador", "Favoritos"],
    cor: "#2d6b5d",
    novo: true,
  },
  {
    pasta: "lumiere-estetica",
    titulo: "Lumière — Estética Avançada",
    segmento: "Estética",
    descricao: "Clínica de estética delicada, com tratamentos por categoria, ritual contado no scroll e quiz de protocolo.",
    tags: ["Quiz", "Pacotes", "Agendamento"],
    cor: "#c48b7c",
    novo: true,
  },
  {
    pasta: "patavet-veterinaria",
    titulo: "Patavet — Clínica Veterinária",
    segmento: "Veterinária",
    descricao: "Clínica veterinária acolhedora com plantão 24h, calculadora de idade do pet, calendário de vacinas e planos.",
    tags: ["24 horas", "Calculadora", "Planos pet"],
    cor: "#14837a",
    novo: true,
  },
];

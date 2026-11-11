/* ==========================================================================
   CONFIGURAÇÃO DA VITRINE
   Edite aqui o nome do estúdio, contatos e a lista de modelos.
   ========================================================================== */

window.ESTUDIO = {
  nome: "ConvertPage",
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

   Página publicada em outro endereço? Use "url" em vez de criar a pasta:
     o catálogo abre a página desse endereço e as capas ficam em
     modelos/<pasta>/ (gere com  node gerar-capas.mjs <pasta>).

   Campos:
     pasta      -> nome da pasta dentro de /modelos (obrigatório; para páginas
                   externas é só um identificador, sem espaços/acentos)
     url        -> endereço da página publicada fora deste projeto (opcional)
     titulo     -> nome exibido no card
     segmento   -> categoria usada nos filtros (ex: "Arquitetura", "Saúde")
     descricao  -> uma ou duas frases sobre o modelo
     tags       -> destaques curtos (opcional)
     cor        -> cor de destaque do card (opcional)
     revisado   -> true quando você já fez suas alterações (bolinha verde);
                   sem o campo, aparece a bolinha vermelha (falta mexer)
   -------------------------------------------------------------------------- */

window.MODELOS = [
  {
    pasta: "aura-arquitetura",
    titulo: "AURA — Arquitetura & Interiores",
    revisado: true,
    segmento: "Arquitetura",
    descricao: "Visual editorial e sofisticado para escritórios de arquitetura e design de interiores de alto padrão.",
    tags: ["Portfólio", "Galeria de projetos", "Alto padrão"],
    cor: "#c8a97e",
  },
  {
    pasta: "odontoral-prime",
    titulo: "Odontoral Prime — Clínica Odontológica",
    revisado: true,
    segmento: "Saúde",
    descricao: "Clínica de implantes e estética dental com antes e depois, simulador de tons e tratamentos em destaque.",
    tags: ["Antes e depois", "Interativo", "Agendamento"],
    cor: "#4a8fd9",
  },
  {
    pasta: "sbc-dev",
    titulo: "SBC Dev — Software Sob Medida",
    revisado: true,
    segmento: "Tecnologia",
    descricao: "Página moderna para empresa de desenvolvimento: serviços, stack, portfólio e contato.",
    tags: ["Tech", "Serviços B2B", "Dark mode"],
    cor: "#6c8cff",
  },
  {
    pasta: "seguranca-digital",
    titulo: "Segurança Digital",
    revisado: true,
    segmento: "Informativo",
    descricao: "Página de campanha educativa com passo a passo, teste de força de senha e checklist interativo.",
    tags: ["Campanha", "Interativo", "Conteúdo"],
    cor: "#5cc8ec",
  },
  {
    pasta: "brasa-parrilla",
    titulo: "Brasa — Parrilla & Fogo de Chão",
    revisado: true,
    segmento: "Gastronomia",
    descricao: "Restaurante com brasas animadas, cortes em rolagem horizontal, seletor do ponto da carne, cardápio e reserva de mesa.",
    tags: ["Reservas", "Cardápio", "Interativo"],
    cor: "#ff6a1a",
  },
  {
    pasta: "vasconcelos-advocacia",
    titulo: "Vasconcelos & Prado — Advocacia",
    revisado: true,
    segmento: "Advocacia",
    descricao: "Escritório de alto padrão com balança da justiça em 3D que reage ao cursor, áreas com foto em destaque, casos conduzidos, sócios e avaliação do caso em 3 perguntas.",
    tags: ["3D", "Diagnóstico", "Alto padrão"],
    cor: "#b08d57",
  },
  {
    pasta: "pulso-academia",
    titulo: "PULSO — Performance Training",
    revisado: true,
    segmento: "Fitness",
    descricao: "Academia com visual intenso, modalidades em painéis, grade de horários, calculadora de IMC e planos.",
    tags: ["Calculadora", "Planos", "Aula grátis"],
    cor: "#ff3d2e",
  },
  {
    pasta: "horizonte-imoveis",
    titulo: "Horizonte Imóveis",
    segmento: "Imobiliária",
    descricao: "Imobiliária de alto padrão com busca que filtra imóveis, favoritos, galeria e simulador de financiamento.",
    tags: ["Busca", "Simulador", "Favoritos"],
    cor: "#2d6b5d",
  },
  {
    pasta: "lumiere-estetica",
    titulo: "Lumière — Estética Avançada",
    segmento: "Estética",
    descricao: "Clínica de estética delicada, com tratamentos por categoria, ritual contado no scroll e quiz de protocolo.",
    tags: ["Quiz", "Pacotes", "Agendamento"],
    cor: "#c48b7c",
  },
  {
    pasta: "patavet-veterinaria",
    titulo: "Patavet — Clínica Veterinária",
    segmento: "Veterinária",
    descricao: "Clínica veterinária acolhedora com plantão 24h, calculadora de idade do pet, calendário de vacinas e planos.",
    tags: ["24 horas", "Calculadora", "Planos pet"],
    cor: "#14837a",
  },
  {
    pasta: "forte-materiais",
    titulo: "Forte — Materiais de Construção",
    segmento: "Construção",
    descricao: "Depósito de materiais com calculadora de blocos, cimento e tinta, orçamento com total ao vivo, ofertas e consulta de entrega por CEP.",
    tags: ["Calculadora", "Orçamento", "Entrega"],
    cor: "#ffcc00",
  },
  {
    pasta: "rua77-streetwear",
    titulo: "RUA 77 — Streetwear",
    segmento: "Moda",
    descricao: "Loja de roupas de rua com contagem para o próximo drop, sacola lateral, escolha de tamanho, lookbook arrastável e guia de medidas.",
    tags: ["Loja", "Drop", "Sacola"],
    cor: "#5b72ff",
  },
  {
    pasta: "quintal-da-vo",
    titulo: "Quintal da Vó — Comida Caseira",
    segmento: "Gastronomia",
    descricao: "Restaurante independente com prato do dia automático, montador de marmita com bandeja ilustrada, delivery e status de aberto/fechado.",
    tags: ["Delivery", "Marmita", "Prato do dia"],
    cor: "#d9452b",
  },
  {
    pasta: "navalha-barbearia",
    titulo: "Navalha & Co. — Barbearia",
    segmento: "Barbearia",
    descricao: "Barbearia clássica com poste animado, tabela de serviços, agendamento completo com horários ocupados e clube de assinatura.",
    tags: ["Agendamento", "Assinatura", "Vintage"],
    cor: "#c9a45c",
  },
  {
    pasta: "torque-autocenter",
    titulo: "Torque — Auto Center",
    segmento: "Automotivo",
    descricao: "Oficina mecânica com conta-giros animado, revisão por quilometragem, acompanhamento do carro pela placa e agendamento com leva e traz.",
    tags: ["Revisão por km", "Rastreio", "Agendamento"],
    cor: "#00c2ff",
  },
  {
    pasta: "flora-viva",
    titulo: "Flora Viva — Orquidário e Floricultura",
    segmento: "Floricultura",
    descricao: "Orquidário e floricultura com pétalas caindo, montador de buquê com desenho ao vivo, guia de cuidados de orquídeas e entrega no dia.",
    tags: ["Monte seu buquê", "Loja", "Guia"],
    cor: "#8e4b8f",
  },
  {
    pasta: "atelier-traco",
    titulo: "Atelier Traço — Arquitetura e Interiores",
    revisado: true,
    segmento: "Arquitetura",
    descricao: "Escritório de arquitetura em que a rolagem monta a casa da foto: da estrutura crua aos acabamentos e móveis reais. Portfólio filtrável, processo e calculadora de honorários.",
    tags: ["Portfólio", "Calculadora", "Blueprint"],
    cor: "#c24b2c",
  },
  {
    pasta: "vitalis-clinica",
    titulo: "Vitalis — Clínica Médica",
    revisado: true,
    segmento: "Saúde",
    descricao: "Clínica com escultura 3D de partículas: corpo humano no topo e formas coloridas para cada especialidade, corpo clínico interativo, verificador de convênio, check-ups e telemedicina.",
    tags: ["3D interativo", "Especialidades", "Telemedicina"],
    cor: "#0e8f7e",
  },
  {
    pasta: "fluxo-saas",
    titulo: "Fluxo — Software Financeiro",
    segmento: "Financeiro",
    descricao: "SaaS com dashboard ao vivo que se inclina no scroll, abas de recursos automáticas, calculadora de ROI e preços mensal/anual.",
    tags: ["SaaS", "Dashboard", "ROI"],
    cor: "#6b4dff",
  },
  {
    pasta: "lingo-idiomas",
    titulo: "Lingo — Escola de Idiomas",
    revisado: true,
    segmento: "Educação",
    descricao: "Escola de idiomas com efeito de digitação, teste de nivelamento que indica o nível CEFR, cursos por idioma e matrícula pelo WhatsApp.",
    tags: ["Teste de nível", "Cursos", "Matrícula"],
    cor: "#ff6b3d",
  },
  {
    pasta: "martins-previdenciario",
    titulo: "Martins — Direito Previdenciário",
    segmento: "Advocacia",
    descricao: "Advocacia previdenciária com simulador de aposentadoria pelas regras de idade e pontos, valor estimado do benefício e áreas de atuação.",
    tags: ["Simulador", "INSS", "Consulta"],
    cor: "#1f4e79",
  },
  {
    pasta: "respira-pilates",
    titulo: "Respira — Studio de Pilates",
    segmento: "Fitness",
    descricao: "Studio de pilates com respiração guiada 4-7-8 animada, grade semanal filtrável, reserva de aula e planos.",
    tags: ["Respiração guiada", "Grade de aulas", "Planos"],
    cor: "#7f9c86",
  },
  {
    pasta: "aurora-lancamento",
    titulo: "Aurora — Lançamento Imobiliário",
    revisado: true,
    segmento: "Imobiliária",
    descricao: "Lançamento de studios e 1 dormitório com prédio 3D interativo: acenda os andares, abra a maquete de cada pavimento, veja as fotos dos ambientes e caminhe pelo decorado.",
    tags: ["Prédio 3D", "Tour virtual", "Plantas"],
    cor: "#e8916b",
  },
  {
    pasta: "studio-mecha",
    titulo: "Studio Mecha — Salão de Cabelo",
    segmento: "Estética",
    descricao: "Salão especializado em cor com simulador de mechas, balayage e ombré, tabela por comprimento, equipe e agendamento.",
    tags: ["Simulador de cor", "Agendamento", "Equipe"],
    cor: "#ff2e88",
  },
  {
    pasta: "bicho-feliz",
    titulo: "Bicho Feliz — Hotel e Creche Pet",
    revisado: true,
    segmento: "Veterinária",
    descricao: "Hotel e creche pet com casinha que se abre no scroll, pet cam ao vivo, dia do pet com céu que muda ao rolar e consulta de vaga direto no WhatsApp.",
    tags: ["Consulta de vaga", "Pet cam", "Interativo"],
    cor: "#e26a2c",
  },
  {
    pasta: "prumo-reformas",
    titulo: "Prumo — Reformas",
    segmento: "Construção",
    descricao: "Empresa de reformas com antes e depois arrastável, orçamento por cômodo com prazo estimado, portfólio e acompanhamento da obra.",
    tags: ["Antes e depois", "Orçamento", "Obra"],
    cor: "#ff5a1f",
  },
  {
    pasta: "maison-odete",
    titulo: "Maison Odete — Moda Feminina",
    segmento: "Moda",
    descricao: "Boutique editorial com coleção filtrável e favoritos, monte seu look com desconto no conjunto e agendamento com personal stylist.",
    tags: ["Monte seu look", "Coleção", "Stylist"],
    cor: "#7a2e2e",
  },
  {
    pasta: "fade-club",
    titulo: "Fade Club — Barbearia",
    segmento: "Barbearia",
    descricao: "Barbearia urbana com fila ao vivo, consultoria de corte por formato de rosto, agenda por barbeiro e clube de assinatura.",
    tags: ["Fila ao vivo", "Formato do rosto", "Assinatura"],
    cor: "#e6ff3d",
  },
  {
    pasta: "brilho-detail",
    titulo: "Brilho Detail — Estética Automotiva",
    segmento: "Automotivo",
    descricao: "Estética automotiva com hero para lavar raspando a sujeira, montador de pacote por porte do carro e comparativo de vitrificação.",
    tags: ["Monte seu pacote", "Vitrificação", "Interativo"],
    cor: "#3ad1ff",
  },
  {
    pasta: "folha-clube",
    titulo: "Folha Clube — Assinatura de Plantas",
    segmento: "Floricultura",
    descricao: "Clube de assinatura de plantas com quiz de planta ideal, catálogo com nível de luz e rega, planos mensal, bimestral e anual.",
    tags: ["Quiz", "Assinatura", "Pet friendly"],
    cor: "#2f5a3f",
  },
  {
    pasta: "creass-reumatologia",
    titulo: "Creass — Reumatologia e Especialidades",
    revisado: true,
    segmento: "Saúde",
    descricao: "Clínica de reumatologia em Mogi das Cruzes: doenças tratadas, especialidades médicas e agendamento pelo WhatsApp.",
    tags: ["Clínica médica", "Agendamento", "Cliente real"],
    cor: "#b7856b",
  },
  {
    pasta: "juliano-advocacia",
    titulo: "Juliano de Paula Ignácio — Direito Médico e do Consumidor",
    segmento: "Advocacia",
    descricao: "Advogado de direito médico, da saúde e do consumidor: plano de saúde, erro médico, medicamentos pelo SUS e cobranças indevidas.",
    tags: ["Direito da saúde", "Atendimento online", "Cliente real"],
    cor: "#0b1527",
  },
  {
    pasta: "infog-bastiao",
    titulo: "InfoG Bastião — Software House e Segurança",
    segmento: "Tecnologia",
    descricao: "Software house com DNA de segurança: sistemas e aplicativos, manutenção com SLA, servidores e firewall com monitoramento 24/7.",
    tags: ["Segurança", "Infraestrutura", "Dark mode"],
    cor: "#3b82f6",
  },
  {
    pasta: "infog-vetor",
    titulo: "InfoG Vetor — Software House Completa",
    segmento: "Tecnologia",
    descricao: "Squads dedicados para desenvolvimento sob medida, sustentação de sistemas, servidores, firewall e aplicativos.",
    tags: ["Squads", "Sob medida", "Apps"],
    cor: "#8b5cf6",
  },  {
    pasta: "plancar",
    titulo: "PlanCar — Agendamento para Lava-Rápidos",
    revisado: true,
    segmento: "Automotivo",
    descricao: "Sistema de agendamento online para lava-rápidos: agenda, fila do dia, equipe, pagamento antecipado com Pix e cartão e relatórios.",
    tags: ["SaaS", "Agendamento", "Cliente real"],
    cor: "#2563eb",
  },
  {
    pasta: "demao-tintas",
    titulo: "Demão — Tintas & Cores",
    revisado: true,
    segmento: "Tintas",
    descricao: "Loja de tintas com lata 3D que abre e leva para dentro da tinta, simulador de cor em sala real, galeria de ambientes, processo em rolagem horizontal e calculadora de litros.",
    tags: ["3D", "Simulador de cor", "Calculadora"],
    cor: "#b5643c",
  },
];

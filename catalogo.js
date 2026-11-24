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
    revisado: true,
    segmento: "Imobiliária",
    descricao: "Imobiliária com match de estilo de vida que reordena os imóveis, mapa vivo dos bairros, ficha com luz natural e tempo até o trabalho e comparador de favoritos.",
    tags: ["Match de estilo de vida", "Mapa vivo", "Comparador"],
    cor: "#2d6b5d",
  },
  {
    pasta: "lumiere-estetica",
    titulo: "Lumière — Estética Avançada",
    revisado: true,
    segmento: "Estética",
    descricao: "Clínica de estética com luz que revela o glow da pele no cursor, mapa do rosto interativo, ritual em que a página entra na imagem e quiz de protocolo.",
    tags: ["Mapa do rosto", "Interativo", "Quiz"],
    cor: "#c48b7c",
  },
  {
    pasta: "patavet-veterinaria",
    titulo: "Patavet — Clínica Veterinária",
    segmento: "Veterinária",
    descricao: "Clínica veterinária 24h com estetoscópio no cursor e monitor cardíaco ao vivo, um dia inteiro de plantão guiado pela rolagem, calculadora de idade e planos em vidro.",
    tags: ["Estetoscópio", "24 horas", "Calculadora"],
    cor: "#14837a",
    revisado: true,
  },
  {
    pasta: "forte-materiais",
    titulo: "Forte — Materiais de Construção",
    revisado: true,
    segmento: "Construção",
    descricao: "Depósito de materiais com uma casa que se constrói etapa por etapa no scroll, lente de planta no cursor, calculadora com desenho ao vivo, orçamento em nota e entrega com rota animada.",
    tags: ["Obra no scroll", "Calculadora", "Orçamento"],
    cor: "#ffcc00",
  },
  {
    pasta: "rua77-streetwear",
    titulo: "RUA 77 — Streetwear",
    segmento: "Moda",
    descricao: "Streetwear com muro para pichar com o cursor, arara de cabides que balançam no scroll, lookbook de lambe-lambes arrancados, sacola com pedido pelo WhatsApp e guia de tamanhos.",
    tags: ["Spray", "Arara", "Lambe-lambe"],
    cor: "#5b72ff",
    revisado: true,
  },
  {
    pasta: "quintal-da-vo",
    titulo: "Quintal da Vó — Comida Caseira",
    segmento: "Gastronomia",
    descricao: "Comida caseira com vapor que reage ao cursor, prato do dia por semana, monte sua marmita com comida realista caindo pedaço por pedaço na bandeja de alumínio (arroz, feijão, filés grelhados, farofa, fritas, purê e mais), história em polaroides e mapa híbrido de satélite com rota no Google Maps, Waze e Apple Maps.",
    tags: ["Marmita realista", "Mapa híbrido", "Polaroides"],
    cor: "#d9452b",
    revisado: true,
  },
  {
    pasta: "navalha-barbearia",
    titulo: "Navalha & Co. — Barbearia",
    revisado: true,
    segmento: "Barbearia",
    descricao: "Barbearia escura e translúcida com holofote que segue o mouse, nome cortado pela navalha no scroll, tabela com fotos flutuantes e consulta de horários pelo WhatsApp.",
    tags: ["Consulta de horários", "Interativo", "Clube"],
    cor: "#c9a45c",
  },
  {
    pasta: "torque-autocenter",
    titulo: "Torque — Auto Center",
    segmento: "Automotivo",
    descricao: "Auto center com garagem escura e painel em vidro: segure o acelerador e o conta-giros sobe e os faróis acendem. Scanner de diagnóstico na rolagem, odômetro de tambores e placa Mercosul.",
    tags: ["Acelerador", "Scanner", "Revisão por km"],
    cor: "#00c2ff",
  },
  {
    pasta: "flora-viva",
    titulo: "Flora Viva — Orquidário e Floricultura",
    segmento: "Floricultura",
    descricao: "Orquidário e floricultura com pétalas que seguem o mouse, viveiro que se abre na rolagem e montador de buquê realista: as hastes entram e saem voando, o papel se abre para trocar a flor.",
    tags: ["Buquê ao vivo", "Rolagem", "Loja"],
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
    descricao: "SaaS financeiro imersivo: papéis soltos (Pix, DANFE, boleto, conta de luz) que fogem do cursor e, com a rolagem, voam para dentro do painel e viram lançamentos conciliados; recursos em vidro com simulação de Pix, comparador antes/depois arrastável, calculadora de economia com horas devolvidas e preços com efeito 3D.",
    tags: ["Conciliação no scroll", "Antes e depois", "Calculadora ROI"],
    cor: "#6b4dff",
    revisado: true,
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
    descricao: "Advocacia previdenciária com carteira de trabalho realista que folheia com a rolagem e soma o tempo de contribuição até o carimbo de concedida; extrato do CNIS examinado com lupa no cursor revelando erros do INSS, simulador de aposentadoria em vidro com ano previsto e benefícios com spotlight.",
    tags: ["Carteira de trabalho", "Lupa no CNIS", "Simulador"],
    cor: "#1f4e79",
  },
  {
    pasta: "respira-pilates",
    titulo: "Respira — Studio de Pilates",
    segmento: "Fitness",
    descricao: "Studio de pilates e yoga em que a página respira: luz de janela que acompanha o cursor, orbe com lente de vidro e respiração guiada 4-7-8, modalidades que se abrem em círculo a cada inspiração com a rolagem, grade semanal em vidro com reserva pelo WhatsApp e galeria horizontal do estúdio.",
    tags: ["Respiração guiada", "Modalidades no scroll", "Galeria horizontal"],
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
    descricao: "Salão de beleza com simulador de cor numa foto real: o cabelo é recolorido fio a fio preservando brilho e sombras, com técnicas global, mechas, balayage e ombré, linha de corte por comprimento e comparação antes/depois arrastável; hero em que o cursor vira pincel de tintura, tabela de preços por comprimento e agenda em vidro.",
    tags: ["Cor em foto real", "Pincel no cursor", "Antes e depois"],
    cor: "#ff2e88",
  },
  {
    pasta: "bicho-feliz",
    titulo: "Bicho Feliz — Hotel e Creche Pet",
    revisado: true,
    segmento: "Veterinária",
    descricao: "Hotel e creche pet com casinha que se abre no scroll e fotos do dia, agora com sistema completo de agendamento: área do cliente (hotelzinho, creche/day use, banho e tosa, pets, fotos e loja) e área da equipe (painel do dia, agenda, ocupação das suítes, clientes, pedidos e estoque).",
    tags: ["Sistema de agendamento", "Área do cliente", "Painel da equipe"],
    cor: "#e26a2c",
  },
  {
    pasta: "prumo-reformas",
    titulo: "Prumo — Reformas",
    segmento: "Construção",
    descricao: "Reformas residenciais com antes/depois em tela cheia e um prumo de verdade que balança com o cursor e a rolagem; seção fixa da planta à chave em que a planta se desenha e um nível laser revela a obra e o acabamento enquanto o cronograma avança, estimativa de custo com peças de porcelanato e contrato em papel assinado na hora.",
    tags: ["Prumo com física", "Da planta à chave", "Contrato assinado"],
    cor: "#ff5a1f",
  },
  {
    pasta: "maison-odete",
    titulo: "Maison Odete — Moda Feminina",
    segmento: "Moda",
    descricao: "Moda feminina autoral em clima de revista: provador na capa em que o cursor revela outro look, coleção pendurada num varal com prendedores de madeira e etiquetas que balançam com a rolagem, monte seu look em vidro, stylist com parallax e lookbook editorial em que cada foto se abre da moldura até a tela cheia.",
    tags: ["Provador no cursor", "Varal da coleção", "Lookbook editorial"],
    cor: "#7a2e2e",
  },
  {
    pasta: "fade-club",
    titulo: "Fade Club — Barbearia",
    segmento: "Barbearia",
    descricao: "Barbearia dark com fila ao vivo num painel de letras giratórias (como em estação de trem), passo a passo do degradê guiado pela rolagem com régua de pentes e lâmina que revela cada foto, consultoria por formato de rosto em vidro, cardápio com prévia da foto no cursor, agenda com barbeiros em 3D e clube de assinatura.",
    tags: ["Painel split-flap", "Régua de pentes", "Prévia no cursor"],
    cor: "#e6ff3d",
  },
  {
    pasta: "brilho-detail",
    titulo: "Brilho Detail — Estética Automotiva",
    segmento: "Automotivo",
    descricao: "Estética automotiva com uma jornada imersiva na rolagem: as luzes do estúdio acendem, a espuma cobre a tela, a água enxágua, o polimento gira e a câmera entra numa gota até a entrega.",
    tags: ["Jornada imersiva", "Rolagem", "Monte seu pacote"],
    cor: "#3ad1ff",
  },
  {
    pasta: "folha-clube",
    titulo: "Folha Clube — Assinatura de Plantas",
    revisado: true,
    segmento: "Floricultura",
    descricao: "Assinatura de plantas onde o cursor vira o sol sobre fotos reais, a selva cresce mês a mês na rolagem, quiz com fotos e planos em vidro fosco.",
    tags: ["Luz real", "Rolagem", "Quiz"],
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
    titulo: "Bastião — Software House e Segurança",
    segmento: "Tecnologia",
    descricao: "Software house com DNA de segurança: sistemas e aplicativos, manutenção com SLA, servidores e firewall com monitoramento 24/7.",
    tags: ["Segurança", "Infraestrutura", "Dark mode"],
    cor: "#3b82f6",
    revisado: true,
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
  {
    pasta: "underground-barbershop",
    titulo: "Underground Barbershop — Agendamento",
    revisado: true,
    segmento: "Barbearia",
    descricao: "Barbearia com agendamento online em menos de um minuto: serviços, equipe, planos de assinatura, próximo horário livre, área do cliente e painel do barbeiro.",
    tags: ["SaaS", "Agendamento", "Cliente real"],
    cor: "#d4b26a",
  },
];

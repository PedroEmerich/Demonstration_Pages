# Fotos do buquê — o que providenciar

O buquê da seção **Monte seu buquê** é montado só com fotos reais recortadas, sobrepostas em camadas.
O código lê tudo de `bouquet-manifest.json`. Para trocar uma foto, basta substituir o arquivo com
o mesmo nome. Se as dimensões mudarem, atualize `w` e `h` no manifest.

## Regras para todas as imagens

- **Formato:** WebP com fundo transparente (PNG também funciona, mas pesa mais).
- **Tamanho:** no mínimo 800 px no lado maior e no máximo cerca de 150 KB por arquivo.
- **Luz:** suave de estúdio, vinda de cima e à esquerda, igual em todas as fotos. Evite sombras duras e fundos coloridos refletidos.
- **Recorte:** limpo, sem halo branco ou escuro em volta.
- **Cores:** cada cor precisa de fotos próprias. Nunca pinte uma foto de outra cor.
- **Variação:** de 4 a 6 fotos diferentes da mesma flor e cor, em ângulos levemente diferentes.

## Já incluídas (fotos do Unsplash, licença livre para uso comercial)

| Pasta | Fotos | Origem |
|---|---|---|
| `flowers/rosas/vermelho/` | 01–08 | recortes de 1 foto de campo de rosas |
| `flowers/rosas/rosa/` | 01–06 | recortes de 2 fotos de buquês de rosas |
| `flowers/girassois/amarelo/` | 01–04 | recortes de 1 foto de girassóis |
| `flowers/tulipas/amarelo/`, `coral/`, `rosa/` | 01–02 | recortes de 1 foto de tulipas no campo |
| `flowers/campo/branco/` | 01–02 | margaridas |
| `wrap/kraft/` | back, front, sleeve | recortes de 1 foto de buquê em papel kraft |
| `ribbon/barbante.webp` | 1 | amarração de barbante da mesma foto |
| `filler/` | folha-01, folha-02 | folhagem |
| `stems/haste-01.webp` | 1 | haste de tulipa |

Essas fotos vêm de cenas diferentes (luz e resolução diferentes) e foram recortadas automaticamente.
Elas resolvem a demonstração, mas um ensaio próprio no mesmo estúdio deixa o buquê com cara
de foto única.

## Faltando (hoje aparecem como "em breve" ou estão ausentes)

### Flores (vista de cima, cerca de 30° de inclinação, só a cabeça da flor, sem haste)

| Arquivo | O que deve aparecer |
|---|---|
| `flowers/rosas/creme/01.webp` … `05.webp` | rosa creme/branca aberta, pétalas externas soltas |
| `flowers/rosas/amarelo/01.webp` … `05.webp` | rosa amarela aberta |
| `flowers/tulipas/lilas/01.webp` … `04.webp` | tulipa lilás **de lado**, só a cabeça, base do caule visível embaixo |
| `flowers/tulipas/branco/01.webp` … `04.webp` | tulipa branca de lado |
| `flowers/campo/colorido/01.webp` … `06.webp` | flores do campo variadas (cosmos, áster, cravina), uma por arquivo |

### Preenchimento

| Arquivo | O que deve aparecer |
|---|---|
| `filler/gipsofila-01.webp` … `04.webp` | galhos de gipsofila (mosquitinho) com 15–30 florzinhas, ramo inteiro, fundo transparente |
| `filler/eucalipto-01.webp` … `03.webp` | ramo de eucalipto baby blue, de 25–35 cm |
| `filler/folha-03.webp` … `05.webp` | folhas de pittosporum/ruscus, ramos de 20 cm |

Depois de adicionar, inclua os arquivos em `filler.back` (atrás das flores) ou `filler.front`
(alguns raminhos por cima) no manifest.

### Embalagens (fotografar o buquê real **sem flores**, de frente, na altura do laço)

| Arquivo | O que deve aparecer |
|---|---|
| `wrap/kraft/front.webp` | folha da frente do kraft dobrada em cone, borda superior com vinco natural, terminando estreita no amarrado. Versão em alta, para substituir a atual |
| `wrap/kraft/back.webp` | folha de trás do kraft, que aparece acima e nas laterais das flores |
| `wrap/seda/back.webp`, `wrap/seda/front.webp` | o mesmo, em papel de seda rosé com 2 a 3 folhas sobrepostas e borda franzida |
| `wrap/caixa/back.webp`, `wrap/caixa/front.webp` | caixa redonda verde-escura (chapeleira): a borda de trás e a frente com o logo |
| `ribbon/roxo.webp` | laço de cetim roxo com duas alças e duas pontas, de frente, com brilho natural |
| `ribbon/kraft-cetim.webp` | laço de cetim bege para o kraft (opcional, substitui o barbante) |
| `stems/haste-02.webp` … `04.webp` | pontas de hastes cortadas em diagonal, 12–15 cm, verdes |

Para ligar uma embalagem nova, preencha `embalagens.seda.camadas` (ou `caixa`) no manifest,
no mesmo formato do kraft. Cada camada tem `src`, `w`, `h`, `x`, `y`, `largura` e `ancora`,
em coordenadas do palco de 600 × 700.

## Como os slots funcionam

`slots["6" | "12" | "24"]` define a posição de cada flor: `x` e `y` no palco de 600 × 700,
`escala` (1 equivale a 100 px de largura), `rot` em graus e `z` (maior fica na frente).
As flores do centro ficam maiores e na frente; as das bordas, menores e atrás.
A rotação vem de uma semente fixa, então não muda a cada carregamento.

# Vitrine de Landing Pages

Site de apresentação dos serviços + catálogo de modelos de landing page.

```
vitrine-landing-pages/
├── index.html        ← página inicial (história animada + vitrine + processo)
├── catalogo.html     ← catálogo completo com filtros
├── ver.html          ← visualizador (computador / tablet / celular)
├── catalogo.js       ← CONFIGURAÇÃO: nome do estúdio, WhatsApp e lista de modelos
├── estilo.css
├── app.js            ← preenche dados, catálogo e vitrine
├── interacoes.js     ← cursor, revelar ao rolar, fileiras em movimento
├── historia.js       ← objeto que gira e muda de lado no scroll (edite FORMAS)
├── gerar-capas.mjs   ← gera as capturas de tela dos modelos
└── modelos/
    └── <nome-do-modelo>/
        ├── index.html       ← a landing page
        ├── capa.jpg         ← captura (gerada)
        └── capa-mobile.jpg  ← captura celular (gerada)
```

## Adicionar um modelo

1. Crie `modelos/<nome-do-modelo>/` (sem espaços/acentos) com a landing como `index.html`.
2. Em `catalogo.js`, adicione um item em `MODELOS` com `pasta: "<nome-do-modelo>"`.
3. Gere as capturas: `node gerar-capas.mjs <nome-do-modelo>` (precisa do Node 22+ e Chrome/Edge).

Sem as capturas o catálogo ainda funciona (mostra a página ao vivo em miniatura),
mas a vitrine animada e a história da página inicial usam as imagens.

## Rodar localmente

```
python -m http.server 5500
```
e abra http://localhost:5500

## Efeitos interativos dos modelos

Os modelos Brasa, Pulso, Vasconcelos & Prado, Lumière, Horizonte e Patavet trazem um
bloco "EFEITOS" (no fim do `<style>` e num `<script>` antes de `</body>`), controlado
por atributos no HTML:

| Atributo | Efeito |
| --- | --- |
| `data-tilt="8"` | card inclina em 3D seguindo o mouse, com brilho |
| `data-img` / `data-img="left"` | imagem revelada com cortina ao rolar |
| `data-pan="3"` | a foto acompanha o mouse dentro da moldura |
| `data-speed=".1"` | parallax no scroll |
| `data-depth="20"` | elemento segue o mouse (camadas do hero) |
| `data-cursor="Ver"` | texto dentro do cursor |
| `data-scrub` | palavras acendem conforme a rolagem |

Também: cursor personalizado, botões (`.btn`, `.wa`) magnéticos, títulos `h2` que sobem
palavra por palavra, barra de progresso e link do menu da seção atual. As cores vêm de
`--fx-accent`, `--fx-label`, `--fx-glare` e `--fx-grain` no `:root` de cada modelo.
Em celulares e com "reduzir movimento" ativo, cursor, ímã e inclinação ficam desligados.

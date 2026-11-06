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

Página já publicada em outro endereço (outro repositório, outro site)?
Não precisa copiar: adicione o item em `MODELOS` com `url: "https://..."`
e um `pasta` qualquer (só identificador). O catálogo abre a página desse
endereço, e `node gerar-capas.mjs <pasta>` salva as capas em `modelos/<pasta>/`.

Sem as capturas o catálogo ainda funciona (mostra a página ao vivo em miniatura),
mas a vitrine animada e a história da página inicial usam as imagens.

## Rodar localmente

```
python -m http.server 5500
```
e abra http://localhost:5500

## Brasa: fotos reais dos pontos da carne

A seção "O ponto perfeito" do modelo `brasa-parrilla` mostra uma picanha gerada
em WebGL. Para usar fotos reais, coloque cinco imagens em
`modelos/brasa-parrilla/pontos/`:

| Arquivo | Ponto |
| --- | --- |
| `0.jpg` | Mal passado |
| `1.jpg` | Ao ponto para mal |
| `2.jpg` | Ao ponto |
| `3.jpg` | Ao ponto para bem |
| `4.jpg` | Bem passado |

Use a mesma carne, o mesmo ângulo, a mesma luz e o mesmo enquadramento
(cerca de 1400 × 1200 px). Com as cinco na pasta, a página troca a carne
gerada pelas fotos, com transição suave entre os pontos.

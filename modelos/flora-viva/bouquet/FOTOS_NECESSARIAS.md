# Fotos do buquê — o que providenciar

A pré-visualização da seção **Monte seu buquê** mostra **uma fotografia completa** para cada combinação de flor, cor, quantidade e embalagem.
Enquanto a foto de uma combinação não existe, aparece um esqueleto com "foto em produção".

## Como entregar cada foto

- **Arquivo:** `bouquet/photos/{flor}-{cor}-{qtd}-{embalagem}.webp`, exatamente com os nomes da lista abaixo.
- **Tamanho:** 1600 × 1600 px, WebP com qualidade 80 a 85 (cerca de 150 a 250 KB).
- **Fundo:** **branco puro (#FFFFFF)**, sem gradiente, vinheta ou sombra no fundo. A página remove o branco com `mix-blend-mode: multiply`; qualquer cinza no fundo vira mancha. Também pode ser PNG ou WebP com fundo transparente.
- **Sombra:** **não** fotografe a sombra de contato no chão; a página desenha a sua.
- **Enquadramento igual em todas as fotos** (use um tripé fixo e uma marca no chão):
  - buquê de pé, de frente, câmera na altura do laço, lente de 50 a 85 mm;
  - buquê centralizado na horizontal;
  - topo das flores a cerca de 5% do topo da imagem e ponta das hastes a cerca de 97% da altura;
  - laço sempre no mesmo lugar (cerca de 62% da altura).
- **Luz:** a mesma em todas as fotos: softbox grande à esquerda, rebatedor à direita, sem estourar o branco das flores claras.
- **Cor:** sem filtros; cada cor é fotografada de verdade.

Depois de colocar o arquivo, abra `bouquet-photos.json` e, na entrada correspondente:
1. mude `"available": false` para `true`;
2. ajuste `focal` (centro das flores, de 0 a 1) e `hotspots` (círculos sobre as flores: x, y e raio r, de 0 a 1) para o brilho do mouse cair nas flores.

Combinação que não existe de verdade (por exemplo, girassol rosa)? Basta apagar a entrada do JSON: a opção some ou fica desabilitada sozinha.

## Prioridade

1. `rosas-vermelho-12-kraft.webp`: primeira foto e combinação inicial da página.
2. As outras 11 combinações em **12 hastes + kraft**, para todas as flores e cores funcionarem.
3. 6 e 24 hastes em kraft.
4. Papel de seda e caixa luxo.

## Lista completa (99 fotos)

### Rosas

| Arquivo | Cor | Hastes | Embalagem |
|---|---|---|---|
| `photos/rosas-vermelho-6-kraft.webp` | Vermelho | 6 | Papel kraft |
| `photos/rosas-vermelho-6-seda.webp` | Vermelho | 6 | Papel de seda |
| `photos/rosas-vermelho-6-caixa.webp` | Vermelho | 6 | Caixa luxo |
| `photos/rosas-vermelho-12-kraft.webp` | Vermelho | 12 | Papel kraft |
| `photos/rosas-vermelho-12-seda.webp` | Vermelho | 12 | Papel de seda |
| `photos/rosas-vermelho-12-caixa.webp` | Vermelho | 12 | Caixa luxo |
| `photos/rosas-vermelho-24-kraft.webp` | Vermelho | 24 | Papel kraft |
| `photos/rosas-vermelho-24-seda.webp` | Vermelho | 24 | Papel de seda |
| `photos/rosas-vermelho-24-caixa.webp` | Vermelho | 24 | Caixa luxo |
| `photos/rosas-rosa-6-kraft.webp` | Rosa | 6 | Papel kraft |
| `photos/rosas-rosa-6-seda.webp` | Rosa | 6 | Papel de seda |
| `photos/rosas-rosa-6-caixa.webp` | Rosa | 6 | Caixa luxo |
| `photos/rosas-rosa-12-kraft.webp` | Rosa | 12 | Papel kraft |
| `photos/rosas-rosa-12-seda.webp` | Rosa | 12 | Papel de seda |
| `photos/rosas-rosa-12-caixa.webp` | Rosa | 12 | Caixa luxo |
| `photos/rosas-rosa-24-kraft.webp` | Rosa | 24 | Papel kraft |
| `photos/rosas-rosa-24-seda.webp` | Rosa | 24 | Papel de seda |
| `photos/rosas-rosa-24-caixa.webp` | Rosa | 24 | Caixa luxo |
| `photos/rosas-branco-6-kraft.webp` | Branco | 6 | Papel kraft |
| `photos/rosas-branco-6-seda.webp` | Branco | 6 | Papel de seda |
| `photos/rosas-branco-6-caixa.webp` | Branco | 6 | Caixa luxo |
| `photos/rosas-branco-12-kraft.webp` | Branco | 12 | Papel kraft |
| `photos/rosas-branco-12-seda.webp` | Branco | 12 | Papel de seda |
| `photos/rosas-branco-12-caixa.webp` | Branco | 12 | Caixa luxo |
| `photos/rosas-branco-24-kraft.webp` | Branco | 24 | Papel kraft |
| `photos/rosas-branco-24-seda.webp` | Branco | 24 | Papel de seda |
| `photos/rosas-branco-24-caixa.webp` | Branco | 24 | Caixa luxo |
| `photos/rosas-amarelo-6-kraft.webp` | Amarelo | 6 | Papel kraft |
| `photos/rosas-amarelo-6-seda.webp` | Amarelo | 6 | Papel de seda |
| `photos/rosas-amarelo-6-caixa.webp` | Amarelo | 6 | Caixa luxo |
| `photos/rosas-amarelo-12-kraft.webp` | Amarelo | 12 | Papel kraft |
| `photos/rosas-amarelo-12-seda.webp` | Amarelo | 12 | Papel de seda |
| `photos/rosas-amarelo-12-caixa.webp` | Amarelo | 12 | Caixa luxo |
| `photos/rosas-amarelo-24-kraft.webp` | Amarelo | 24 | Papel kraft |
| `photos/rosas-amarelo-24-seda.webp` | Amarelo | 24 | Papel de seda |
| `photos/rosas-amarelo-24-caixa.webp` | Amarelo | 24 | Caixa luxo |

### Girassóis

| Arquivo | Cor | Hastes | Embalagem |
|---|---|---|---|
| `photos/girassois-amarelo-6-kraft.webp` | Amarelo | 6 | Papel kraft |
| `photos/girassois-amarelo-6-seda.webp` | Amarelo | 6 | Papel de seda |
| `photos/girassois-amarelo-6-caixa.webp` | Amarelo | 6 | Caixa luxo |
| `photos/girassois-amarelo-12-kraft.webp` | Amarelo | 12 | Papel kraft |
| `photos/girassois-amarelo-12-seda.webp` | Amarelo | 12 | Papel de seda |
| `photos/girassois-amarelo-12-caixa.webp` | Amarelo | 12 | Caixa luxo |
| `photos/girassois-amarelo-24-kraft.webp` | Amarelo | 24 | Papel kraft |
| `photos/girassois-amarelo-24-seda.webp` | Amarelo | 24 | Papel de seda |
| `photos/girassois-amarelo-24-caixa.webp` | Amarelo | 24 | Caixa luxo |

### Tulipas

| Arquivo | Cor | Hastes | Embalagem |
|---|---|---|---|
| `photos/tulipas-rosa-6-kraft.webp` | Rosa | 6 | Papel kraft |
| `photos/tulipas-rosa-6-seda.webp` | Rosa | 6 | Papel de seda |
| `photos/tulipas-rosa-6-caixa.webp` | Rosa | 6 | Caixa luxo |
| `photos/tulipas-rosa-12-kraft.webp` | Rosa | 12 | Papel kraft |
| `photos/tulipas-rosa-12-seda.webp` | Rosa | 12 | Papel de seda |
| `photos/tulipas-rosa-12-caixa.webp` | Rosa | 12 | Caixa luxo |
| `photos/tulipas-rosa-24-kraft.webp` | Rosa | 24 | Papel kraft |
| `photos/tulipas-rosa-24-seda.webp` | Rosa | 24 | Papel de seda |
| `photos/tulipas-rosa-24-caixa.webp` | Rosa | 24 | Caixa luxo |
| `photos/tulipas-branco-6-kraft.webp` | Branco | 6 | Papel kraft |
| `photos/tulipas-branco-6-seda.webp` | Branco | 6 | Papel de seda |
| `photos/tulipas-branco-6-caixa.webp` | Branco | 6 | Caixa luxo |
| `photos/tulipas-branco-12-kraft.webp` | Branco | 12 | Papel kraft |
| `photos/tulipas-branco-12-seda.webp` | Branco | 12 | Papel de seda |
| `photos/tulipas-branco-12-caixa.webp` | Branco | 12 | Caixa luxo |
| `photos/tulipas-branco-24-kraft.webp` | Branco | 24 | Papel kraft |
| `photos/tulipas-branco-24-seda.webp` | Branco | 24 | Papel de seda |
| `photos/tulipas-branco-24-caixa.webp` | Branco | 24 | Caixa luxo |
| `photos/tulipas-amarelo-6-kraft.webp` | Amarelo | 6 | Papel kraft |
| `photos/tulipas-amarelo-6-seda.webp` | Amarelo | 6 | Papel de seda |
| `photos/tulipas-amarelo-6-caixa.webp` | Amarelo | 6 | Caixa luxo |
| `photos/tulipas-amarelo-12-kraft.webp` | Amarelo | 12 | Papel kraft |
| `photos/tulipas-amarelo-12-seda.webp` | Amarelo | 12 | Papel de seda |
| `photos/tulipas-amarelo-12-caixa.webp` | Amarelo | 12 | Caixa luxo |
| `photos/tulipas-amarelo-24-kraft.webp` | Amarelo | 24 | Papel kraft |
| `photos/tulipas-amarelo-24-seda.webp` | Amarelo | 24 | Papel de seda |
| `photos/tulipas-amarelo-24-caixa.webp` | Amarelo | 24 | Caixa luxo |
| `photos/tulipas-lilas-6-kraft.webp` | Lilás | 6 | Papel kraft |
| `photos/tulipas-lilas-6-seda.webp` | Lilás | 6 | Papel de seda |
| `photos/tulipas-lilas-6-caixa.webp` | Lilás | 6 | Caixa luxo |
| `photos/tulipas-lilas-12-kraft.webp` | Lilás | 12 | Papel kraft |
| `photos/tulipas-lilas-12-seda.webp` | Lilás | 12 | Papel de seda |
| `photos/tulipas-lilas-12-caixa.webp` | Lilás | 12 | Caixa luxo |
| `photos/tulipas-lilas-24-kraft.webp` | Lilás | 24 | Papel kraft |
| `photos/tulipas-lilas-24-seda.webp` | Lilás | 24 | Papel de seda |
| `photos/tulipas-lilas-24-caixa.webp` | Lilás | 24 | Caixa luxo |

### Flores do campo

| Arquivo | Cor | Hastes | Embalagem |
|---|---|---|---|
| `photos/campo-colorido-6-kraft.webp` | Colorido | 6 | Papel kraft |
| `photos/campo-colorido-6-seda.webp` | Colorido | 6 | Papel de seda |
| `photos/campo-colorido-6-caixa.webp` | Colorido | 6 | Caixa luxo |
| `photos/campo-colorido-12-kraft.webp` | Colorido | 12 | Papel kraft |
| `photos/campo-colorido-12-seda.webp` | Colorido | 12 | Papel de seda |
| `photos/campo-colorido-12-caixa.webp` | Colorido | 12 | Caixa luxo |
| `photos/campo-colorido-24-kraft.webp` | Colorido | 24 | Papel kraft |
| `photos/campo-colorido-24-seda.webp` | Colorido | 24 | Papel de seda |
| `photos/campo-colorido-24-caixa.webp` | Colorido | 24 | Caixa luxo |
| `photos/campo-branco-6-kraft.webp` | Branco | 6 | Papel kraft |
| `photos/campo-branco-6-seda.webp` | Branco | 6 | Papel de seda |
| `photos/campo-branco-6-caixa.webp` | Branco | 6 | Caixa luxo |
| `photos/campo-branco-12-kraft.webp` | Branco | 12 | Papel kraft |
| `photos/campo-branco-12-seda.webp` | Branco | 12 | Papel de seda |
| `photos/campo-branco-12-caixa.webp` | Branco | 12 | Caixa luxo |
| `photos/campo-branco-24-kraft.webp` | Branco | 24 | Papel kraft |
| `photos/campo-branco-24-seda.webp` | Branco | 24 | Papel de seda |
| `photos/campo-branco-24-caixa.webp` | Branco | 24 | Caixa luxo |

## Descrição das embalagens

- **kraft:** papel kraft natural, folha de trás subindo acima das flores, frente em cone, gargalo com laço de cetim.
- **seda:** 2 a 3 folhas de papel de seda rosé sobrepostas, borda franzida, laço de cetim.
- **caixa:** chapeleira redonda verde-escura com logo dourado, flores em domo saindo da caixa, sem hastes à mostra (as hastes podem ficar fora do quadro).

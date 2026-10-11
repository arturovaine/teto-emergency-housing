# Fundação em terreno irregular — escavação e pedrisco

**Data:** 2026-10-09
**Escopo:** adicionar, ao modelo 3D (`app.js`), o processo de fundação sobre terreno
irregular: relevo ondulado, buracos de cavadeira e camada de pedrisco sob cada piloti.

## Decisões

- **Montagem:** novo passo inicial "Terreno e escavação" → sequência vai de 7 para 8 passos.
- **Aleatoriedade:** ruído com **semente fixa** (determinístico, estável entre recarregamentos).
- **Relevo:** **moderado**, ~±0,17 m em torno de `y=0`, com leve caimento geral.
- **Detalhe:** buraco + pedrisco (sem montículos de terra, sem a ferramenta cavadeira, sem CSG).

## Implementação (Abordagem A)

### 1. Terreno
- Substituir a `BoxGeometry` plana por uma `PlaneGeometry` (~80×60 segmentos sobre 12×9 m)
  deslocada em `y` por `terrainY(x, z)`.
- `terrainY` = ruído de valor com semente (reutilizar `rng(seed)` mulberry32 já existente):
  grade pequena (~8×6) de alturas aleatórias, interpolada com smoothstep, + caimento linear suave.
  Amplitude total ~±0,17 m.
- Borda inferior ("saia") descendo a ~`y=-0,35` para dar volume sólido e evitar ver por baixo.
- `receiveShadow = true`. Sempre visível (não depende do passo).

### 2. Grid
- Drapeado sobre o terreno: cada ponto de linha recebe `y = terrainY(x,z) + 0,012`.
- Segmentos de 1 m subdivididos (~0,15 m) para acompanhar a curvatura. Opacidade atual mantida.

### 3. Escavação (peça `escavacao`, passo 1)
- **Furos reais** abertos na malha do terreno: as faces cujo centro cai no raio do furo
  (`R_OPEN`) são descartadas do índice da geometria → abertura de verdade na superfície.
- 12 soquetes revestindo cada furo: cone aberto (raio ~0,17→0,085 m, prof. ~0,40 m),
  faces internas (`BackSide`) em tom de terra escura, com piso (`CircleGeometry`) no fundo.
- Colar (`RingGeometry`) de terra remexida na boca de cada furo, mascarando a borda
  irregular da malha e dando contorno redondo; leve `dish` (`RIM_D`) no entorno.

### 4. Pedrisco (peça `pedrisco`, passo 1)
- No fundo de cada soquete: disco de brita (cor cinza, leve bump) + 4–5 pedriscos soltos,
  posicionados sob o piloti.

### 5. Pilotis (ajuste da peça existente)
- Comprimento variável: topo fixo em `y=0,50` (piso nivelado); base abaixo do terreno local.
- `altura = 0,95 − terrainY(x,z)`; exposição acima do solo varia por apoio. Nenhum piloti flutua.

### 6. Sequência de montagem (8 passos)
```
Dia 1 · fundação e piso
  1. Terreno e escavação   (peças: Escavação, Pedrisco)
  2. Pilotis
  3. Vigas mestras
  4. Painéis de piso
Dia 2 · paredes e cobertura
  5. Paredes
  6. Estrutura do telhado
  7. Manta e telhas
  8. Porta e janelas
```
- `STEPS` ganha o item inicial; slider `max=8`, valor inicial `8`; rótulo "de 8".
- Todas as `PART.step` existentes somam +1; duas novas peças (`escavacao`, `pedrisco`) no passo 1.
- `days`: Dia 1 = steps [1,2,3,4]; Dia 2 = steps [5,6,7,8].
- No explode, `escavacao` e `pedrisco` ficam fixos (`ex = [0,0,0]`), como os pilotis.

### 7. Ficha técnica
- Adicionar linha **Fundação**: "buraco de cavadeira + pedrisco sob cada piloti" (fonte estimada `S`).

### 8. Cotas
- Ancorar a base da cota "0,50 m" (piso acima do solo) ao `terrainY` daquela posição.

## Verificação
- `node --check app.js` (sintaxe) + render headless (perspectiva, planta e explode no passo 1 e 2)
  confirmando: terreno irregular, pilotis com exposição variável, buracos com pedrisco,
  grid acompanhando o relevo, e a nova sequência de 8 passos.

## Fora de escopo
Montículos de terra escavada, ferramenta cavadeira, recorte real dos furos (CSG),
terreno aleatório a cada carregamento.

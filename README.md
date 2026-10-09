# Moradia de Emergência TETO

Modelo 3D interativo da **moradia de emergência da TETO** (casa pré-fabricada de
18 m², montada em mutirão de dois dias). A página mostra a casa em WebGL, com a
sequência de montagem passo a passo, uma vista explodida e a ficha técnica com as
medidas em metros.

Tudo roda no navegador, sem build e sem servidor — é só abrir o `index.html`.

## Recursos

- **Modelo 3D** em [Three.js](https://threejs.org/) (r128), com sombras e textura
  procedural de tábuas de pinus.
- **Vistas predefinidas**: perspectiva, fachada, lateral, fundos e planta.
- **Órbita livre**: arrastar para girar, rolar/pinça para aproximar, Shift +
  arrastar para mover. Também responde a teclado (setas, `+` / `-`).
- **Montagem passo a passo** (7 etapas, dos pilotis às aberturas) e **vista
  explodida** controladas por sliders.
- **Alternâncias**: cotas, porta e janelas abertas/fechadas, tábuas horizontais
  ou verticais.
- **Seleção de peças**: clicar numa peça no modelo ou na lista lateral destaca a
  peça e mostra sua descrição.
- **Acessibilidade e tema**: controles rotulados, foco visível, suporte a
  `prefers-reduced-motion` e tema claro/escuro via `prefers-color-scheme`.

## Como usar

Abra `index.html` em um navegador moderno com WebGL.

```bash
# direto do sistema de arquivos
open index.html

# ou servindo localmente (recomendado)
python3 -m http.server 8000
# depois acesse http://localhost:8000
```

É necessária conexão com a internet: o Three.js e as fontes (Barlow / IBM Plex
Mono) são carregados por CDN. Sem WebGL, a página exibe um aviso e mantém a
sequência de montagem e a ficha técnica legíveis.

## Estrutura

```
.
├── index.html   # marcação da página (cabeçalho, viewport 3D, controles, ficha técnica)
├── styles.css   # reset base + estilos da "prancha de obra" e temas claro/escuro
└── app.js       # cena Three.js: geometria da casa, órbita, etapas, cotas e interação
```

## Fontes

As medidas e quantidades vêm de material público, com as marcações usadas na
ficha técnica:

- **T** — [TETO Brasil](https://br.techo.org/blog/os-diferentes-tipos-de-moradia-da-teto-brasil/) e figuras TETO 2015.
- **U** — [TCC Poli-USP, 2012](https://bdta.abcd.usp.br/directbitstream/60903a0e-42fa-4d19-907b-6eec0f05e07d/LPedote.pdf).
- **S** — medições nas vistas do modelo SketchUp TETO 2017 (margem de ~5 cm).

Seções de vigas, caibros e ripas foram estimadas a partir de fotos de obra.

> **Aviso**: este é um modelo de divulgação, reconstruído a partir de material
> público. Não substitui o projeto executivo da TETO.

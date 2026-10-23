# Direção de arte — Energy City 3D

Estilo: **low-poly polido com iluminação forte**. Formas simples (caixas/cilindros), flat shading pontual, materiais PBR contidos, emissivos usados como fonte de luz (janelas, cabos quentes) para o bloom. Coeso em dia e noite.

## Paleta

Definida em `src/render/art.ts` (`PALETTE`):

| Papel | Cor |
| --- | --- |
| Céu (dia/noite) | `#8fc7f0` / `#050912` |
| Névoa (dia/noite) | `#a9d3f0` / `#0a1220` |
| Chão | `#4a6b4a` |
| Rua | `#20262e` |
| Prédio / telhado | `#8a97a6` / `#39424e` |
| Zona 110 V / 220 V | `#6b7a8f` / `#7d6b8f` |
| Metal claro / escuro | `#cbd5e1` / `#64748b` |
| Árvore (tronco/copa) | `#5b3a1e` / `#2f8f4e` |
| Poste de luz | `#fde68a` |

Saúde da rede (`HEALTH`): verde `#22c55e` → amarelo `#f59e0b` → vermelho `#ef4444`. O mesmo código de cores vale para o fantasma de construção (`ghostOk`), halo de limite e prévia do cabo.

## Iluminação e céu

- `Sky` (drei) permanente com `sunPosition` animado; `Stars` aparecem quando escurece.
- Luz direcional com **sombras suaves** (`shadow-radius`), ambiente + hemisférica fraca.
- **Ciclo dia/noite**: 24 h de jogo em `DAY_SECONDS = 600 s` (10 min reais; ~2,5 min em 4×). Começa às **08:00**; nascer do sol às **06:00** e pôr às **18:00** (`src/game/clock.ts`).
- Iluminação **contínua** (`dayFactor`/`nightFactor`): céu, névoa, sol, luz pública e janelas esmaecem suavemente — sem trocas binárias. O flag `night` (usado pelo gerador solar) tem **histerese** para não piscar.
- O **horário** aparece no HUD, sob as estrelas (`☀/🌙 HH:MM`).

## Pós-processamento (chave de qualidade)

Presets em `QUALITY` (`baixa`/`media`/`alta`), aplicados em `src/render/PostFX.tsx`:

| Efeito | Baixa | Média | Alta |
| --- | --- | --- | --- |
| Bloom (janelas/cabos quentes) | não | sim | sim |
| Tone mapping ACES | sim | sim | sim |
| Vinheta | não | sim | sim |
| SSAO | não | não | sim |
| Sombras / mapa | não / 512 | sim / 1024 | sim / 2048 |
| Stars | não | sim | sim |
| Pixel ratio (dpr) | 1 | 1,25 | 1,5 |

## Feedback de estado

- Cabos coloridos pela temperatura (verde→vermelho) com **emissivo** proporcional ao calor (bloom nos quentes); escuros quando falhados.
- **Halo** pulsante em componentes perto do limite (`load > 85% da capacidade`) e em componentes com tensão inadequada.
- **Linhas de fluxo** cuja velocidade reflete a corrente (via `visualClock`).
- Animação curta de **construção**: os componentes surgem com escala de 0,01 → 1.

## Desempenho visual

- Árvores e postes em `InstancedMesh`.
- Cabos com **geometria própria** (`TubeGeometry`) memoizada por endpoints e `dispose()` no desmonte — sem recriar a cada tick.
- Cada `NodeModel`/`CableView` assina só o que muda e é `memo`, evitando re-render por tick.
- Frustum culling padrão do three; LOD não implementado (geometrias já são baratas).

## Pendências

- SSAO e sombras podem pesar em GPU integrada; a chave Baixa desliga ambos.
- Animação de demolição é imediata (sem fade-out).
- Instancing das janelas: as janelas usam textura de emissão compartilhada (barato), sem `InstancedMesh` dedicado.

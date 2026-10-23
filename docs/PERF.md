# Desempenho — Energy City 3D

## Metodologia

- **Chrome headless** com CDP: medição de `solve`, `advance` e FPS via `requestAnimationFrame` (`performance.now`).
- **Build** medido pelo output do Vite (tamanho bruto e gzip por chunk).
- **Limitação**: o headless usa renderização por software (SwiftShader). Os tempos de CPU (solver/advance) são representativos; **os FPS não são** — servem como piso. Não houve sessão interativa do React Profiler; a análise de re-render foi estrutural (assinaturas/seletores) e por contadores de mudança.

## Os 3 maiores gargalos e as correções

### 1. Solver com 300 iterações fixas → critério de convergência

`src/electrical/engine.ts`: o Gauss-Seidel rodava sempre 300 varreduras. Agora para ao atingir `maxDelta < 1e-3 V`. Mesmos resultados (testes e tabela de balanceamento praticamente idênticos), custo muito menor.

| Medida (média) | Antes | Depois | Ganho |
| --- | --- | --- | --- |
| `solve` rede simples | 0,47–0,71 ms | **0,039 ms** | ~13–18× |
| `solve` 30 zonas / 60 cabos | 6,3–9,4 ms | **0,435 ms** | ~15–21× |
| `advance` (30 zonas) | 0,008–0,013 ms | **0,013 ms** | estável |

### 2. Re-render da cena ao mover o mouse

`src/render/Scene.tsx`: o estado de *hover* ficava no `Scene`, então cada movimento do mouse re-renderizava o componente que mapeia todos os nós e cabos. Extraído para `GroundLayer` (piso + fantasma + prévia do cabo), que é o único a re-renderizar com o ponteiro. O `Scene` só re-renderiza quando a **estrutura** muda (assinaturas de ids/posições), e `NodeModel`/`CableView` continuam `memo` e auto-assinantes por quadro.

### 3. Chunk único de ~1,2 MB → divisão de vendors

`vite.config.ts`: `manualChunks` separa `react`, `three`, `r3f` e `postfx`.

| Chunk | Antes | Depois |
| --- | --- | --- |
| Entrada da aplicação | 1.214 kB (gzip 338 kB) — único | **66 kB** (gzip 24 kB) |
| react | — | 0,65 kB |
| postfx | — | 95 kB (gzip 22 kB) |
| r3f | — | 380 kB (gzip 120 kB) |
| three | — | 684 kB (gzip 176 kB) |

A entrada caiu ~18× em bruto; os vendors ficam em cache entre versões.

## Situação após as correções

| Métrica | Valor |
| --- | --- |
| `solve` simples | **0,039 ms** |
| `solve` 30 zonas / 60 cabos | **0,435 ms** |
| `advance` | **0,013 ms** |
| FPS (software, qualidade Média com pós-processamento) | ~6 |

## Pendências de desempenho

- O **pós-processamento** (bloom/SSAO) domina o custo de GPU. Em GPU real tende a ser irrelevante; a chave **Baixa** o desliga (junto de sombras) para integradas. Recomenda-se remedir em GPU real.
- `three` ainda passa de 500 kB (aviso do Vite). É inevitável para o renderizador; pode ser reduzido com `import` cirúrgico de módulos do three no futuro.
- O FPS de ~6 é piso de software rendering, não uma meta.

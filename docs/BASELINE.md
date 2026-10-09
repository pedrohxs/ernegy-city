# Energy City 3D — Linha de base (FASE 0)

Data da medição: 2026-10-09
Escopo: reconhecimento, linha de base de build/testes/execução e medições de desempenho. Nenhuma feature nova foi adicionada.

## Mapa da arquitetura

### Módulos e responsabilidades

| Arquivo | Responsabilidade | Camada |
| --- | --- | --- |
| `src/electrical/engine.ts` | Física pura: `resistance` (R = ρ·L/A), `jouleLoss` (P = R·I²), `makeNode`, `solve` (solver nodal Gauss-Seidel com cargas de potência constante), `stepCable` e `stepNode` (modelo térmico). | Motor (sem React/Three) |
| `src/balance.ts` | Todas as constantes de balanceamento (custos, capacidades, metas, ρ, HEAT/COOL/NODE_HEAT, T_MAX). | Dados |
| `src/workers/electrical.worker.ts` | Executa `solve` fora da thread principal. | Motor/Worker |
| `src/store/gameStore.ts` | Estado do jogo (zustand): ferramentas, colocação, conexão de cabos, `tick` (postMessage ao worker), save/load em `localStorage`. | Estado |
| `src/game/advance.ts` | Passo puro: aplica o resultado do solver, atualiza temperatura, economia, níveis, eventos (crescimento/onda de calor), missões/conquistas. | Regras |
| `src/game/missions.ts` | Definições de missões e conquistas. | Regras |
| `src/game/audio.ts` | Áudio procedural (WebAudio): zumbido, sirene, estalos, beep de falha. | Apresentação |
| `src/three/Scene.tsx` | Renderização 3D: piso, nós (modelos), cabos, efeitos; clique para construir/selecionar. | Three |
| `src/three/Environment.tsx` | Ciclo dia/noite, estradas, árvores, postes e iluminação pública. | Three |
| `src/three/Player.tsx` | Personagem e câmeras (orbital/3ª/1ª pessoa), colisão simples. | Three |
| `src/three/Effects.tsx` | Faíscas, fumaça, fogo, fluxo de corrente nos cabos. | Three |
| `src/three/GltfOr.tsx` | Carrega `/models/<nome>.glb` se existir; senão usa o modelo procedural. | Three |
| `src/App.tsx` | HUD pt-BR + `<Canvas>`; agenda `tick` (500 ms), `save` (5 s) e `updateAudio` (200 ms). | UI |

### Fluxo de dados do tick

```
setInterval 500ms (App.tsx)
  -> useGame.tick()
       -> postMessage { nodes, cables, mult } para o Web Worker
            -> solve()  (Gauss-Seidel, 300 iterações fixas)
       <- onmessage com SolveResult
            -> advance(state, result, dt=0.5)   [puro]
                 - stepCable/stepNode (térmico)
                 - eventos, economia, nível, missões
                 - detecta novas falhas -> relatório Post-Mortem
            -> set(parcial)  (zustand)
                 -> React re-renderiza Scene/HUD
```

Observação: o resultado do solver é serializado pelo worker (Sets viram arrays) e convertido de volta em `advance`.

## O que funciona (verificado)

- `npm install` — 173 pacotes, sem erro. `npm audit`: 6 vulnerabilidades (3 moderate, 1 high, 2 critical) em dependências transitivas.
- `npm run build` — sucesso (`tsc && vite build`), chunk principal ~1.097 kB (aviso de chunk > 500 kB).
- `npm test` — 13 testes verdes (ver abaixo).
- Execução (Chrome headless via CDP, `http://localhost:5173/`):
  - App monta; `<canvas>` presente; título "Energy City 3D" no DOM.
  - Nenhuma exceção não capturada e nenhum `console.error`/`console.warn` da aplicação.
  - É possível construir uma rede completa Gerador → Trafo → Zona: com 3 nós e 2 cabos de 40 m, a zona foi energizada (`powered=[3]`), `supplied=20/20 kW`, perda calculada de ~0,69 kW, I≈188 A no cabo BT, temperatura subindo (~34 °C).
- Economia/modos funcionam no fluxo (orçamento debitado, `sandbox` com orçamento infinito).

## O que está quebrado ou não verificado

- FPS real em GPU dedicada/integrada **não** foi medido: a medição foi feita em Chrome headless com renderização por software (SwiftShader). Ver "Desempenho".
- Áudio (WebAudio) não foi exercitado em ambiente headless.
- Eventos de crescimento urbano, onda de calor, missões, conquistas e progressão de nível não foram exercitados nesta fase (só análise estática + testes unitários do motor).
- Não existe script de lint (`npm run lint`) nem config ESLint/Prettier no repositório. O comentário `// eslint-disable-line` em `Scene.tsx` não tem efeito sem ESLint.

## Dívidas técnicas

1. **Re-render a cada tick:** `App.tsx` usa `useGame()` (store inteiro) e `Scene.tsx` idem (`{ nodes, cables, ... } = useGame()`). Qualquer mudança de estado re-renderiza HUD e cena inteira a cada 500 ms.
2. **Cabos:** `Scene.tsx` recria a geometria via `useMemo` por mudança de ponta e usa `Line` do drei; potencial de recriação de buffers e aumento de draw calls.
3. **Solver com 300 iterações fixas:** `solve` não tem critério de convergência/tolerância; sempre roda o laço completo. Custo cresce com o tamanho da rede (ver medições).
4. **Worker sem tratamento de erro:** criado de forma preguiçosa em `tick`; se a criação/execução falhar, `busy` fica `true` e a simulação para silenciosamente (sem feedback).
5. **Save sem versionamento:** `localStorage` grava um JSON sem campo de versão do formato, contrariando a regra de compatibilidade/migração do AGENTS.md.
6. **`advance` monolítico:** mistura física térmica, economia, níveis, eventos e missões — difícil de testar isoladamente.
7. **`clickNode` pode lançar exceção:** se o segundo nó do cabo não existir (`nodes.find(...)` retorna `undefined`), `Math.hypot(a.x - b.x, ...)` lança `TypeError`. Não é alcançável pela UI (só se clica em nós renderizados), mas é frágil.
8. **Sem lint/format configurado:** não há `eslint`/`prettier` nem script associado; "sem warnings novos de lint" não é verificável hoje.
9. **Draw calls fixos:** 22 planos de estrada separados (11×2), além de postes/árvores instanciados; sem batching das estradas.
10. **Bundle grande:** chunk único de ~1,1 MB (three + drei + react), acima do limite de aviso de 500 kB.
11. **Efeitos alocam por instância:** cada `Fire` cria 10 materiais de fumaça e 6 faíscas; muitas falhas simultâneas = muitas draw calls.
12. **Física simplificada (documentada):** CC, um só gerador, subestação apenas repassa tensão, rede em árvore, sem validação de sobreposição de construções.

## Desempenho (medido, não estimado)

Ambiente: Chrome headless `--headless=new`, renderização por software SwiftShader (`--use-angle=swiftshader`), Node v20.9.0, Windows. Valores de CPU do solver são representativos; **FPS não é representativo de GPU real**.

| Métrica | Valor medido |
| --- | --- |
| `solve` — rede simples (1 gerador, 1 trafo, 1 zona, 2 cabos) | **0,47 ms** por chamada (média de 200) |
| `solve` — 30 zonas / 60 cabos (estrela HV) | **6,96 ms** por chamada (média de 20); 30 zonas energizadas |
| `advance` — passo da simulação (30 zonas) | **0,0075 ms** por chamada (média de 200) |
| FPS — cena padrão, render por software | **~17 FPS** (42 frames em ~2,5 s) |

Leitura: o gargalo do tick é o `solve` (≈7 ms a 30 zonas/60 cabos), não o `advance`. A 2 Hz (tick de 500 ms) isso é aceitável, mas o laço fixo de 300 iterações e o re-render integral da cena são os principais custos a atacar. O FPS de 17 é piso de software rendering e precisa ser remedido em GPU real.

## Testes de caracterização adicionados

`src/electrical/engine.test.ts` (13 testes):

- Fórmulas: R = ρL/A (cobre) e P = R·I².
- Solver: queda de tensão no cabo BT; malha com cabos em paralelo dividindo corrente; zona com tensão errada vira `mismatch`; zona desconectada sem energia; **cabo BT falhado desconecta a zona**; **cabo primário falhado isola a rede**; **rede sem gerador não energiza nada**.
- Térmico: **`stepCable` esquenta e falha em T_MAX**; **`stepCable` sem corrente esfria até T_amb**; **`stepNode` falha por sobrecarga**; **`stepNode` dentro da capacidade não falha**.

## Comandos da linha de base

```
npm install          # ok
npm run build        # ok (tsc + vite build)
npm test             # 13 passed
npm run dev          # ok em http://localhost:5173/
```

## Próximo passo sugerido (FASE 1)

Estabelecer barreiras de qualidade e desempenho antes de novas features:

1. Adicionar versionamento ao formato de save (`version` + migração) — dívida 5.
2. Tratamento de erro do Worker com feedback ao jogador — dívida 4.
3. Critério de convergência no `solve` (parar cedo) e/ou limitar iterações por tamanho — dívida 3.
4. Seletores granulares no zustand em `App.tsx`/`Scene.tsx` — dívida 1.
5. Configurar ESLint + script `lint` para tornar "sem warnings novos" verificável — dívida 8.
6. Medir FPS em GPU real (navegador com aceleração) para validar a meta de 60/30 FPS.

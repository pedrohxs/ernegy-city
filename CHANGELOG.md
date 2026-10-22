# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/); versionamento semântico.

## [Não lançado]

### Adicionado
- Recuperação de cabos: **Reparar** (25% do custo) e **Remover** (50% de reembolso) direto no Post-Mortem e no inspetor, com undo/redo.

### Documentação
- README transformado em apresentação curta para professor e turma, com passo a passo, física essencial, modos e ficha técnica.
- Guia completo do jogador movido para `docs/GUIA_DO_JOGADOR.md` (glossário, contas, economia, eventos, sintomas/soluções, FAQ e limitações).

## [0.8.2] — Ajustes de personagem e tamanhos

### Alterado
- Personagem: braços refeitos (saem do ombro e descem, com luvas) — não ficam mais soltos.
- Casas voltaram ao pack anterior (`casa`, `casa2`, `casa4`, `casa5`) e ficaram maiores (alvo 10 u); prédios 11 u e hospital 12 u.
- Kit Kenney de prédios movido para `assets-src/kenney-buildings-extra`.

## [0.8.1] — Equipamentos e personagem gerados

### Adicionado
- `gen.glb`, `sub.glb`, `trafo.glb` gerados pelo `equipment.py` (o script agora exporta **só os equipamentos**, sem sobrescrever casa/prédio/hospital).
- `player.glb` (eletricista cartoon) gerado pelo `character.py`, com rotação corrigida em `modelOverrides.ts` (`player: { rotY: Math.PI }`).

## [0.8.0] — Casas Kenney e pacote enxuto

### Adicionado
- Casas agora usam o kit **Kenney** (`casas-buldings/building-type-{h,i,m,g,a,p}`, 6 variações); prédios e hospital continuam do pack anterior.
- Assets não usados movidos para `assets-src/` (deploy de `public/models` caiu para ~730 kB).

## [0.7.0] — Estradas Kenney e personagem

### Adicionado
- **Estradas do kit Kenney** (crossroad + straight) renderizadas por `InstancedMesh` (`src/render/Tiles.tsx`), substituindo as faixas planas.
- `tools/blender/character.py`: gera um **personagem cartoon (eletricista)** low-poly e exporta `player.glb`.
- Acabamento visual: modelos GLB recebem **sombras** e um **emissivo sutil à noite** (janelas acesas); animação de "bob" no personagem ao andar; footprint de colisão aumentado (9 u).
- Kit Kenney duplicado movido para `assets-src/kenney-roadkit-dup` (não vai ao deploy).

## [0.6.0] — Cidade com modelos do pack

### Adicionado
- Conversor: compressão **Draco** (280 kB → 17 kB por casa) e `public/models/rename.json` para nomear direto (`House`→`casa`, `Flat`→`predio`, `Hospital`→`hospital`).
- **Variação de modelos**: casas usam `casa`..`casa5` e prédios `predio`..`predio3` (escolha pelo id do nó).
- Texturas mapeadas para hospital/prédios via `public/models/textures.json`.

### Alterado
- Tamanho dos prédios/casas aumentado (casa 8, prédio 10, hospital 11 unidades de base).

## [0.5.9] — Texturas embutidas e primeiros modelos

### Adicionado
- Conversor embute texturas no `.glb` casando pelo nome (com `public/models/textures.json` opcional para forçar).
- `assets:check` agora reporta a contagem de texturas embutidas.
- `assets-src/` para guardar o pack bruto (fora do deploy).

## [0.5.8] — Conversor OBJ → GLB

### Adicionado
- `npm run models:convert -- <pasta> [saída]`: converte `.obj` (+ `.mtl` + texturas `.png`) em `.glb` com texturas embutidas, sem Blender (usa `obj2gltf`).
- Seção "Caminho 1.5" em `docs/MODELS.md` e nota em `docs/ASSETS.md`.

## [0.5.7] — Modelos sem Blender

### Adicionado
- **Auto-ajuste de modelos**: ao carregar um `.glb`, o jogo encaixa a maior dimensão horizontal no tamanho do tipo e apoia a base no chão — dá para usar modelos prontos sem editar no Blender.
- `src/render/modelOverrides.ts`: ajustes finos opcionais por modelo (rotação/escala/altura).
- `docs/MODELS.md`: passo a passo completo (caminho sem Blender, instalação do Blender no Windows, uso de kits e do script, solução de problemas).

## [0.5.6] — Pipeline de modelos 3D

### Adicionado
- `GltfOr` aceita lista de nomes e tenta na ordem: zonas procuram `casa`/`predio`/`hospital` e caem para `zone`.
- `npm run assets:check` — validador de `.glb` sem dependências (tamanho, compressão Draco/meshopt, bounding box/base Y, nomes de nós, avisos de escala/origem).
- `tools/blender/equipment.py` — gera gen/sub/trafo/casa/predio/hospital low-poly e exporta para `public/models/` (não testado nesta máquina: Blender ausente).
- `docs/ASSETS.md` reescrito: estratégia genéricos (kits CC0) × específicos (script), mapeamento, convenções e validação.

## [0.5.5] — Passe de balanceamento do crescimento

### Adicionado
- `growthCurve()` em `balanceSim.ts`: simula o crescimento da cidade durante cada nível (+1 min) e valida que o orçamento cobre o layout inicial + crescimento; tabela impressa em `npm run balance:sim`.
- Missão **"🚫 Apagão zero: 90 s com tudo aceso"** (`serviceT ≥ 90` e `outageT = 0`).

### Alterado
- Orçamentos dos níveis 6-10 elevados para cobrir o crescimento da cidade (antes 6-8 estouravam).

## [0.5.4] — Cidade viva

### Adicionado
- **Crescimento BFS pelas ruas**: novas casas/prédios/hospitais surgem em lotes livres vizinhos ao que já está energizado (malha de 10, fora das vias), com limite de 60 zonas.
- **Continuidade da cidade**: tempo total atendido × em apagão, com `📶 %` no HUD (só conta depois da primeira luz).
- Missões "🏥 Hospital energizado por 60 s" e "📶 Continuidade ≥ 95% por 2 min"; conquista "Hospital salvo".
- Save guarda os contadores de continuidade (compatível com saves antigos: assumem 0).

## [0.5.3] — Bairro semente

### Adicionado
- **Bairro semente**: em campanha/desafio a cidade começa com três casas (110 V) sem energia; o nível 1 ("Primeira luz") agora é alimentá-las (`target = 60 kW`).
- Tutorial de 4 passos alinhado ao bairro (gerador → trafo 110 V → cabo → casas acesas).
- `everPowered`: o apagão só é anunciado depois que a cidade já teve luz.

### Alterado
- Crescimento urbano só ocorre quando a cidade está **totalmente atendida** (nada de casas brotando durante um apagão).
- Testes de `city`, `clock` e ajustes de balanceamento do nível 1.

## [0.5.2] — Relógio e ciclo dia/noite

### Adicionado
- Relógio do jogo (`src/game/clock.ts`): 24 h em 10 min reais, início às 08:00, nascer 06:00 / pôr 18:00; horário `☀/🌙 HH:MM` no HUD sob as estrelas.
- Iluminação contínua (`dayFactor`/`nightFactor`): céu, névoa, sol, postes e janelas esmaecem suavemente.

### Corrigido
- Fim dos "pops" de dia/noite (antes 120 s com trocas binárias de céu/estrelas) e do piscar do gerador solar; o flag `night` agora tem histerese.

## [0.5.1] — Cidade e correções de UX

### Adicionado
- Tipos de zona: **Casa** (110 V/20 kW), **Prédio** (220 V/40 kW) e **Hospital** (220 V/60 kW, crítico com penalidade maior), com modelos distintos.
- Painel de construção **recolhível** e mais compacto (botão "🏗 Construir").

### Corrigido
- **Apagão falso**: a tela vermelha só aparece com gerador online, cabos e após o tempo de partida — colocar uma carga ainda sem rede não dispara apagão.
- Crescimento urbano não sobrepõe mais construções e anuncia o tipo criado.

## [0.5.0] — Fase final: qualidade e publicação

### Adicionado
- Testes de integração do fluxo principal (construir → simular → falhar → Post-Mortem) e regressões de save (campos novos, save antigo, corrupção).
- Telemetria **local** opcional (log de falhas em `localStorage`, nada é enviado a servidores) com visualização/limpeza em Opções.
- `docs/PERF.md` com a auditoria e as correções.
- `README.md`, `CHANGELOG.md`, `vercel.json` e capturas em `docs/screenshots/`.
- Seleção de slots no menu inicial; "Continuar" desabilitado quando o slot está vazio.

### Alterado
- Solver com critério de convergência (≈15–21× mais rápido).
- `Scene` não re-renderiza mais ao mover o mouse (piso/fantasma em `GroundLayer`).
- Build dividido em chunks de vendor; entrada de 1.214 kB → 66 kB.

## [0.4.0] — Interface e experiência

### Adicionado
- Design system (`theme.css`, `ui.module.css`) e componentes reutilizáveis.
- Menu inicial, pausa, fim de nível com estrelas, Post-Mortem didático, opções e créditos.
- Codex com fórmulas, exemplos e "tentar no jogo" (cenários mínimos).
- HUD por categorias, tooltips e atalhos visíveis; sensibilidade da câmera.

## [0.3.0] — Visual e áudio

### Adicionado
- Direção de arte (`docs/ART.md`), pós-processamento com qualidade Baixa/Média/Alta, sombras e céu.
- Cabos com geometria própria (tubo) e halo de saúde; animação de construção.
- Mixer de áudio (master/música/efeitos/ambiente), trilha procedural e sons de interface.
- Colisão de câmera, transições suaves e modo fotografia.
- Pipeline glTF com cache + Draco/meshopt (`docs/ASSETS.md`).

## [0.2.0] — Jogabilidade e profundidade

### Adicionado
- Grade com snap, fantasma, colisão, mover, desfazer/refazer e demolição com reembolso.
- Prévia do cabo com R, I, perdas, custo e risco térmico.
- Múltiplos geradores (gás/hídrica/solar) e subestação com capacidade/perdas.
- Reparo, manutenção, eventos (pico/tempestade/queda), níveis 1–10 com estrelas.
- Economia documentada (`docs/BALANCE.md`) e script de balanceamento (`npm run balance:sim`).

## [0.1.0] — Fundação técnica

### Adicionado
- Estrutura de pastas, laço de simulação de passo fixo (10 Hz) com pausa e 1×/2×/4×.
- Save versionado com migração, validação e múltiplos slots.
- Seletores granulares do zustand; ESLint + Prettier + `npm run check`; CI no GitHub Actions.
- ErrorBoundary global.

## [0.0.1] — Protótipo (Fase 0)

### Adicionado
- Motor elétrico (R = ρL/A, I = P/U, P = R·I², térmico), solver nodal, store zustand, cena 3D.

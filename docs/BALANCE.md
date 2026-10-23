# Balanceamento — Energy City 3D

Todos os números ficam em `src/data/balance.ts`. Este documento explica as fórmulas e as decisões.

## Física (didática, CC)

- Resistência: **R = ρ·L/A**, com ρ_cobre = 0,017 e ρ_alumínio = 0,028 Ω·mm²/m.
- Corrente: **I = P/U** (cargas de potência constante).
- Queda de tensão: **ΔV = R·I**.
- Perda por efeito Joule: **P = R·I²**.
- Zona só é alimentada se |V/V_nom − 1| ≤ 10%; caso contrário fica roxa (`mismatch`).
- Térmico do cabo: `T ← T + (P·HEAT − (T − T_amb)·COOL)·Δt`, com T_amb = 25 °C, HEAT = 0,005, COOL = 0,1. Falha em T_MAX = 95 °C.
- Térmico de nó: `T_eq = T_amb + NODE_HEAT·(carga/capacidade)²`, NODE_HEAT = 70 (logo, 100% de carga ⇒ 95 °C). Sobrecarga > capacidade aquece e falha.

## Solver e topologia

- Solver nodal (Gauss-Seidel, 300 iterações), ignora componentes falhados/offline.
- Cada transformador tem 2 vértices: lado HV (`id`) e lado BT (`-id`).
- **Vários geradores**: todos os geradores online são fontes fixas em 13,8 kV; o solver divide a carga entre eles e `nodeLoad` reporta a saída de cada um.
- **Laços/malhas são suportados**: como o solver é nodal (Kirchhoff), cabos em paralelo dividem a corrente. Não há rejeição de laços.
- `rmult` (tempestade) multiplica a resistência efetiva de todos os cabos.

## Subestação

- Capacidade: `CAP.sub = 300 kW`. A sub tem `nodeLoad` = throughput (≈ metade da soma dos fluxos nas arestas incidentes, em kW); se exceder a capacidade, aquece e falha como qualquer nó.
- Perdas próprias: `SUB_LOSS = 1%` do throughput, somadas às perdas totais e cobradas na economia.
- Distribuição para vários ramais é inerente: cabos ligados à sub dividem a carga.

## Geradores (`GENS`)

| Tipo | Capacidade | Custo | Partida | Combustível | Noturno |
| --- | --- | --- | --- | --- | --- |
| Gás | 500 kW | R$ 60.000 | 2 s | 0,04 R$/kW·s | não |
| Hídrica | 900 kW | R$ 120.000 | 8 s | 0,02 R$/kW·s | não |
| Solar | 200 kW | R$ 45.000 | 0 s | 0 | só de dia (offline à noite) |

Ao colocar um gerador, `cap` e `genType` vêm do tipo. Geradores ficam offline até `startLeft` chegar a 0 (tempo de partida) ou após uma queda.

## Economia (R$; tempo em segundos)

Atualizada a cada passo (exceto sandbox, onde o orçamento é infinito):

```
Δorçamento = ( fornecida · ENERGY_PRICE
             − perdas    · LOSS_COST
             − (apagão ? déficit · BLACKOUT_PENALTY : 0)
             − combustível
             − manutenção ) · Δt
```

- `ENERGY_PRICE = 0,5` R$/kW·s fornecido.
- `LOSS_COST = 0,3` R$/kW·s perdido (perdas de cabo + sub).
- Apagão quando `fornecida < 0,5 · demanda`; penalidade `BLACKOUT_PENALTY = 0,4` R$ por kW·s de déficit.
- Combustível = Σ (carga do gerador online · fuel do tipo).
- Manutenção = nº de componentes · `MAINTENANCE_COST` (0,5 R$/componente·s) quando ativa.
- Orçamento nunca fica negativo (piso 0).
- Bônus de missão e `LEVEL_BONUS = 50.000` entram por cima.

> Os valores são fictícios e ajustados para o jogo (a unidade de preço é por kW·s, não kWh real).

## Reparo e manutenção

- **Reparo**: componente falhado volta ao ar por `REPAIR_FRACTION = 25%` do valor original (gerador usa o custo do tipo). Restaura `failed=false`, `temp=T_amb`, e para gerador reinicia a partida.
- **Manutenção** (contrato global): custo recorrente de 0,5 R$/componente·s e reduz o desgaste térmico (`MAINT_WEAR = 0,4`), diminuindo a chance de falha por sobrecarga.

## Cidade e continuidade

- **Bairro semente** (campanha/desafio): 3 casas de 110 V (60 kW) que o nível 1 pede para energizar.
- **Crescimento**: a cada `GROWTH_EVERY = 40 s`, **se** `fornecida ≥ demanda` e houver menos de `MAX_ZONES = 60` zonas, surge uma casa/prédio/hospital num lote livre vizinho a uma zona energizada (BFS pela malha de ruas, lotes a cada 10 e longe das vias).
- **Continuidade**: `serviceT` soma `dt` quando `fornecida ≥ demanda`; `outageT` soma quando `fornecida < 0,5·demanda` (apagão). O HUD mostra `serviceT/(serviceT+outageT)`. Ambos só contam **depois da primeira luz** (`everPowered`).
- **Hospital**: `criticalT` soma `dt` enquanto um hospital está energizado; hospital sem energia recebe `CRITICAL_PENALTY` extra na economia.

## Eventos

- **Crescimento urbano**: nova zona a cada `GROWTH_EVERY = 40 s` (fora do sandbox).
- **Onda de calor**: demanda ×1,2 na janela `time > 60 s` e `time % 90 < 20`.
- **Eventos determinísticos** (após 60 s, a cada `EVENT_EVERY = 45 s`, ciclo pico → tempestade → queda):
  - **Pico de consumo**: demanda ×1,5 por 12 s.
  - **Tempestade**: resistência dos cabos ×1,3 por 18 s.
  - **Queda de gerador**: um gerador online sai por 12 s (volta via partida).

## Níveis 1-10

Objetivos variados: fornecimento, perdas e onda de calor. `hold` é o tempo sustentando o objetivo; estrelas dependem do orçamento restante. Cada nível define seu orçamento inicial.

Resultado do script de balanceamento (layouts de referência, `npm run balance:sim`):

| Nível | Alcançável | Fornecido | Perdas % | Custo do layout | Sobra | ⭐ |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | SIM | 80 | 1,1 | 116.983 | 33.812 | 1 |
| 2 | SIM | 80 | 1,2 | 116.983 | 43.812 | 1 |
| 3 | SIM | 80 | 1,2 | 116.983 | 53.812 | 2 |
| 4 | SIM | 160 | 1,2 | 138.971 | 47.618 | 1 |
| 5 | SIM | 144 | 1,2 | 119.480 | 86.963 | 2 |
| 6 | SIM | 240 | 1,1 | 143.966 | 169.014 | 3 |
| 7 | SIM | 240 | 1,1 | 143.966 | 179.014 | 3 |
| 8 | SIM | 320 | 1,1 | 277.943 | 56.030 | 1 |
| 9 | SIM | 384 | 1,2 | 277.943 | 89.238 | 1 |
| 10 | SIM | 400 | 1,1 | 282.937 | 113.022 | 2 |

O layout de referência usa clusters gerador→subestação→trafos→zonas, 1 zona de 220 V (40 kW) por posição, cabos de cobre 95 mm² curtos. Um teste (`src/game/balanceSim.test.ts`) afirma que todos os níveis são alcançáveis e cabem no orçamento.

### Crescimento × orçamento

A cidade cresce a cada 40 s enquanto estiver **totalmente atendida** (~+33 kW por evento, média do sorteio casa/prédio/hospital). O orçamento de cada nível precisa cobrir o layout inicial **e** o crescimento durante o nível + 1 min (validado por `growthCurve()`); por isso os orçamentos dos níveis 6-10 foram elevados.

| Nível | Eventos | +kW | Custo inicial | Custo final | Orçamento | Cabe? |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2 | 67 | 116.983 | 138.971 | 150.000 | SIM |
| 2 | 2 | 67 | 116.983 | 138.971 | 160.000 | SIM |
| 3 | 2 | 67 | 116.983 | 138.971 | 170.000 | SIM |
| 4 | 2 | 67 | 138.971 | 143.966 | 185.000 | SIM |
| 5 | 1 | 33 | 119.480 | 138.971 | 200.000 | SIM |
| 6 | 2 | 67 | 143.966 | 277.943 | 310.000 | SIM |
| 7 | 2 | 67 | 143.966 | 277.943 | 320.000 | SIM |
| 8 | 2 | 67 | 277.943 | 282.937 | 330.000 | SIM |
| 9 | 1 | 33 | 277.943 | 280.440 | 350.000 | SIM |
| 10 | 2 | 67 | 282.937 | 287.931 | 390.000 | SIM |

> O salto dos níveis 6/7 vem da virada de 1→2 clusters de 250 kW no layout de referência; na prática o jogador pode compartilhar o gerador existente e gastar menos.

### Missões de continuidade

- **🏥 Hospital energizado por 60 s** — `criticalT ≥ 60` (só cresce com hospital no ar).
- **📶 Continuidade ≥ 95% por 2 min** — `serviceT ≥ 120` e `serviceT/(serviceT+outageT) ≥ 0,95`.
- **🚫 Apagão zero: 90 s com tudo aceso** — `serviceT ≥ 90` e `outageT = 0` (nenhum apagão desde a primeira luz).

## Assistente contextual

O HUD mostra o próximo passo (gerador → trafo → cabo → zona) e explica o problema quando algo falha: tensão errada, cabo aquecendo/queimado, equipamento sobrecarregado ou zona sem caminho. A lógica fica em `src/game/diagnose.ts` (funções puras) e o cartão pode ser ocultado. Quando a cidade está atendida, ele desaparece.

## Limitações / pendências

- Modelo CC e subestação ideal exceto pelas perdas de throughput (aproximação de metade do fluxo incidente).
- Script de balanceamento desliga eventos aleatórios (roda física + economia + onda de calor de forma determinística).
- Preços fictícios; a escala ainda pode ser refinada em playtest.

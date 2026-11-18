# Balanceamento e simulação

Os valores abaixo vêm de [src/data/balance.ts](../src/data/balance.ts). O jogo usa um modelo didático em corrente contínua com uma unidade de mapa representando um metro de comprimento para os novos cabos.

## Rede elétrica

| Grandeza | Cálculo |
| --- | --- |
| Resistência | **R = ρ·L/A**. Cobre usa 0,017 e alumínio 0,028 Ω·mm²/m. |
| Corrente e queda | **I = P/U** para cargas de potência constante e **ΔV = R·I** no cabo. |
| Perda por efeito Joule | **P = R·I²**. A resistência efetiva inclui o multiplicador de tempestade. |
| Cabo | Temperatura ganha **P·0,005** e perde **(T − 25)·0,1** por segundo. O limite é 95 °C. |
| Equipamento | Temperatura de equilíbrio de **25 + 70·(carga/capacidade)² °C** antes da manutenção. |

Ampacidade é o limite de corrente usado no desgaste dos cabos. Em cobre de 16, 25, 35, 50, 70 e 95 mm², os limites são respectivamente 76, 101, 125, 151, 192 e 232 A. Alumínio usa 78% desses valores. Corrente acima de três vezes a ampacidade provoca rompimento imediato. Integridade cai lentamente em serviço, com desgaste acelerado quando a utilização ultrapassa 85%. A integridade zerada também causa falha.

O solver usa Gauss–Seidel com tolerância de 0,001 V e até 300 iterações. Geradores online são fontes de 13,8 kV. O transformador tem um vértice de alta tensão e outro de baixa, ligado aos imóveis. A subestação faz distribuição em alta tensão, com throughput aproximado e perda própria de 1%. Uma zona é considerada atendida dentro de ±10% da tensão nominal. Instalações podem ter vários geradores e malhas. O editor bloqueia dois cabos com o mesmo par de pontos e o Codex inclui um circuito pré-montado com cabos paralelos. O jogo simplifica redes reais e não calcula corrente alternada, potência reativa ou proteção de distribuição.

## Economia e cidade

- O saldo por segundo considera potência atendida, perdas, combustível, manutenção e penalidade por apagão. Potência atendida rende R$ 0,50 por kW·s e perdas custam R$ 0,30 por kW·s. Abaixo de 50% de atendimento, aplica-se R$ 0,40 por kW·s de déficit com acréscimo para hospitais.
- A manutenção cobra R$ 0,50 por nó por segundo. Reduz o aquecimento-alvo de equipamentos e o desgaste de integridade. Reparo custa 25% do valor original. Remoção de um componente devolve 50% do seu valor. Mover uma peça atualiza os comprimentos e as resistências dos cabos nela conectados e preserva seu custo histórico.
- A cada marco de 40 s, o crescimento automático exige atendimento total, um lote disponível e menos de 60 zonas. Os lotes sugeridos pelo crescimento ficam em uma malha de 10 unidades próxima às zonas energizadas. A continuidade divide o tempo atendido pela soma dos tempos atendido e em apagão, contados a partir da primeira energização.
- Após 60 s, o ciclo de eventos repete pico (+50% por 12 s), tempestade (+30% de resistência por 18 s) e religamento de um gerador (12 s), em intervalos de 45 s. Na Campanha, a onda de calor tem prioridade sobre o pico da demanda e aumenta a carga em 20% por 20 s a cada 90 s, a partir de 90 s. Sandbox fica livre desses eventos.

## Campanha

| Etapa | Meta | Tempo | Piso de entrada |
| --- | --- | --- | --- |
| 1 · Primeira luz | 60 kW | 20 s | R$ 150.000 |
| 2 · Bairro novo | 80 kW | 20 s | R$ 160.000 |
| 3 · Eficiência | 60 kW, perdas ≤ 10% | 20 s | R$ 170.000 |
| 4 · Distrito industrial | 160 kW | 20 s | R$ 185.000 |
| 5 · Onda de calor | 120 kW durante o calor | 15 s | R$ 200.000 |
| 6 · Metrópole | 240 kW | 25 s | R$ 310.000 |
| 7 · Rede enxuta | 220 kW, perdas ≤ 8% | 25 s | R$ 320.000 |
| 8 · Alta demanda | 320 kW | 25 s | R$ 330.000 |
| 9 · Tudo ao mesmo tempo | 300 kW durante o calor | 15 s | R$ 350.000 |
| 10 · Energia para todos | 400 kW | 30 s | R$ 390.000 |

Uma falha ativa interrompe a estabilidade pedida pelas metas. A partida fica suspensa na tela de promoção. As estrelas refletem o saldo naquele momento. A próxima etapa preserva a rede, o histórico da cidade e o maior valor entre saldo atual e piso da etapa. A etapa 10 encerra a campanha. O valor **level = 11** no save representa essa conclusão. Missões paralelas creditam recompensas uma vez, de acordo com o que já está registrado no slot.

Para verificar mudanças, rode **npm run balance:sim**. O script testa cada meta com um layout de referência e uma estimativa de orçamento para expansão. O teste de integração do store cobre da primeira ligação à expansão. Na validação da maquete, um roteiro adicional usou as ações do store para ampliar uma cidade contínua e concluir as dez etapas, chegando a 420 kW atendidos em 327,1 s de simulação, sem falhas de componentes.

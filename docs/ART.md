# Direção de arte

O bairro é uma maquete urbana. Use asfaltos e vegetação dessaturados e mantenha o contraste nos equipamentos, nas fachadas e nos estados da rede. O menu enquadra uma maquete demonstrativa independente das partidas salvas.

## Modelos e iluminação

- As casas têm volumes baixos, telhados e janelas variadas. O prédio é escalonado. O hospital tem marquise e sinalização frontal.
- A escala das construções é de 1,04 nos eixos horizontais e 1,14 na altura. As dimensões resultantes orientam colisão, pontos de cabo e posicionamento dos rótulos.
- O eletricista mede cerca de duas unidades. Em terceira pessoa, a câmera se aproxima o suficiente para ler o uniforme e a passada junto às portas das casas.
- Equipamentos de gás, hídrica e solar se distinguem por chaminés, conjunto de turbinas e painéis, respectivamente. O transformador tem isoladores e radiadores, e a subestação tem vários pontos de distribuição.
- As peças da cidade são definidas em [districtParts.ts](../src/render/districtParts.ts). Estrutura, base e janelas usam lotes de geometria compartilhados. Estrutura e base têm cores por vértice. As janelas têm materiais próprios para o estado elétrico.
- Fundo e névoa acompanham o ciclo de dia e noite. A luz das janelas cresce ao anoitecer apenas nos imóveis atendidos. Um dia de jogo equivale a 600 s de simulação e começa às 08:00. A simulação determina a disponibilidade solar.
- Ruas, calçadas, lotes, árvores e postes usam instâncias. A grade aparece ao construir ou escolher o destino de uma movimentação.

## Leitura da rede

| Sinal | Estado |
| --- | --- |
| Janelas iluminadas | Imóvel atendido. |
| Cabo verde | Corrente passando. |
| Rótulo e contorno roxos | Tensão fora da faixa ou ligação incompatível. |
| Âmbar | Cabo aquecendo ou equipamento perto da capacidade. |
| Vermelho e rótulo | Falha. Fogo representa falha térmica em cabo. |
| Azul e verde-claro | Origem e destino sugerido durante a ligação. |

O HUD usa a mesma ênfase verde-clara para seleção, ações primárias e avanço. A janela de prévia mostra os riscos por escrito. O Post-Mortem descreve o motivo real da falha.

## Qualidade gráfica

| Preset | Sombras | Pós-processamento | Limite de DPR |
| --- | --- | --- | --- |
| Baixa | Desligadas | Sem compositor | 1,0 |
| Média | Mapa de 1024 | Sem compositor | 1,2 |
| Alta | Mapa de 2048 | Bloom suave, SSAO e tone mapping no compositor | 1,5 |

Os presets Baixa e Média usam o tone mapping ACES do renderizador. A decisão de usar o compositor apenas no preset Alta mantém a iluminação básica em máquinas com menor orçamento de GPU. Veja [Desempenho](PERF.md) para o teste de carga.

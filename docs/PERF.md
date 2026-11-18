# Desempenho

## Maquete urbana

O teste de carga comparou a revisão anterior (**0efeda3**) com a maquete (**8b60f7d**) no mesmo Windows. O cenário usa **30 zonas, 10 transformadores, 5 geradores e 60 cabos**, com a câmera no mesmo enquadramento. O Chrome headless rodou em **1024 × 640**, preset **Média** e DPR 1. A cena ficou pausada para isolar renderização. Os FPS são medidos em uma janela de aproximadamente 4 s com **requestAnimationFrame**. As chamadas e os triângulos são as médias dos contadores do renderizador, incluindo as passagens de sombra e pós-processamento.

O cenário tem cinco grupos com um gerador a gás e dois transformadores de 220 V por grupo. Cada transformador atende três prédios e há cabos entre prédios vizinhos no mesmo ramal. A câmera fica em **(94, 104, 146)**, olhando para **(24, 0, 30)**. Na rodada da integrada, o contexto WebGL pediu **low-power** e o renderer confirmou a Radeon.

| Renderizador | FPS antes | FPS depois |
| --- | ---: | ---: |
| NVIDIA GeForce GTX 1650, D3D11 | 144 | 144 |
| AMD Radeon integrada, D3D11 | — | 144 |
| SwiftShader, software | 2,4 | 6,2 |

| Métrica de renderização | Antes | Depois |
| --- | ---: | ---: |
| Chamadas de desenho por quadro | 392 | 233 |
| Triângulos por quadro | 328.699 | 55.162 |

Uma segunda rodada de 12 s com a cidade em simulação registrou **143,5 FPS** na GTX 1650 e **144 FPS** na Radeon integrada. Ambas ultrapassaram as metas de 60 e 30 FPS nessas condições. Os FPS do headless dependem do ritmo de quadros do ambiente. Para comparar outra revisão, use a mesma GPU, resolução, preset, posição de câmera e topologia. Teste também construção e movimento da câmera para avaliar estabilidade de frame time durante interações.

A maior redução vem de agrupar peças estáticas da maquete por cores de vértice e instanciar o terreno e a decoração. O preset Média mantém sombras e usa o tone mapping do renderizador. O compositor fica no preset Alta. Cabos mantêm a geometria enquanto os endpoints não mudam. Os seletores da cena separam posições e estados visuais da telemetria por passo.

## Build e histórico

O build da maquete gera aproximadamente **117 kB** para o chunk de entrada (**42 kB gzip**). O chunk de Three.js continua em aproximadamente **684 kB** (**176 kB gzip**), acima do limite padrão de 500 kB do aviso do Vite.

A [linha de base histórica](BASELINE.md) documenta a versão com passo de 500 ms e 300 iterações fixas. Medições feitas naquela fase usam outra cena e outro laço de simulação.

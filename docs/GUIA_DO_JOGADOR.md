# 📖 Guia completo — Energy City 3D

**Manual detalhado para jogar, entender a física e apresentar o projeto.**

> Para a visão rápida de apresentação, volte ao [README](../README.md). Este guia é a referência completa: passo a passo, glossário, contas, modos, economia e solução de problemas.

![Gameplay do Energy City 3D](screenshots/gameplay.png)

> **Novo por aqui?** Vá direto para [Como jogar em 5 minutos](#como-jogar-em-5-minutos). Você não precisa saber eletricidade para começar.

---

## O que é este jogo (em 1 minuto)

Imagine a cidade como um corpo e a rede elétrica como a circulação sanguínea:

- o **gerador** é o coração, que produz a energia;
- os **cabos** são as veias, que levam essa energia;
- o **transformador** é um adaptador: recebe 13.800 V e entrega 110 V ou 220 V para as casas;
- as **zonas** (casa, prédio, hospital) são quem consome.

Você é o engenheiro da cidade. Não basta clicar e ver a luz acender: cada cabo tem comprimento, material e espessura; cada equipamento tem um limite de potência; e a eletricidade obedece às mesmas contas da vida real. Se o cabo for fino ou longo demais, ele esquenta, pega fogo e a cidade apaga.

**Objetivo:** atender a demanda da cidade, dentro do orçamento, sem falhas, pelo tempo pedido em cada nível.

**Para quem é:** curiosos, estudantes, professores e jogadores que gostam de quebra-cabeça com consequências reais. Funciona melhor em computador (teclado e mouse), em navegadores modernos.

**O que dá para aprender jogando:** por que a energia é transmitida em alta tensão, por que cabos grossos perdem menos, o que é queda de tensão, por que um transformador queima por sobrecarga e como diagnosticar um apagão.

---

## Como jogar em 5 minutos

Ao iniciar uma **Nova campanha**, a cidade já tem um bairro com **três casas de 110 V** esperando energia. O nível 1 pede **60 kW atendidos por 20 segundos**.

1. **Escolha o slot** no menu (0, 1 ou 2) e clique em **▶ Nova campanha**.
2. No painel esquerdo, em **Geração**, escolha **Gerador** → **Gás**.
3. Clique em um espaço livre no chão, perto das três casas. Deixe uma distância de pelo menos 10 unidades entre construções.
4. Em **Transmissão**, escolha **Trafo** e deixe a tensão em **110 V**. Coloque-o perto das casas.
5. Em **Conexão**, escolha **Cabo**. Clique no **gerador** e depois no **trafo**. Esse é o trecho de alta tensão (13,8 kV).
6. Ainda com **Cabo**, clique no **trafo** e depois na **primeira casa**. Repita para as outras duas casas. Cada casa precisa de um caminho até o trafo.
7. Observe a barra superior: a **demanda** deve ficar em 60 kW e a **atendida** também. O objetivo começa a contar.
8. Mantenha tudo funcionando por 20 segundos. O nível termina e você recebe de 1 a 3 estrelas conforme o orçamento que sobrou.

![Bairro semente com as três casas](screenshots/casas.png)

> **Dica:** a subestação é opcional no nível 1. O caminho mínimo é **gerador → trafo → casas**. A subestação vira útil quando a rede cresce e você quer concentrar vários ramais.

### Se a casa ficar roxa

Roxo significa **tensão errada**, não falta de cabo. Exemplos:

- uma casa de **110 V** ligada em um trafo de **220 V**;
- uma casa ligada **direto no gerador**, sem transformador;
- uma casa de 110 V ligada em uma rede de 220 V.

A solução é conferir a tensão do trafo e da zona, ou refazer a ligação passando pelo lado correto do transformador.

### Se nada acender

Escolha a ferramenta **Analisar** e clique no componente para ver tensão, carga, temperatura e estado. Também confira:

- o gerador já terminou a partida? (gás: 2 s; hídrica: 8 s)
- o cabo realmente conecta os dois pontos?
- algum componente está em **FALHA** (vermelho)?
- a demanda é maior do que a energia disponível?
- é noite e o gerador é **solar**? (solar só opera de dia)

---

## Entendendo cada peça do jogo

| Peça                      | O que é                     | O que faz no jogo                                                                                                                                        |
| ------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Gerador**               | Fonte de energia            | Produz em **13,8 kV**. Pode ser a gás, hídrico ou solar. Tem capacidade, custo, tempo de partida e combustível.                                          |
| **Subestação**            | Concentrador de alta tensão | Não muda a tensão. Serve de hub para vários ramais, tem capacidade de **300 kW** e perdas próprias de **1%**. É opcional.                                |
| **Transformador (trafo)** | Adaptador de tensão         | Recebe 13,8 kV e entrega **110 V ou 220 V**. Capacidade de **150 kW**. O lado de alta tensão é ligado ao gerador/subestação; o lado de baixa, às zonas.  |
| **Cabo**                  | Condutor                    | Leva energia entre dois pontos. Tem **material** (cobre/alumínio), **seção** (16 a 95 mm²), **comprimento**, resistência, corrente, perda e temperatura. |
| **Zona**                  | Consumidor                  | Casa (110 V, 20 kW), prédio (220 V, 40 kW) ou hospital (220 V, 60 kW, crítico). Sem energia, a cidade perde receita e continuidade.                      |
| **Chão / malha**          | Terreno                     | A construção encaixa em uma grade de 10 unidades. As ruas servem de caminho para o crescimento da cidade.                                                |

### Tipos de gerador

| Gerador     | Capacidade | Custo      | Partida | Combustível  | Observação                            |
| ----------- | ---------- | ---------- | ------- | ------------ | ------------------------------------- |
| **Gás**     | 500 kW     | R$ 60.000  | 2 s     | 0,04 R$/kW·s | Opção inicial equilibrada.            |
| **Hídrica** | 900 kW     | R$ 120.000 | 8 s     | 0,02 R$/kW·s | Cara, mas potente e barata de operar. |
| **Solar**   | 200 kW     | R$ 45.000  | 0 s     | Grátis       | **Só funciona de dia**.               |

### Tipos de zona

| Zona         | Tensão | Potência | Crítica? | Observação                            |
| ------------ | ------ | -------- | -------- | ------------------------------------- |
| **Casa**     | 110 V  | 20 kW    | Não      | A carga mais comum do bairro inicial. |
| **Prédio**   | 220 V  | 40 kW    | Não      | Consome o dobro de uma casa.          |
| **Hospital** | 220 V  | 60 kW    | **Sim**  | Sem energia, a penalidade é maior.    |

---

## Entendendo as grandezas (glossário para leigos)

| Termo                    | O que significa                                                                | Como aparece no jogo                                                              |
| ------------------------ | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| **Tensão (V)**           | A “pressão” da eletricidade. É o que empurra a corrente.                       | 13.800 V na alta tensão; 110 V ou 220 V nas zonas.                                |
| **Corrente (A)**         | A “vazão” de eletricidade que passa pelo cabo.                                 | `I = P / U`. Quanto menor a tensão, maior a corrente para a mesma potência.       |
| **Potência (kW)**        | Quanta energia por segundo um equipamento consome ou produz.                   | Casa 20 kW; trafo 150 kW; gerador 500/900/200 kW.                                 |
| **Demanda**              | Soma de tudo o que a cidade quer consumir agora.                               | Número no topo da tela. Sobe com o crescimento e com eventos.                     |
| **Atendida**             | Parte da demanda que está realmente recebendo energia.                         | Se for menor que a demanda, alguém está no escuro.                                |
| **Perdas**               | Energia que vira calor nos cabos e na subestação, em vez de chegar ao destino. | Número amarelo no topo. Perda alta esquenta o cabo e custa dinheiro.              |
| **Resistência (Ω)**      | O quanto o cabo “atrapalha” a passagem da corrente.                            | `R = ρ·L/A`: aumenta com o comprimento e diminui com a espessura.                 |
| **Queda de tensão (ΔV)** | Quanta tensão se perde ao longo do cabo.                                       | `ΔV = R·I`. Se a tensão final sair mais de 10% do valor nominal, a zona não liga. |
| **Efeito Joule**         | Aquecimento causado pela corrente passando pela resistência.                   | `P = R·I²`. É o que faz o cabo esquentar até 95 °C e falhar.                      |
| **Apagão**               | A cidade está fornecendo menos da metade do que precisa.                       | Aviso vermelho **🚨 APAGÃO** e sirene.                                            |
| **Continuidade**         | Percentual de tempo em que a cidade ficou atendida.                            | `📶` no topo. Só começa a contar depois da primeira luz.                          |
| **Orçamento**            | Dinheiro disponível para construir e operar.                                   | `💰` no topo. Em sandbox é infinito (`∞`).                                        |
| **Combo**                | Multiplicador de pontos por ficar sem falhas.                                  | `×1` a `×10`; cresce a cada 20 s sem falhas.                                      |
| **Post-Mortem**          | Relatório que explica uma falha com as contas.                                 | Abre automaticamente quando um cabo ou equipamento queima.                        |
| **Codex**                | Manual de fórmulas e exemplos do jogo.                                         | Botão **📐 Codex** no menu e na pausa.                                            |
| **Slot**                 | Um espaço de save independente.                                                | Três slots no menu inicial.                                                       |

---

## Entendendo a tela

| Área                     | O que mostra                                                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Barra superior**       | Demanda, energia atendida, perdas, orçamento, pontuação, combo, continuidade, relógio do jogo, nível/objetivo, evento ativo e estrelas da campanha.           |
| **Painel de construção** | Ferramentas separadas em Geração, Transmissão, Consumo, Conexão e Edição. Também tem pausa, velocidades, desfazer/refazer, manutenção, opções, som e atalhos. |
| **Seletores**            | Material do cabo (cobre/alumínio), seção (16–95 mm²), tensão do trafo (110/220 V), tipo de gerador e tipo de zona.                                            |
| **Lista de cabos**       | Todos os cabos com corrente, queda, perda e temperatura. Clique para inspecionar.                                                                             |
| **Missões e conquistas** | Objetivos extras com recompensa em dinheiro e conquistas permanentes.                                                                                         |
| **Inspetor**             | Ao selecionar um componente, mostra tensão, carga, temperatura, estado e a opção de reparar (se falhou). Em cabos, mostra as contas de R, ΔV e perda.         |
| **Tutorial**             | Quatro passos guiados no primeiro bairro, com **Próximo** e **Pular**.                                                                                        |
| **Cores**                | **Roxo** = tensão errada; **vermelho escuro** = componente falhado; **amarelo** = perto do limite; **fogo/faísca** = cabo superaquecendo ou queimado.         |

### As cores dos cabos

- **Verde → amarelo → vermelho:** o cabo está esquentando. Amarelo é alerta; vermelho é perigo.
- **Faíscas:** o cabo passou de 75 °C.
- **Fogo:** o cabo passou de 95 °C e falhou. Ele para de conduzir e precisa ser substituído.

---

## As contas do jogo (sem susto)

O jogo usa quatro fórmulas. Você não precisa decorá-las: o inspetor e o Post-Mortem mostram as contas prontas.

### 1. Resistência do cabo

```
R = ρ · L / A
```

- `R` = resistência em ohms (Ω)
- `ρ` = resistividade do material: cobre **0,017** e alumínio **0,028** Ω·mm²/m
- `L` = comprimento em metros
- `A` = seção do cabo em mm²

Quanto mais longo e mais fino o cabo, maior a resistência. O alumínio resiste mais que o cobre, mas custa menos.

### 2. Corrente

```
I = P / U
```

Para entregar a mesma potência, uma tensão menor exige uma corrente muito maior. É por isso que a rede de alta tensão existe.

### 3. Queda de tensão

```
ΔV = R · I
```

É a “pressão” que se perde no caminho. A zona só liga se a tensão que chega estiver dentro de **±10%** da tensão nominal.

### 4. Perda por efeito Joule

```
P = R · I²
```

A perda cresce com o **quadrado** da corrente. Dobrar a corrente quadruplica o aquecimento. Essa é a razão pela qual cabos finos e longos falham.

### Exemplo prático: uma casa de 20 kW em 110 V

| Situação                   | Conta                  | Resultado                    |
| -------------------------- | ---------------------- | ---------------------------- |
| Corrente                   | `I = 20.000 / 110`     | **≈ 182 A**                  |
| Cabo de cobre 35 mm², 20 m | `R = 0,017 × 20 / 35`  | **0,0097 Ω**                 |
| Queda de tensão            | `ΔV = 0,0097 × 182`    | **≈ 1,8 V (1,6%)** — ótimo   |
| Perda                      | `P = 0,0097 × 182²`    | **≈ 321 W (1,6%)** — ok      |
| O mesmo cabo com 100 m     | `R = 0,017 × 100 / 35` | **0,0486 Ω**                 |
| Queda de tensão            | `ΔV = 0,0486 × 182`    | **≈ 8,8 V (8%)** — no limite |
| Perda                      | `P = 0,0486 × 182²`    | **≈ 1,6 kW (8%)**            |

No segundo caso a casa ainda liga (8% < 10%), mas o cabo dissipa 1,6 kW em calor. A temperatura de equilíbrio passa de **105 °C**, acima do limite de 95 °C — ou seja, o cabo vai falhar. A solução é encurtar o trecho, aumentar a seção ou dividir a carga.

### Por que a alta tensão?

Para transportar **150 kW**:

- em **13.800 V**: `I ≈ 10,9 A`;
- em **220 V**: `I ≈ 682 A`.

A corrente é cerca de 62 vezes maior. Como a perda cresce com `I²`, a perda no mesmo cabo seria milhares de vezes maior. Por isso o jogo usa 13,8 kV do gerador até o transformador e só baixa a tensão perto de quem consome.

---

## Regras de ouro (checklist)

1. **Respeite a cadeia:** gerador → (subestação opcional) → trafo → zona.
2. **Nunca ligue o gerador direto em uma casa.** A casa espera 110/220 V e receberia 13.800 V; ela fica roxa.
3. **Case as tensões:** trafo de 110 V alimenta casas; trafo de 220 V alimenta prédios e hospitais.
4. **Fique dentro de ±10%** da tensão nominal. Fora disso, a zona não recebe energia.
5. **Dimensione o cabo:** trechos longos ou com muita corrente pedem seção maior, cobre ou cabos em paralelo.
6. **Respeite a capacidade:** trafo 150 kW, subestação 300 kW, gerador conforme o tipo. Sobrecarga esquenta e falha.
7. **Cabos em paralelo funcionam:** dois cabos entre os mesmos pontos dividem a corrente e reduzem a resistência equivalente.
8. **A subestação é opcional** no começo: ela só concentra ramais e adiciona 1% de perda.
9. **Planeje o crescimento:** a cidade ganha novas zonas a cada 40 s enquanto estiver totalmente atendida.
10. **Use o Codex e o Post-Mortem:** eles mostram a conta e a solução, não só o erro.

---

## Sintomas, causas e soluções

| Sintoma                    | Causa provável                                                                     | Como resolver                                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Casa roxa e sem energia    | Tensão errada (trafo 220 V em casa 110 V, ou ligação direta no gerador)            | Confira a tensão do trafo e refaça a ligação pelo lado de baixa tensão.                                  |
| Casa apagada, mas não roxa | Sem caminho elétrico, gerador offline, componente falhado ou déficit de energia    | Use **Analisar**, veja a lista de cabos e confira o estado do gerador.                                   |
| Tudo apagado de repente    | Sobrecarga, cabo queimado, queda de gerador ou tempestade                          | Abra o Post-Mortem, veja o componente em falha e reconstrua o trecho.                                    |
| Cabo amarelo, com faíscas  | Corrente alta para a seção/comprimento                                             | Aumente a seção, use cobre, encurte o trecho ou duplique o cabo.                                         |
| Cabo com fogo              | Passou de 95 °C e falhou                                                           | O trecho precisa ser substituído. Veja a limitação de reparo de cabos abaixo.                            |
| Trafo ou subestação quente | Carga acima da capacidade                                                          | Divida a carga em mais transformadores/ramais ou aumente a capacidade da rede.                           |
| Dinheiro acabando          | Cabos longos e grossos são o maior custo                                           | Encurte caminhos, use alumínio nos trechos de alta tensão (baixa corrente) e evite cabos desnecessários. |
| Objetivo não avança        | A meta ficou sem ser cumprida por um instante                                      | O contador zera. Mantenha a demanda atendida continuamente pelo tempo pedido.                            |
| Não consigo construir      | Fora do modo orbital, espaço ocupado, orçamento insuficiente ou limite de 60 zonas | Volte para **🎥 Orbital**, escolha outro lote e confira o orçamento.                                     |
| Demanda subiu sozinha      | Crescimento urbano, onda de calor ou pico de consumo                               | Veja o evento no topo e amplie a geração/transformação antes do próximo pico.                            |
| Solar não gera             | É noite                                                                            | Use outro gerador ou espere o dia (o ciclo completo dura 10 minutos reais em 1×).                        |

---

## Modos de jogo

### Campanha

Dez níveis com metas crescentes. A cidade continua de um nível para o outro; o orçamento é renovado no início de cada nível. Você ganha **1 estrela** por concluir, **2** se sobrar bastante orçamento e **3** se sobrar ainda mais. O saldo que sobra não é somado ao próximo nível: ele serve para medir a eficiência do seu projeto.

| Nível | Título              | Objetivo                               | Tempo | Orçamento  |
| ----- | ------------------- | -------------------------------------- | ----- | ---------- |
| 1     | Primeira luz        | Atender 60 kW                          | 20 s  | R$ 150.000 |
| 2     | Bairro novo         | Atender 80 kW                          | 20 s  | R$ 160.000 |
| 3     | Eficiência          | Atender 60 kW com perdas ≤ 10%         | 20 s  | R$ 170.000 |
| 4     | Distrito industrial | Atender 160 kW                         | 20 s  | R$ 185.000 |
| 5     | Onda de calor       | Atender 120 kW durante a onda de calor | 15 s  | R$ 200.000 |
| 6     | Metrópole           | Atender 240 kW                         | 25 s  | R$ 310.000 |
| 7     | Rede enxuta         | Atender 220 kW com perdas ≤ 8%         | 25 s  | R$ 320.000 |
| 8     | Alta demanda        | Atender 320 kW                         | 25 s  | R$ 330.000 |
| 9     | Tudo ao mesmo tempo | Atender 300 kW durante a onda de calor | 15 s  | R$ 350.000 |
| 10    | Energia para todos  | Atender 400 kW                         | 30 s  | R$ 390.000 |

### Desafio

Você começa com o mesmo bairro e **R$ 200.000**, mas a meta é chegar a **150 kW de demanda** e manter tudo atendido por **20 segundos**. O crescimento e os eventos continuam ativos. Ao concluir, o jogo mostra quanto você gastou.

### Sandbox

Dinheiro infinito, sem crescimento automático, sem eventos e sem economia. É o modo para testar layouts, experimentar cabos em paralelo e aprender sem pressão. A física continua valendo: cabo fino ainda queima.

### Save e continuidade

- **Três slots** independentes.
- **Autosave a cada 5 segundos de jogo** no `localStorage` do navegador.
- Não há botão manual de salvar na interface atual; espere alguns segundos após construir antes de fechar a aba.
- O save guarda a versão do formato e é migrado automaticamente; saves antigos continuam funcionando.
- Não há nuvem: limpar os dados do navegador apaga os saves.
- **Reiniciar nível** (na pausa) recomeça o modo atual do zero.

---

## Eventos e dificuldade

| Evento                 | Quando acontece                                | Efeito                                                          |
| ---------------------- | ---------------------------------------------- | --------------------------------------------------------------- |
| **Crescimento urbano** | A cada 40 s, se a cidade estiver 100% atendida | Uma nova casa, prédio ou hospital aparece. O limite é 60 zonas. |
| **Onda de calor**      | Campanha, a partir de 60 s, em janelas de 20 s | Demanda **+20%**.                                               |
| **Pico de consumo**    | Após 60 s, a cada 45 s (fora do sandbox)       | Demanda **+50%** por 12 s.                                      |
| **Tempestade**         | Após 60 s, a cada 45 s (fora do sandbox)       | Resistência dos cabos **+30%** por 18 s.                        |
| **Queda de gerador**   | Após 60 s, a cada 45 s (fora do sandbox)       | Um gerador sai do ar por 12 s e depois religa.                  |
| **Ciclo dia/noite**    | 24 h de jogo em 10 min reais (1×)              | Começa às 08:00. Solar só gera de dia; janelas acendem à noite. |

Os eventos são determinísticos (pico → tempestade → queda), então dá para se preparar. O HUD mostra o evento ativo.

---

## Economia

O dinheiro entra e sai enquanto o jogo roda. Todos os números ficam em [`src/data/balance.ts`](../src/data/balance.ts) e são fictícios, ajustados para o jogo (a unidade de tempo é o segundo de jogo, não o kWh real).

| Item                          | Valor                                                                             |
| ----------------------------- | --------------------------------------------------------------------------------- |
| Receita por energia fornecida | **0,5 R$ por kW·s**                                                               |
| Custo das perdas              | **0,3 R$ por kW·s** perdido                                                       |
| Penalidade de apagão          | **0,4 R$ por kW·s** de déficit, quando o atendimento cai abaixo de 50% da demanda |
| Hospital sem energia          | Penalidade extra de **1,5×**                                                      |
| Combustível                   | Carga do gerador × taxa do tipo (gás 0,04; hídrica 0,02; solar 0)                 |
| Manutenção                    | **0,5 R$ por componente por segundo** (opcional; reduz o desgaste térmico)        |
| Reparo de componente falhado  | **25%** do valor original (gerador, subestação ou trafo)                          |
| Demolição                     | Devolve **50%** do valor do componente                                            |
| Missões                       | R$ 5.000 a R$ 30.000 cada                                                         |

O orçamento nunca fica negativo: se acabar, o jogo trava em zero e você precisa esperar a receita ou demolir algo.

### Onde o dinheiro vai

O gasto que mais cresce é o **cabo**. O preço é proporcional ao comprimento e à seção:

- cobre 35 mm²: **R$ 92/m**;
- alumínio 35 mm²: **R$ 48/m**;
- cobre 95 mm²: **≈ R$ 250/m**.

Por isso, medir o caminho e escolher bem a seção vale mais do que construir rápido. Em trechos de alta tensão, onde a corrente é baixa, o alumínio costuma dar conta por menos dinheiro.

---

## Controles

| Entrada                     | Ação                                                        |
| --------------------------- | ----------------------------------------------------------- |
| **Clique no chão**          | Construir a peça selecionada                                |
| **Clique em um componente** | Selecionar, conectar cabo ou demolir, conforme a ferramenta |
| **Arrastar o mouse**        | Girar a câmera orbital; olhar em 3ª/1ª pessoa               |
| **Roda do mouse**           | Zoom na câmera orbital                                      |
| **Espaço**                  | Pausar / retomar                                            |
| **1 / 2 / 3**               | Velocidade **1× / 2× / 4×**                                 |
| **V**                       | Alternar câmera orbital / 3ª pessoa / 1ª pessoa             |
| **WASD**                    | Andar nos modos de personagem                               |
| **Shift**                   | Correr                                                      |
| **Q / E**                   | Girar a câmera                                              |
| **P**                       | Modo fotografia                                             |
| **Ctrl+Z / Ctrl+Y**         | Desfazer / refazer                                          |
| **Esc**                     | Fechar janela ou pausar                                     |
| **⌨** no painel             | Ver a lista de atalhos dentro do jogo                       |

> A construção só funciona no modo **Orbital**. Nos modos de personagem, a câmera serve para explorar a cidade.

---

## Codex, Post-Mortem e aprendizado

### Codex do Engenheiro

O **📐 Codex** reúne as fórmulas com exemplos numéricos e um botão **“Tentar no jogo”** que carrega um cenário mínimo no sandbox:

- Lei de Ohm;
- resistência do condutor;
- potência e corrente;
- perda por efeito Joule;
- cabos em paralelo.

### Post-Mortem

Quando um cabo ou equipamento falha, o jogo abre um relatório com o que aconteceu, passo a passo:

- corrente e queda de tensão do cabo;
- resistência calculada;
- perda em kW;
- temperatura atingida;
- carga e capacidade do equipamento;
- lista de soluções possíveis.

O objetivo não é punir: é mostrar **por que** falhou e **como** resolver.

### Missões

| Missão                              | Recompensa |
| ----------------------------------- | ---------- |
| Alimente uma zona                   | R$ 5.000   |
| Distribua 110 V corretamente        | R$ 8.000   |
| Atenda uma indústria de 220 V       | R$ 8.000   |
| Perdas < 10% com ≥ 60 kW            | R$ 15.000  |
| Atenda 200 kW                       | R$ 25.000  |
| 120 s sem falhas                    | R$ 15.000  |
| 🏥 Hospital energizado por 60 s     | R$ 20.000  |
| 📶 Continuidade ≥ 95% por 2 min     | R$ 25.000  |
| 🚫 Apagão zero: 90 s com tudo aceso | R$ 30.000  |

### Conquistas

💡 Primeira luz · 🔥 Combo ×5 · 🏙 Nível 3 · 🧯 Sobreviveu a uma falha · 🏥 Hospital salvo

As conquistas são permanentes no save e não pagam dinheiro.

---

## Perguntas frequentes

**Preciso saber eletricidade para jogar?**
Não. O tutorial, o Codex e o Post-Mortem explicam o necessário. Quem já sabe pode usar as fórmulas a seu favor.

**Funciona no celular?**
O jogo foi feito para **computador**, com teclado e mouse. Não há layout touch dedicado; em telas pequenas a interface pode ficar apertada.

**O jogo salva sozinho?**
Sim, a cada 5 segundos de jogo, em um dos três slots do navegador. Como não há botão manual de salvar na interface atual, espere alguns segundos após construir antes de fechar a aba.

**Perdi meu save. O que aconteceu?**
Saves ficam no `localStorage`. Limpar dados do navegador, usar modo anônimo ou trocar de navegador/dispositivo apaga o acesso. Não há conta nem nuvem.

**Preciso de internet?**
O jogo é um site estático; não há backend. Depois de carregado, a simulação roda no navegador. Alguns modelos comprimidos podem baixar o decoder na primeira carga.

**Por que a cidade cresce sozinha?**
É a proposta: a cidade só cresce quando você a mantém totalmente atendida. Se ela crescer demais, o orçamento e a rede precisam acompanhar.

**Um cabo queimou e não consigo repará-lo. E agora?**
Hoje não existe botão de reparo direto para cabos. O jeito mais barato é demolir uma **zona** ligada ao trecho (zonas são gratuitas), reconstruí-la e refazer o cabo. Para trechos entre gerador e trafo, é preciso remover um dos equipamentos. Essa é uma das melhorias prioritárias do projeto.

**Posso usar vários geradores?**
Sim. Todos os geradores online são fontes fixas em 13,8 kV, e o solver divide a carga entre eles. Cuidado com a capacidade individual.

**Cabos em paralelo funcionam?**
Sim. A rede aceita malhas; dois cabos entre os mesmos pontos dividem a corrente e reduzem a resistência equivalente.

**A campanha acaba no nível 10?**
O conteúdo planejado vai até o nível 10. Ao concluir, o jogo continua no nível 10 (ainda não há tela de encerramento).

**Dá para trocar os modelos 3D?**
Sim. O jogo procura arquivos em `public/models/` e usa um modelo procedural quando não encontra. Veja [`docs/ASSETS.md`](ASSETS.md) e [`docs/MODELS.md`](MODELS.md).

---

## Limitações conhecidas (versão atual)

- **Desktop primeiro:** interface pensada para teclado e mouse; sem controles touch dedicados.
- **Cabos não têm reparo nem remoção direta:** um cabo queimado só sai demolindo um componente conectado. Prioridade alta na lista de melhorias.
- **Campanha sem encerramento:** após o nível 10, o jogo continua no nível 10.
- **Modelo elétrico didático em CC:** não simula CA, fases, curto-circuito, proteção ou banco de capacitores. A subestação é um concentrador com 1% de perda.
- **Save local:** sem conta, sem nuvem e sem sincronização entre dispositivos.
- **Assets opcionais:** modelos `.glb` podem faltar; o fallback procedural mantém o jogo funcionando.

---

## Como rodar o projeto

Requisitos: **Node.js 20+** e npm. O CI usa Node 20.

```bash
npm install
npm run dev        # http://localhost:5173
```

Para gerar o build de produção:

```bash
npm run build
npm run preview    # http://localhost:4173
```

### Scripts

| Comando                  | O que faz                                                          |
| ------------------------ | ------------------------------------------------------------------ |
| `npm run dev`            | Servidor de desenvolvimento                                        |
| `npm run build`          | Checagem de tipos + build em `dist/`                               |
| `npm run preview`        | Serve o `dist/` localmente                                         |
| `npm test`               | Testes (Vitest)                                                    |
| `npm run typecheck`      | Só a checagem de tipos                                             |
| `npm run lint`           | ESLint                                                             |
| `npm run check`          | Tipos + ESLint + testes (o que o CI roda)                          |
| `npm run balance:sim`    | Simula os níveis 1–10 e imprime metas, custos e sobra de orçamento |
| `npm run assets:check`   | Valida os modelos `.glb` de `public/models`                        |
| `npm run models:convert` | Converte `.obj` em `.glb`                                          |
| `npm run format`         | Formata com Prettier                                               |

---

## Arquitetura

O projeto separa **física**, **regras**, **estado** e **renderização**. A física não depende de React nem de Three.js.

```
src/
  electrical/   motor puro (R, I, P, solver nodal, térmico), worker e cliente
  game/         regras puras: advance (economia/níveis/eventos), simulação, cidade, missões, cenários
  data/         balanceamento, save versionado + migrações, telemetria local
  store/        zustand (estado, construção, economia, undo/redo)
  render/       React Three Fiber (Scene, Environment, Player, Effects, PostFX)
  audio/        WebAudio procedural com mixer
  ui/           telas, HUD, componentes, tokens (CSS Modules)
  i18n/         textos pt-BR
```

Fluxo de um passo de simulação:

```
laço de passo fixo (10 Hz) → solve no Web Worker → advance (puro) → store → React
```

A renderização usa um relógio visual contínuo e interpola; não depende de `setInterval`. O `Scene` assina apenas o que precisa, e os cabos só recriam a geometria quando as pontas mudam.

- Física e regras: [`src/electrical/engine.ts`](../src/electrical/engine.ts) e [`src/game/advance.ts`](../src/game/advance.ts).
- Números de balanceamento: [`src/data/balance.ts`](../src/data/balance.ts) e [`docs/BALANCE.md`](BALANCE.md).
- Documentação extra: [`docs/ART.md`](ART.md), [`docs/ASSETS.md`](ASSETS.md), [`docs/MODELS.md`](MODELS.md), [`docs/PERF.md`](PERF.md), [`docs/BASELINE.md`](BASELINE.md).

---

## Como contribuir

1. Crie uma branch e faça mudanças pequenas.
2. Rode `npm run check` (tipos, lint e testes) e `npm run build`.
3. Mantenha a física em funções puras (sem React/Three) e os textos da interface em `src/i18n`.
4. Números de balanceamento ficam em `src/data/balance.ts` — nada de números mágicos no meio do código.
5. Mudou o formato de save? Suba a versão e escreva a migração; save antigo nunca pode quebrar.
6. Descreva a mudança no [`CHANGELOG.md`](../CHANGELOG.md) e, se for desempenho, atualize [`docs/PERF.md`](PERF.md).

O CI do GitHub Actions roda `npm run check` em pushes para `main` e em pull requests (`.github/workflows/ci.yml`).

---

## Deploy

O build gera um site estático em `dist/` — sem backend. Saves ficam no `localStorage` do navegador.

### Vercel (recomendado)

O repositório já tem `vercel.json` (`framework: vite`, build `npm run build`, saída `dist`).

**Pelo painel:**

1. Suba o projeto para o GitHub.
2. Em [vercel.com/new](https://vercel.com/new), importe o repositório.
3. Confirme Build Command `npm run build` e Output Directory `dist`.
4. Deploy. Cada push gera uma URL de preview; `main` publica em produção.

**Pela CLI:**

```bash
npm i -g vercel
vercel          # primeira vez: login e vínculo do projeto (preview)
vercel --prod   # produção
```

### Outras opções

- **Netlify:** build `npm run build`, publish `dist`.
- **GitHub Pages:** defina `base: '/<repo>/'` no `vite.config.ts`, rode o build e publique `dist` (por exemplo, com `gh-pages`).

---

## Créditos

- **Código e design:** projeto Energy City 3D.
- **Modelos de casas e estradas:** kit **Kenney** (CC0), conforme [`docs/ASSETS.md`](ASSETS.md).
- **Equipamentos e personagem:** gerados pelos scripts Blender do projeto em `tools/blender/`.
- **Áudio:** sintetizado em tempo real com WebAudio (sem arquivos de áudio externos).
- **Interface:** React, TypeScript, three.js / React Three Fiber e zustand.

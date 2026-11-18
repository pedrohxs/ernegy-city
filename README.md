# Rede Viva

Projete uma rede elétrica para acender um bairro e acompanhar o crescimento da cidade. **Rede Viva** é um simulador didático em 3D. Cada escolha de tensão, material, seção e rota afeta a queda de tensão, as perdas e a integridade da rede.

![Bairro inicial energizado, com a meta de 60 kW atingida](docs/screenshots/gameplay.png)

## Comece a jogar

Na **Campanha**, três casas de **110 V** esperam energia. Instale um gerador, ligue-o a um transformador de 110 V e conecte o transformador a cada casa. Siga os destaques do mapa e mantenha **60 kW por 20 s** para conquistar a primeira promoção.

- **Campanha** tem dez etapas na mesma cidade, com metas de atendimento, eficiência e onda de calor.
- **Desafio** começa com R$ 200.000. Atenda integralmente uma cidade com demanda de pelo menos 150 kW por 20 s.
- **Sandbox** oferece orçamento livre, sem crescimento automático ou eventos. O **Codex** abre circuitos didáticos para experimentar.

O [Guia do Jogador](docs/GUIA_DO_JOGADOR.md) traz os controles, a primeira ligação e exemplos de diagnóstico.
Veja também o [menu principal com a maquete](docs/screenshots/menu.png).

## Instalação e execução

Use Node.js e npm. O desenvolvimento foi validado com Node.js 24 e o [CI](.github/workflows/ci.yml) usa Node.js 20. Execute na raiz do repositório.

~~~sh
npm ci
npm run dev
~~~

Abra o endereço mostrado pelo Vite, normalmente [localhost:5173](http://localhost:5173). O jogo usa WebGL e não exige variáveis de ambiente nem backend. As partidas e preferências ficam no navegador, por origem. O build estático sai em **dist/** e pode ser conferido com **npm run preview**.

| Comando | Uso |
| --- | --- |
| **npm run check** | TypeScript, ESLint e Vitest. É o comando do CI. |
| **npm run build** | Compila TypeScript e gera o site de produção. |
| **npm test** | Roda os testes, incluindo física, persistência e integração. |
| **npm run balance:sim** | Exercita as dez metas com layouts de referência. |
| **npm run assets:check** | Inspeciona tamanho, compressão e dimensões dos GLBs. |

## Arquitetura

React 18, TypeScript e Vite compõem a aplicação. Three.js, React Three Fiber e drei renderizam a cidade. Zustand coordena o estado e Web Audio sintetiza os sons.

| Área | Responsabilidade |
| --- | --- |
| [**src/electrical**](src/electrical) | Solver nodal em CC, perdas e evolução térmica. O solver roda em Worker quando disponível. |
| [**src/game**](src/game) | Passo de simulação, metas, economia, orientação, construção e diagnóstico. |
| [**src/store**](src/store) | Ações do jogador, histórico da rede e integração com o solver e os slots. |
| [**src/data**](src/data) | Constantes de balanceamento, save v4, migrações e preferências. |
| [**src/render**](src/render) | Maquete, iluminação, câmera, avatares e leitura visual da rede. |
| [**src/ui**](src/ui), [**src/i18n**](src/i18n) e [**src/audio**](src/audio) | HUD, menus, textos em pt-BR e áudio procedural. |

Uma ação de interface atualiza o store. A cada passo de 0,1 s de simulação, o store entrega a topologia ao solver, aplica o resultado às regras de jogo e publica o estado que a interface e a cena exibem. Os testes de física e regras rodam sem renderizador.

## Colaboração

- Consulte [AGENTS.md](AGENTS.md) e organize mudanças em commits pequenos com um objetivo claro. Centralize regras numéricas em [balance.ts](src/data/balance.ts) e a nova interface em [pt-BR.ts](src/i18n/pt-BR.ts).
- Mantenha a física em funções testáveis e os seletores do store granulares. Alterações de persistência exigem versão e migração para os slots anteriores.
- Antes de enviar uma mudança, rode **npm run check** e **npm run build**. Mudanças de interface devem ser exercitadas no navegador. Para simulação e economia, confira casos relevantes em **npm run balance:sim**.
- Use o [changelog](CHANGELOG.md) para registrar mudanças perceptíveis e decisões relevantes. Consulte os documentos de [balanceamento](docs/BALANCE.md), [arte](docs/ART.md), [assets](docs/ASSETS.md) e [desempenho](docs/PERF.md) para trabalhar nessas áreas.

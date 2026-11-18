# Assets

A maquete, os equipamentos, as fachadas, o terreno e as ruas usam geometria procedural. O áudio é sintetizado com Web Audio. O avatar em terceira pessoa tenta carregar **public/models/player.glb** e tem fallback procedural.

| Fonte | Uso |
| --- | --- |
| [src/render/districtParts.ts](../src/render/districtParts.ts) | Receitas de geometria e materiais da cidade e dos equipamentos. |
| [src/render/Environment.tsx](../src/render/Environment.tsx) | Terreno, decoração em instâncias e luz. |
| [public/models](../public/models) | Modelo do avatar e GLBs históricos de equipamentos, prédios e ruas. |
| [assets-src](../assets-src) | Matrizes de kits e arquivos OBJ usados em iterações anteriores. |
| [tools/blender](../tools/blender) | Scripts de autoria para o avatar e equipamentos em GLB. |

A maquete tem fallback para as peças disponíveis. O avatar articulado com animações importadas e sons gravados ainda não fazem parte do jogo. Para incluir um asset externo, confirme a origem e a licença antes de adicioná-lo ao repositório.

## Validação

~~~sh
npm run assets:check
npm run assets:check -- pasta/dos/modelos
~~~

O validador lista tamanho, compressão, nomes de nós e dimensões. Ele pode avisar sobre a base deslocada de modelos antigos. O carregador corrige a posição vertical do avatar quando usa **fit**, mas vale conferir a silhueta e a escala no jogo ao trocar o arquivo.

Consulte [Pipeline de modelos](MODELS.md) para editar e exportar.

# Assets

A maquete e o eletricista articulado usam geometria procedural. O áudio é sintetizado com Web Audio.

| Fonte | Uso |
| --- | --- |
| [src/render/districtParts.ts](../src/render/districtParts.ts) | Receitas de geometria e materiais da cidade e dos equipamentos. |
| [src/render/Environment.tsx](../src/render/Environment.tsx) | Terreno, decoração em instâncias e luz. |
| [src/render/Avatar.tsx](../src/render/Avatar.tsx) | Eletricista em terceira pessoa, com juntas para movimento e materiais de uniforme. |
| [public/models](../public/models) | GLBs históricos do avatar, equipamentos, prédios e ruas. |
| [assets-src](../assets-src) | Matrizes de kits e arquivos OBJ usados em iterações anteriores. |
| [tools/blender](../tools/blender) | Scripts de autoria para o avatar e equipamentos em GLB. |

O ciclo de caminhada e corrida é calculado em tempo real. Animações importadas e sons gravados ainda não fazem parte do jogo. Para incluir um asset externo, confirme a origem e a licença antes de adicioná-lo ao repositório.

## Validação

~~~sh
npm run assets:check
npm run assets:check -- pasta/dos/modelos
~~~

O validador lista tamanho, compressão, nomes de nós e dimensões. Ele pode avisar sobre a base deslocada de modelos antigos.

Consulte [Pipeline de modelos](MODELS.md) para editar e exportar.

# Pipeline de modelos

## Peças da maquete

Edite as receitas em [districtParts.ts](../src/render/districtParts.ts) e as cores do ambiente em [art.ts](../src/render/art.ts). Mantenha a base em Y=0, deixe espaço entre lotes vizinhos de 10 unidades e confira a altura do ponto de ligação antes de alterar telhados ou isoladores.

Os grupos de geometria têm funções distintas. A base recebe sombra e a estrutura projeta sombra. As janelas usam emissão separada para refletir atendimento e tensão inválida. Ao adicionar uma variação, confira o modelo energizado, desligado e incompatível. Veja a [direção de arte](ART.md).

## GLB do avatar e protótipos históricos

- **public/models/player.glb** é o modelo opcional do personagem em terceira pessoa. O [carregador](../src/render/GltfOr.tsx) ajusta a dimensão horizontal e apoia a base no chão. Use [modelOverrides.ts](../src/render/modelOverrides.ts) para corrigir escala, rotação ou altura.
- Os GLBs de prédios, equipamentos e estradas em **public/models** são referências de autoria preservadas. Trocar um desses arquivos por outro não altera a maquete procedural.
- Exporte em glTF 2.0 binário. Para uso offline sem depender de decoder Draco externo, use um GLB sem Draco. Confira dimensões, materiais, base e posição no navegador.

É possível regenerar o avatar ou gerar equipamentos de referência com Blender em modo batch. Use uma pasta de saída separada para revisar o resultado antes de substituir um modelo.

~~~sh
blender -b -P tools/blender/character.py -- arte-exportada
blender -b -P tools/blender/equipment.py -- arte-exportada
~~~

O conversor de OBJ incorpora texturas quando encontra os materiais e usa as regras de nome e de textura do projeto. Use **--no-draco** se quiser um GLB sem Draco.

~~~sh
npm run models:convert -- assets-src/OBJ arte-exportada --no-draco
npm run assets:check -- arte-exportada
~~~

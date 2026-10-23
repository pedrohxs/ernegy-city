# Assets — Energy City 3D

O jogo funciona **sem nenhum `.glb`**: cada peça tem modelo procedural (fallback). Você pode ir substituindo por modelos prontos, um a um.

> **Novo por aqui? Veja o passo a passo completo em [`docs/MODELS.md`](MODELS.md)** — inclui o caminho sem Blender (só baixar GLB e renomear) e como instalar o Blender.

## Estratégia recomendada

- **Genéricos** (casas, prédios, árvores, ruas, postes) → use **kits prontos CC0** (mais rápido).
- **Específicos** (gerador, subestação, transformador, hospital) → use o **script Blender** `tools/blender/equipment.py` (controle de escala/origem e visual didático), ou um kit que combine.

O loader procura `/models/<nome>.glb`; se não existir, usa o procedural. Para zonas ele tenta na ordem `casa`/`predio`/`hospital` e depois `zone`.

## Mapeamento de arquivos

| Arquivo | Usado para | Tamanho-alvo | Origem sugerida |
| --- | --- | --- | --- |
| `gen.glb` | Gerador | ~10 u de largura, base em Y=0 | script Blender |
| `sub.glb` | Subestação | ~10 u | script Blender |
| `trafo.glb` | Transformador | ~6 u | script Blender |
| `casa.glb` | Zona casa (110 V) | ~6 u | kit CC0 ou script |
| `predio.glb` | Zona prédio (220 V) | ~7 × 16 u | kit CC0 ou script |
| `hospital.glb` | Zona hospital (220 V, crítico) | ~8 × 10 u | kit CC0 ou script |
| `zone.glb` | Reserva para qualquer zona | ~7 u | kit CC0 |
| `player.glb` | Personagem | ~4 u de altura | kit CC0 |

## Kits CC0 recomendados

- **Kenney — City Kit (Suburban/Commercial/Roads)**: https://kenney.nl/assets (licença CC0). Ideal para casas, prédios, ruas, postes.
- **Quaternius — Ultimate Buildings / City**: https://quaternius.com (CC0). Ótimo para prédios variados.
- **Poly Haven (HDRI/texturas)**: https://polyhaven.com (CC0) — se quiser ambiente além do céu procedural.

Fluxo com kit pronto:
1. Importe o pack no Blender.
2. Separe/renomeie o objeto para o nome do arquivo (ex.: `casa`), com **origem na base** e **+Y para cima** (o exportador glTF converte de Z-up para Y-up).
3. Exporte como `.glb` (de preferência com **Draco** ou **meshopt**).
4. Salve em `public/models/` e rode `npm run assets:check`.
5. Recarregue o jogo — o modelo aparece; se estiver torto/grande, ajuste e repita.

## Script Blender (equipamentos)

`tools/blender/equipment.py` gera `gen`, `sub`, `trafo`, `casa`, `predio`, `hospital` em low-poly, com materiais e emissivos, e exporta em `public/models/`.

```bash
# instale o Blender (3.6+ ou 4.x) e rode na raiz do projeto:
blender -b -P tools/blender/equipment.py
# ou escolha a pasta de saída:
blender -b -P tools/blender/equipment.py -- public/models
```

> ⚠ O script foi escrito e revisado, mas **não foi executado nesta máquina** (Blender não está no PATH). Se algo falhar, me mande a mensagem de erro que eu ajusto.

## Convenções

- **Origem na base** (pés do objeto em Y=0), **+Y para cima**, 1 unidade ≈ 1 m didático.
- Nomes de nós/malhas iguais ao nome do arquivo (`gen`, `casa`, …).
- Materiais PBR (metallic/roughness); janelas com **emissivo** (`emissiveIntensity > 1`) para o bloom.
- Orçamento de polígonos: alguns milhares por objeto (low-poly).
- glTF 2.0 binário (`.glb`), com Draco/meshopt quando possível.

## Converter `.obj` para `.glb` (sem Blender)

```bash
npm run models:convert -- assets-src/OBJ public/models
```

Converte todo `.obj` da pasta: embute as texturas `.png` (casadas por nome), comprime com **Draco** (`--no-draco` desativa) e usa `public/models/rename.json` para os nomes finais (`casa`, `predio`, `hospital`…). Variações `casa2..5`/`predio2..3` são escolhidas automaticamente pelo jogo. Detalhes em [`docs/MODELS.md`](MODELS.md). (`.blend`/`.fbx` exigem Blender.)

> Draco exige o decoder (a drei baixa de uma CDN na primeira carga). Se precisar funcionar 100% offline, gere com `--no-draco`.

## Validação

```bash
npm run assets:check            # valida public/models
npm run assets:check -- caminho # valida outra pasta
```

O validador (sem dependências) reporta para cada `.glb`: tamanho, compressão (Draco/meshopt), **bounding box** e base Y, nomes de nós, e avisa sobre escala/origem/arquivo grande sem compressão. Ele **não** bloqueia o build — é um guia.

## Pipeline no jogo

- `src/render/GltfOr.tsx`: cache por URL, tenta uma lista de nomes, clone por instância, fallback procedural em erro.
- Compressão: `useGLTF(url, true, true)` (Draco + meshopt). O decoder Draco vem da CDN da drei; para uso offline, prefira **meshopt**.
- Nada é enviado a servidores.

## Pendências

- Sem import de animações (ex.: `player.glb` andando) — hoje o personagem é procedural.
- Sem conversão automática dos kits; o passo de renomear/exportar é manual.

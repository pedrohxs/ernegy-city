# Como colocar modelos 3D no jogo (passo a passo)

Você tem **dois caminhos**. Comece pelo 1 — não precisa de Blender.

O jogo ajusta **escala e origem sozinho**: ao carregar um `.glb`, ele mede o modelo, encaixa a maior dimensão horizontal no tamanho do tipo (casa, prédio, gerador…) e apoia a base no chão. Você só precisa soltar o arquivo com o **nome certo**.

---

## Caminho 1 — Modelos prontos, SEM Blender (recomendado para começar)

### 1. Baixe um kit CC0
Kits gratuitos e livres (CC0, pode usar comercialmente):
- **Quaternius – Ultimate Buildings / City**: https://quaternius.com — costuma ter versão **GLB** direto. ✅ mais fácil.
- **Kenney – City Kit** (Suburban/Commercial/Roads): https://kenney.nl/assets — alguns packs vêm em `.glb`.

Prefira baixar a versão **GLB** do pack. Se só tiver `.obj`/`.fbx`, use o Caminho 2 (Blender).

### 2. Escolha os arquivos e renomeie
Copie para `public/models/` e renomeie para os nomes que o jogo espera:

| Nome do arquivo | Vira no jogo |
| --- | --- |
| `casa.glb` | Zona casa (110 V) |
| `predio.glb` | Zona prédio (220 V) |
| `hospital.glb` | Zona hospital (crítico) |
| `gen.glb` | Gerador |
| `sub.glb` | Subestação |
| `trafo.glb` | Transformador |
| `player.glb` | Personagem |

Não precisa de todos! Os que faltarem usam o modelo procedural.

### 3. Valide
```bash
npm run assets:check
```
Ele mostra tamanho, compressão, **bounding box/base** e avisos de escala. Se avisar "escala suspeita", não se preocupe: o jogo reescala sozinho; o aviso é só um guia.

### 4. Veja no jogo
Rode `npm run dev`, abra o jogo e construa uma casa/prédio/gerador. O modelo aparece no lugar do procedural.

### 5. (Opcional) Ajustes finos sem Blender
Se o modelo estiver girado ou um pouco fora do lugar, edite `src/render/modelOverrides.ts`:
```ts
export const MODEL_OVERRIDES = {
  casa: { rotY: Math.PI / 2, scale: 1.2, y: 0.2 },
}
```
- `rotY`: gira (use `Math.PI / 2` = 90°).
- `scale`: multiplicador de tamanho.
- `y`: sobe/desce.

Salve e recarregue. Pronto, sem abrir o Blender.

---

## Caminho 1.5 — Pack em `.obj` (sem Blender): converter para `.glb`

Se o pack só tem `.obj` + `.mtl` + texturas `.png` (e talvez `.blend`/`.fbx`), use o conversor incluído — não precisa de Blender.

1. Copie a pasta do pack para algum lugar (ex.: `C:\models\predios`).
2. Rode na raiz do projeto:
   ```bash
   npm run models:convert -- assets-src/OBJ public/models
   ```
   Ele percorre a pasta, converte **cada `.obj`** em `.glb`, **embute as texturas** (casando pelo nome) e **comprime com Draco** (use `--no-draco` para desativar). Os nomes de saída saem de `public/models/rename.json`.
3. **Nomes**: em vez de renomear na mão, use `public/models/rename.json` (já incluído), ex.:
   ```json
   { "House": "casa", "House2": "casa2", "Flat": "predio", "Hospital": "hospital" }
   ```
   E para forçar texturas sem correspondência, `public/models/textures.json`: `{ "Hospital": "Hotel.png" }`.
   Variações (`casa2`…`casa5`, `predio2`, `predio3`) são usadas automaticamente pelo jogo (a cena escolhe pelo id do nó).
4. Valide e abra o jogo:
   ```bash
   npm run assets:check
   npm run dev
   ```

> - O `.blend` e o `.fbx` **não** são convertidos por esse script (o `.blend` é do Blender; o `.fbx` precisaria do Caminho 2). Use os `.obj`.
> - Mantenha o `.mtl` e os `.png` na **mesma pasta** (ou pasta irmã `Textures/`) do `.obj` — é o que o script lê.
> - **Texturas**: o script casa pelo nome (`House` → `HouseTexture1`, `House2` → `HouseTexture2`, `Shop` → `Shop`). Para forçar um mapa, crie `public/models/textures.json`, ex.: `{ "Flat": "Hotel.png" }`.
> - O pack bruto pode ficar **fora** de `public/` (ex.: `assets-src/OBJ` e `assets-src/Textures`) para não ir ao deploy; só os `.glb` finais precisam estar em `public/models/`.
> - Se o jogo carrega o modelo mas ele está **sem textura**, é porque o `.mtl` não referenciava `map_Kd` (alguns packs vêm assim). Nesse caso use o Caminho 2 (Blender) ou o `textures.json`.

---

## Caminho 2 — Blender com kits prontos (quando o pack não tem GLB)

### A. Instalar o Blender (Windows)
1. Acesse **https://www.blender.org/download/**.
2. Baixe o **Blender Installer (Windows)** — a versão LTS (ex.: 3.6 LTS ou 4.x LTS).
3. Rode o instalador e avance (pode instalar no padrão). Marque "Add to PATH" se aparecer.
4. Abra o Blender. Na primeira vez ele mostra a tela de boas-vindas.

> Dica: para rodar o script por linha de comando, confirme que `blender` está no PATH (`blender --version` no Prompt). Se não estiver, use o caminho completo, ex.: `"C:\Program Files\Blender Foundation\Blender 4.2\blender.exe"`.

### B. Importar um modelo do kit
1. Abra um arquivo **novo**: `File → New → General` (apague o cubo padrão: clique nele e `X`).
2. `File → Import → Wavefront (.obj)` (ou `.fbx`/`.gltf`, conforme o pack).
3. Selecione o arquivo da casa/prédio e importe. O objeto aparece na cena.

### C. Ajustar origem, escala e rotação
1. Selecione o objeto (clique nele).
2. **Escala**: tecle `S`, digite um número (ex.: `0.5`) e `Enter`. Confira no painel `N` (Item) as dimensões em metros (alvo: casa ~6, prédio ~7×16).
3. **Origem na base**: `Object → Set Origin → Origin to Geometry` ajuda; depois, no painel `N`, ajuste a posição Z para o objeto ficar **apoiado em Z=0**.
4. **Rotação**: se a frente estiver virada, `R` + `Z` + `90` + `Enter`.
5. Aplique as transformações: com o objeto selecionado, `Ctrl+A → All Transforms`.

### D. Exportar GLB
1. `File → Export → glTF 2.0 (.glb/.gltf)`.
2. No painel da direita (export settings):
   - **Format**: `glTF Binary (.glb)`
   - **Include → Selected Objects**: marque (se quiser só o objeto).
   - **Transform → +Y Up**: deixe marcado (padrão).
   - **Compression → Draco**: marque se quiser arquivo menor.
3. Salve em `public/models/` com o nome certo (`casa.glb`, `predio.glb`, …).
4. Rode `npm run assets:check` e abra o jogo.

### E. Rodar o script dos equipamentos (`equipment.py`)
Gera gerador, subestação, transformador, casa, prédio e hospital já no padrão:
1. Baixe/instale o Blender (acima).
2. No **Prompt de Comando**, na pasta do projeto:
   ```bash
   "C:\Program Files\Blender Foundation\Blender 4.2\blender.exe" -b -P tools\blender\equipment.py
   ```
   (ajuste o caminho/versão do Blender). Ele cria os `.glb` em `public/models/`.
3. Ou, pela interface: aba **Scripting** → **Open** → escolha `tools/blender/equipment.py` → botão **Run Script**.
4. Rode `npm run assets:check`.

> O script não foi testado nesta máquina (sem Blender). Se der erro, mande a mensagem.

---

## Solução de problemas

| Sintoma | Causa provável | O que fazer |
| --- | --- | --- |
| Modelo gigante ou minúsculo | Escala do kit | O jogo auto-ajusta; se ainda estiver estranho, `modelOverrides.ts` |
| Modelo afundado ou flutuando | Origem fora da base | Auto-ajustado; senão `y` em `modelOverrides.ts` |
| Modelo deitado | Eixo do kit (Z-up) | `rotY: Math.PI/2` ou exportar com "+Y Up" |
| Não aparece nada | Nome do arquivo errado | Confira a tabela de nomes e rode `npm run assets:check` |
| Erro de Draco no console | Decoder (CDN) bloqueado | Reexporte **sem** Draco (ou use meshopt) |
| Jogo lento | Muitos polígonos | Use LOD/compressão; os procedurais são leves |

## Estradas Kenney e personagem

- **Estradas**: o kit fica em `public/models/estradas-roads/`. O jogo usa `road-crossroad.glb` nos cruzamentos e `road-straight.glb` nas retas (escala 10, via `InstancedMesh`). Para trocar por outro kit, mantenha esses dois nomes (ou ajuste `src/render/Environment.tsx`).
- **Personagem**: rode o script para gerar o eletricista cartoon:
  ```bash
  "C:\Program Files\Blender Foundation\Blender 4.2\blender.exe" -b -P tools\blender\character.py
  ```
  Ele exporta `public/models/player.glb` (origem nos pés, ~4 u de altura). Se o personagem ficar virado, ajuste em `src/render/modelOverrides.ts`: `player: { rotY: Math.PI }`. Sem o arquivo, o jogo usa o personagem procedural.

## Mapa atual de modelos

Definido em `src/render/Scene.tsx` (`ZONE_MODELS`):

| Tipo | Modelos |
| --- | --- |
| Casa | `casas-buldings/building-type-{h,i,m,g,a,p}` (Kenney) |
| Prédio | `predio`, `predio2`, `predio3` (pack anterior) |
| Hospital | `hospital` (pack anterior) |
| Estradas | `estradas-roads/road-crossroad`, `road-straight` (Kenney) |

Os assets **não usados** ficam em `assets-src/` (fora do deploy). Para usar outro tipo, copie de volta para `public/models` e adicione em `ZONE_MODELS`.

## Observações
- Licenças: Kenney e Quaternius são **CC0** (livres). Guarde a licença/atribuição que vier no pack.
- Nada é enviado para servidores; os modelos ficam no seu `public/models/`.
- Mais detalhes de convenção: `docs/ASSETS.md`.

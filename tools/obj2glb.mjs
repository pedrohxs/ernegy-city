// Converte modelos .obj (+ .mtl) para .glb, sem Blender, e embute texturas .png.
// Uso: node tools/obj2glb.mjs <pasta-de-entrada> [pasta-de-saida] [--textures <pasta>]
//
// As texturas são casadas por nome: House → HouseTexture1, House2 → HouseTexture2, Shop → Shop...
// Dá para forçar um mapa em public/models/textures.json: { "Flat": "Hotel.png" }
import { readdir, mkdir, writeFile, readFile, stat } from 'node:fs/promises'
import { join, basename, resolve, dirname } from 'node:path'
import obj2gltf from 'obj2gltf'
import gltfPipeline from 'gltf-pipeline'

const argv = process.argv.slice(2)
let IN = null, OUT = 'public/models', TEX = null, NO_DRACO = false
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--textures') { TEX = argv[++i]; continue }
  if (argv[i] === '--no-draco') { NO_DRACO = true; continue }
  if (!IN) IN = argv[i]; else OUT = argv[i]
}
if (!IN) {
  console.log('Uso: node tools/obj2glb.mjs <pasta-de-entrada> [pasta-de-saida] [--textures <pasta>]')
  process.exit(1)
}

const letters = s => s.toLowerCase().replace(/[^a-z]/g, '')
const trailingNum = s => (s.match(/(\d+)\s*$/) || [])[1] || ''
const stripExt = s => s.replace(/\.[^.]+$/, '')

/** Melhor textura para um modelo, por nome (sem extensão). */
function matchTexture(model, textures, overrides) {
  if (overrides[model]) return overrides[model]
  const mb = letters(model).replace(/\d+$/, ''), mn = trailingNum(model)
  const cands = textures.filter(t => letters(stripExt(t)).startsWith(mb))
  if (!cands.length) return null
  const numbered = cands.filter(t => trailingNum(stripExt(t)))
  if (mn) {
    const exact = numbered.find(t => trailingNum(stripExt(t)) === mn)
    if (exact) return exact
    const best = numbered
      .filter(t => Number(trailingNum(stripExt(t))) <= Number(mn))
      .sort((a, b) => Number(trailingNum(stripExt(b))) - Number(trailingNum(stripExt(a))))[0]
    if (best) return best
  }
  return numbered[0] || cands[0]
}

// ---- injeção de textura no GLB ----
function parseGLB(buf) {
  let off = 12, json = null, bin = null
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4)
    const data = buf.subarray(off + 8, off + 8 + len)
    if (type === 0x4e4f534a && !json) json = JSON.parse(data.toString('utf8'))
    if (type === 0x004e4942 && !bin) bin = Buffer.from(data)
    off += 8 + len
  }
  return { json, bin }
}
const pad = (buf, byte, to) => { const p = (to - (buf.length % to)) % to; return p ? Buffer.concat([buf, Buffer.alloc(p, byte)]) : buf }
function buildGLB(json, bin) {
  const jb = pad(Buffer.from(JSON.stringify(json), 'utf8'), 0x20, 4)
  const bb = bin ? pad(bin, 0, 4) : null
  const total = 12 + 8 + jb.length + (bb ? 8 + bb.length : 0)
  const out = Buffer.alloc(total)
  out.writeUInt32LE(0x46546c67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(total, 8)
  let o = 12
  out.writeUInt32LE(jb.length, o); out.writeUInt32LE(0x4e4f534a, o + 4); jb.copy(out, o + 8); o += 8 + jb.length
  if (bb) { out.writeUInt32LE(bb.length, o); out.writeUInt32LE(0x004e4942, o + 4); bb.copy(out, o + 8) }
  return out
}
function injectTexture(glb, png) {
  const { json, bin } = parseGLB(Buffer.from(glb))
  if ((json.images || []).length) return glb // já tem textura
  const oldLen = bin ? bin.length : 0, gap = (4 - (oldLen % 4)) % 4
  const newBin = Buffer.concat([bin || Buffer.alloc(0), Buffer.alloc(gap), png])
  json.bufferViews = json.bufferViews || []
  json.bufferViews.push({ buffer: 0, byteOffset: oldLen + gap, byteLength: png.length })
  const bv = json.bufferViews.length - 1
  json.samplers = [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }]
  json.images = [{ bufferView: bv, mimeType: 'image/png' }]
  json.textures = [{ source: 0, sampler: 0 }]
  for (const m of json.materials || []) {
    m.pbrMetallicRoughness = m.pbrMetallicRoughness || {}
    m.pbrMetallicRoughness.baseColorTexture = { index: 0 }
    m.pbrMetallicRoughness.baseColorFactor = [1, 1, 1, 1]
  }
  json.buffers[0].byteLength = newBin.length
  return buildGLB(json, newBin)
}

async function walk(dir) {
  const out = []
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...await walk(p))
    else if (e.isFile() && e.name.toLowerCase().endsWith('.obj') && !e.name.startsWith('._')) out.push(p)
  }
  return out
}

async function main() {
  let files = []
  try { files = await walk(IN) } catch { console.error(`Pasta não encontrada: ${IN}`); return 1 }

  // acha a pasta de texturas: flag > irmã "Textures" > public/models/Textures
  if (!TEX) {
    for (const c of [join(dirname(resolve(IN)), 'Textures'), join('public', 'models', 'Textures'), join(IN, 'Textures')]) {
      try { if ((await stat(c)).isDirectory()) { TEX = c; break } } catch { /* segue */ }
    }
  }
  let textures = []
  if (TEX) { try { textures = (await readdir(TEX)).filter(f => /\.(png|jpe?g|webp)$/i.test(f)) } catch { textures = [] } }
  let overrides = {}, rename = {}
  try { overrides = JSON.parse(await readFile(join('public', 'models', 'textures.json'), 'utf8')) } catch { /* opcional */ }
  try { rename = JSON.parse(await readFile(join('public', 'models', 'rename.json'), 'utf8')) } catch { /* opcional */ }

  if (!files.length) { console.log(`Nenhum .obj encontrado em ${IN}`); return 0 }
  await mkdir(OUT, { recursive: true })
  console.log(`Convertendo ${files.length} .obj → ${OUT}`)
  console.log(`Texturas: ${TEX || '(nenhuma)'} (${textures.length})\n`)

  let errors = 0, textured = 0, compressed = 0
  for (const f of files) {
    const name = basename(f, '.obj')
    const out = rename[name] || name
    const dest = join(OUT, `${out}.glb`)
    try {
      let glb = await obj2gltf(resolve(f), { binary: true })
      const tex = matchTexture(name, textures, overrides)
      if (tex && TEX) {
        try { glb = injectTexture(glb, await readFile(join(TEX, tex))); textured++ } catch { /* segue sem textura */ }
      }
      if (!NO_DRACO) {
        try { const res = await gltfPipeline.processGlb(glb, { dracoOptions: { compressionLevel: 7 } }); glb = res.glb; compressed++ } catch { /* mantém sem compressão */ }
      }
      await writeFile(dest, glb)
      const kb = (await stat(dest)).size / 1024
      console.log(`[ok] ${out}.glb  (${kb.toFixed(0)} kB)${tex ? `  textura: ${tex}` : ''}`)
    } catch (e) {
      errors++
      console.error(`[erro] ${name}: ${e.message}`)
    }
  }
  console.log(`\nConcluído: ${files.length - errors} ok (${textured} com textura, ${compressed} comprimidos com Draco), ${errors} com erro.`)
  console.log('Rode "npm run assets:check" e ajuste os nomes conforme docs/MODELS.md.')
  return errors ? 1 : 0
}

main().then(c => process.exit(c)).catch(e => { console.error(e); process.exit(1) })

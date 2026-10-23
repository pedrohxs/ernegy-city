// Validador de modelos glTF/GLB (sem dependências). Uso: npm run assets:check [pasta]
import { readFile, readdir } from 'node:fs/promises'
import { join, basename } from 'node:path'

const DIR = process.argv[2] || 'public/models'
const EXPECTED = ['gen', 'sub', 'trafo', 'casa', 'predio', 'hospital', 'player']
const MAGIC = 0x46546c67 // 'glTF'
const CHUNK_JSON = 0x4e4f534a

const fmt = n => n.toFixed(2).replace('.', ',')

function parseGLB(buf) {
  if (buf.length < 12 || buf.readUInt32LE(0) !== MAGIC) throw new Error('não é um GLB (magic inválido)')
  const version = buf.readUInt32LE(4)
  let off = 12
  let json = null
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4)
    const data = buf.subarray(off + 8, off + 8 + len)
    if (type === CHUNK_JSON && !json) json = JSON.parse(data.toString('utf8'))
    off += 8 + len
  }
  if (!json) throw new Error('chunk JSON ausente')
  return { version, json }
}

function analyze(json) {
  const ext = [...(json.extensionsUsed || [])]
  const draco = ext.includes('KHR_draco_mesh_compression')
  const meshopt = ext.includes('EXT_meshopt_compression')
  // bbox aproximada a partir dos accessors POSITION
  let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity], found = false
  for (const mesh of json.meshes || []) for (const prim of mesh.primitives || []) {
    const idx = prim.attributes?.POSITION
    if (idx == null) continue
    const acc = json.accessors?.[idx]
    if (!acc?.min || !acc?.max) continue
    for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], acc.min[i]); max[i] = Math.max(max[i], acc.max[i]) }
    found = true
  }
  const names = [...new Set([...(json.nodes || []).map(n => n.name), ...(json.meshes || []).map(m => m.name)].filter(Boolean))]
  const images = (json.images || []).length
  return { draco, meshopt, images, bbox: found ? { min, max, dim: [0, 1, 2].map(i => max[i] - min[i]) } : null, names, generator: json.asset?.generator || 'desconhecido' }
}

async function main() {
  let files = []
  try { files = (await readdir(DIR)).filter(f => f.toLowerCase().endsWith('.glb')) }
  catch { console.log(`⚠ Pasta "${DIR}" não encontrada. Nada a validar.`); return 0 }
  if (!files.length) {
    console.log(`ℹ Nenhum .glb em "${DIR}" — o jogo usa os modelos procedurais (fallback).`)
    console.log(`  Esperados (opcionais): ${EXPECTED.map(n => n + '.glb').join(', ')}`)
    return 0
  }

  let errors = 0
  console.log(`Validando ${files.length} modelo(s) em ${DIR}:\n`)
  for (const f of files.sort()) {
    const path = join(DIR, f)
    try {
      const buf = await readFile(path)
      const { json } = parseGLB(buf)
      const a = analyze(json)
      const sizeKB = buf.length / 1024
      console.log(`• ${basename(f)}  (${fmt(sizeKB)} kB)  [${a.generator}]`)
      console.log(`  compressão: ${a.draco ? 'Draco' : a.meshopt ? 'meshopt' : 'nenhuma'} · texturas: ${a.images}`)
      if (a.bbox) {
        const { min, max, dim } = a.bbox
        console.log(`  bbox: X ${fmt(dim[0])} · Y ${fmt(dim[1])} · Z ${fmt(dim[2])}  |  base Y≈${fmt(min[1])}`)
        const big = Math.max(...dim)
        if (big > 80 || big < 1) console.log(`  ⚠ escala suspeita (maior dimensão ${fmt(big)}); alvo ~2–40 unidades`)
        if (Math.abs(min[1]) > 2) console.log(`  ⚠ origem não parece na base (Y mín = ${fmt(min[1])}); mova a origem para os pés`)
      } else {
        console.log('  ⚠ sem accessors POSITION (mesh ausente?)')
      }
      if (a.names.length) console.log(`  nós: ${a.names.slice(0, 8).join(', ')}${a.names.length > 8 ? '…' : ''}`)
      if (sizeKB > 1500 && !a.draco && !a.meshopt) console.log('  ⚠ arquivo grande sem compressão; exporte com Draco ou meshopt')
      console.log('')
    } catch (e) {
      errors++
      console.log(`• ${f}: ❌ inválido — ${e.message}\n`)
    }
  }

  const present = new Set(files.map(f => basename(f, '.glb')))
  const missing = EXPECTED.filter(n => !present.has(n))
  if (missing.length) console.log(`ℹ Sem .glb (usam procedural): ${missing.join(', ')}`)
  return errors ? 1 : 0
}

main().then(code => process.exit(code)).catch(e => { console.error(e); process.exit(1) })

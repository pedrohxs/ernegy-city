// Diagnóstico didático: transforma o estado da rede em causa + solução.
// Funções puras (sem React/Three) para serem testadas e usadas pelo HUD e pelo inspetor.
import { T_MAX } from '../data/balance'
import { ampacity, type Cable, type GNode } from '../electrical/engine'
import { strings } from '../i18n/pt-BR'

export type DiagnosisTone = 'ok' | 'info' | 'warn' | 'bad'

export interface Diagnosis {
  tone: DiagnosisTone
  title: string
  detail: string
  fix?: string
}

export interface NextActionInput {
  nodes: GNode[]
  cables: Cable[]
  powered: Set<number>
  mismatch: Set<number>
  nodeV: Record<number, number>
  supplied: number
  demand: number
}

const KIND_LABEL: Record<string, string> = { gen: 'Gerador', sub: 'Subestação', trafo: 'Transformador', zone: 'Zona' }
const zoneLabel = (n: GNode) => (n.zoneType === 'casa' ? 'Casa' : n.zoneType === 'predio' ? 'Prédio' : n.zoneType === 'hospital' ? 'Hospital' : 'Zona')
const volts = (v: number | undefined) => Math.round(v ?? 0)

export function faultDetail(component: GNode | Cable): string {
  if (component.fault === 'wear') return strings.report.wear
  if (component.fault === 'overcurrent' && 'area' in component) return strings.report.overcurrent(component.current, ampacity(component.material, component.area))
  if (component.fault === 'heat') return strings.report.heat(T_MAX)
  return strings.report.unknownFault
}

/** Explica o estado de uma zona consumidora. */
export function diagnoseZone(n: GNode, voltage: number | undefined, powered: boolean, mismatch: boolean): Diagnosis {
  if (n.failed) return { tone: 'bad', title: 'Zona falhada', detail: `A ${zoneLabel(n)} #${n.id} está fora de operação.`, fix: 'Selecione a zona e use Reparar.' }
  if (powered) {
    return { tone: 'ok', title: 'Zona energizada', detail: `Recebendo ${volts(voltage)} V; a tensão nominal é ${n.volt} V.` }
  }
  if (mismatch) {
    const actual = volts(voltage)
    if (actual <= 0) {
      return {
        tone: 'bad',
        title: 'Tensão errada',
        detail: `Esta zona espera ${n.volt} V, mas está ligada em uma tensão incompatível.`,
        fix: `Ligue a zona no lado de baixa tensão de um trafo de ${n.volt} V.`
      }
    }
    return {
      tone: 'bad',
      title: 'Tensão errada',
      detail: `Chegaram ${actual} V, mas esta zona espera ${n.volt} V.`,
      fix: actual > n.volt ? `Use um trafo de ${n.volt} V ou conecte uma zona de ${actual} V.` : `Confira o trafo: ele precisa entregar ${n.volt} V.`
    }
  }
  return {
    tone: 'warn',
    title: 'Zona sem energia',
    detail: voltage && voltage > 0 ? `Chegaram ${volts(voltage)} V, fora da faixa de ±10% de ${n.volt} V.` : 'Nenhuma tensão chegou a esta zona.',
    fix: 'Confira o caminho: gerador online → trafo → cabo → zona.'
  }
}

/** Explica o estado de um cabo. */
export function diagnoseCable(c: Cable): Diagnosis {
  if (c.failed) {
    return {
      tone: 'bad',
      title: c.fault && c.fault !== 'heat' ? strings.report.cableFailed : 'Cabo queimado',
      detail: faultDetail(c),
      fix: 'Selecione o cabo para reparar ou remover; o Post-Mortem mostra as contas.'
    }
  }
  if (c.temp > 75) {
    return {
      tone: 'warn',
      title: 'Cabo aquecendo',
      detail: `C-${c.id}: ${c.temp.toFixed(0)} °C com ${c.current.toFixed(0)} A e perda de ${(c.loss / 1000).toFixed(2)} kW.`,
      fix: 'Aumente a seção, use cobre, encurte o trecho ou duplique o cabo.'
    }
  }
  if (c.current < 0.01) {
    return {
      tone: 'info',
      title: 'Cabo sem corrente',
      detail: `C-${c.id} está conectado, mas nada está passando por ele agora.`,
      fix: 'Confira se ele liga o gerador ao trafo ou o trafo a uma zona energizada.'
    }
  }
  return {
    tone: 'ok',
    title: 'Cabo saudável',
    detail: `C-${c.id}: ${c.current.toFixed(0)} A, queda de ${c.drop.toFixed(1)} V e ${(c.loss / 1000).toFixed(2)} kW de perda.`
  }
}

/** Explica o estado de gerador, subestação ou transformador. */
export function diagnoseNode(n: GNode, voltage: number | undefined): Diagnosis {
  if (n.failed) {
    return {
      tone: 'bad',
      title: 'Equipamento falhado',
      detail: faultDetail(n),
      fix: 'Selecione o equipamento e use Reparar.'
    }
  }
  if (n.kind === 'gen' && !n.online) {
    return { tone: 'info', title: 'Gerador partindo', detail: `Faltam ${Math.max(0, n.startLeft).toFixed(0)} s para entrar em operação.`, fix: 'Aguarde a partida; o solar só funciona de dia.' }
  }
  if (n.cap > 0 && n.load > n.cap * 0.85) {
    return {
      tone: 'warn',
      title: 'Perto do limite',
      detail: `${KIND_LABEL[n.kind]} #${n.id}: ${n.load.toFixed(0)} de ${n.cap} kW, a ${n.temp.toFixed(0)} °C.`,
      fix: 'Divida a carga em mais ramais ou construa outro transformador/gerador.'
    }
  }
  if ((n.kind === 'trafo' || n.kind === 'sub') && n.load <= 0) {
    return { tone: 'info', title: 'Sem carga', detail: `${KIND_LABEL[n.kind]} #${n.id} ainda não está alimentando nenhuma zona.`, fix: 'Ligue uma zona pelo lado de baixa tensão do trafo.' }
  }
  return {
    tone: 'ok',
    title: 'Equipamento saudável',
    detail: `${KIND_LABEL[n.kind]} #${n.id}: ${n.load.toFixed(0)}/${n.cap || '—'} kW, ${volts(voltage)} V e ${n.temp.toFixed(0)} °C.`
  }
}

/**
 * Próxima ação para o HUD. Segue a ordem em que um jogador novo precisa agir.
 * Retorna tone "ok" quando não há nada urgente para fazer.
 */
export function nextAction(s: NextActionInput): Diagnosis {
  const zones = s.nodes.filter((n) => n.kind === 'zone')
  const gens = s.nodes.filter((n) => n.kind === 'gen')
  const trafos = s.nodes.filter((n) => n.kind === 'trafo')
  const failedCable = s.cables.find((c) => c.failed)
  const failedNode = s.nodes.find((n) => n.failed && n.kind !== 'zone')
  const mismatch = zones.filter((z) => s.mismatch.has(z.id))
  const hot = s.cables.find((c) => !c.failed && c.temp > 75)
  const unpowered = zones.filter((z) => !s.powered.has(z.id))
  const hasCable = (id: number) => s.cables.some((c) => c.a === id || c.b === id)

  if (!gens.length) {
    return {
      tone: 'info',
      title: 'Coloque um gerador',
      detail: 'No painel Geração, escolha Gerador e clique no chão perto das casas.',
      fix: 'Ele produz em 13,8 kV; o gás começa em 2 s e a hídrica em 8 s.'
    }
  }
  if (gens.every((g) => !g.online && !g.failed)) {
    return { tone: 'info', title: 'Aguardando o gerador', detail: 'A partida leva alguns segundos.', fix: 'O gerador solar só opera durante o dia.' }
  }
  if (failedNode) {
    return {
      tone: 'bad',
      title: `${KIND_LABEL[failedNode.kind]} falhado`,
      detail: `#${failedNode.id} está fora de operação por sobrecarga.`,
      fix: 'Selecione o equipamento e use Reparar.'
    }
  }
  if (!trafos.length) {
    return {
      tone: 'info',
      title: 'Coloque um transformador',
      detail: 'No painel Transmissão, escolha Trafo. Ele abaixa 13,8 kV para 110 V ou 220 V.',
      fix: 'Casas usam 110 V; prédios e hospitais usam 220 V.'
    }
  }
  if (!zones.length) {
    return {
      tone: 'info',
      title: 'Adicione uma zona consumidora',
      detail: 'No painel Consumo, escolha Casa, Prédio ou Hospital e clique no chão.',
      fix: 'A zona precisa da mesma tensão que o trafo entrega.'
    }
  }
  if (failedCable) {
    return {
      tone: 'bad',
      title: `Cabo C-${failedCable.id} queimado`,
      detail: `Ele passou de ${T_MAX} °C e parou de conduzir.`,
      fix: 'Selecione o cabo para reparar ou remover.'
    }
  }
  if (mismatch.length) {
    const z = mismatch[0]
    const actual = volts(s.nodeV[z.id])
    if (actual <= 0) {
      return {
        tone: 'bad',
        title: 'Tensão errada',
        detail: `A ${zoneLabel(z)} #${z.id} espera ${z.volt} V, mas está ligada em uma tensão incompatível.`,
        fix: `Ligue a zona no lado de baixa tensão de um trafo de ${z.volt} V.`
      }
    }
    return {
      tone: 'bad',
      title: 'Tensão errada',
      detail: `A ${zoneLabel(z)} #${z.id} espera ${z.volt} V, mas recebeu ${actual} V.`,
      fix: `Use um trafo de ${z.volt} V ou conecte uma zona de ${actual} V.`
    }
  }
  if (hot) {
    return {
      tone: 'warn',
      title: `Cabo C-${hot.id} aquecendo`,
      detail: `Temperatura de ${hot.temp.toFixed(0)} °C; o limite é ${T_MAX} °C.`,
      fix: 'Aumente a seção, use cobre, encurte o trecho ou duplique o cabo.'
    }
  }
  const near = s.nodes.find((n) => n.cap > 0 && n.load > n.cap * 0.85)
  if (near) {
    return {
      tone: 'warn',
      title: `${KIND_LABEL[near.kind]} perto do limite`,
      detail: `#${near.id} está com ${near.load.toFixed(0)} de ${near.cap} kW.`,
      fix: 'Divida a carga em mais ramais ou construa outro transformador/gerador.'
    }
  }
  if (!s.cables.length) {
    return {
      tone: 'info',
      title: 'Ligue o gerador ao trafo',
      detail: 'Escolha Cabo e clique no gerador; depois clique no trafo.',
      fix: 'Esse é o trecho de alta tensão (13,8 kV).'
    }
  }
  const withoutCable = zones.find((z) => !hasCable(z.id))
  if (withoutCable) {
    return {
      tone: 'info',
      title: `Ligue a ${zoneLabel(withoutCable).toLowerCase()} #${withoutCable.id} ao trafo`,
      detail: 'Cada zona precisa de um cabo até o lado de baixa tensão do trafo.',
      fix: 'Escolha Cabo e clique no trafo; depois na zona.'
    }
  }
  if (unpowered.length) {
    const deficit = Math.max(0, s.demand - s.supplied)
    return {
      tone: 'warn',
      title: 'Zonas sem energia',
      detail: `${unpowered.length} zona(s) sem energia; déficit de ${deficit.toFixed(0)} kW.`,
      fix: 'Confira se o gerador está online e se o cabo chega ao lado correto do trafo.'
    }
  }
  return {
    tone: 'ok',
    title: 'Tudo aceso',
    detail: 'A cidade está atendida. Mantenha a demanda coberta para cumprir o objetivo.'
  }
}

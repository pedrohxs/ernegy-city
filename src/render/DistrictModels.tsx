import type { GNode } from '../electrical/engine'
import { districtMaterial, districtParts } from './districtParts'

export function DistrictModel({ node, powered = false, mismatch = false, failed = false }: {
  node: GNode; powered?: boolean; mismatch?: boolean; failed?: boolean
}) {
  return <group dispose={null}>
    {districtParts(node).map(({ finish, geometry }) => <mesh key={finish} geometry={geometry}
      material={districtMaterial(finish, powered, mismatch, failed)}
      castShadow={finish !== 'window' && finish !== 'foundation'} receiveShadow />)}
  </group>
}

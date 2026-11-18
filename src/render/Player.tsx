import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PLAYER_RUN_SPEED, PLAYER_WALK_SPEED } from '../data/balance'
import type { GNode } from '../electrical/engine'
import { useGame, type S } from '../store/gameStore'
import Avatar from './Avatar'
import { districtBounds } from './districtParts'
import { strideLength, type AvatarMotion } from './gait'

const ground = 0.08
const bodyRadius = 0.37
const eyeHeight = 1.67
const cameraDistance = 6.8
const cameraSide = 1.2
const { clamp, damp } = THREE.MathUtils

const canWalk = (s: S) =>
  s.screen === 'game' && s.view !== 'orbit' && !s.photo && !s.overlay && !s.paused && !s.report && !s.levelResult

// A proteção segue a base visível de cada construção, inclusive nos lotes mais próximos.
function avoidBuilding(position: THREE.Vector3, nodes: GNode[]) {
  for (const node of nodes) {
    const { min, max } = districtBounds(node)
    const left = node.x + min.x - bodyRadius, right = node.x + max.x + bodyRadius
    const back = node.z + min.z - bodyRadius, front = node.z + max.z + bodyRadius
    if (position.x <= left || position.x >= right || position.z <= back || position.z >= front) continue
    const dx = Math.min(position.x - left, right - position.x)
    const dz = Math.min(position.z - back, front - position.z)
    if (dx < dz) position.x = position.x - left < right - position.x ? left : right
    else position.z = position.z - back < front - position.z ? back : front
  }
  position.x = clamp(position.x, -195, 195)
  position.z = clamp(position.z, -195, 195)
}

const cameraRay = new THREE.Ray()
const cameraBounds = new THREE.Box3()
const intersection = new THREE.Vector3()
function shortenCamera(focus: THREE.Vector3, position: THREE.Vector3, nodes: GNode[], out: THREE.Vector3) {
  cameraRay.origin.copy(focus)
  const distance = cameraRay.direction.subVectors(position, focus).length()
  if (distance < 1e-3) return out.copy(position)
  cameraRay.direction.divideScalar(distance)
  let available = distance
  for (const node of nodes) {
    const { min, max } = districtBounds(node)
    cameraBounds.min.set(node.x + min.x, min.y, node.z + min.z)
    cameraBounds.max.set(node.x + max.x, max.y, node.z + max.z)
    if (!cameraRay.intersectBox(cameraBounds, intersection)) continue
    available = Math.min(available, Math.max(0.26, focus.distanceTo(intersection) - 0.32))
  }
  return cameraRay.at(available, out)
}

export default function Player() {
  const view = useGame(s => s.view)
  const photo = useGame(s => s.photo)
  const session = useGame(s => s.session)
  const enabled = useGame(canWalk)
  const camera = useThree(s => s.camera)
  const avatar = useRef<THREE.Group>(null)
  const motion = useRef<AvatarMotion>({ phase: 0, weight: 0, run: 0 })
  const input = useRef<Record<string, boolean>>({})
  const player = useRef({
    position: new THREE.Vector3(10, ground, 32), velocity: new THREE.Vector3(),
    cameraPosition: new THREE.Vector3(), focus: new THREE.Vector3(), desired: new THREE.Vector3(),
    yaw: 0, pitch: 0.3, heading: 0, initialized: false,
  })

  useEffect(() => {
    function clear() {
      input.current = {}
      player.current.velocity.set(0, 0, 0)
    }
    function keydown(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select, button, summary')) return
      if (canWalk(useGame.getState())) input.current[e.code] = true
    }
    function keyup(e: KeyboardEvent) { delete input.current[e.code] }
    function drag(e: PointerEvent) {
      if (!(e.buttons & 1) || !(e.target instanceof HTMLCanvasElement) || !canWalk(useGame.getState())) return
      const s = player.current
      const sensitivity = 0.005 * useGame.getState().sensitivity
      s.yaw -= e.movementX * sensitivity
      s.pitch = clamp(s.pitch + e.movementY * sensitivity * 0.8, -0.55, 1)
    }
    function visibility() { if (document.hidden) clear() }
    window.addEventListener('keydown', keydown)
    window.addEventListener('keyup', keyup)
    window.addEventListener('pointermove', drag)
    window.addEventListener('blur', clear)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      window.removeEventListener('keydown', keydown)
      window.removeEventListener('keyup', keyup)
      window.removeEventListener('pointermove', drag)
      window.removeEventListener('blur', clear)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [])

  useEffect(() => {
    const s = player.current
    s.position.set(10, ground, 32)
    avoidBuilding(s.position, useGame.getState().nodes)
    s.yaw = 0; s.pitch = 0.3; s.heading = 0; s.initialized = false
  }, [session])

  useEffect(() => {
    input.current = {}
    player.current.velocity.set(0, 0, 0)
    motion.current.weight = 0
    motion.current.run = 0
  }, [view, enabled])

  useEffect(() => { player.current.initialized = false }, [view, photo])

  useFrame((_, delta) => {
    const game = useGame.getState()
    if (!canWalk(game)) return

    const dt = Math.min(delta, 0.05)
    if (dt <= 0) return
    const s = player.current, keys = input.current, gait = motion.current
    if (keys.ArrowLeft || keys.KeyQ) s.yaw += 1.8 * dt
    if (keys.ArrowRight || keys.KeyE) s.yaw -= 1.8 * dt

    const forward = Number(!!(keys.KeyW || keys.ArrowUp)) - Number(!!(keys.KeyS || keys.ArrowDown))
    const sideways = Number(!!keys.KeyD) - Number(!!keys.KeyA)
    const sin = Math.sin(s.yaw), cos = Math.cos(s.yaw)
    const limit = keys.ShiftLeft || keys.ShiftRight ? PLAYER_RUN_SPEED : PLAYER_WALK_SPEED
    const speed = limit / Math.max(1, Math.hypot(forward, sideways))
    s.velocity.x = damp(s.velocity.x, (sideways * cos - forward * sin) * speed, 14, dt)
    s.velocity.z = damp(s.velocity.z, (-sideways * sin - forward * cos) * speed, 14, dt)
    const { x: startX, z: startZ } = s.position
    s.position.addScaledVector(s.velocity, dt)
    avoidBuilding(s.position, game.nodes)
    const dx = s.position.x - startX, dz = s.position.z - startZ
    const distance = Math.min(Math.hypot(dx, dz), s.velocity.length() * dt)
    const realSpeed = distance / dt

    gait.run = damp(gait.run, clamp((realSpeed - PLAYER_WALK_SPEED) / (PLAYER_RUN_SPEED - PLAYER_WALK_SPEED), 0, 1), 9, dt)
    gait.weight = damp(gait.weight, clamp(realSpeed / PLAYER_WALK_SPEED, 0, 1), 15, dt)
    gait.phase = (gait.phase + distance / strideLength(gait.run)) % 1
    if (realSpeed > 0.12) {
      const angle = Math.atan2(-dx, -dz) - s.heading
      s.heading += Math.atan2(Math.sin(angle), Math.cos(angle)) * (1 - Math.exp(-14 * dt))
    }

    if (avatar.current) {
      avatar.current.position.copy(s.position)
      avatar.current.rotation.y = s.heading
    }

    const { x, y, z } = s.position
    if (game.view === 'terceira') {
      const pitch = clamp(s.pitch, 0, 0.83)
      const horizontal = Math.cos(pitch) * cameraDistance
      s.focus.set(x, y + 1.22, z)
      s.desired.set(x + sin * horizontal + cos * cameraSide, y + 1.56 + Math.sin(pitch) * cameraDistance, z + cos * horizontal - sin * cameraSide)
    } else {
      const pitch = s.pitch - 0.3
      s.desired.set(x, y + eyeHeight, z)
      s.focus.set(x - sin * Math.cos(pitch) * 5, y + eyeHeight - Math.sin(pitch) * 5, z - cos * Math.cos(pitch) * 5)
    }
    if (!s.initialized) {
      s.cameraPosition.copy(s.desired)
      s.initialized = true
    }
    s.cameraPosition.lerp(s.desired, 1 - Math.exp(-13 * dt))
    if (game.view === 'terceira') shortenCamera(s.focus, s.cameraPosition, game.nodes, camera.position)
    else camera.position.copy(s.cameraPosition)
    camera.lookAt(s.focus)
  }, -1)

  if (view !== 'terceira' || photo) return null
  return <group name="walk-mode-avatar" ref={avatar} position={player.current.position} rotation-y={player.current.heading}>
    <Avatar motion={motion} />
  </group>
}

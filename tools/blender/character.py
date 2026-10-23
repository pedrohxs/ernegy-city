# Gera um personagem cartoon (eletricista) low-poly e exporta public/models/player.glb.
# Uso: blender -b -P tools/blender/character.py
# Estilo: capacete amarelo, macacão, luvas laranja, botas — inspirado nas referências.
# Convenções: origem nos pés, ~4 unidades de altura, frente para -Y (o jogo ajusta rotação se preciso).

import bpy
import os
import sys
import math

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(args[0] if args else os.path.join(HERE, '..', '..', 'public', 'models'))
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)


def mat(name, color, rough=0.6):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*color, 1.0)
    if 'Roughness' in b.inputs:
        b.inputs['Roughness'].default_value = rough
    return m


M = {
    'skin': mat('skin', (0.95, 0.76, 0.60)),
    'shirt': mat('shirt', (0.96, 0.96, 0.96)),
    'overall': mat('overall', (0.24, 0.34, 0.48)),
    'hat': mat('hat', (0.99, 0.80, 0.12)),
    'boot': mat('boot', (0.14, 0.14, 0.16)),
    'belt': mat('belt', (0.42, 0.28, 0.14)),
    'buckle': mat('buckle', (0.72, 0.72, 0.75)),
    'glove': mat('glove', (0.95, 0.52, 0.18)),
    'hair': mat('hair', (0.22, 0.16, 0.11)),
    'dark': mat('dark', (0.10, 0.10, 0.12)),
    'white': mat('white', (0.98, 0.98, 0.98)),
}


def sphere(name, r, loc, material, scale=(1, 1, 1), segments=16, rings=10):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=segments, ring_count=rings, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    bpy.ops.object.shade_smooth()
    o.data.materials.append(material)
    return o


def cube(name, size, loc, material, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    return o


def cylinder(name, r, h, loc, material, rot=(0, 0, 0), verts=12):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, vertices=verts, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(material)
    return o


# Blender é Z-up: pés em Z=0. Frente para -Y.
# pernas e botas
for x in (-0.28, 0.28):
    cylinder(f'leg_{x}', 0.20, 1.35, (x, 0, 0.85), M['overall'])
    cube(f'boot_{x}', (0.42, 0.6, 0.28), (x, -0.05, 0.15), M['boot'])
# quadril/cinto
cube('hip', (1.05, 0.6, 0.42), (0, 0, 1.55), M['overall'])
cube('belt', (1.1, 0.64, 0.14), (0, 0, 1.72), M['belt'])
cube('buckle', (0.18, 0.08, 0.16), (0, -0.33, 1.72), M['buckle'])
# torso: macacão sobre camisa branca
cube('torso', (1.0, 0.58, 0.9), (0, 0, 2.15), M['shirt'])
cube('overall_front', (0.8, 0.62, 0.7), (0, 0, 2.05), M['overall'])
cube('strap_l', (0.14, 0.6, 0.7), (-0.28, 0, 2.4), M['overall'])
cube('strap_r', (0.14, 0.6, 0.7), (0.28, 0, 2.4), M['overall'])
# braços: saem do ombro e descem (A-pose leve) + luvas laranja
for s in (-1, 1):
    sx, a, L = 0.5 * s, 0.16, 1.0
    dx, dz = math.sin(a) * s, -math.cos(a)
    sphere(f'shoulder_{s}', 0.20, (sx, 0, 2.48), M['shirt'])
    cylinder(f'arm_{s}', 0.15, L, (sx + dx * L / 2, 0, 2.48 + dz * L / 2), M['shirt'], rot=(0, math.pi - a * s, 0))
    sphere(f'glove_{s}', 0.18, (sx + dx * (L + 0.08), 0, 2.48 + dz * (L + 0.08)), M['glove'])
# cabeça
cylinder('neck', 0.16, 0.2, (0, 0, 2.72), M['skin'])
sphere('head', 0.5, (0, 0, 3.15), M['skin'], scale=(1, 0.95, 1.05), segments=20, rings=12)
sphere('ear_l', 0.12, (-0.5, 0, 3.15), M['skin'])
sphere('ear_r', 0.12, (0.5, 0, 3.15), M['skin'])
sphere('eye_l', 0.07, (-0.18, -0.44, 3.2), M['dark'], segments=10, rings=6)
sphere('eye_r', 0.07, (0.18, -0.44, 3.2), M['dark'], segments=10, rings=6)
sphere('nose', 0.08, (0, -0.5, 3.08), M['skin'])
cube('mouth', (0.26, 0.06, 0.08), (0, -0.46, 2.94), M['dark'])
# cabelo (lateral) e capacete
cube('hair', (0.9, 0.5, 0.28), (0, 0.18, 3.5), M['hair'])
cylinder('hat_dome', 0.5, 0.4, (0, 0, 3.62), M['hat'], verts=16)
sphere('hat_top', 0.5, (0, 0, 3.78), M['hat'], scale=(1, 1, 0.6), segments=18, rings=10)
cube('hat_brim', (0.9, 1.0, 0.08), (0, -0.18, 3.44), M['hat'])
# chave de fenda no cinto
cylinder('tool', 0.05, 0.5, (0.28, -0.32, 1.5), M['glove'], rot=(0.2, 0, 0), verts=8)
cylinder('tool_tip', 0.05, 0.16, (0.28, -0.32, 1.22), M['buckle'], verts=8)

out = os.path.join(OUT, 'player.glb')
kwargs = dict(filepath=out, export_format='GLB', use_selection=False)
try:
    bpy.ops.export_scene.gltf(export_draco_mesh_compression_enable=True, **kwargs)
    print(f'[ok] {out} (Draco)')
except TypeError:
    bpy.ops.export_scene.gltf(**kwargs)
    print(f'[ok] {out}')
print('Rode "npm run assets:check" para validar. Se o personagem estiver virado, use modelOverrides.')

# Gera os modelos "específicos" (equipamentos elétricos e prédios) em low-poly e
# exporta cada um como GLB para public/models/, seguindo docs/ASSETS.md.
#
# Uso (Blender 3.6+ ou 4.x), na raiz do projeto:
#   blender -b -P tools/blender/equipment.py
#   blender -b -P tools/blender/equipment.py -- outra/pasta/de/saida
#
# Gera: gen.glb, sub.glb, trafo.glb, casa.glb, predio.glb, hospital.glb
# Convenções: Y-up na exportação (Blender Z-up → glTF Y-up), origem na base,
# 1 unidade ≈ 1 m didático. ATENÇÃO: script não testado nesta máquina (Blender ausente).

import bpy
import os
import sys

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(args[0] if args else os.path.join(HERE, '..', '..', 'public', 'models'))
os.makedirs(OUT, exist_ok=True)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def mat(name, color, emissive=None, strength=2.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    rgba = (color[0], color[1], color[2], 1.0)
    bsdf.inputs['Base Color'].default_value = rgba
    if 'Roughness' in bsdf.inputs:
        bsdf.inputs['Roughness'].default_value = 0.7
    if emissive is not None:
        # Blender 4.x renomeou para "Emission Color"; 3.x usa "Emission"
        for key in ('Emission Color', 'Emission'):
            if key in bsdf.inputs:
                bsdf.inputs[key].default_value = (emissive[0], emissive[1], emissive[2], 1.0)
                break
        if 'Emission Strength' in bsdf.inputs:
            bsdf.inputs['Emission Strength'].default_value = strength
    return m


def box(name, size, loc, material):
    bpy.ops.mesh.primitive_cube_add(size=2, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    return o


def cyl(name, radius, depth, loc, material, rot=(0, 0, 0), verts=12):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, vertices=verts, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(material)
    return o


def cone(name, radius, depth, loc, material, verts=4):
    bpy.ops.mesh.primitive_cone_add(radius1=radius, depth=depth, vertices=verts, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(material)
    return o


def export(name):
    path = os.path.join(OUT, f'{name}.glb')
    kwargs = dict(filepath=path, export_format='GLB', use_selection=False)
    try:
        bpy.ops.export_scene.gltf(export_draco_mesh_compression_enable=True, **kwargs)
        print(f'[ok] {path} (Draco)')
    except TypeError:
        bpy.ops.export_scene.gltf(**kwargs)
        print(f'[ok] {path}')


# ---- Equipamentos elétricos ----
def build_gen():
    reset()
    body = mat('metal', (0.79, 0.83, 0.88))
    dark = mat('metal_dark', (0.39, 0.45, 0.55))
    yellow = mat('lamp', (0.98, 0.79, 0.16), emissive=(1.0, 0.8, 0.2), strength=1.2)
    box('body', (10, 8, 6), (0, 0, 3), body)          # Blender Z-up: altura em Z
    cyl('stack_a', 1.0, 10, (-3, 0, 11), dark)
    cyl('stack_b', 1.0, 10, (3, 0, 11), dark)
    box('cap', (10.4, 8.4, 0.6), (0, 0, 6.3), yellow)


def build_sub():
    reset()
    body = mat('steel', (0.58, 0.64, 0.71))
    insul = mat('insulator', (0.89, 0.91, 0.94))
    box('body', (10, 10, 3), (0, 0, 1.5), body)
    for x in (-3, 0, 3):
        cyl(f'bushing_{x}', 0.4, 3, (x, 0, 4.5), insul)


def build_trafo():
    reset()
    body = mat('orange', (0.98, 0.57, 0.24))
    insul = mat('insulator', (0.89, 0.91, 0.94))
    cyl('tank', 3, 6, (0, 0, 3), body, verts=16)
    for x in (-1.8, 0, 1.8):
        cyl(f'insul_{x}', 0.4, 3, (x, 0, 7.5), insul)


# ---- Prédios/casas ----
def build_casa():
    reset()
    wall = mat('wall', (0.54, 0.59, 0.67))
    roof = mat('roof', (0.22, 0.26, 0.31))
    win = mat('win', (0.1, 0.1, 0.12), emissive=(1.0, 0.82, 0.48), strength=2.0)
    box('body', (6, 6, 5), (0, 0, 2.5), wall)
    cone('roof', 4.6, 3, (0, 0, 5.7), roof)
    box('window', (1.2, 0.2, 1.2), (0, -3, 3.2), win)


def build_predio():
    reset()
    wall = mat('wall', (0.54, 0.59, 0.67))
    win = mat('win', (0.1, 0.1, 0.12), emissive=(1.0, 0.82, 0.48), strength=2.0)
    box('body', (7, 7, 16), (0, 0, 8), wall)
    for z in (3, 6, 9, 12):
        box(f'win_{z}', (5.4, 0.3, 1.0), (0, -3.6, z), win)


def build_hospital():
    reset()
    wall = mat('hospital_wall', (0.91, 0.93, 0.96))
    win = mat('win', (0.1, 0.1, 0.12), emissive=(0.86, 0.92, 1.0), strength=1.2)
    red = mat('cross', (0.94, 0.27, 0.27), emissive=(0.94, 0.27, 0.27), strength=1.5)
    box('body', (8, 8, 10), (0, 0, 5), wall)
    box('window', (5.6, 0.3, 1.2), (0, -4, 6), win)
    box('cross_v', (0.7, 0.4, 2.6), (0, -4.2, 8), red)
    box('cross_h', (2.6, 0.4, 0.7), (0, -4.2, 8), red)


def main():
    # Só equipamentos: casa/predio/hospital vêm dos packs (não sobrescrever).
    for name, build in (('gen', build_gen), ('sub', build_sub), ('trafo', build_trafo)):
        build()
        export(name)
    print(f'\nConcluído. Modelos em: {OUT}\nRode "npm run assets:check" para validar.')


if __name__ == '__main__':
    main()

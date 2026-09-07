"""Export the saved Blender scene to a compact, self-contained web asset.

Run with: Blender --background myoffice.blend --python export_web.py
The source .blend is never overwritten.
"""
import bpy
import os
from collections import defaultdict

ROOT = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(ROOT, 'assets'), exist_ok=True)
scene = bpy.context.scene
camera = scene.camera

# Merge by material within each collection to reduce WebGL draw calls.
# This only changes the temporary export session, keeping the .blend editable.
groups = defaultdict(list)
for obj in list(scene.objects):
    if obj.type != 'MESH' or obj.hide_render or obj.name == 'Fond studio':
        continue
    collection = obj.users_collection[0]
    material_key = tuple(slot.material.name if slot.material else '' for slot in obj.material_slots)
    groups[(collection.name, material_key)].append(obj)

export_objects = []
for (collection_name, materials), objects in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.hide_set(False)
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    if len(objects) > 1:
        bpy.ops.object.join()
    merged = bpy.context.view_layer.objects.active
    merged.name = f"{collection_name} / {' + '.join(materials)}"
    export_objects.append(merged)

bpy.ops.object.select_all(action='DESELECT')
for obj in export_objects:
    obj.select_set(True)
if camera:
    camera.select_set(True)

path = os.path.join(ROOT, 'assets', 'myoffice.glb')
bpy.ops.export_scene.gltf(
    filepath=path,
    export_format='GLB',
    use_selection=True,
    export_cameras=True,
    export_lights=False,
    export_animations=False,
    export_yup=True,
    export_apply=True,
    export_materials='EXPORT',
)
print(f'WEB_EXPORT_COMPLETE: {len(export_objects)} mesh batches, {os.path.getsize(path):,} bytes', flush=True)

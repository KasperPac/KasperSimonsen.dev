"""Shared helpers for the Blender scripts (setup_street.py, greybox_office.py, export.py)."""
import json
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

REPO = Path(__file__).resolve().parents[2]
BLEND = REPO / "art" / "office.blend"


def meta():
    return json.loads((REPO / "art" / "osm" / "cremorne-meta.json").read_text())


def gl_to_bl(xz):
    """glTF ground coords [x, z] (+x east, -z north) -> Blender Vector (+x east, +y north, z = 0)."""
    return Vector((xz[0], -xz[1], 0.0))


def collection(name):
    col = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if col.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(col)
    return col


def clear(col):
    for obj in list(col.all_objects):
        bpy.data.objects.remove(obj, do_unlink=True)


def _place(obj, location, parent, col):
    obj.location = location
    obj.parent = parent  # matrix_parent_inverse stays identity: location is in the parent's space
    col.objects.link(obj)
    return obj


def box(name, size, location, parent, col):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    bm.to_mesh(mesh)
    bm.free()
    return _place(bpy.data.objects.new(name, mesh), location, parent, col)


def cylinder(name, radius, depth, location, parent, col, segments=12):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segments, radius1=radius, radius2=radius, depth=depth)
    bm.to_mesh(mesh)
    bm.free()
    return _place(bpy.data.objects.new(name, mesh), location, parent, col)


def empty(name, location, parent, col):
    return _place(bpy.data.objects.new(name, None), location, parent, col)


def save():
    BLEND.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))

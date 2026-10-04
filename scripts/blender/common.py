"""Shared helpers for the Blender scripts (setup_street.py, greybox_office.py, export.py)."""
import json
import math
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector

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
    """Remove the collection's objects and the mesh/camera data they orphan, so re-runs keep clean names."""
    for obj in list(col.all_objects):
        data = obj.data
        bpy.data.objects.remove(obj, do_unlink=True)
        if data is not None and data.users == 0:
            if isinstance(data, bpy.types.Mesh):
                bpy.data.meshes.remove(data)
            elif isinstance(data, bpy.types.Camera):
                bpy.data.cameras.remove(data)


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


def text_mesh(name, text, size, depth, location, parent, col, align="CENTER"):
    """Text in Blender's built-in font as a plain mesh, standing upright and reading along +x.

    The letters face -y: their back is on y = 0 and they stand out `depth` towards -y, so `location` can sit on
    the face of a wall, sign or poster. `size` is the font size (capitals come out about 0.7 * size tall), with the
    line roughly centred on z = 0. `align` is LEFT, CENTER or RIGHT about x = 0. No curve or font datablock is left
    behind.
    """
    curve = bpy.data.curves.new(name, "FONT")
    curve.body = text
    curve.size = size
    curve.extrude = depth / 2  # either side of the glyphs' plane
    curve.resolution_u = 3  # few segments per glyph curve, so curved letters keep their facets and stay light
    curve.align_x = align
    curve.align_y = "CENTER"
    font = curve.font
    tmp = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(tmp)
    mesh = bpy.data.meshes.new_from_object(tmp.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    bpy.data.objects.remove(tmp, do_unlink=True)
    bpy.data.curves.remove(curve)
    if font is not None and font.users == 0:
        bpy.data.fonts.remove(font)
    mesh.name = name
    # glyphs lie in xy facing +z; stand them up facing -y, back face on y = 0
    mesh.transform(Matrix.Translation((0, -depth / 2, 0)) @ Matrix.Rotation(math.pi / 2, 4, "X"))
    return _place(bpy.data.objects.new(name, mesh), location, parent, col)


def save():
    BLEND.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))

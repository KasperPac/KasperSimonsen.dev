"""Street collection of art/office.blend: OSM import, The Commons' doorway and door, AAMI Park and the MCG
(landmarks.py), Nylex sign grey-box.

Re-runnable: rebuilds the street and helpers collections from art/osm/. This also removes cam_walkin,
so run greybox_office.py afterwards.
"""
import importlib
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, str(Path(__file__).parent))
import common  # noqa: E402
import landmarks  # noqa: E402

importlib.reload(common)
importlib.reload(landmarks)

OSM_GLB = common.REPO / "art" / "osm" / "cremorne-osm.glb"
DOOR_WIDTH, DOOR_HEIGHT, DOOR_DEPTH = 1.8, 2.6, 3.0
NYLEX_SIGN = (14.0, 0.3, 6.0)  # width, depth, height in metres (grey-box)


def import_osm(street):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(OSM_GLB))
    for obj in set(bpy.data.objects) - before:
        for col in list(obj.users_collection):
            col.objects.unlink(obj)
        street.objects.link(obj)


def cut_doorway(m, helpers):
    commons = bpy.data.objects["osm_commons"]
    door = common.gl_to_bl(m["door"])
    normal = common.gl_to_bl(m["normal"]).normalized()
    cutter = common.box("helper_door_cutter", (DOOR_DEPTH, DOOR_WIDTH, DOOR_HEIGHT), door + Vector((0, 0, DOOR_HEIGHT / 2)), None, helpers)
    cutter.rotation_euler.z = math.atan2(normal.y, normal.x)  # local x through the wall
    cutter.display_type = "WIRE"
    cutter.hide_render = True
    mod = commons.modifiers.new("doorway", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.object = cutter
    mod.solver = "EXACT"
    mod.use_self = True  # the three Commons footprints share walls
    mod.use_hole_tolerant = True


def commons_door(m, street):
    """prop_commons_door: the street door's leaf, origin on the hinge (left jamb, outer face). greybox_office.py
    swings it. A slim frame of stiles and rails, a recessed panel and a pull handle on the street side."""
    inward = -common.gl_to_bl(m["normal"]).normalized()
    turn = math.atan2(inward.y, inward.x) - math.pi / 2  # local +y into the building, +x along the facade
    width, height, thick = DOOR_WIDTH - 0.02, DOOR_HEIGHT - 0.02, 0.05
    stile, rail, kick = 0.1, 0.1, 0.25
    bm = bmesh.new()

    def part(size, centre):
        verts = bmesh.ops.create_cube(bm, size=1.0)["verts"]
        bmesh.ops.scale(bm, vec=Vector(size), verts=verts)
        bmesh.ops.translate(bm, vec=Vector(centre), verts=verts)

    part((stile, thick, height), (stile / 2, thick / 2, height / 2))
    part((stile, thick, height), (width - stile / 2, thick / 2, height / 2))
    part((width - 2 * stile, thick, rail), (width / 2, thick / 2, height - rail / 2))
    part((width - 2 * stile, thick, kick), (width / 2, thick / 2, kick / 2))
    panel = height - rail - kick
    part((width - 2 * stile, thick - 0.03, panel), (width / 2, thick / 2, kick + panel / 2))  # 15 mm recess each face
    handle = width - 0.16  # pull bar on the street side by the free edge; nothing on the inside, which opens flat to the wall
    part((0.03, 0.03, 0.9), (handle, -0.065, 1.05))
    for z in (0.65, 1.45):
        part((0.02, 0.05, 0.02), (handle, -0.025, z))
    mesh = bpy.data.meshes.new("prop_commons_door")
    bm.to_mesh(mesh)
    bm.free()
    leaf = bpy.data.objects.new("prop_commons_door", mesh)
    hinge = Vector((-DOOR_WIDTH / 2 + 0.01, 0.02, 0.01))  # 10 mm in from the jamb, 20 mm behind the facade
    leaf.location = common.gl_to_bl(m["door"]) + Matrix.Rotation(turn, 3, "Z") @ hinge
    leaf.rotation_euler.z = turn
    street.objects.link(leaf)
    # the sign, at eye height on the panel's street face: ~9 cm capitals, 6 mm proud, inside the panel's recess
    common.text_mesh("prop_commons_door__sign", "KASPER SIMONSEN.DEV", 0.13, 0.006, (width / 2, 0.015, 1.6), leaf, street)
    return leaf


def footprint(name, helper, helpers):
    """Moves an OSM landmark block to helpers as its footprint: drawn as wire, never rendered or exported."""
    obj = bpy.data.objects[name]
    for col in list(obj.users_collection):
        col.objects.unlink(obj)
    helpers.objects.link(obj)
    obj.name = obj.data.name = helper
    obj.display_type = "WIRE"
    obj.hide_render = True
    return obj


def nylex_sign(m, street):
    if not m.get("nylex"):
        return None
    spot = common.gl_to_bl(m["nylex"])
    depsgraph = bpy.context.evaluated_depsgraph_get()
    hit, location, *_ = bpy.context.scene.ray_cast(depsgraph, Vector((spot.x, spot.y, 500)), Vector((0, 0, -1)))
    roof = location.z if hit else 30.0
    width, depth, height = NYLEX_SIGN
    sign = common.box("prop_nylex_sign", (width, depth, height), Vector((spot.x, spot.y, roof + 2 + height / 2)), None, street)
    sign.rotation_euler.z = math.atan2(-spot.y, -spot.x) - math.pi / 2  # face The Commons
    return round(roof, 1)


def main():
    m = common.meta()
    street = common.collection("street")
    helpers = common.collection("helpers")
    common.clear(street)
    common.clear(helpers)
    import_osm(street)
    landmarks.aami_park(footprint("osm_aami_park", "helper_aami_footprint", helpers), street)
    landmarks.mcg(footprint("osm_mcg", "helper_mcg_footprint", helpers), street)
    cut_doorway(m, helpers)
    commons_door(m, street)
    roof = nylex_sign(m, street)
    common.save()
    return {"street": sorted(o.name for o in street.all_objects), "nylex_roof": roof, "blend": str(common.BLEND)}


if __name__ == "__main__":
    SUMMARY = main()

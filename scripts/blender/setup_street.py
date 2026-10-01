"""Street collection of art/office.blend: OSM import, The Commons' doorway, Nylex sign grey-box.

Re-runnable: rebuilds the street and helpers collections from art/osm/. This also removes cam_walkin,
so run greybox_office.py afterwards.
"""
import importlib
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).parent))
import common  # noqa: E402

importlib.reload(common)

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
    cut_doorway(m, helpers)
    roof = nylex_sign(m, street)
    common.save()
    return {"street": sorted(o.name for o in street.all_objects), "nylex_roof": roof, "blend": str(common.BLEND)}


if __name__ == "__main__":
    SUMMARY = main()

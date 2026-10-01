"""Street collection of art/office.blend: OSM import, AAMI Park and the MCG (landmarks.py), Nylex sign grey-box.

The Commons itself (commons.py), its lobby door and everything behind it are built by greybox_office.py on the
footprint left here in helpers, because the office's window decides where its front wall gets a hole.

Re-runnable: rebuilds the street and helpers collections from art/osm/. This also removes cam_walkin, The Commons
and the doors, so run greybox_office.py afterwards.
"""
import importlib
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).parent))
import common  # noqa: E402
import landmarks  # noqa: E402

importlib.reload(common)
importlib.reload(landmarks)

OSM_GLB = common.REPO / "art" / "osm" / "cremorne-osm.glb"
NYLEX_SIGN = (14.0, 0.3, 6.0)  # width, depth, height in metres (grey-box)


def import_osm(street):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(OSM_GLB))
    for obj in set(bpy.data.objects) - before:
        for col in list(obj.users_collection):
            col.objects.unlink(obj)
        street.objects.link(obj)


def footprint(name, helper, helpers):
    """Moves an OSM block to helpers as the footprint a hand-built model stands on: wire, never rendered or exported."""
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
    footprint("osm_commons", "helper_commons_footprint", helpers)
    roof = nylex_sign(m, street)
    common.save()
    return {"street": sorted(o.name for o in street.all_objects), "nylex_roof": roof, "blend": str(common.BLEND)}


if __name__ == "__main__":
    SUMMARY = main()

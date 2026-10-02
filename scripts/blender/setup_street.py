"""Street collection of art/office.blend: OSM import, AAMI Park, the MCG with its rail portals (landmarks.py) and the
Nylex silos (signs.py).

The Commons itself (commons.py), its lobby door and everything behind it are built by greybox_office.py on the
footprint left here in helpers, because the office's window decides where its front wall gets a hole. The heritage
signs are stood there too, because they face the opening camera.

Re-runnable: rebuilds the street and helpers collections from art/osm/. This also removes cam_walkin, The Commons,
the doors and the signs, so run greybox_office.py afterwards.
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
import signs  # noqa: E402

importlib.reload(common)
importlib.reload(landmarks)
importlib.reload(signs)

OSM_GLB = common.REPO / "art" / "osm" / "cremorne-osm.glb"
# A portal where the rail lines run in under the MCG (metres): a pier either side of the opening and a deep lintel
# over it, standing `proud` of the stadium's outer wall, with the opening's back panel `recess` behind its face.
PORTAL = {"pier": 3.0, "clear": 6.5, "lintel": 2.5, "proud": 2.0, "recess": 1.2, "panel": 0.3}


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


def _slab(bm, lo, hi):
    bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((Vector(lo) + Vector(hi)) / 2)
                          @ Matrix.Diagonal((*(Vector(hi) - Vector(lo)), 1.0)))


def mcg_portals(m, mcg, street):
    """prop_mcg__portal_NN at each of the MCG's rail portals in meta, facing out along the line. Each is built back to
    wherever the faceted wall stands behind it, and its back panel hides the rail ends cut just inside the wall."""
    p = PORTAL
    bpy.context.view_layer.update()  # the stadium was only just placed
    to_mcg = mcg.matrix_world.inverted()
    portals = []
    for k, portal in enumerate(m["landmarks"]["mcg"]["portals"]):
        centre, inward = common.gl_to_bl(portal["centre"]), common.gl_to_bl(portal["direction"]).normalized()
        # local frame: +y in along the line, +x across it, z up from the ground
        frame = Matrix.Translation(centre) @ Matrix.Rotation(math.atan2(inward.y, inward.x) - math.pi / 2, 4, "Z")
        half = portal["width"] / 2
        wall = {}
        steps = math.ceil(2 * (half + p["pier"]))  # every metre or so, so no corner of the faceted wall slips between
        for x in [-half - p["pier"] + 2 * (half + p["pier"]) * i / steps for i in range(steps + 1)] + [-half, half]:
            start = to_mcg @ frame @ Vector((x, -80.0, 3.0))
            hit, location, *_ = mcg.ray_cast(start, to_mcg.to_3x3() @ frame.to_3x3() @ Vector((0, 1, 0)))
            if not hit:
                raise ValueError(f"portal {k} misses the MCG's wall at {x:+.1f} m")
            wall[x] = (frame.inverted() @ mcg.matrix_world @ location).y
        front = min(wall.values()) - p["proud"]
        top = p["clear"] + p["lintel"]
        bm = bmesh.new()
        for side in (-1, 1):
            lo, hi = sorted((side * half, side * (half + p["pier"])))
            back = max(y for x, y in wall.items() if lo <= x <= hi) + 0.5
            _slab(bm, (lo, front, 0.0), (hi, back, top))
        _slab(bm, (-half, front, p["clear"]), (half, max(wall.values()) + 0.5, top))
        _slab(bm, (-half, front + p["recess"], 0.0), (half, front + p["recess"] + p["panel"], p["clear"]))
        mesh = bpy.data.meshes.new(f"prop_mcg__portal_{k:02d}")
        bm.to_mesh(mesh)
        bm.free()
        obj = bpy.data.objects.new(mesh.name, mesh)
        street.objects.link(obj)
        obj.parent = mcg
        obj.matrix_parent_inverse = to_mcg
        obj.matrix_world = frame
        portals.append(obj.name)
    return portals


def main():
    m = common.meta()
    street = common.collection("street")
    helpers = common.collection("helpers")
    common.clear(street)
    common.clear(helpers)
    import_osm(street)
    landmarks.aami_park(footprint("osm_aami_park", "helper_aami_footprint", helpers), street)
    mcg = landmarks.mcg(footprint("osm_mcg", "helper_mcg_footprint", helpers), street)
    portals = mcg_portals(m, mcg, street)
    signs.nylex_silos(footprint("osm_nylex_silos", "helper_nylex_silos_footprint", helpers), street)
    footprint("osm_commons", "helper_commons_footprint", helpers)
    common.save()
    return {"street": sorted(o.name for o in street.all_objects), "portals": portals, "blend": str(common.BLEND)}


if __name__ == "__main__":
    SUMMARY = main()

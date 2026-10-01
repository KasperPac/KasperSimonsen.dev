"""Street collection of art/office.blend: OSM import, The Commons' doorway, AAMI Park, Nylex sign grey-box.

Re-runnable: rebuilds the street and helpers collections from art/osm/. This also removes cam_walkin,
so run greybox_office.py afterwards.
"""
import importlib
import math
import statistics
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, str(Path(__file__).parent))
import common  # noqa: E402

importlib.reload(common)

OSM_GLB = common.REPO / "art" / "osm" / "cremorne-osm.glb"
DOOR_WIDTH, DOOR_HEIGHT, DOOR_DEPTH = 1.8, 2.6, 3.0
NYLEX_SIGN = (14.0, 0.3, 6.0)  # width, depth, height in metres (grey-box)

# AAMI Park, built on its OSM outline, which traces the roof (metres). Shape only: no name, logos or signage.
AAMI_VALLEY_DEG = 40.0  # a notch in the outline this sharp is the valley between two roof bubbles
AAMI_STANDS = (19.0, 4.0, 36.0)  # back height, front-row height, depth in from the facade
AAMI_ROOF_DEPTH = 40.0  # the roof's inner edge, cantilevered past the front row
# One bubble per valley-to-valley bay, 14 triangles: feet at the bay's corners, a crown over each side (outer
# rim, the shared valley arches, inner rim) and four top points, each pulled from the bay's centre towards its
# crown. Tuned so neighbouring roof triangles meet at 25 degrees or more, which is what the clean-edge renderer
# needs to draw the triangulation; rounder than that and the facets stop drawing.
AAMI_BUBBLE = {
    "feet": (19.0, 21.0),  # on the facade, at the inner edge
    "crowns": (21.8, 29.5, 21.2),  # outer rim, valleys, inner rim
    "tops": (35.0, 32.9, 32.3),  # top points towards the outer rim, the valleys, the inner rim
    "tops_at": (0.9, 0.16, 0.9),  # fraction of the way from the bay's centre to that crown
    "centre_at": 0.5,  # bay centre, from the facade to the inner edge
    "corner_lift": 2.3,  # the four big corner bays stand this much taller
    "inner_bulge": 0.6,  # the inner rim bulges into the bowl by this much of the outer scallop
}


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


def outline(obj):
    """The footprint an OSM extrusion stands on (its open bottom edge), in world XY, counter-clockwise."""
    me = obj.data
    links = {}
    for e in me.edges:
        a, b = e.vertices
        if abs(me.vertices[a].co.z) < 1e-3 and abs(me.vertices[b].co.z) < 1e-3:
            links.setdefault(a, []).append(b)
            links.setdefault(b, []).append(a)
    loop = [next(iter(links))]
    while nxt := [i for i in links[loop[-1]] if i not in loop]:
        loop.append(nxt[0])
    ring = [obj.matrix_world @ me.vertices[i].co for i in loop]
    ring = [Vector((p.x, p.y, 0)) for p in ring]
    area = sum(ring[i - 1].x * ring[i].y - ring[i].x * ring[i - 1].y for i in range(len(ring)))
    return ring if area > 0 else ring[::-1]


def valleys(ring):
    """Runs of outline indices that turn right (inwards) by more than AAMI_VALLEY_DEG in total."""
    n = len(ring)
    turn = []
    for i in range(n):
        a, b = ring[i] - ring[i - 1], ring[(i + 1) % n] - ring[i]
        turn.append(math.atan2(a.x * b.y - a.y * b.x, a.dot(b)))  # left (outwards) is positive
    start = next(i for i in range(n) if turn[i] >= 0)
    runs, run = [], []
    for j in range(n):
        i = (start + j) % n
        if turn[i] < 0:
            run.append(i)
        elif run:
            runs.append(run)
            run = []
    if run:
        runs.append(run)
    return [r for r in runs if -sum(turn[i] for i in r) > math.radians(AAMI_VALLEY_DEG)]


def aami_park(street, helpers):
    """prop_aami_park: stands and the bubble roof, on osm_aami_park's outline. The OSM block moves to helpers."""
    src = bpy.data.objects["osm_aami_park"]
    for col in list(src.users_collection):
        col.objects.unlink(src)
    helpers.objects.link(src)
    src.name = src.data.name = "helper_aami_footprint"
    src.display_type = "WIRE"
    src.hide_render = True

    ring = outline(src)
    runs = valleys(ring)
    if len(runs) < 8:
        raise RuntimeError(f"found {len(runs)} roof valleys in osm_aami_park's outline, expected about 20")
    n, count = len(ring), len(runs)
    valley = [sum((ring[i] for i in run), Vector()) / len(run) for run in runs]
    crowns = []  # each bay's outer rim crown: the outline point furthest out from its valley-to-valley chord
    for k, run in enumerate(runs):
        a, b = valley[k], valley[(k + 1) % count]
        out = (b - a).cross(Vector((0, 0, 1)))
        i, stop, crown = (run[-1] + 1) % n, runs[(k + 1) % count][0], (a + b) / 2
        while i != stop:
            if (ring[i] - crown).dot(out) > 0:
                crown = ring[i]
            i = (i + 1) % n
        crowns.append(crown)

    # inner rings pull the valley points in along the principal axes, so the bowl stays a rounded rectangle
    centre = sum(valley, Vector()) / count
    sxx = sum((p.x - centre.x) ** 2 for p in valley)
    syy = sum((p.y - centre.y) ** 2 for p in valley)
    sxy = sum((p.x - centre.x) * (p.y - centre.y) for p in valley)
    axes = Matrix.Rotation(-0.5 * math.atan2(2 * sxy, sxx - syy), 3, "Z")  # world -> principal axes
    half = [max(abs((axes @ (p - centre))[i]) for p in valley) for i in (0, 1)]

    def inward(p, depth):
        q = axes @ (p - centre)
        return centre + axes.transposed() @ Vector((q.x * (half[0] - depth) / half[0], q.y * (half[1] - depth) / half[1], 0))

    bm = bmesh.new()

    def vert(p, z):
        return bm.verts.new((p.x, p.y, z))

    # stands: outer wall on the valley line, raked seating, a low front wall onto the pitch
    back, front, depth = AAMI_STANDS
    edge = [inward(p, depth) for p in valley]
    rings = [[vert(p, 0) for p in valley], [vert(p, back) for p in valley], [vert(p, front) for p in edge], [vert(p, 0) for p in edge]]
    for k in range(count):
        j = (k + 1) % count
        for lo, hi in zip(rings, rings[1:]):
            bm.faces.new((lo[k], lo[j], hi[j], hi[k]))

    # roof: a bubble over each bay, sharing its valley arch with the next
    bubble = AAMI_BUBBLE
    (foot_out, foot_in), (crown_out, crown_valley, crown_in) = bubble["feet"], bubble["crowns"]
    inner = [inward(p, AAMI_ROOF_DEPTH) for p in valley]
    widths = [(valley[(k + 1) % count] - valley[k]).length for k in range(count)]
    big = 1.4 * statistics.median(widths)
    feet_out = [vert(p, foot_out) for p in valley]
    feet_in = [vert(p, foot_in) for p in inner]
    arch = [valley[k].lerp(inner[k], 0.5) for k in range(count)]
    arches = [vert(p, crown_valley) for p in arch]
    roof = set()
    for k in range(count):
        j = (k + 1) % count
        mid_out, mid_in = (valley[k] + valley[j]) / 2, (inner[k] + inner[j]) / 2
        centre = mid_out.lerp(mid_in, bubble["centre_at"])
        lift = bubble["corner_lift"] if widths[k] > big else 0.0
        crown_at = [crowns[k], arch[j], mid_in - (crowns[k] - mid_out) * bubble["inner_bulge"], arch[k]]
        # rim, counter-clockwise from the outer foot: foot, crown, foot, crown ... (crown i follows foot i)
        feet = [feet_out[k], feet_out[j], feet_in[j], feet_in[k]]
        rim_crowns = [vert(crown_at[0], crown_out), arches[j], vert(crown_at[2], crown_in), arches[k]]
        top_z = [bubble["tops"][i] for i in (0, 1, 2, 1)]
        top_at = [bubble["tops_at"][i] for i in (0, 1, 2, 1)]
        tops = [vert(centre.lerp(crown_at[i], top_at[i]), top_z[i] + lift) for i in range(4)]
        for i in range(4):
            n = (i + 1) % 4
            for face in ((tops[i], rim_crowns[i], feet[n]), (tops[i], feet[n], tops[n]), (tops[n], feet[n], rim_crowns[n])):
                roof.add(bm.faces.new(face))
        roof.update((bm.faces.new((tops[0], tops[1], tops[2])), bm.faces.new((tops[0], tops[2], tops[3]))))

    bm.normal_update()
    creases = []
    for e in bm.edges:
        faces = [f for f in e.link_faces if f in roof]
        if len(faces) == 2:
            creases.append(math.degrees(faces[0].normal.angle(faces[1].normal)))
    mesh = bpy.data.meshes.new("prop_aami_park")
    bm.to_mesh(mesh)
    bm.free()
    street.objects.link(bpy.data.objects.new("prop_aami_park", mesh))
    return {"bubbles": count, "roof_tris": len(roof), "dihedral_min": round(min(creases), 1), "dihedral_median": round(statistics.median(creases), 1)}


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
    stadium = aami_park(street, helpers)
    cut_doorway(m, helpers)
    roof = nylex_sign(m, street)
    common.save()
    return {"street": sorted(o.name for o in street.all_objects), "nylex_roof": roof, "aami_park": stadium, "blend": str(common.BLEND)}


if __name__ == "__main__":
    SUMMARY = main()

"""Melbourne's heritage rooftop signs for the opening shot: Pelaco, the Skipping Girl and the Nylex Clock, plus the
Richmond Maltings silos the Nylex sign stands on.

The words are the landmark on these, so unlike AAMI Park's sponsorship branding the lettering stays. It's built from
bold block glyphs rather than Blender's font: an extruded outline reads like the signs' box letters and neon, and stays
legible at 300-700 m, where the renderer's feature edges are all that's left of a letter. Frames are square steel
members, so every one draws as lines.

The sign builders take (location, rotation_z, col, scale) in Blender world space, with the location at the base centre
on a roof, and the front facing local -y before the turn. Re-runnable: a rebuild replaces the old objects and their
meshes, so names stay clean and nothing is orphaned.
"""
import math

import bmesh
import bpy
from mathutils import Matrix, Vector
from mathutils.geometry import tessellate_polygon

STEEL = 0.15  # frame member section (m)

# Block glyphs on a grid six units tall, stroke one unit: (width, [outline, hole, ...]).
GLYPHS = {
    "A": (4, [[(0, 0), (1, 0), (1, 2), (3, 2), (3, 0), (4, 0), (4, 4.8), (2.8, 6), (1.2, 6), (0, 4.8)],
              [(1, 3), (3, 3), (3, 4.4), (2.4, 5), (1.6, 5), (1, 4.4)]]),
    "C": (4, [[(1, 0), (4, 0), (4, 1), (1, 1), (1, 5), (4, 5), (4, 6), (1, 6), (0, 5), (0, 1)]]),
    "E": (4, [[(0, 0), (4, 0), (4, 1), (1, 1), (1, 2.5), (3, 2.5), (3, 3.5), (1, 3.5), (1, 5), (4, 5), (4, 6), (0, 6)]]),
    "G": (4, [[(1, 0), (4, 0), (4, 3.2), (2.2, 3.2), (2.2, 2.2), (3, 2.2), (3, 1), (1, 1), (1, 5), (4, 5), (4, 6), (1, 6),
               (0, 5), (0, 1)]]),
    "I": (1, [[(0, 0), (1, 0), (1, 6), (0, 6)]]),
    "K": (4.2, [[(0, 0), (1, 0), (1, 2.3), (2.9, 0), (4.2, 0), (1.95, 3.0), (4.2, 6), (2.9, 6), (1, 3.7), (1, 6), (0, 6)]]),
    "L": (3.6, [[(0, 0), (3.6, 0), (3.6, 1), (1, 1), (1, 6), (0, 6)]]),
    "N": (4, [[(0, 0), (1, 0), (1, 4), (3, 0), (4, 0), (4, 6), (3, 6), (3, 2), (1, 6), (0, 6)]]),
    "O": (4, [[(1, 0), (3, 0), (4, 1), (4, 5), (3, 6), (1, 6), (0, 5), (0, 1)], [(1, 1), (3, 1), (3, 5), (1, 5)]]),
    "P": (4, [[(0, 0), (1, 0), (1, 2.5), (3.2, 2.5), (4, 3.3), (4, 5.2), (3.2, 6), (0, 6)], [(1, 3.5), (3, 3.5), (3, 5), (1, 5)]]),
    "R": (4.1, [[(0, 0), (1, 0), (1, 2.5), (2, 2.5), (3, 0), (4.1, 0), (3.05, 2.6), (4, 3.3), (4, 5.2), (3.2, 6), (0, 6)],
                [(1, 3.5), (3, 3.5), (3, 5), (1, 5)]]),
    "S": (4, [[(0, 0), (3.2, 0), (4, 0.8), (4, 2.7), (3.2, 3.5), (1, 3.5), (1, 5), (4, 5), (4, 6), (0.8, 6), (0, 5.2),
               (0, 3.3), (0.8, 2.5), (3, 2.5), (3, 1), (0, 1)]]),
    "T": (4, [[(0, 5), (1.5, 5), (1.5, 0), (2.5, 0), (2.5, 5), (4, 5), (4, 6), (0, 6)]]),
    "V": (4, [[(0, 6), (1.5, 0), (2.5, 0), (4, 6), (3, 6), (2, 2), (1, 6)]]),
    "X": (4, [[(0, 0), (1.1, 0), (2, 2.2), (2.9, 0), (4, 0), (2.6, 3), (4, 6), (2.9, 6), (2, 3.8), (1.1, 6), (0, 6), (1.4, 3)]]),
    "Y": (4, [[(1.5, 0), (2.5, 0), (2.5, 2.8), (4, 6), (2.9, 6), (2, 3.9), (1.1, 6), (0, 6), (1.5, 2.8)]]),
    "°": (1.8, [[(0, 4.2), (1.8, 4.2), (1.8, 6), (0, 6)], [(0.6, 4.8), (1.2, 4.8), (1.2, 5.4), (0.6, 5.4)]]),
    " ": (2, []),
}
# Seven-segment digits for the Nylex display, 3.2 units wide: a top, b top right, c bottom right, d bottom,
# e bottom left, f top left, g middle. The segments keep a gap between them, like the real thing.
SEGMENTS = {
    "a": (0.9, 5.2, 2.3, 6.0), "b": (2.4, 3.4, 3.2, 5.1), "c": (2.4, 0.9, 3.2, 2.6), "d": (0.9, 0.0, 2.3, 0.8),
    "e": (0.0, 0.9, 0.8, 2.6), "f": (0.0, 3.4, 0.8, 5.1), "g": (0.9, 2.6, 2.3, 3.4),
}
DIGITS = {"0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd", "6": "afgedc", "7": "abc",
          "8": "abcdefg", "9": "abcdfg"}

# Pelaco: 14-foot box letters, double sided, on an open steel frame (metres).
PELACO = {"height": 4.3, "depth": 0.45, "lift": 2.0, "frame": 1.2}
# Skipping Girl: a flat painted cut-out outlined in neon. The rope lights in four positions round the cycle; tubes
# under her feet suggest the jump; painted lettering below.
GIRL = {"height": 7.5, "feet": 5.1, "rope": 0.58, "hands": 0.25, "cutout": 0.12}
GIRL_POSES = (  # rope angle from overhead, turning towards the street; jump, knee tuck, skirt flare (fractions of height)
    (0.0, 0.0, 0.0, 0.0),
    (90.0, 0.05, 0.5, 0.03),
    (180.0, 0.12, 1.0, 0.06),
    (270.0, 0.05, 0.4, 0.02),
)
GIRL_TEXT = (("SKIPPING GIRL", 0.9, 3.1), ("VINEGAR", 1.6, 1.0))  # line, letter height, baseline
# Nylex: on a cross-braced frame about 15 m high: PLASTICS, NYLEX above it, crowned by the clock and temperature.
NYLEX = {"width": 16.0, "depth": 2.0, "legs": 5.0, "plastics": (1.9, 5.4), "nylex": (3.6, 7.9),
         "display": (2.2, 12.2, "21°"), "top": 15.0}
# Richmond Maltings No. 2 silos: concrete cylinders in a grid under a head house.
SILOS = {"diameter": 6.2, "sides": 12, "house": 6.0, "house_width": 0.45}


# --- shared ---------------------------------------------------------------------------------------------------------


def _remove(name):
    """Delete the object called `name`, its children and the meshes they leave unused."""
    obj = bpy.data.objects.get(name)
    if obj is not None:
        for o in [*obj.children_recursive, obj]:
            data = o.data
            bpy.data.objects.remove(o, do_unlink=True)
            if isinstance(data, bpy.types.Mesh) and data.users == 0:
                bpy.data.meshes.remove(data)
    mesh = bpy.data.meshes.get(name)
    if mesh is not None and mesh.users == 0:
        bpy.data.meshes.remove(mesh)


def _mesh(name, bm, col, parent=None):
    bm.normal_update()
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.parent = parent  # matrix_parent_inverse stays identity: the child sits at its parent's origin
    col.objects.link(obj)
    return obj


def _root(name, location, rotation_z, col, bm=None):
    obj = _mesh(name, bm, col) if bm is not None else bpy.data.objects.new(name, None)
    if bm is None:
        col.objects.link(obj)
    obj.location = location
    obj.rotation_euler.z = rotation_z
    return obj


def _box(bm, lo, hi):
    verts = bmesh.ops.create_cube(bm, size=1.0)["verts"]
    bmesh.ops.scale(bm, vec=Vector(hi) - Vector(lo), verts=verts)
    bmesh.ops.translate(bm, vec=(Vector(lo) + Vector(hi)) / 2, verts=verts)


def _beam(bm, a, b, size=STEEL):
    """A square steel member from a to b."""
    a, b = Vector(a), Vector(b)
    d = (b - a).normalized()
    side = d.cross(Vector((0, 1, 0)) if abs(d.y) < 0.9 else Vector((1, 0, 0))).normalized() * size / 2
    up = side.cross(d).normalized() * size / 2
    ends = [[bm.verts.new(p + sx * side + sy * up) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))] for p in (a, b)]
    for i in range(4):
        bm.faces.new((ends[0][i], ends[0][(i + 1) % 4], ends[1][(i + 1) % 4], ends[1][i]))
    bm.faces.new(ends[0][::-1])
    bm.faces.new(ends[1])


def _plate(bm, rings, y0, y1, scale=1.0, offset=(0.0, 0.0)):
    """Extrude a flat shape (outline first, then holes) in the xz plane, from y0 to y1."""
    rings = [[Vector((offset[0] + x * scale, offset[1] + z * scale)) for x, z in ring] for ring in rings if ring]
    if not rings:
        return
    flat = [p for ring in rings for p in ring]
    faces = {y: [bm.verts.new((p.x, y, p.y)) for p in flat] for y in (y0, y1)}
    for tri in tessellate_polygon([[p.to_3d() for p in ring] for ring in rings]):
        a, b, c = (flat[i] for i in tri)
        if (b - a).cross(c - a) < 0:
            tri = tri[::-1]
        bm.faces.new([faces[y0][i] for i in tri[::-1]])
        bm.faces.new([faces[y1][i] for i in tri])
    start = 0
    for ring in rings:
        n = len(ring)
        for i in range(n):
            j, k = start + i, start + (i + 1) % n
            bm.faces.new((faces[y0][j], faces[y0][k], faces[y1][k], faces[y1][j]))
        start += n


def _text_width(text, height, gap=1.0):
    unit = height / 6
    return sum(GLYPHS[ch][0] * unit for ch in text) + gap * unit * (len(text) - 1)


def _text(bm, text, height, x, z, y0, y1, gap=1.0):
    """Block letters `height` tall from (x, z) along +x, extruded from y0 to y1."""
    unit = height / 6
    for ch in text:
        width, rings = GLYPHS[ch]
        _plate(bm, rings, y0, y1, unit, (x, z))
        x += (width + gap) * unit


def _digits(bm, text, height, x, z, y0, y1):
    """Seven-segment digits `height` tall; anything else falls back to a block glyph."""
    unit = height / 6
    for ch in text:
        if ch in DIGITS:
            for s in DIGITS[ch]:
                x0, z0, x1, z1 = SEGMENTS[s]
                _plate(bm, [[(x0, z0), (x1, z0), (x1, z1), (x0, z1)]], y0, y1, unit, (x, z))
            x += (3.2 + 1.0) * unit
        else:
            _plate(bm, GLYPHS[ch][1], y0, y1, unit, (x, z))
            x += (GLYPHS[ch][0] + 1.0) * unit


def _lattice(bm, xs, zs, ys, brace=()):
    """A steel frame: posts at every x in each plane y, rails at every z, ties between the planes, and X-bracing in
    the bays listed in `brace` as (column, row)."""
    for y in ys:
        for x in xs:
            _beam(bm, (x, y, zs[0]), (x, y, zs[-1]))
        for z in zs:
            _beam(bm, (xs[0], y, z), (xs[-1], y, z))
        for c, r in brace:
            _beam(bm, (xs[c], y, zs[r]), (xs[c + 1], y, zs[r + 1]))
            _beam(bm, (xs[c + 1], y, zs[r]), (xs[c], y, zs[r + 1]))
    for x in xs:
        for z in (zs[0], zs[-1]):
            _beam(bm, (x, ys[0], z), (x, ys[-1], z))


def _scaled(bm, scale):
    if scale != 1.0:
        bmesh.ops.scale(bm, vec=(scale, scale, scale), verts=bm.verts)
    return bm


def triangles(obj):
    return sum(len(p.vertices) - 2 for o in [obj, *obj.children_recursive] if o.type == "MESH" for p in o.data.polygons)


# --- Pelaco -----------------------------------------------------------------------------------------------------------


def pelaco(location, rotation_z, col, scale=1.0):
    """prop_pelaco: PELACO in 14-foot box letters on an open steel frame. One mesh."""
    _remove("prop_pelaco")
    p = PELACO
    bm = bmesh.new()
    width = _text_width("PELACO", p["height"])
    _text(bm, "PELACO", p["height"], -width / 2, p["lift"], -p["depth"], 0.0)
    # the frame behind, in two planes: a post behind each letter (so none shows in the gaps between them) and one at
    # each end, rails under and over the letters, braced in every other bay below them, raking struts to the roof
    unit, x, centres = p["height"] / 6, -width / 2, []
    for ch in "PELACO":
        centres.append(x + GLYPHS[ch][0] * unit / 2)
        x += (GLYPHS[ch][0] + 1) * unit
    xs = [-width / 2 - 0.3, *centres, width / 2 + 0.3]
    zs = [0.1, p["lift"] - 0.1, p["lift"] + p["height"] + 0.2]
    _lattice(bm, xs, zs, (0.1, p["frame"]), brace=[(c, 0) for c in range(0, len(xs) - 1, 2)])
    for x in xs[::2]:
        _beam(bm, (x, p["frame"], p["lift"] + p["height"] / 2), (x, p["frame"] + 2.5, 0.1))
    return _root("prop_pelaco", location, rotation_z, col, _scaled(bm, scale))


# --- Skipping Girl ----------------------------------------------------------------------------------------------------


def _circle(cx, cz, r, n=14, start=0.0, end=2 * math.pi):
    return [(cx + r * math.cos(start + (end - start) * i / n), cz + r * math.sin(start + (end - start) * i / n))
            for i in range(n + (0 if end - start >= 2 * math.pi - 1e-6 else 1))]


def _strip(points, width):
    """A polyline thickened to `width`, as one outline (left side out, right side back)."""
    pts = [Vector(p) for p in points]
    left, right = [], []
    for i, p in enumerate(pts):
        d0 = (p - pts[i - 1]).normalized() if i > 0 else (pts[1] - p).normalized()
        d1 = (pts[i + 1] - p).normalized() if i < len(pts) - 1 else d0
        n = Vector((-(d0 + d1).y, (d0 + d1).x)).normalized()
        miter = width / 2 / max(n.dot(Vector((-d0.y, d0.x))), 0.5)
        left.append(p + n * miter)
        right.append(p - n * miter)
    return [tuple(v) for v in left + right[::-1]]


def _girl(bm, pose):
    """Little Audrey in one pose: a flat cut-out, front on, and her rope as a tube swinging round her hands."""
    g, h = GIRL, GIRL["height"]
    angle, jump, tuck, flare = pose
    base = g["feet"] + jump * h
    t = g["cutout"]

    def at(x, z):
        return (x * h, base + z * h)

    def shape(rings, y0, y1):
        _plate(bm, [[at(x, z) for x, z in ring] for ring in rings], y0, y1)

    # legs behind the dress: hip, knee, ankle; tucking bends the knee and kicks the foot back, so it shortens
    for side in (-1, 1):
        hip, knee, ankle = (side * 0.045, 0.46), (side * (0.05 + 0.02 * tuck), 0.25 + 0.02 * tuck), (side * (0.05 + 0.01 * tuck), 0.04 + 0.14 * tuck)
        shape([_strip([hip, knee, ankle], 0.045)], 0.0, t)
        ax, az = ankle
        shape([[(ax - 0.035, az - 0.02), (ax + 0.035 + 0.01 * side, az - 0.02), (ax + 0.035 + 0.01 * side, az + 0.025), (ax - 0.035, az + 0.025)]], 0.0, t)
    # the dress: puffed sleeves, fitted waist, a skirt that flares and lifts as she jumps
    hem = 0.43 + flare
    shape([[(-0.17 - flare, hem), (0.17 + flare, hem), (0.05, 0.64), (0.065, 0.72), (0.1, 0.75), (0.085, 0.8), (0.03, 0.82),
            (-0.03, 0.82), (-0.085, 0.8), (-0.1, 0.75), (-0.065, 0.72), (-0.05, 0.64)]], -t, 0.0)
    # head over a bob of hair, and the bow
    shape([_circle(0.0, 0.89, 0.085, 16, math.radians(-25), math.radians(205))], 0.0, t)  # hair, behind the head
    shape([_circle(0.0, 0.885, 0.068, 16)], -t, 0.0)
    for wing in (0.065, -0.065):  # a bow on top, two wings off a knot
        shape([[(0.03, 0.97), (0.03 + wing, 1.005), (0.03 + wing, 0.935)]], -2 * t, -t)
    # arms out to the rope handles, which ride round a small circle with the rope
    hand_z = 0.6 + 0.03 * math.cos(math.radians(angle))
    hands = []
    for side in (-1, 1):
        shoulder, elbow, hand = (side * 0.08, 0.77), (side * 0.17, 0.68), (side * g["hands"], hand_z)
        shape([_strip([shoulder, elbow, hand], 0.035)], -2 * t, -t)
        hx, hz = hand
        shape([[(hx - 0.015, hz - 0.05), (hx + 0.015, hz - 0.05), (hx + 0.015, hz + 0.05), (hx - 0.015, hz + 0.05)]], -2 * t, -t)
        hands.append(Vector((hx * h, -1.5 * t, base + hz * h)))
    # the rope: a tube looping from hand to hand, turned about the line through them
    a = math.radians(angle)
    swing = Vector((0, -math.sin(a), math.cos(a)))  # overhead, then out towards the street, under her, behind
    mid, half = (hands[0] + hands[1]) / 2, (hands[1] - hands[0]) / 2
    path = [mid + half * -math.cos(math.pi * i / 24) + swing * (g["rope"] * h * math.sin(math.pi * i / 24)) for i in range(25)]
    rings = []
    for i, p in enumerate(path):
        d = (path[min(i + 1, 24)] - path[max(i - 1, 0)]).normalized()
        u = d.cross(Vector((1, 0, 0)) if abs(d.x) < 0.9 else Vector((0, 0, 1))).normalized() * 0.06
        v = d.cross(u).normalized() * 0.06
        rings.append([bm.verts.new(p + sx * u + sy * v) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
    for r0, r1 in zip(rings, rings[1:]):
        for i in range(4):
            bm.faces.new((r0[i], r0[(i + 1) % 4], r1[(i + 1) % 4], r1[i]))
    bm.faces.new(rings[0][::-1])
    bm.faces.new(rings[-1])


def skipping_girl(location, rotation_z, col, scale=1.0):
    """prop_skipping_girl (an empty) with children: __text, the lettering, jump tubes and frame, always shown; and
    __pose_00 to __pose_03, the girl and her rope round the cycle (overhead, out towards the street, under her feet,
    behind), stacked in one place for the site to show one at a time."""
    _remove("prop_skipping_girl")
    root = _root("prop_skipping_girl", location, rotation_z, col)
    g, h = GIRL, GIRL["height"]
    bm = bmesh.new()
    widest = max(_text_width(line, size) for line, size, _ in GIRL_TEXT)
    for line, size, z in GIRL_TEXT:
        _text(bm, line, size, -_text_width(line, size) / 2, z, -0.1, 0.0)
    _box(bm, (-widest / 2 - 0.4, 0.0, GIRL_TEXT[1][2] - 0.3), (widest / 2 + 0.4, 0.15, GIRL_TEXT[0][2] + GIRL_TEXT[0][1] + 0.2))
    for k in range(3):  # the tubes under her feet that light in turn as she jumps
        z = g["feet"] - 0.2 - 0.27 * k
        _box(bm, (-0.22 * h, -0.08, z - 0.06), (0.22 * h, 0.04, z + 0.06))
    # the lettering's frame, braced below the panel, and one spine up behind the girl, hidden by her cut-out
    panel_top = GIRL_TEXT[0][2] + GIRL_TEXT[0][1] + 0.2
    _lattice(bm, (-widest / 2, 0.0, widest / 2), (0.0, GIRL_TEXT[1][2] - 0.3, panel_top), (0.3, 1.2), brace=[(0, 0), (1, 0)])
    _beam(bm, (0.0, 0.3, panel_top), (0.0, 0.3, g["feet"] + 0.7 * h))
    _beam(bm, (-0.22 * h, 0.3, g["feet"] - 0.2), (0.22 * h, 0.3, g["feet"] - 0.2))  # carries the jump tubes
    _mesh("prop_skipping_girl__text", _scaled(bm, scale), col, root)
    for k, pose in enumerate(GIRL_POSES):
        bm = bmesh.new()
        _girl(bm, pose)
        _mesh(f"prop_skipping_girl__pose_{k:02d}", _scaled(bm, scale), col, root)
    return root


# --- Nylex ------------------------------------------------------------------------------------------------------------


def nylex(location, rotation_z, col, scale=1.0):
    """prop_nylex: NYLEX over PLASTICS on a cross-braced steel frame, crowned by the clock and temperature display.
    One mesh."""
    _remove("prop_nylex")
    n = NYLEX
    bm = bmesh.new()
    half = n["width"] / 2
    for word, (size, z) in (("PLASTICS", n["plastics"]), ("NYLEX", n["nylex"])):
        _text(bm, word, size, -_text_width(word, size) / 2, z, -0.5, -0.1)
    size, z, reading = n["display"]
    unit = size / 6
    width = sum((3.2 if ch in DIGITS else GLYPHS[ch][0]) + 1.0 for ch in reading) * unit - unit
    _box(bm, (-width / 2 - 0.5, -0.25, z - 0.4), (width / 2 + 0.5, 0.25, z + size + 0.4))  # the display's case
    _digits(bm, reading, size, -width / 2, z, -0.45, -0.25)
    # the frame: four posts in each of two planes, rails between the rows, X-bracing down the legs
    xs = [-half + n["width"] * i / 3 for i in range(4)]
    zs = [0.1, n["legs"], n["plastics"][1] + n["plastics"][0] + 0.25, n["nylex"][1] + n["nylex"][0] + 0.2, n["top"]]
    _lattice(bm, xs, zs, (0.0, n["depth"]), brace=[(c, 0) for c in range(3)])
    for x in (xs[0], xs[-1]):  # and across each end
        _beam(bm, (x, 0.0, zs[0]), (x, n["depth"], zs[1]))
        _beam(bm, (x, n["depth"], zs[0]), (x, 0.0, zs[1]))
    return _root("prop_nylex", location, rotation_z, col, _scaled(bm, scale))


def nylex_silos(footprint, col):
    """prop_nylex_silos on the footprint of the Richmond Maltings No. 2 silos: a grid of faceted concrete cylinders up
    to a head house, with the footprint's height as the top of the house. Origin at the footprint's centre on the
    ground."""
    _remove("prop_nylex_silos")
    me = footprint.data
    world = [footprint.matrix_world @ v.co for v in me.vertices]
    ground, top = min(p.z for p in world), max(p.z for p in world)
    base = [p.to_2d() for p in world if abs(p.z - ground) < 1e-3]
    centre = sum(base, Vector((0, 0))) / len(base)
    # the footprint's long side sets the grid's direction
    best = None
    for a in base:
        for b in base:
            if (b - a).length > 1.0:
                d = (b - a).normalized()
                n = Vector((-d.y, d.x))
                spans = [max((p - centre).dot(axis) for p in base) - min((p - centre).dot(axis) for p in base) for axis in (d, n)]
                if best is None or spans[0] * spans[1] < best[0]:
                    best = (spans[0] * spans[1], d, n, spans)
    _, along, across, (length, width) = best
    s = SILOS
    cols, rows = max(1, round(length / s["diameter"])), max(1, round(width / s["diameter"]))
    r = min(length / cols, width / rows) / 2
    shoulder = top - ground - s["house"]
    bm = bmesh.new()
    for i in range(cols):
        for j in range(rows):
            c = along * ((i + 0.5) * length / cols - length / 2) + across * ((j + 0.5) * width / rows - width / 2)
            ring = [c + Vector((math.cos(a), math.sin(a))) * r for a in (2 * math.pi * k / s["sides"] for k in range(s["sides"]))]
            lo = [bm.verts.new((p.x, p.y, 0.0)) for p in ring]
            hi = [bm.verts.new((p.x, p.y, shoulder)) for p in ring]
            for k in range(s["sides"]):
                bm.faces.new((lo[k], lo[(k + 1) % s["sides"]], hi[(k + 1) % s["sides"]], hi[k]))
            bm.faces.new(hi)
    # the head house along the middle of the roof
    hw = width * s["house_width"] / 2
    corners = [along * x + across * y for x, y in ((-length / 2, -hw), (length / 2, -hw), (length / 2, hw), (-length / 2, hw))]
    lo = [bm.verts.new((p.x, p.y, shoulder)) for p in corners]
    hi = [bm.verts.new((p.x, p.y, top - ground)) for p in corners]
    for k in range(4):
        bm.faces.new((lo[k], lo[(k + 1) % 4], hi[(k + 1) % 4], hi[k]))
    bm.faces.new(hi)
    obj = _mesh("prop_nylex_silos", bm, col)
    obj.location = (centre.x, centre.y, ground)
    return obj

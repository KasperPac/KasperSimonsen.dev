"""Furniture and set dressing for the office: one builder per prop, low-poly and edge-clean for the line renderer.

Every builder takes (name, location, rotation_z, parent, col) plus size options and returns the prop's root, an
empty. Its parts are mesh children named <name>__<part>. Local frame: metres, origin at floor level at the centre
of the footprint, +x right, +y towards the back (away from a viewer facing the front), +z up. Wall-hung props
(shelf, posters) put their origin on the wall plane instead and stand out from it towards -y.

The site draws each mesh as a black fill plus its feature edges: faces meeting at more than 20 degrees, and open
borders. So every detail is real geometry, curves keep few enough facets to break that angle, and nothing relies
on shading or textures.

Re-runnable like the other scripts: common.clear() the collection, then build again.
"""
import importlib
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector

sys.path.insert(0, str(Path(__file__).parent))
import common  # noqa: E402

importlib.reload(common)

DESK_HEIGHT = 0.75  # top surface of build_desk's top; desk-top props go at this z
I4 = Matrix.Identity(4)
XZ = Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))  # drawing in (x, z), extruded along +y
YZ = Matrix(((0, 0, 1, 0), (1, 0, 0, 0), (0, 1, 0, 0), (0, 0, 0, 1)))  # drawing in (y, z), extruded along +x
WALL = Matrix.Rotation(math.pi / 2, 4, "X")  # drawing in (x, y) put up as (x, z), extruded towards -y (out of a wall)


# --- geometry: each helper adds to a bmesh, through an optional matrix into the part's space ---------------------


def _m(loc=(0, 0, 0), rot=(0, 0, 0)):
    return Matrix.Translation(loc) @ Euler(rot).to_matrix().to_4x4()


def _smooth(e0, e1, x):
    t = min(max((x - e0) / (e1 - e0), 0.0), 1.0)
    return t * t * (3 - 2 * t)


def _loft(bm, rings, m=I4, caps=True, wrap=False):
    """Join rings of points (equal counts; a one-point ring is a pole) with quads, and cap the open ends."""
    vs = [[bm.verts.new(m @ Vector(p)) for p in ring] for ring in rings]
    pairs = list(zip(vs, vs[1:])) + ([(vs[-1], vs[0])] if wrap else [])
    for a, b in pairs:
        n = max(len(a), len(b))
        for i in range(n):
            j = (i + 1) % n
            if len(a) == 1:
                bm.faces.new((a[0], b[i], b[j]))
            elif len(b) == 1:
                bm.faces.new((a[i], a[j], b[0]))
            else:
                bm.faces.new((a[i], a[j], b[j], b[i]))
    if caps and not wrap:
        if len(vs[0]) > 2:
            bm.faces.new(list(reversed(vs[0])))
        if len(vs[-1]) > 2:
            bm.faces.new(vs[-1])
    return vs


def _poly(bm, pts, m=I4):
    """One flat face through 3D points."""
    return bm.faces.new([bm.verts.new(m @ Vector(p)) for p in pts])


def _box(bm, size, center=(0, 0, 0), m=I4):
    (x, y, z), (cx, cy, cz) = (s / 2 for s in size), center
    ring = [(cx - x, cy - y), (cx + x, cy - y), (cx + x, cy + y), (cx - x, cy + y)]
    return _loft(bm, [[(a, b, cz - z) for a, b in ring], [(a, b, cz + z) for a, b in ring]], m)


def _prism(bm, pts, depth, m=I4):
    """A polygon in xy, extruded `depth` along +z."""
    return _loft(bm, [[(x, y, 0) for x, y in pts], [(x, y, depth) for x, y in pts]], m)


def _lathe(bm, profile, segs, m=I4, caps=True, phase=0.0):
    """Revolve [(radius, z), ...] about z in `segs` facets; a radius of 0 is a pole."""
    rings = []
    for r, z in profile:
        if r <= 0:
            rings.append([(0, 0, z)])
        else:
            rings.append([(r * math.cos(a), r * math.sin(a), z) for a in (phase + 2 * math.pi * k / segs for k in range(segs))])
    return _loft(bm, rings, m, caps)


def _strip(bm, left, right, depth, m=I4, closed=False):
    """The band between two matching point lines in xy (a stroke, or a ring when closed), extruded along +z."""
    lb, rb, lt, rt = ([bm.verts.new(m @ Vector((x, y, z))) for x, y in line]
                      for z, line in ((0, left), (0, right), (depth, left), (depth, right)))
    n = len(left)
    for i in range(n if closed else n - 1):
        j = (i + 1) % n
        bm.faces.new((lt[i], rt[i], rt[j], lt[j]))
        bm.faces.new((lb[j], rb[j], rb[i], lb[i]))
        bm.faces.new((lb[i], lb[j], lt[j], lt[i]))
        bm.faces.new((rb[j], rb[i], rt[i], rt[j]))
    if not closed:
        bm.faces.new((lb[0], lt[0], rt[0], rb[0]))
        bm.faces.new((lb[-1], rb[-1], rt[-1], lt[-1]))


def _offset(pts, width, closed=False):
    """Left and right edges of a polyline drawn `width` wide, with mitred joins."""
    p = [Vector(q) for q in pts]
    n = len(p)
    left, right = [], []
    for i in range(n):
        if closed or 0 < i < n - 1:
            d0, d1 = (p[i] - p[i - 1]).normalized(), (p[(i + 1) % n] - p[i]).normalized()
        else:
            d0 = d1 = (p[1] - p[0]).normalized() if i == 0 else (p[i] - p[i - 1]).normalized()
        n0, n1 = Vector((-d0.y, d0.x)), Vector((-d1.y, d1.x))
        mitre = n0 + n1 if (n0 + n1).length > 1e-6 else n1
        mitre.normalize()
        k = width / 2 / max(mitre.dot(n1), 0.35)
        left.append(tuple(p[i] + mitre * k))
        right.append(tuple(p[i] - mitre * k))
    return left, right


def _stroke(bm, pts, width, depth, m=I4, closed=False):
    """A drawn line: the polyline in xy, `width` wide, standing `depth` up along +z."""
    _strip(bm, *_offset(pts, width, closed), depth, m, closed)


def _circle(r, n, c=(0, 0), phase=0.0, ry=None):
    angles = (phase + 2 * math.pi * k / n for k in range(n))
    return [(c[0] + r * math.cos(a), c[1] + (ry or r) * math.sin(a)) for a in angles]


def _rrect(w, d, r, segs=2, c=(0, 0)):
    """Rounded rectangle outline, anticlockwise."""
    r = min(r, w / 2 - 1e-4, d / 2 - 1e-4)
    if r <= 1e-4:
        return [(c[0] + x, c[1] + y) for x, y in ((w / 2, d / 2), (-w / 2, d / 2), (-w / 2, -d / 2), (w / 2, -d / 2))]
    pts = []
    cx, cy = w / 2 - r, d / 2 - r
    for sx, sy, a0 in ((1, 1, 0), (-1, 1, 90), (-1, -1, 180), (1, -1, 270)):
        for k in range(segs + 1):
            a = math.radians(a0 + 90 * k / segs)
            pts.append((c[0] + sx * cx + r * math.cos(a), c[1] + sy * cy + r * math.sin(a)))
    return pts


def _slab(bm, w, d, z0, z1, r=0.0, segs=2, top=0.0, bottom=0.0, m=I4):
    """A rounded-rectangle slab from z0 to z1, with optional 45-degree chamfers on its top and bottom edges."""
    rings = []
    if bottom:
        rings.append([(x, y, z0) for x, y in _rrect(w - 2 * bottom, d - 2 * bottom, max(r - bottom, r * 0.4), segs)])
    rings.append([(x, y, z0 + bottom) for x, y in _rrect(w, d, r, segs)])
    rings.append([(x, y, z1 - top) for x, y in _rrect(w, d, r, segs)])
    if top:
        rings.append([(x, y, z1) for x, y in _rrect(w - 2 * top, d - 2 * top, max(r - top, r * 0.4), segs)])
    return _loft(bm, rings, m)


def _sweep(bm, path, section, m=I4, hint=(0, 0, 1), wrap=False, caps=True, scale=None):
    """Sweep a 2D section along a 3D path. The section's u runs towards `hint` (squared off the path), v across."""
    p = [Vector(q) for q in path]
    n = len(p)
    rings = []
    for i in range(n):
        t = (p[(i + 1) % n] - p[i - 1]) if wrap else (p[min(i + 1, n - 1)] - p[max(i - 1, 0)])
        t.normalize()
        h = Vector(hint)
        nrm = h - h.dot(t) * t
        nrm = nrm.normalized() if nrm.length > 1e-6 else t.orthogonal().normalized()
        b = t.cross(nrm)
        s = scale[i] if scale else 1.0
        rings.append([p[i] + (u * nrm + v * b) * s for u, v in section])
    return _loft(bm, rings, m, caps, wrap)


def _tube(bm, path, radius, segs=6, m=I4, hint=(0, 0, 1), wrap=False, scale=None):
    return _sweep(bm, path, _circle(radius, segs), m, hint, wrap, scale=scale)


def _surface(bm, grid, m=I4):
    """An open sheet through a grid of points (rows of equal length)."""
    vs = [[bm.verts.new(m @ Vector(p)) for p in row] for row in grid]
    for a, b in zip(vs, vs[1:]):
        for i in range(len(a) - 1):
            bm.faces.new((a[i], a[i + 1], b[i + 1], b[i]))
    return vs


def _grid_border(grid):
    """The outer loop of a grid, anticlockwise from its first corner."""
    nv, nu = len(grid) - 1, len(grid[0]) - 1
    return grid[0][:] + [grid[j][nu] for j in range(1, nv + 1)] + grid[nv][nu - 1::-1] + [grid[j][0] for j in range(nv - 1, 0, -1)]


ROLLED = (-1, -0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9, 1)  # cushion stations with a narrow band at the edge for a roll


def _cushion(bm, w, d, z0, z1, height, m=I4, us=ROLLED, vs=ROLLED, k=0.2, tuck=0.94):
    """A cushion: a gridded top at z1 + height(u, v) over a rounded outline, walls that tuck in to a flat base at z0.

    u and v run -1..1 across x and y at the given stations; k rounds the corners (0 square, 0.5 round).
    """
    grid = [[(u * math.sqrt(1 - k * v * v) * w / 2, v * math.sqrt(1 - k * u * u) * d / 2, z1 + height(u, v)) for u in us]
            for v in vs]
    top = _surface(bm, grid, m)
    border = _grid_border(top)
    local = [m.inverted() @ v.co for v in border]
    lo = min(p.z for p in local)
    mid = [bm.verts.new(m @ Vector((p.x, p.y, z0 + 0.45 * (lo - z0)))) for p in local]
    base = [bm.verts.new(m @ Vector((p.x * tuck, p.y * tuck, z0))) for p in local]
    for ring_a, ring_b in ((border, mid), (mid, base)):
        for i in range(len(border)):
            j = (i + 1) % len(border)
            bm.faces.new((ring_a[i], ring_a[j], ring_b[j], ring_b[i]))
    bm.faces.new(list(reversed(base)))


def _circles_meet(c1, r1, c2, r2):
    """The front-most (lowest y) point where two circles in xy cross."""
    d = (c2 - c1).length
    a = (r1 * r1 - r2 * r2 + d * d) / (2 * d)
    h = math.sqrt(max(r1 * r1 - a * a, 0.0))
    u = (c2 - c1) / d
    mid, perp = c1 + u * a, Vector((-u.y, u.x))
    return min(mid + perp * h, mid - perp * h, key=lambda p: p.y)


def _width(obj):
    xs = [v.co.x for v in obj.data.vertices]
    return max(xs) - min(xs)


def _part(name, bm, parent, col, location=(0, 0, 0), rotation=(0, 0, 0), uv=None):
    """Finish a bmesh into the mesh child `name`: welded, normals outward, linked under `parent`."""
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if uv:
        layer = bm.loops.layers.uv.new("UVMap")
        for f in bm.faces:
            for loop in f.loops:
                loop[layer].uv = uv(loop.vert.co)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = common._place(bpy.data.objects.new(name, mesh), location, parent, col)
    obj.rotation_euler = rotation
    return obj


def _root(name, location, rotation_z, parent, col):
    root = common.empty(name, location, parent, col)
    root.rotation_euler.z = rotation_z
    return root


# --- furniture --------------------------------------------------------------------------------------------------


def build_chair(name, location, rotation_z, parent, col, headrest=True):
    """Ergonomic mesh chair facing -y: five-star base on twin-wheel casters, gas lift, contoured seat, a pleated mesh
    back with a lumbar band and spine, armrests and an optional headrest. Seat top about 0.47 m."""
    root = _root(name, location, rotation_z, parent, col)

    bm = bmesh.new()
    _lathe(bm, [(0.042, 0.072), (0.05, 0.092), (0.05, 0.12), (0.04, 0.14)], 10)
    for k in range(5):
        rot = Matrix.Rotation(math.radians(-90 + 72 * k), 4, "Z")
        rings = [[(r, -hw, bot), (r, hw, bot), (r, hw * 0.7, top), (r, 0, top + 0.007), (r, -hw * 0.7, top)]
                 for r, top, bot, hw in ((0.03, 0.13, 0.085, 0.028), (0.17, 0.112, 0.074, 0.021), (0.3, 0.085, 0.06, 0.016))]
        _loft(bm, rings, rot)
        _lathe(bm, [(0.011, 0.045), (0.011, 0.065)], 6, rot @ Matrix.Translation((0.3, 0, 0)))
        wheel = rot @ Matrix.Translation((0.315, 0, 0.028)) @ Matrix.Rotation(math.pi / 2, 4, "X")
        for off in (-0.014, 0.014):
            _lathe(bm, [(0.023, off - 0.009), (0.028, off - 0.005), (0.028, off + 0.005), (0.023, off + 0.009)], 8, wheel)
        _box(bm, (0.05, 0.01, 0.032), (0.31, 0, 0.044), rot)
    _part(f"{name}__base", bm, root, col)

    bm = bmesh.new()
    _lathe(bm, [(0.034, 0.13), (0.03, 0.27), (0.024, 0.28)], 10)
    _lathe(bm, [(0.014, 0.27), (0.014, 0.34)], 8)
    _part(f"{name}__lift", bm, root, col)

    # seat: mechanism, shell, contoured cushion with a waterfall front and side bolsters, height lever
    bm = bmesh.new()
    _box(bm, (0.2, 0.26, 0.05), (0, -0.01, 0.36))
    _lathe(bm, [(0.022, 0), (0.022, 0.035), (0.015, 0.04)], 8, _m((0, -0.14, 0.36), (math.pi / 2, 0, 0)))
    _slab(bm, 0.42, 0.4, 0.385, 0.401, r=0.07, segs=3, m=_m((0, -0.03, 0)))

    def seat(u, v):
        roll = -0.014 * (max(abs(u), abs(v)) > 0.95)  # the outer band rolls over the edge
        bolster = 0.04 * min(max((abs(u) - 0.6) / 0.3, 0.0), 1.0)  # ramps up steeply enough (~28 deg) to draw
        return (-0.012 * (1 - u * u) * (1 - v * v) + bolster + 0.012 * max(0.0, v) ** 2
                - 0.04 * max(0.0, (-v - 0.3) / 0.6) ** 2 + roll)

    _cushion(bm, 0.5, 0.47, 0.4, 0.465, seat, _m((0, -0.03, 0)), k=0.22)
    _tube(bm, [(0.09, -0.06, 0.36), (0.19, -0.07, 0.36), (0.23, -0.1, 0.352)], 0.007, 6)
    _box(bm, (0.03, 0.05, 0.01), (0.235, -0.12, 0.35), _m(rot=(0, 0, -0.5)))
    _part(f"{name}__seat", bm, root, col)

    # back: a pleated mesh membrane in a tube frame, reclined, wrapped round the sitter, with a lumbar bulge
    z0, h = 0.53, 0.55

    def back(s, t, push=0.0):
        z = z0 + t * h
        hw = 0.2 + 0.045 * _smooth(0.0, 0.75, t) - 0.015 * _smooth(0.85, 1.0, t)
        y = 0.19 + (z - z0) * math.tan(math.radians(13)) - 0.03 * math.exp(-(((t - 0.28) / 0.15) ** 2)) - 0.045 * s * s
        return Vector((s * hw, y + push, z))

    def membrane(pleat):
        """Rows alternate `pleat` m back, so each row folds about 24 degrees against the next: horizontal lines that
        read as a woven mesh."""
        nu, nv, kq = 10, 12, 0.25
        rows = []
        for j in range(nv + 1):
            b = -1 + 2 * j / nv
            rows.append([back(a * math.sqrt(1 - kq * b * b), (b * math.sqrt(1 - kq * a * a) + 1) / 2, pleat * (j % 2))
                         for a in (-1 + 2 * i / nu for i in range(nu + 1))])
        return rows

    bm = bmesh.new()
    _surface(bm, membrane(0.01), I4)
    _tube(bm, _grid_border(membrane(0.0)), 0.013, 6, hint=(0, 1, 0), wrap=True)
    spine = [(0, 0.08, 0.36), (0, 0.2, 0.365), (0, 0.24, 0.4)] + [tuple(back(0, t, 0.035)) for t in (0.0, 0.15, 0.3, 0.45)]
    _sweep(bm, spine, _rrect(0.05, 0.016, 0.0), hint=(1, 0, 0))
    _sweep(bm, [tuple(back(s, 0.28, 0.024)) for s in (-0.8, -0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.8)], _rrect(0.07, 0.012, 0.0))
    for s in (-0.86, 0.86):
        knob = Matrix.Translation(back(s, 0.28, 0.024)) @ Matrix.Rotation(math.pi / 2, 4, "Y")
        _lathe(bm, [(0.02, -0.012), (0.02, 0.012)], 8, knob)
    _part(f"{name}__back", bm, root, col)

    bm = bmesh.new()
    for side in (-1, 1):
        x = side * 0.285
        _sweep(bm, [(side * 0.08, -0.03, 0.355), (side * 0.22, -0.03, 0.355), (side * 0.265, -0.03, 0.375), (x, -0.03, 0.43),
                    (x, -0.03, 0.47)], _rrect(0.05, 0.014, 0.0), hint=(0, 1, 0))
        _slab(bm, 0.035, 0.06, 0.47, 0.64, r=0.012, segs=2, m=Matrix.Translation((x, -0.03, 0)))
        _box(bm, (0.012, 0.02, 0.03), (x + side * 0.02, -0.03, 0.6))
        _slab(bm, 0.095, 0.26, 0.64, 0.665, r=0.04, segs=3, top=0.007, bottom=0.004, m=Matrix.Translation((x, -0.02, 0)))
    _part(f"{name}__arms", bm, root, col)

    if headrest:
        top = back(0, 1.0)
        bm = bmesh.new()
        pad = _m((0, top.y + 0.075, top.z + 0.13), (math.radians(78), 0, 0))
        _cushion(bm, 0.3, 0.15, 0.0, 0.04, lambda u, v: 0.025 * u * u - 0.012 * (max(abs(u), abs(v)) > 0.95), pad,
                 vs=(-1, -0.85, 0, 0.85, 1), k=0.3, tuck=0.9)
        _sweep(bm, [tuple(back(0, 0.78, 0.03)), tuple(back(0, 1.0, 0.04)), (0, top.y + 0.085, top.z + 0.1)],
               _rrect(0.04, 0.014, 0.0), hint=(1, 0, 0))
        _part(f"{name}__headrest", bm, root, col)
    return root


def build_desk(name, location, rotation_z, parent, col, width=1.4, depth=0.7, height=DESK_HEIGHT):
    """Modern desk: a slim top with a knife-edge chamfer underneath, on two closed-loop steel leg frames, with a
    back rail and a cable tray. 1.4 m takes a monitor and a laptop side by side."""
    root = _root(name, location, rotation_z, parent, col)
    t = 0.025
    bm = bmesh.new()
    _slab(bm, width, depth, height - t, height, r=0.012, segs=2, bottom=0.01)
    _part(f"{name}__top", bm, root, col)

    bm = bmesh.new()
    under = height - t
    for side in (-1, 1):
        x = side * (width / 2 - 0.08)
        hy = depth / 2 - 0.05
        outer = [(-hy, 0), (hy, 0), (hy, under), (-hy, under)]
        inner = [(-hy + 0.04, 0.04), (hy - 0.04, 0.04), (hy - 0.04, under - 0.04), (-hy + 0.04, under - 0.04)]
        _strip(bm, outer, inner, 0.04, Matrix.Translation((x - 0.02, 0, 0)) @ YZ, closed=True)
    _box(bm, (width - 0.2, 0.03, 0.06), (0, depth / 2 - 0.07, under - 0.03))
    tray = [(-0.06, 0), (0.06, 0), (0.06, 0.07), (0.056, 0.07), (0.056, 0.004), (-0.056, 0.004), (-0.056, 0.07), (-0.06, 0.07)]
    _prism(bm, tray, width * 0.6, Matrix.Translation((-width * 0.3, depth / 2 - 0.16, under - 0.09)) @ YZ)
    _part(f"{name}__frame", bm, root, col)
    return root


def build_pedestal(name, location, rotation_z, parent, col, width=0.4, depth=0.5, height=0.58, card=False):
    """Three-drawer pedestal on a recessed plinth. The top drawer is its own child, <name>__drawer, with its origin
    on the front face: slide it along -y to open it. It has a real tray behind the front and the carcass is hollow
    there, so an open drawer has an inside to look into. With card, a blank business card (<name>__card, 90 x 55 x
    3 mm, long edge left to right) lies centred in the tray on its floor, with desk-drawer clutter round it
    (<name>__clutter: two pens, a stapler, a sticky-note pad, a USB stick), all parented to the drawer so they slide out
    with it."""
    root = _root(name, location, rotation_z, parent, col)
    t, plinth, gap = 0.016, 0.05, 0.003
    fronts = (0.12, 0.16, height - t - plinth - 0.12 - 0.16 - 3 * gap)  # top to bottom
    fy = -depth / 2  # carcass front plane
    bm = bmesh.new()
    _box(bm, (width, depth, t), (0, 0, height - t / 2))
    for side in (-1, 1):
        _box(bm, (t, depth, height - plinth - t), (side * (width - t) / 2, 0, plinth + (height - plinth - t) / 2))
    _box(bm, (width - 2 * t, t, height - plinth - t), (0, depth / 2 - t / 2, plinth + (height - plinth - t) / 2))
    _box(bm, (width - 2 * t, depth, t), (0, 0, plinth + t / 2))
    _box(bm, (width - 0.04, depth - 0.06, plinth), (0, 0.02, plinth / 2))
    divider = height - t - fronts[0] - gap
    _box(bm, (width - 2 * t, depth - 0.02, t), (0, 0.01, divider - t / 2))
    z = divider - gap
    for h in fronts[1:]:
        _box(bm, (width - 2 * t - 2 * gap, 0.018, h), (0, fy + 0.009, z - h / 2))
        _box(bm, (0.14, 0.012, 0.012), (0, fy - 0.022, z - 0.03))
        for x in (-0.06, 0.06):
            _box(bm, (0.01, 0.018, 0.01), (x, fy - 0.008, z - 0.03))
        z -= h + gap
    _part(f"{name}__body", bm, root, col)

    h = fronts[0]
    inner_w, tray_d, tray_h = width - 2 * t - 0.012, depth - 0.06, h - 0.03
    bm = bmesh.new()
    _box(bm, (width - 2 * t - 2 * gap, 0.018, h), (0, 0.009, 0))
    _box(bm, (0.14, 0.012, 0.012), (0, -0.022, h / 2 - 0.03))
    for x in (-0.06, 0.06):
        _box(bm, (0.01, 0.018, 0.01), (x, -0.008, h / 2 - 0.03))
    tz = -h / 2 + 0.012 + tray_h / 2
    for side in (-1, 1):
        _box(bm, (0.012, tray_d, tray_h), (side * (inner_w - 0.012) / 2, 0.018 + tray_d / 2, tz))
    _box(bm, (inner_w, 0.012, tray_h), (0, 0.018 + tray_d - 0.006, tz))
    floor = -h / 2 + 0.02  # top of the tray floor, in the drawer's space
    _box(bm, (inner_w, tray_d, 0.008), (0, 0.018 + tray_d / 2, floor - 0.004))
    drawer = _part(f"{name}__drawer", bm, root, col, location=(0, fy, height - t - gap - h / 2))
    if card:
        card_y = 0.018 + tray_d / 2
        bm = bmesh.new()
        _box(bm, (0.09, 0.055, 0.003), (0, 0, 0))
        _part(f"{name}__card", bm, drawer, col, location=(0, card_y, floor + 0.0015))
        bm = bmesh.new()
        _drawer_clutter(bm, floor, card_y)
        _part(f"{name}__clutter", bm, drawer, col)
    return root


def _drawer_clutter(bm, floor, card_y):
    """Desk-drawer odds and ends round a business card centred at (0, card_y) on a tray floor at height `floor`, in
    the drawer's space (+y into the pedestal). Few facets: small things with many edges read as noise."""
    pen = [(0, 0), (0.0045, 0.016), (0.0045, 0.105), (0.0052, 0.105), (0.0052, 0.14), (0, 0.14)]  # tip to cap
    for x, y, turn in ((0.015, card_y + 0.065, 0.12), (-0.115, card_y - 0.03, 1.35)):
        _lathe(bm, pen, 6, _m((x, y, floor + 0.0052), (0, math.pi / 2, turn)) @ Matrix.Translation((0, 0, -0.07)))
    stapler = _m((0.112, card_y + 0.035, floor), (0, 0, -1.25))
    _box(bm, (0.13, 0.034, 0.01), (0, 0, 0.005), stapler)  # base
    _box(bm, (0.12, 0.03, 0.016), (0.004, 0, 0.02), stapler)  # arm
    _box(bm, (0.018, 0.032, 0.022), (-0.056, 0, 0.011), stapler)  # hinge
    _box(bm, (0.076, 0.076, 0.014), (0, 0, 0.007), _m((-0.095, card_y + 0.105, floor), (0, 0, 0.2)))  # sticky notes
    _box(bm, (0.05, 0.018, 0.008), (0, 0, 0.004), _m((0.08, card_y - 0.075, floor), (0, 0, 0.4)))  # USB stick


def build_monitor(name, location, rotation_z, parent, col, width=0.62, height=0.36):
    """Monitor: a thin panel with a narrow bezel round an inset screen, a back housing, a slotted column and a flat
    foot. <name>__screen is a separate UV-mapped quad in the recess (0..1 across the visible screen) for anything
    the site wants to show on it. Origin under the foot."""
    root = _root(name, location, rotation_z, parent, col)
    bm = bmesh.new()
    _slab(bm, 0.25, 0.18, 0.0, 0.014, r=0.05, segs=3, top=0.005, m=Matrix.Translation((0, 0.03, 0)))
    col_h = 0.3
    outer = [(-0.03, 0), (0.03, 0), (0.03, col_h), (-0.03, col_h)]
    inner = [(-0.014, 0.04), (0.014, 0.04), (0.014, 0.1), (-0.014, 0.1)]
    _strip(bm, outer, inner, 0.022, Matrix.Translation((0, 0.06, 0.012)) @ _m(rot=(math.radians(-4), 0, 0)) @ XZ, closed=True)
    _part(f"{name}__stand", bm, root, col)

    t, side_b, top_b, chin = 0.014, 0.008, 0.008, 0.02
    sw, sh = width - 2 * side_b, height - top_b - chin
    sz = (chin - top_b) / 2  # screen centre sits above the panel centre by this
    pose = _monitor_pose(height)

    def rect(w, hh, y, dz=0.0):
        return [(x, y, z + dz) for x, z in ((-w / 2, -hh / 2), (w / 2, -hh / 2), (w / 2, hh / 2), (-w / 2, hh / 2))]

    bm = bmesh.new()
    _loft(bm, [rect(width, height, t), rect(width, height, 0), rect(sw, sh, 0, sz), rect(sw, sh, 0.002, sz)], pose)
    _loft(bm, [rect(width - 0.06, height - 0.06, t), rect(width * 0.45, height * 0.5, 0.04)], pose)
    _part(f"{name}__panel", bm, root, col)

    bm = bmesh.new()
    _poly(bm, rect(sw, sh, 0.0015, sz), pose)
    _part(f"{name}__screen", bm, root, col, uv=lambda co: _screen_uv(co, pose, sw, sh, sz))
    return root


def _monitor_pose(height):
    """The monitor panel's frame in the monitor's space: centred on the panel's front face, tilted back 5 degrees."""
    return _m((0, 0.035, 0.012 + 0.07 + height / 2), (math.radians(-5), 0, 0))


def _screen_uv(co, pose, w, h, dz):
    p = pose.inverted() @ co
    return (p.x / w + 0.5, (p.z - dz) / h + 0.5)


def build_laptop(name, location, rotation_z, parent, col, width=0.31, depth=0.215, open_deg=110):
    """Open laptop: tapered base with a raised key grid and trackpad, lid hinged at the back with an inset screen.
    The lid is <name>__lid, its origin on the hinge line."""
    root = _root(name, location, rotation_z, parent, col)
    base_h = 0.015
    bm = bmesh.new()
    _slab(bm, width, depth, 0, base_h, r=0.01, segs=2, bottom=0.003)
    _box(bm, (0.26, 0.095, 0.001), (0, 0.035, base_h + 0.0005))  # key field, one plate: single keys read as a hatch
    _box(bm, (0.1, 0.06, 0.0006), (0, -0.065, base_h + 0.0003))  # trackpad
    _part(f"{name}__base", bm, root, col)

    lid_t, bez = 0.006, 0.009
    sw, sh = width - 2 * bez, depth - 2 * bez

    def rect(w, hh, y, zc):
        return [(x, y, z + zc) for x, z in ((-w / 2, -hh / 2), (w / 2, -hh / 2), (w / 2, hh / 2), (-w / 2, hh / 2))]

    bm = bmesh.new()
    zc = depth / 2
    _loft(bm, [rect(width, depth, lid_t, zc), rect(width, depth, 0, zc), rect(sw, sh, 0, zc + 0.002),
               rect(sw, sh, 0.0015, zc + 0.002)])
    _part(f"{name}__lid", bm, root, col, location=(0, depth / 2 - lid_t, base_h), rotation=(math.radians(-(open_deg - 90)), 0, 0))
    return root


def build_keyboard(name, location, rotation_z, parent, col):
    """Tenkeyless keyboard: a low wedge case with one recessed key field. No single keys: from across the room they
    read as a hatch."""
    root = _root(name, location, rotation_z, parent, col)
    w, d = 0.36, 0.13

    def top(hw, hd, drop=0.0):  # a rectangle on the sloping top, 12 mm high at the front and 22 at the back
        return [(x, y, 0.017 + 0.01 * y / d - drop) for x, y in ((-hw, -hd), (hw, -hd), (hw, hd), (-hw, hd))]

    bm = bmesh.new()
    _loft(bm, [[(-w / 2, -d / 2, 0), (w / 2, -d / 2, 0), (w / 2, d / 2, 0), (-w / 2, d / 2, 0)], top(w / 2, d / 2),
               top(w / 2 - 0.012, d / 2 - 0.012), top(w / 2 - 0.012, d / 2 - 0.012, 0.003)])
    _part(f"{name}__case", bm, root, col)
    return root


def build_mouse(name, location, rotation_z, parent, col):
    """Mouse: a lofted shell with a scroll wheel."""
    root = _root(name, location, rotation_z, parent, col)
    bm = bmesh.new()
    rings = []
    for y, hw, hz in ((-0.058, 0.012, 0.012), (-0.045, 0.026, 0.026), (-0.015, 0.031, 0.036), (0.02, 0.029, 0.038),
                      (0.045, 0.024, 0.026), (0.058, 0.012, 0.012)):
        rings.append([(hw * math.cos(a), y, max(hz * math.sin(a), 0.0)) for a in (math.pi * k / 6 for k in range(7))])
    _loft(bm, rings)
    _lathe(bm, [(0.008, -0.0025), (0.008, 0.0025)], 8, _m((0, -0.03, 0.036), (0, math.pi / 2, 0)))
    _part(f"{name}__body", bm, root, col)
    return root


# --- records and shelving ---------------------------------------------------------------------------------------

SLEEVE = 0.315  # LP sleeve, square
SLEEVE_T = 0.005  # its depth
# The crate's records are deeper, the extra behind the front face, so the vinyl inside sits 3.5 mm or more from both
# faces while the cover and the flick against the crate's front stay as they were: the site pushes every fill back in
# depth so feature lines win, and at the crate camera's angle the vinyl's label, 1 mm under the front, showed through.
CRATE_SLEEVE_T = 0.01


def _ray_rect(hw, hh, d):
    """Where a ray from the centre along direction d leaves a rectangle of half-sizes hw, hh."""
    k = min(hw / abs(d[0]) if abs(d[0]) > 1e-9 else 1e9, hh / abs(d[1]) if abs(d[1]) > 1e-9 else 1e9)
    return (d[0] * k, d[1] * k)


def _plate_with_hole(bm, w, h, hole_w, hole_h, depth, m=I4, segs=16, c=(0, 0)):
    """A w x h plate in xy, extruded `depth` along +z, with an oval hole at c (a hand hole, a cable slot)."""
    inner = [(c[0] + x, c[1] + y) for x, y in _circle(hole_w / 2, segs, ry=hole_h / 2)]
    outer = [_ray_rect(w / 2, h / 2, (x - c[0], y - c[1])) for x, y in inner]
    outer = [(x + c[0], y + c[1]) for x, y in outer]
    _strip(bm, outer, inner, depth, m, closed=True)


def _sleeve(name, parent, col, location, rotation=(0, 0, 0), depth=SLEEVE_T):
    """A record sleeve standing on its bottom edge, origin there (the pivot for flipping it forward), front face -y on
    y = -SLEEVE_T / 2 whatever its `depth` (any extra goes behind), UV-mapped 0..1 on the front for sleeve art."""
    bm = bmesh.new()
    _box(bm, (SLEEVE, depth, SLEEVE), (0, (depth - SLEEVE_T) / 2, SLEEVE / 2))
    return _part(name, bm, parent, col, location, rotation, uv=lambda co: (co.x / SLEEVE + 0.5, co.z / SLEEVE))


ART_BOX = (0.2, 0.17)  # the cover art (logo, and label under it) fits this, centred on the sleeve's front, metres
ART_MARK = 0.7  # with a label, the logo's share of the box's height
LABEL_SIZE = 0.032
LABEL_GAP = 0.02  # between the logo and its label
BORDER_INSET = 0.012  # the cover's thin square border, this far in from the sleeve's edges
BORDER_W = 0.0015
VINYL_R = 0.15
VINYL_LABEL_R = 0.05
VINYL_PEEK = 0.04  # how far the disc's top stands above the sleeve's top edge


def _vinyl(record, col):
    """The LP inside `record`: a 2 mm disc with a raised label, origin at its centre, peeking out of the sleeve's top
    (the runtime slides it out onto the platter)."""
    bm = bmesh.new()
    _lathe(bm, [(0, -0.001), (VINYL_R, -0.001), (VINYL_R, 0.001), (VINYL_LABEL_R, 0.001), (VINYL_LABEL_R, 0.0015), (0, 0.0015)], 48)
    # the lathe's axis is z; stand the disc in the middle of the record's depth (normal along y), centre up so its top
    # peeks out
    centre_z = SLEEVE + VINYL_PEEK - VINYL_R
    return _part(f"{record.name}__vinyl", bm, record, col, location=(0, (CRATE_SLEEVE_T - SLEEVE_T) / 2, centre_z),
                 rotation=(math.pi / 2, 0, 0))


def _cover_border(bm, m):
    """A thin flat square frame BORDER_INSET in from the sleeve's edges, drawn in xy about the sleeve's centre and put
    on its front through m."""
    h = SLEEVE / 2 - BORDER_INSET
    outer = [(-h, -h), (h, -h), (h, h), (-h, h)]
    o = [bm.verts.new(m @ Vector((x, y, 0))) for x, y in outer]
    i = [bm.verts.new(m @ Vector((x - math.copysign(BORDER_W, x), y - math.copysign(BORDER_W, y), 0))) for x, y in outer]
    for a in range(4):
        b = (a + 1) % 4
        bm.faces.new((o[a], o[b], i[b], i[a]))


def _svg_mesh(path):
    """An SVG's filled shapes as one flat bmesh in xy (y up), any scale; None if the file draws nothing."""
    before, mats = set(bpy.data.objects), set(bpy.data.materials)
    bpy.ops.import_curve.svg(filepath=str(common.REPO / path))
    curves = [o for o in bpy.data.objects if o not in before]
    dg = bpy.context.evaluated_depsgraph_get()
    bm = bmesh.new()
    for o in curves:
        o.data.resolution_u = 4  # few facets per curve: many short edges read as noise
        # a path some exporters leave open (no closing z) imports as an open 3D curve: it gets no fill, so no faces and
        # no outline (three letters of the Victory crest's MELBOURNE went missing). Every shape here is a filled one.
        o.data.dimensions = "2D"
        for spline in o.data.splines:
            spline.use_cyclic_u = True
        o.data.fill_mode = "BOTH"
    dg.update()
    for o in curves:
        mesh = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
        mesh.transform(o.matrix_world)
        bm.from_mesh(mesh)
        bpy.data.meshes.remove(mesh)
    cols = {c for o in curves for c in o.users_collection}
    for o in curves:
        data = o.data
        bpy.data.objects.remove(o, do_unlink=True)
        bpy.data.curves.remove(data)
    for c in cols:
        if c is not bpy.context.scene.collection and not c.objects:
            bpy.data.collections.remove(c)
    for m in set(bpy.data.materials) - mats:  # the importer's fill colours; the site draws lines, not materials
        if not m.users:
            bpy.data.materials.remove(m)
    if not bm.verts:
        bm.free()
        return None
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    return bm


def _bounds(bm):
    xs = [v.co.x for v in bm.verts]
    ys = [v.co.y for v in bm.verts]
    return min(xs), max(xs), min(ys), max(ys)


def _sleeve_art(record, row, col):
    """A project's cover on the front of `record`: its logo (its SVGs side by side) in line geometry and, when
    `row['label']` is given, the label under it in the built-in font, centred as one block inside ART_BOX on the
    sleeve's centre, with the thin border round it (part of __art)."""
    parts = [bm for bm in (_svg_mesh(p) for p in row["logos"]) if bm]
    if not parts:
        return
    # lay the SVGs out left to right at a common height, a gap of 15% of that height between them
    height = max(_bounds(bm)[3] - _bounds(bm)[2] for bm in parts)
    art = bmesh.new()
    x = 0.0
    for bm in parts:
        x0, x1, y0, y1 = _bounds(bm)
        k = height / (y1 - y0)
        bmesh.ops.transform(bm, matrix=Matrix.Translation((x, 0, 0)) @ Matrix.Diagonal((k, k, 1, 1)) @ Matrix.Translation((-x0, -y0, 0)), verts=bm.verts)
        x += (x1 - x0) * k + 0.15 * height
        mesh = bpy.data.meshes.new("tmp")
        bm.to_mesh(mesh)
        bm.free()
        art.from_mesh(mesh)
        bpy.data.meshes.remove(mesh)
    x0, x1, y0, y1 = _bounds(art)
    label = None
    if row.get("label"):
        label = common.text_mesh(f"{record.name}__label", row["label"], LABEL_SIZE, 0.0005, (0, -0.0025, 0), record, col)
        lz = [v.co.z for v in label.data.vertices]
    k = min(ART_BOX[0] / (x1 - x0), ART_BOX[1] * (ART_MARK if label else 1) / (y1 - y0))
    block = k * (y1 - y0) + (LABEL_GAP + max(lz) - min(lz) if label else 0)
    top = SLEEVE / 2 + block / 2
    # centre on x, top of the block at `top`; stand it up on the sleeve front (xz plane), 1 mm proud of it, facing -y
    front = Matrix.Translation((0, -0.0035, 0)) @ WALL
    place = Matrix.Translation((0, 0, top)) @ front @ Matrix.Diagonal((k, k, 1, 1)) @ Matrix.Translation((-(x0 + x1) / 2, -y1, 0))
    bmesh.ops.transform(art, matrix=place, verts=art.verts)
    _cover_border(art, Matrix.Translation((0, 0, SLEEVE / 2)) @ front)
    _part(f"{record.name}__art", art, record, col)
    if label:
        label.location.z = top - k * (y1 - y0) - LABEL_GAP - max(lz)


def build_crate(name, location, rotation_z, parent, col, records=9, sleeves=()):
    """Open-top slatted record crate with hand holes, its front cut down to the bottom slat like a shop bin, and LPs
    standing in it as children <name>__record_00.. with their origins on their bottom edges, so each one flips forward
    by rotating about x and leans out over the low front. The front records are the projects, one `sleeves` row each
    from record 00: each carries its cover and holds its vinyl (<record>__vinyl), peeking out of the top. The blank
    records behind have neither, a sign they can't be picked."""
    root = _root(name, location, rotation_z, parent, col)
    w, t, slats = 0.36, 0.015, ((0.0, 0.07), (0.095, 0.165), (0.19, 0.26))
    front = slats[0][1]  # the front keeps its bottom slat only, and no corner posts: flicked records lean out over it
    bm = bmesh.new()
    for z0, z1 in slats:
        zc, h = (z0 + z1) / 2, z1 - z0
        for side in (-1, 1):
            if side > 0 or z1 <= front:
                _box(bm, (w, t, h), (0, side * (w - t) / 2, zc))
            if z1 == slats[-1][1]:
                _plate_with_hole(bm, w - 2 * t, h, 0.1, 0.03, t, Matrix.Translation((side * (w - t) / 2 - t / 2, 0, zc)) @ YZ)
            else:
                _box(bm, (t, w - 2 * t, h), (side * (w - t) / 2, 0, zc))
    for sx in (-1, 1):  # corner posts at the back only
        _box(bm, (0.022, 0.022, 0.26), (sx * (w / 2 - t - 0.011), w / 2 - t - 0.011, 0.13))
    _box(bm, (w - 2 * t, w - 2 * t, 0.012), (0, 0, 0.006))
    _part(f"{name}__body", bm, root, col)

    span = w - 2 * t - 0.07
    for i in range(records):
        y = -span / 2 + span * i / max(records - 1, 1)
        jitter = (i * 7) % 3 - 1, (i * 5) % 3 - 1  # -1, 0 or 1, so the LPs don't stand in perfect order
        lean = (-0.14 + 0.012 * (i % 3), 0, 0.01 * jitter[1])
        record = _sleeve(f"{name}__record_{i:02d}", root, col, (0.004 * jitter[0], y, 0.012), lean, CRATE_SLEEVE_T)
        if i < len(sleeves):
            _vinyl(record, col)
            _sleeve_art(record, sleeves[i], col)
    return root


def build_shelf(name, location, rotation_z, parent, col, width=1.0, depth=0.22):
    """Wall shelf on two triangular steel brackets, with ornaments <name>__ornament_00..03 standing on it, each with
    its origin at its base. Origin on the wall plane at the board's top centre; the board stands out to -y."""
    root = _root(name, location, rotation_z, parent, col)
    bm = bmesh.new()
    _slab(bm, width, depth, -0.03, 0.0, top=0.003, m=Matrix.Translation((0, -depth / 2, 0)))
    for x in (-width * 0.32, width * 0.32):
        outer = [(0, -0.03), (-0.17, -0.03), (0, -0.2)]
        inner = [(-0.014, -0.044), (-0.122, -0.044), (-0.014, -0.152)]
        _strip(bm, outer, inner, 0.012, Matrix.Translation((x - 0.006, 0, 0)) @ YZ, closed=True)
        _box(bm, (0.03, 0.006, 0.19), (x, -0.003, -0.125))
    _part(f"{name}__board", bm, root, col)

    y = -depth / 2
    builders = (_ornament_gear, _ornament_globe, _ornament_phone, _ornament_computer)  # services order (content/services.ts)
    for i, (build, x) in enumerate(zip(builders, (-0.36, -0.12, 0.12, 0.36))):
        bm = bmesh.new()
        build(bm)
        _part(f"{name}__ornament_{i:02d}", bm, root, col, (x * width, y, 0), (0, 0, 0.12 * (i % 2 * 2 - 1)))
    return root


def _ornament_gear(bm):
    """Industrial automation: a gear standing on a little plinth, its face to the room."""
    teeth, r_out, r_root = 10, 0.07, 0.056
    pts = []
    for k in range(teeth):
        a = 2 * math.pi * k / teeth
        for da, r in ((-0.36, r_root), (-0.2, r_out), (0.2, r_out), (0.36, r_root)):
            pts.append((r * math.cos(a + da * math.pi / teeth * 2), r * math.sin(a + da * math.pi / teeth * 2)))
    inner = [(0.022 * x / math.hypot(x, y), 0.022 * y / math.hypot(x, y)) for x, y in pts]
    _strip(bm, pts, inner, 0.022, Matrix.Translation((0, -0.011, 0.088)) @ XZ, closed=True)
    _slab(bm, 0.08, 0.05, 0.0, 0.02, r=0.006, top=0.004)


def _ornament_globe(bm):
    """Websites: a desk globe, tilted on its axis inside a half-meridian, on a stem and a round foot."""
    r, zc = 0.058, 0.098
    tilt = _m((0, 0, zc), (0, math.radians(-23.5), 0))  # this way round the meridian passes over the stem
    _lathe(bm, [(r * math.sin(a), -r * math.cos(a)) for a in (math.pi * k / 8 for k in range(9))], 12, tilt)
    ring = r + 0.008
    _tube(bm, [(-ring * math.sin(a), 0, -ring * math.cos(a)) for a in (math.pi * k / 10 for k in range(11))], 0.003, 6, m=tilt, hint=(0, 1, 0))
    _lathe(bm, [(0.004, 0.012), (0.004, zc - ring + 0.004)], 6)
    _lathe(bm, [(0.04, 0.0), (0.04, 0.008), (0.028, 0.014), (0.0, 0.014)], 12)


def _ornament_phone(bm):
    """Apps: a phone leaning back in a little desk stand, its screen to the room."""
    w, h, t = 0.072, 0.145, 0.009
    lean = _m((0, -0.013, 0.012), (math.radians(-12), 0, 0))  # its foot against the stand's lip
    _prism(bm, _rrect(w, h, 0.011, 3, c=(0, h / 2)), t, lean @ Matrix.Translation((0, -t / 2, 0)) @ XZ)
    _prism(bm, _rrect(w - 0.008, h - 0.022, 0.006, 2, c=(0, h / 2)), 0.001, lean @ Matrix.Translation((0, -t / 2 - 0.001, 0)) @ XZ)
    _lathe(bm, [(0.0028, 0.0), (0.0028, 0.001)], 8, lean @ _m((0, -t / 2, h - 0.007), (math.pi / 2, 0, 0)))
    _box(bm, (0.05, 0.006, 0.074), (0, t / 2 + 0.003, 0.033), lean)  # the back it rests on
    _slab(bm, 0.085, 0.05, 0.0, 0.012, r=0.006, top=0.003)
    _box(bm, (0.085, 0.006, 0.02), (0, -0.022, 0.016))


def _ornament_computer(bm):
    """Desktop software: a little all-in-one computer, the old beige kind, with a keyboard lying in front of it."""
    w, h, d = 0.1, 0.125, 0.085
    _slab(bm, w, d, 0.0, h, r=0.006, segs=2, top=0.004, m=Matrix.Translation((0, 0.015, 0)))
    front = 0.015 - d / 2
    _prism(bm, _rrect(0.072, 0.056, 0.006, 2, c=(0, 0.082)), 0.002, Matrix.Translation((0, front - 0.001, 0)) @ XZ)
    _box(bm, (0.034, 0.002, 0.004), (0.016, front - 0.001, 0.032))
    _slab(bm, 0.09, 0.03, 0.0, 0.008, r=0.003, top=0.002, m=Matrix.Translation((0, front - 0.018, 0)))


def build_turntable(name, location, rotation_z, parent, col):
    """A low mid-century sideboard with a turntable and a pair of bookshelf speakers on it, a sleeve leaning on the
    wall behind and another propped against the sideboard. The sideboard's right bay is open, with LPs in it."""
    root = _root(name, location, rotation_z, parent, col)
    w, d, z0, h, t = 1.2, 0.42, 0.18, 0.42, 0.018
    z1 = z0 + h
    bm = bmesh.new()
    for sx in (-1, 1):
        for sy in (-1, 1):
            _lathe(bm, [(0.014, 0.0), (0.022, z0)], 8, Matrix.Translation((sx * (w / 2 - 0.06), sy * (d / 2 - 0.05), 0)))
    _slab(bm, w, d, z1 - t, z1, r=0.006, top=0.003)
    _box(bm, (w, d, t), (0, 0, z0 + t / 2))
    for x in (-(w - t) / 2, (w - t) / 2, w / 2 - 0.4):
        _box(bm, (t, d, h - 2 * t), (x, 0, z0 + h / 2))
    _box(bm, (w, t, h - 2 * t), (0, d / 2 - t / 2, z0 + h / 2))
    door_w = (w - 0.4 - t) / 2 - 0.004
    for i in range(2):
        x = -w / 2 + 0.002 + door_w / 2 + i * (door_w + 0.004)
        _box(bm, (door_w, t, h - 2 * t - 0.004), (x, -d / 2 + t / 2, z0 + h / 2))
        _box(bm, (0.012, 0.012, 0.09), (x + (door_w / 2 - 0.03) * (1 if i == 0 else -1), -d / 2 - 0.006, z0 + h / 2))
    lp = h - 2 * t - 0.03  # the open bay is a little shorter than a sleeve, so these LPs stand slightly tilted
    for i in range(7):
        stand = _m((w / 2 - 0.36 + i * 0.014, -0.01, z0 + t), (0, math.radians(8 - 2 * i), 0))
        _box(bm, (0.005, SLEEVE * 0.98, lp), (0, 0, lp / 2), stand)
    _part(f"{name}__sideboard", bm, root, col)
    # where the now-playing album goes while a project's record plays (the site moves it): edge on in the open bay,
    # beside the LPs, its origin on the bay's floor like a sleeve's (bottom centre)
    slot = common.empty(f"{name}__away", (w / 2 - 0.24, -0.01, z0 + t), root, col)
    slot.rotation_euler = (0, 0, math.pi / 2)

    # turntable: the plinth and fixed fittings are __deck; the platter and the tonearm are parts of their own so
    # the site can spin one and swing the other
    bm = bmesh.new()
    tt = Matrix.Translation((-0.08, -0.02, z1))
    for sx in (-1, 1):
        for sy in (-1, 1):
            _lathe(bm, [(0.02, 0.0), (0.02, 0.012)], 8, tt @ Matrix.Translation((sx * 0.19, sy * 0.14, 0)))
    _slab(bm, 0.45, 0.35, 0.012, 0.075, r=0.008, top=0.004, m=tt)
    _lathe(bm, [(0.028, 0.0), (0.028, 0.012), (0.0, 0.012)], 10, tt @ Matrix.Translation((0.16, 0.1, 0.075)))  # tonearm base
    _lathe(bm, [(0.004, 0.0), (0.004, 0.04)], 6, tt @ Matrix.Translation((0.2, -0.02, 0.075)))  # arm rest
    _box(bm, (0.03, 0.02, 0.006), (-0.17, -0.15, 0.078), tt)
    _lathe(bm, [(0.012, 0.075), (0.012, 0.085)], 8, tt @ Matrix.Translation((-0.17, -0.11, 0)))
    _part(f"{name}__deck", bm, root, col)

    spindle = tt @ Vector((-0.05, 0, 0.075))
    bm = bmesh.new()
    _lathe(bm, [(0.15, 0.0), (0.15, 0.018)], 12)
    _lathe(bm, [(0.148, 0.018), (0.148, 0.02), (0.05, 0.02), (0.05, 0.021), (0.004, 0.021), (0.004, 0.032), (0.0, 0.032)], 12)
    _box(bm, (0.014, 0.004, 0.0008), (0.028, 0, 0.0214))  # a mark on the label, so the spin shows
    _part(f"{name}__platter", bm, root, col, spindle)

    # the tonearm swings about its pivot; at rest here its stylus sits in the groove 12 cm out from the spindle
    pivot = tt @ Vector((0.16, 0.1, 0.075))
    stylus = _circles_meet(spindle.xy, 0.12, pivot.xy, 0.215)
    reach = (stylus - pivot.xy).length
    arm = Matrix.Rotation(math.atan2(stylus.y - pivot.y, stylus.x - pivot.x), 4, "Z")  # local +x runs out along the arm
    bm = bmesh.new()
    _lathe(bm, [(0.012, 0.012), (0.012, 0.045), (0.0, 0.045)], 10)
    _tube(bm, [(-0.05, 0, 0.045), (0, 0, 0.045), (0.55 * reach, 0.018, 0.041), (reach - 0.035, 0.01, 0.036), (reach - 0.012, 0, 0.034)],
          0.0045, 6, arm)
    _lathe(bm, [(0.016, 0.0), (0.016, 0.03)], 8, arm @ Matrix.Translation((-0.05, 0, 0.045)) @ Matrix.Rotation(-math.pi / 2, 4, "Y"))
    _box(bm, (0.035, 0.022, 0.006), (0, 0, 0), arm @ Matrix.Translation((reach - 0.005, 0, 0.032)) @ Matrix.Rotation(0.35, 4, "Z"))
    _box(bm, (0.016, 0.012, 0.009), (reach, 0, 0.0255), arm)  # cartridge, its stylus on the record
    _part(f"{name}__tonearm", bm, root, col, pivot)

    # speakers either side
    bm = bmesh.new()
    for side in (-1, 1):
        sp = Matrix.Translation((side * 0.43, -0.03, z1))
        _slab(bm, 0.18, 0.22, 0.0, 0.3, r=0.008, top=0.003, m=sp)
        face = sp @ Matrix.Translation((0, -0.11, 0)) @ _m(rot=(math.pi / 2, 0, 0))
        for zc, ro, ri, cone in ((0.1, 0.07, 0.056, 0.016), (0.235, 0.032, 0.02, 0.008)):
            ring = face @ Matrix.Translation((0, zc, 0))
            _strip(bm, _circle(ro, 12), _circle(ri, 12), 0.006, ring, closed=True)
            _lathe(bm, [(ri, 0.002), (ri * 0.35, -cone), (0.0, -cone * 0.6)], 12, ring, caps=False)
    _part(f"{name}__speakers", bm, root, col)

    _sleeve(f"{name}__sleeve_00", root, col, (-0.1, d / 2 - 0.05, z1), (math.radians(-12), 0, 0.03))
    _sleeve(f"{name}__sleeve_01", root, col, (-0.35, -d / 2 - 0.09, 0), (math.radians(-16), 0, -0.06))
    return root


NOW_PLAYING = (  # (artist, title, motif); copy for Kasper to approve
    ("PINK FLOYD", "THE DARK SIDE OF THE MOON", "prism"),
    ("POLARIS", "FATALISM", "star"),
    ("PEARL JAM", "BLACK", "none"),
    ("THE BUTTERFLY EFFECT", "BEGINS HERE", "butterfly"),
)


def _motif(bm, motif, m):
    """A nod to a record, never its cover art: simple shapes in a -1..1 box, drawn through m (which sets the size and
    raises them off the sleeve)."""
    if motif == "prism":  # a triangle, one line in, a fan of lines out
        _stroke(bm, [(0.0, 0.75), (-0.62, -0.45), (0.62, -0.45)], 0.11, 1, m, closed=True)
        _stroke(bm, [(-1.05, -0.12), (-0.33, 0.11)], 0.07, 1, m)
        for k in range(4):
            _stroke(bm, [(0.34, 0.09), (1.05, 0.36 - 0.22 * k)], 0.07, 1, m)
    elif motif == "star":  # four points
        _prism(bm, [((1.0 if k % 2 == 0 else 0.28) * math.cos(math.pi / 2 - k * math.pi / 4),
                     (1.0 if k % 2 == 0 else 0.28) * math.sin(math.pi / 2 - k * math.pi / 4)) for k in range(8)], 1, m)
    elif motif == "waves":  # three wavy lines
        for k in range(3):
            _stroke(bm, [(x, 0.55 - 0.55 * k + 0.18 * math.sin(math.pi * 1.5 * x + 0.7 * k)) for x in (-1 + j / 6 for j in range(13))],
                    0.11, 1, m)
    elif motif == "butterfly":  # two mirrored wings either side of a body, and its antennae
        wing = [(0.14, 0.12), (0.36, 0.72), (0.7, 0.94), (0.98, 0.8), (0.9, 0.32), (0.5, 0.02), (0.8, -0.36),
                (0.64, -0.76), (0.3, -0.7), (0.14, -0.16)]
        for side in (1, -1):
            _stroke(bm, [(side * x, y) for x, y in (wing if side > 0 else wing[::-1])], 0.11, 1, m, closed=True)
            _stroke(bm, [(0.0, 0.42), (side * 0.3, 0.86)], 0.07, 1, m)
        _stroke(bm, [(0.0, 0.42), (0.0, -0.62)], 0.11, 1, m)


def _sleeve_text(name, text, size, parent, col, top, max_w=0.28):
    """Centred text on a sleeve's face, its first line's top at z = top. A line too wide breaks at its middle space;
    anything still too wide shrinks to fit."""
    obj = _text_at(name, text, size, 0.0008, 0, -0.0025, top, parent, col, align="CENTER")
    if _width(obj) > max_w and " " in text:
        cut = min((i for i, ch in enumerate(text) if ch == " "), key=lambda i: abs(i - len(text) / 2))
        mesh = obj.data
        bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.meshes.remove(mesh)
        obj = _text_at(name, text[:cut] + "\n" + text[cut + 1:], size, 0.0008, 0, -0.0025, top, parent, col, align="CENTER")
    if _width(obj) > max_w:
        obj.data.transform(Matrix.Scale(max_w / _width(obj), 4))
        obj.location.z = top - max(v.co.z for v in obj.data.vertices)
    return obj


def _album(name, parent, col, location, rotation, artist, title, motif):
    """A sleeve with its artist written large (<name>__artist: 4-5 cm capitals over one or two lines, the most that
    reads from across the room; a name too long for that shrinks to the sleeve's width, as THE BUTTERFLY EFFECT does
    to 2.7 cm) and its motif (<name>__motif) bold underneath. The title isn't shown: at that size it can't be read.
    With motif "none" the name sits in the middle on its own."""
    sleeve = _sleeve(name, parent, col, location, rotation)

    def extent(obj):
        zs = [obj.location.z + v.co.z for v in obj.data.vertices]
        return min(zs), max(zs)

    if motif == "none":
        label = _sleeve_text(f"{name}__artist", artist, 0.075, sleeve, col, SLEEVE)
        low, high = extent(label)
        label.location.z += SLEEVE / 2 - (low + high) / 2
        return sleeve
    roof = extent(_sleeve_text(f"{name}__artist", artist, 0.064, sleeve, col, 0.295))[0] - 0.02
    floor = 0.02
    s = min(0.12, (roof - floor) / 2)
    bm = bmesh.new()
    _motif(bm, motif, Matrix.Translation((0, -0.0025, (roof + floor) / 2)) @ WALL @ Matrix.Diagonal((s, s, 0.0015, 1.0)))
    _part(f"{name}__motif", bm, sleeve, col)
    return sleeve


def build_now_playing(name, location, rotation_z, parent, col, albums=NOW_PLAYING):
    """A 'now playing' ledge for next to the turntable: a small base with a front lip and a back rest holding a sleeve
    up, leaning back 12 degrees. Every album in `albums` [(artist, title, motif)] gets a sleeve, all stacked in the
    same spot as <name>__sleeve_00, _01... (origin at the sleeve's bottom centre) for the site to show one at a time.
    Each face carries its artist, large, and a bold motif as geometry: "prism", "star", "waves", "butterfly", or
    "none" for the name on its own. Titles stay in `albums` but aren't drawn. The base is 0.16 m wide but a sleeve is
    0.315: turn it about 57 degrees to fit between build_turntable's deck and right speaker."""
    root = _root(name, location, rotation_z, parent, col)
    seat, lean = (0, -0.022, 0.012), math.radians(-12)
    bm = bmesh.new()
    _slab(bm, 0.16, 0.09, 0.0, 0.012, r=0.006, segs=2, top=0.002)
    _box(bm, (0.16, 0.008, 0.012), (0, -0.034, 0.018))  # lip
    _box(bm, (0.12, 0.008, 0.15), (0, 0.0065, 0.07), Matrix.Translation(seat) @ Matrix.Rotation(lean, 4, "X"))  # back rest
    _part(f"{name}__stand", bm, root, col)
    for i, (artist, title, motif) in enumerate(albums):
        _album(f"{name}__sleeve_{i:02d}", root, col, seat, (lean, 0, 0), artist, title, motif)
    return root


# --- plants -----------------------------------------------------------------------------------------------------


def _leaf(bm, length, width, m, fold=15, droop=40, slits=(), stations=7, shape=0.7, base=0.0, lobe=0.0):
    """A leaf along +y from its base at the origin: two halves folded up `fold` degrees off a midrib (so the midrib
    draws), curling down `droop` degrees by the tip. Width follows sin(pi * t)^shape, starting from `base` of the
    way along that curve (0 pinches the base, more gives a broad base). `lobe` swings the base corners back by that
    share of the length (a heart shape). `slits` are (t, depth) narrow cuts in from both margins (a monstera)."""
    ts = sorted({k / stations for k in range(stations + 1)} | {s for t, _ in slits for s in (t - 0.012, t, t + 0.012)})
    cut = {t: dep for t, dep in slits}
    f = math.radians(fold)
    mid, halves = [], ([], [])
    pos, prev = Vector((0, 0, 0)), 0.0
    for t in ts:
        step = (t - prev) * length
        pitch = math.radians(droop) * t * t
        pos = pos + Vector((0, math.cos(pitch) * step, -math.sin(pitch) * step))
        prev = t
        half_w = width / 2 * math.sin(math.pi * (base + (1 - base) * min(t, 0.9999))) ** shape * (1 - cut.get(t, 0.0))
        back = -lobe * length * max(0.0, 1 - t / 0.22) ** 2
        mid.append(pos.copy())
        for side, out in ((-1, halves[0]), (1, halves[1])):
            out.append(pos + Vector((side * half_w * math.cos(f), back, half_w * math.sin(f))))
    for side in halves:
        _surface(bm, [[a, b] for a, b in zip(mid, side)], m)


def _pot(bm, r_base, r_top, h, segs=10, m=I4, rim=0.012):
    _lathe(bm, [(0.0, 0.0), (r_base, 0.0), (r_top, h - rim), (r_top + 0.008, h - rim), (r_top + 0.008, h), (r_top - 0.008, h),
                (r_top - 0.012, h - 0.025), (0.0, h - 0.025)], segs, m)


def build_monstera(name, location, rotation_z, parent, col):
    """Floor plant: a monstera, split leaves on arching stems, in a tapered pot. About 1.3 m tall."""
    root = _root(name, location, rotation_z, parent, col)
    bm = bmesh.new()
    _pot(bm, 0.13, 0.17, 0.34)
    _part(f"{name}__pot", bm, root, col)
    bm = bmesh.new()
    soil = 0.315
    # (azimuth deg, reach m, height m, leaf length m, leaf pitch deg, leaf roll deg). Blades tip down and outwards,
    # so their faces turn out to the room rather than up at the ceiling. Seven big leaves with two splits a side:
    # more of either reads as hatching from across the room.
    leaves = ((-80, 0.2, 1.08, 0.53, -30, -10), (-25, 0.3, 0.92, 0.51, -38, 12), (30, 0.26, 1.2, 0.55, -22, -8),
              (90, 0.32, 0.98, 0.53, -36, 15), (150, 0.3, 1.12, 0.55, -28, 6), (210, 0.36, 0.82, 0.48, -44, 10),
              (-130, 0.16, 1.28, 0.5, -16, 5))
    slits = ((0.38, 0.6), (0.64, 0.55))
    for az, reach, height, length, pitch, roll in leaves:
        a = math.radians(az)
        out = Vector((math.cos(a), math.sin(a), 0))
        stem = [Vector((0, 0, soil)) + out * (0.03 + reach * f) + Vector((0, 0, (height - soil) * math.sin(f * math.pi / 2)))
                for f in (0.0, 0.25, 0.5, 0.75, 1.0)]
        _tube(bm, stem, 0.007, 5)
        base = (Matrix.Translation(stem[-1]) @ Matrix.Rotation(a - math.pi / 2, 4, "Z")
                @ Matrix.Rotation(math.radians(pitch), 4, "X") @ Matrix.Rotation(math.radians(roll), 4, "Y"))
        _leaf(bm, length, length * 0.95, base, fold=15, droop=30, slits=slits, stations=7, shape=0.5, base=0.14, lobe=0.12)
    _part(f"{name}__leaves", bm, root, col)
    return root


def build_snake_plant(name, location, rotation_z, parent, col):
    """Small desk or shelf plant: a snake plant's upright sword leaves in a little pot. About 0.4 m tall."""
    root = _root(name, location, rotation_z, parent, col)
    bm = bmesh.new()
    _pot(bm, 0.05, 0.065, 0.1, segs=8, rim=0.008)
    _part(f"{name}__pot", bm, root, col)
    bm = bmesh.new()
    # (azimuth deg, lean off vertical deg, length m)
    blades = ((0, 8, 0.3), (70, 14, 0.26), (140, 10, 0.32), (200, 18, 0.22), (260, 9, 0.28), (320, 15, 0.24), (30, 4, 0.18))
    for k, (az, lean, length) in enumerate(blades):
        a = math.radians(az)
        base = (Matrix.Translation((0.02 * math.cos(a), 0.02 * math.sin(a), 0.075)) @ Matrix.Rotation(a, 4, "Z")
                @ Matrix.Rotation(math.radians(90 - lean), 4, "X"))
        _leaf(bm, length, 0.045, base, fold=22, droop=-12 if k % 2 else 10, stations=4, shape=0.6, base=0.3)
    _part(f"{name}__leaves", bm, root, col)
    return root


# --- books ------------------------------------------------------------------------------------------------------


def _book(bm, thick, depth, height, m, label=True):
    """A hardback standing up, spine to -y: cover boards round a page block recessed at the top, bottom and fore-edge."""
    c, x, y = 0.0025, thick / 2, depth / 2
    covers = [(-x, -y), (x, -y), (x, y), (x - c, y), (x - c, -y + c), (-x + c, -y + c), (-x + c, y), (-x, y)]
    _prism(bm, covers, height, m)
    _box(bm, (thick - 2 * c, depth - c - 0.004, height - 0.008), (0, (-y + c + y - 0.004) / 2, height / 2), m)
    if label:
        _box(bm, (thick * 0.7, 0.002, height * 0.18), (0, -y - 0.001, height * 0.7), m)


_BOOKS = ((0.032, 0.17, 0.24), (0.024, 0.15, 0.21), (0.045, 0.19, 0.27), (0.02, 0.14, 0.2), (0.038, 0.16, 0.235),
          (0.028, 0.2, 0.29), (0.05, 0.17, 0.25), (0.022, 0.13, 0.19), (0.035, 0.18, 0.26), (0.026, 0.15, 0.22))


def build_book_row(name, location, rotation_z, parent, col, count=9):
    """A row of hardbacks of mixed sizes standing along x, spines to -y, the last one leaning on the rest."""
    root = _root(name, location, rotation_z, parent, col)
    bm = bmesh.new()
    sizes = [_BOOKS[i % len(_BOOKS)] for i in range(count)]
    x = -sum(s[0] for s in sizes[:-1]) / 2
    for i, (thick, depth, height) in enumerate(sizes[:-1]):
        _book(bm, thick, depth, height, Matrix.Translation((x + thick / 2, 0, 0)), label=i % 3 != 1)
        x += thick
    thick, depth, height = sizes[-1]
    lean = math.radians(18)
    # pivots on its bottom-left edge until its top rests on the last upright book
    _book(bm, thick, depth, height, Matrix.Translation((x + height * math.sin(lean) + 0.002, 0, 0)) @ Matrix.Rotation(-lean, 4, "Y")
          @ Matrix.Translation((thick / 2, 0, 0)))
    _part(f"{name}__books", bm, root, col)
    return root


def build_book_stack(name, location, rotation_z, parent, col, count=5):
    """A loose stack of hardbacks lying flat, biggest at the bottom, spines to -y, each turned a little."""
    root = _root(name, location, rotation_z, parent, col)
    bm = bmesh.new()
    sizes = sorted((_BOOKS[(i * 3 + 2) % len(_BOOKS)] for i in range(count)), key=lambda s: -s[2])
    z = 0.0
    for i, (thick, depth, height) in enumerate(sizes):
        spin = math.radians((-6, 4, -2, 7, -4, 3)[i % 6])
        # lying down: the book's height runs along x and its thickness up z
        lay = (_m((0.01 * ((i * 7) % 3 - 1), 0, z), (0, 0, spin)) @ Matrix.Translation((-height / 2, 0, thick / 2))
               @ Matrix.Rotation(math.pi / 2, 4, "Y"))
        _book(bm, thick, depth, height, lay, label=i % 2 == 0)
        z += thick
    _part(f"{name}__books", bm, root, col)
    return root


# --- on the desk ------------------------------------------------------------------------------------------------


MUG_R, MUG_SEGS = 0.041, 14
ROUND_DEG = 60.0  # edge_threshold_deg for small round things: rims and handles draw, the facets between them don't
DUCK_DEG = 45.0  # and for the duck: its outlines draw, the facets of its lenses don't


def _soft(obj, deg):
    """Only creases sharper than `deg` draw on this mesh: the renderer's per-object edge_threshold_deg."""
    obj["edge_threshold_deg"] = float(deg)
    return obj


def _mug(bm, m=I4):
    """A mug standing at the origin, a flat strap of a handle to +x, coffee inside; one of its facets faces -y. Made
    for ROUND_DEG: the base, the rim, the coffee and the handle draw, the side facets don't."""
    _lathe(bm, [(0.0, 0.0), (MUG_R, 0.0), (MUG_R, 0.095), (0.036, 0.095), (0.035, 0.08), (0.0, 0.08)], MUG_SEGS, m)
    handle = [(0.04 + 0.028 * math.cos(a), 0, 0.05 + 0.03 * math.sin(a)) for a in (math.radians(d) for d in range(75, -76, -25))]
    _sweep(bm, handle, _rrect(0.014, 0.008, 0.0), m, hint=(0, 1, 0))


def _chip_packet(bm):
    """A puffed-up chip packet lying flat, crimped at both ends, with a few chips spilled beside it."""
    hw, seal = 0.085, 0.022
    rings = []
    for y, th in ((-0.1, 0.004), (-0.085, 0.022), (-0.05, 0.036), (0.0, 0.042), (0.05, 0.036), (0.085, 0.022), (0.1, 0.004)):
        w = hw * (0.94 if abs(y) > 0.09 else 1.0)
        rings.append([(-w, y, 0.0), (-w * 0.6, y, th * 0.64), (0.0, y, th), (w * 0.6, y, th * 0.64), (w, y, 0.0), (0.0, y, 0.0)])
    _loft(bm, rings)
    for side in (-1, 1):
        y0 = side * 0.1
        teeth = 9
        edge = [(-hw * 0.94 + 2 * hw * 0.94 * k / (teeth * 2), y0 + side * (seal - 0.006 * (k % 2))) for k in range(teeth * 2 + 1)]
        pts = [(-hw * 0.94, y0)] + edge + [(hw * 0.94, y0)]
        if side > 0:
            pts.reverse()
        _prism(bm, pts, 0.002)
    for x, y, a in ((0.13, 0.03, 0.4), (0.15, -0.04, 1.9), (0.12, -0.09, 3.0)):
        chip = [(-0.018, -0.012, 0.0), (0.0, -0.016, 0.006), (0.02, -0.008, 0.0), (0.0, 0.016, 0.0)]
        m = _m((x, y, 0.001), (0, 0, a))
        _poly(bm, chip[:3], m)
        _poly(bm, [chip[0], chip[2], chip[3]], m)


def _papers(bm):
    """A few A4 sheets fanned out, the top one printed and dog-eared."""
    w, h = 0.21, 0.297
    for k, (x, y, a) in enumerate(((-0.03, 0.02, 0.35), (0.02, -0.01, -0.2))):
        sheet = [(sx * w / 2, sy * h / 2, 0.0) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        _poly(bm, sheet, _m((x, y, 0.0006 * (k + 1)), (0, 0, a)))
    top = _m((0.0, 0.0, 0.002), (0, 0, 0.08))
    ear = 0.04
    a, b, c = Vector((w / 2 - ear, h / 2, 0)), Vector((w / 2, h / 2 - ear, 0)), Vector((w / 2, h / 2, 0))
    _poly(bm, [(-w / 2, -h / 2, 0), (w / 2, -h / 2, 0), tuple(b), tuple(a), (-w / 2, h / 2, 0)], top)
    fold = Matrix.Translation(a) @ Matrix.Rotation(math.radians(155), 4, (b - a).normalized()) @ Matrix.Translation(-a)
    _poly(bm, [tuple(a), tuple(b), tuple(fold @ c)], top)
    for i in range(11):
        length = (0.15, 0.16, 0.12, 0.16, 0.15, 0.09, 0.16, 0.14, 0.16, 0.1, 0.13)[i]
        _box(bm, (length, 0.004, 0.0005), (-0.165 / 2 + length / 2, h / 2 - 0.06 - i * 0.016, 0.00025), top)


def _sticky_notes(bm):
    """A pad of sticky notes and two loose ones, their free ends curling up."""
    s = 0.076
    _box(bm, (s, s, 0.012), (0, 0, 0.006), _m(rot=(0, 0, 0.1)))
    for x, y, a, curl in ((0.1, -0.03, -0.35, 22), (0.06, 0.08, 0.5, 28)):
        m = _m((x, y, 0.0005), (0, 0, a))
        flat = s * 0.62
        _poly(bm, [(-s / 2, s / 2, 0), (-s / 2, s / 2 - flat, 0), (s / 2, s / 2 - flat, 0), (s / 2, s / 2, 0)], m)
        r = math.radians(curl)
        tip = (s - flat) * Vector((0, -math.cos(r), math.sin(r)))
        y0 = s / 2 - flat
        _poly(bm, [(-s / 2, y0, 0), (-s / 2, y0 + tip.y, tip.z), (s / 2, y0 + tip.y, tip.z), (s / 2, y0, 0)], m)


def _pen(bm):
    """A hexagonal ballpoint with its cap and clip on."""
    r = 0.0045
    _tube(bm, [(-0.07, 0, r), (0.055, 0, r)], r, 6, hint=(0, 0, 1))
    _lathe(bm, [(r * 0.95, 0.0), (0.0015, 0.016), (0.0, 0.018)], 6, _m((0.055, 0, r), (0, math.pi / 2, 0)), phase=math.pi / 6)
    _tube(bm, [(-0.075, 0, r), (-0.03, 0, r)], r * 1.15, 6, hint=(0, 0, 1))
    _box(bm, (0.04, 0.003, 0.002), (-0.05, 0, 2 * r + 0.002))


def _headphones(bm):
    """Over-ear headphones lying on their back: the band flat on the desk, the cups turned flat beside it."""
    for side in (-1, 1):
        _lathe(bm, [(0.0, 0.0), (0.038, 0.0), (0.045, 0.008), (0.045, 0.026), (0.047, 0.03), (0.046, 0.042), (0.038, 0.048),
                    (0.024, 0.048), (0.02, 0.04), (0.0, 0.04)], 12, Matrix.Translation((side * 0.11, -0.01, 0)))
    arc = [(0.11 * math.cos(a), -0.01 + 0.13 * math.sin(a), 0.03) for a in (math.pi * k / 10 for k in range(11))]
    _sweep(bm, arc, _rrect(0.008, 0.03, 0.0))


def _cable(bm, path, radius=0.003):
    _tube(bm, path, radius, 5)


def build_desk_mess(name, location, rotation_z, parent, col, depth=0.7, parts=None):
    """Lived-in clutter for the desk top, laid out for build_desk's default 1.4 x 0.7 top with a monitor at the back
    left of centre and a laptop to the right. Origin on the desk surface at its centre. Parts: <name>__mug (origin at
    the mug's base, for steam), __chips, __papers, __notes, __pen, __headphones, __can, __paper_balls, __cables (one
    runs off the back edge and down). `parts` names the ones to build, e.g. ("mug", "chips", "papers"); None builds
    them all."""
    root = _root(name, location, rotation_z, parent, col)

    def wanted(part):
        return parts is None or part in parts

    # front left keeps just the papers and the mug; the chips have been shoved back under the monitor's left edge
    for part, build, loc, rot in (("mug", _mug, (-0.38, -0.28, 0), 0.4), ("chips", _chip_packet, (-0.39, 0.16, 0), 0.25),
                                  ("papers", _papers, (-0.53, -0.1, 0), -0.3), ("notes", _sticky_notes, (0.2, -0.27, 0), 0.0),
                                  ("pen", _pen, (0.24, -0.1, 0.0), 0.7), ("headphones", _headphones, (0.52, -0.22, 0), -0.3),
                                  ("can", _can, (0.21, 0.2, 0), 0.3)):
        if not wanted(part):
            continue
        bm = bmesh.new()
        build(bm)
        obj = _part(f"{name}__{part}", bm, root, col, loc, (0, 0, rot))
        if part in ("mug", "can"):
            _soft(obj, ROUND_DEG)
    if wanted("paper_balls"):
        bm = bmesh.new()
        _crumple(bm, 0.028, (0.15, 0.03, 0.026), seed=5)
        _crumple(bm, 0.03, (0.63, 0.07, 0.028), seed=6)
        _part(f"{name}__paper_balls", bm, root, col)
    if not wanted("cables"):
        return root
    bm = bmesh.new()
    back = depth / 2
    _cable(bm, [(0.24, 0.03, 0.003), (0.17, 0.1, 0.003), (0.2, 0.22, 0.003), (0.3, 0.3, 0.003), (0.33, back - 0.01, 0.003),
                (0.335, back + 0.012, -0.012), (0.335, back + 0.02, -0.08), (0.33, back + 0.02, -0.3)])
    _cable(bm, [(-0.15, 0.2, 0.003), (-0.1, 0.28, 0.003), (-0.12, back - 0.01, 0.003), (-0.125, back + 0.012, -0.012),
                (-0.125, back + 0.02, -0.08), (-0.12, back + 0.02, -0.3)])
    _cable(bm, [(0.43, -0.14, 0.003), (0.4, -0.06, 0.003), (0.36, 0.02, 0.003)], 0.002)
    _part(f"{name}__cables", bm, root, col)
    return root


def build_desk_lamp(name, location, rotation_z, parent, col):
    """Architect's desk lamp: weighted base, twin-rod arms with a spring on the lower one, cone shade over a bulb,
    reaching forward (-y) over the desk."""
    root = _root(name, location, rotation_z, parent, col)
    bm = bmesh.new()
    _lathe(bm, [(0.0, 0.0), (0.075, 0.0), (0.075, 0.014), (0.06, 0.028), (0.02, 0.034), (0.0, 0.034)], 10)
    _lathe(bm, [(0.012, 0.03), (0.012, 0.07)], 8)
    j1, j2, j3 = Vector((0, 0.0, 0.075)), Vector((0, 0.13, 0.42)), Vector((0, -0.2, 0.5))
    for a, b in ((j1, j2), (j2, j3)):
        for x in (-0.012, 0.012):
            _tube(bm, [a + Vector((x, 0, 0)), b + Vector((x, 0, 0))], 0.004, 6, hint=(1, 0, 0))
    for j in (j1, j2, j3):
        _lathe(bm, [(0.014, -0.02), (0.014, 0.02)], 8, Matrix.Translation(j) @ Matrix.Rotation(math.pi / 2, 4, "Y"))
    axis = (j2 - j1).normalized()
    side = axis.cross(Vector((1, 0, 0))).normalized()
    start, end = j1 + axis * 0.06 + side * 0.02, j1 + axis * 0.26 + side * 0.02
    turns, per = 9, 5
    coil = [start + (end - start) * (k / (turns * per)) + 0.006 * (math.cos(2 * math.pi * k / per) * Vector((1, 0, 0))
            + math.sin(2 * math.pi * k / per) * side) for k in range(turns * per + 1)]
    _tube(bm, coil, 0.0016, 4)
    shade = Matrix.Translation(j3 + Vector((0, -0.02, -0.01))) @ Matrix.Rotation(math.radians(-28), 4, "X")
    _lathe(bm, [(0.0, 0.012), (0.022, 0.012), (0.024, -0.02), (0.07, -0.1), (0.074, -0.11)], 10, shade, caps=False)
    _lathe(bm, [(0.0, -0.02), (0.018, -0.035), (0.02, -0.05), (0.012, -0.066), (0.0, -0.07)], 8, shade)
    _part(f"{name}__lamp", bm, root, col)
    return root


# --- couch and telly --------------------------------------------------------------------------------------------


def _crumple(bm, radius, center, seed=0, m=I4):
    """A crumpled ball (paper, foil): a jittered icosahedron, every edge of which draws."""
    c = m @ Vector(center)
    geom = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=radius, matrix=Matrix.Translation(c))
    for k, v in enumerate(geom["verts"]):
        v.co = c + (v.co - c) * (1 + 0.22 * math.sin(seed * 12.9898 + k * 78.233))


def build_couch(name, location, rotation_z, parent, col, width=1.7, depth=0.85, askew=True):
    """Two-seater: a box frame with upholstered arms on short tapered legs, two seat cushions (<name>__seat_0, _1)
    and two back cushions (__back_0, _1) with rolled edges, so every cushion outline draws. The seats carry the dent
    of someone who's been sitting there a while. With askew, the left seat has crept forward and the right back
    cushion has slumped sideways."""
    root = _root(name, location, rotation_z, parent, col)
    arm_w, back_t, leg, deck, arm_h, back_h = 0.17, 0.2, 0.09, 0.3, 0.6, 0.8
    inner = width - 2 * arm_w
    bm = bmesh.new()
    for sx in (-1, 1):
        for sy in (-1, 1):
            _lathe(bm, [(0.016, 0.0), (0.024, leg)], 8, Matrix.Translation((sx * (width / 2 - 0.07), sy * (depth / 2 - 0.07), 0)))
    _box(bm, (inner, depth - back_t, deck - leg), (0, -back_t / 2, (leg + deck) / 2))
    _slab(bm, inner + 0.02, back_t, leg, back_h, r=0.03, segs=2, top=0.03, m=Matrix.Translation((0, depth / 2 - back_t / 2, 0)))
    for side in (-1, 1):
        _slab(bm, arm_w, depth, leg, arm_h, r=0.04, segs=2, top=0.035, m=Matrix.Translation((side * (width / 2 - arm_w / 2), 0, 0)))
    _part(f"{name}__frame", bm, root, col)

    seat_w, seat_d, seat_h = inner / 2 - 0.006, depth - back_t, 0.15

    def seat(u, v):
        dent = 0.012 * math.exp(-((u - 0.1) ** 2 + (v + 0.15) ** 2) / 0.18)
        return 0.02 * (1 - u * u) * (1 - v * v) - 0.022 * (max(abs(u), abs(v)) > 0.95) - dent

    for i, side in enumerate((-1, 1)):
        bm = bmesh.new()
        _cushion(bm, seat_w, seat_d, 0.0, seat_h - 0.02, seat, k=0.08, tuck=0.96)
        crept = askew and i == 0
        _part(f"{name}__seat_{i}", bm, root, col, (side * inner / 4, -back_t / 2 - 0.05 * crept, deck),
              (0, 0, math.radians(4) * crept))

    def back(u, v):
        return 0.025 * (1 - u * u) * (1 - v * v) - 0.02 * (max(abs(u), abs(v)) > 0.95)

    lean = math.radians(78)  # back cushions lean back 12 degrees
    back_w, back_hgt, back_th = seat_w - 0.01, 0.44, 0.17
    for i, side in enumerate((-1, 1)):
        bm = bmesh.new()
        _cushion(bm, back_w, back_hgt, 0.0, back_th - 0.02, back, _m(rot=(lean, 0, 0)), k=0.1, tuck=0.95)
        top = Vector((0, math.cos(lean), math.sin(lean))) * back_hgt / 2  # centre to top edge
        loc = (side * inner / 4, depth / 2 - back_t - top.y - 0.004, deck + seat_h + top.z)
        slumped = askew and i == 1
        _part(f"{name}__back_{i}", bm, root, col, (loc[0], loc[1], loc[2] - 0.03 * slumped),
              (0, math.radians(-14) * slumped, math.radians(5) * slumped))
    return root


def build_old_tv(name, location, rotation_z, parent, col, console=True):
    """A CRT telly on a low open stand: deep body tapering to the back, a bulging screen in a recess (its own part,
    <name>__screen, UV-mapped 0..1), a speaker grille of raised slats, two knobs, and rabbit ears on top with a ball
    of foil on one tip for reception. With console, an old games console sits in the stand and its controller lies
    on the floor in front, cable trailing back to it."""
    root = _root(name, location, rotation_z, parent, col)
    sw, sd, sh, t, leg = 0.76, 0.46, 0.42, 0.02, 0.06
    bm = bmesh.new()
    for sx in (-1, 1):
        for sy in (-1, 1):
            _box(bm, (0.035, 0.035, leg), (sx * (sw / 2 - 0.04), sy * (sd / 2 - 0.04), leg / 2))
    _slab(bm, sw, sd, sh - t, sh, r=0.008, top=0.004)
    _box(bm, (sw, sd, t), (0, 0, leg + t / 2))
    for side in (-1, 1):
        _box(bm, (t, sd, sh - leg - 2 * t), (side * (sw - t) / 2, 0, (leg + sh) / 2))
    _box(bm, (sw - 2 * t, t, sh - leg - 2 * t), (0, sd / 2 - t / 2, (leg + sh) / 2))
    _part(f"{name}__stand", bm, root, col)

    w, h, fy, depth = 0.58, 0.47, -0.2, 0.46  # front face size, front face y, overall depth
    zc = sh + h / 2
    scx, scz, scw, sch = -0.06, zc + 0.012, 0.42, 0.355  # screen opening: left of centre, controls on the right

    def ring(rw, rh, y, cx=0.0, cz=zc, r=0.03):
        return [(cx + x, y, cz + z) for x, z in _rrect(rw, rh, r, 2)]

    # the cabinet: a rear shell tapering in at the top and sides (the bottom stays flat on the stand) to a flat back
    # panel with two vent slots, then the front frame, bezel and screen recess
    back_y, bw, bh = fy + depth - 0.025, 0.42, 0.36
    bm = bmesh.new()
    _loft(bm, [ring(bw, bh, back_y, cz=sh + bh / 2), ring(w, h, fy + 0.11), ring(w, h, fy),
               ring(scw, sch, fy, scx, scz, 0.04), ring(scw, sch, fy + 0.022, scx, scz, 0.04)])
    _slab(bm, bw + 0.02, bh, back_y, back_y + 0.025, r=0.03, segs=2, top=0.006, m=Matrix.Translation((0, 0, sh + bh / 2)) @ XZ)
    for z in (sh + bh - 0.07, sh + bh - 0.1):
        _box(bm, (0.2, 0.006, 0.012), (0, fy + depth + 0.002, z))
    knobs = Matrix.Rotation(math.pi / 2, 4, "X")  # lathe axis z -> out of the front, -y
    for z, turn in ((zc + 0.15, 0.6), (zc + 0.07, -1.1)):
        _lathe(bm, [(0.024, 0.0), (0.024, 0.016), (0.02, 0.022), (0.0, 0.022)], 10, Matrix.Translation((0.22, fy, z)) @ knobs)
        _box(bm, (0.004, 0.004, 0.02), (0, 0, 0.006), Matrix.Translation((0.22, fy - 0.023, z)) @ Matrix.Rotation(turn, 4, "Y"))
    for i in range(7):
        _box(bm, (0.09, 0.006, 0.007), (0.22, fy - 0.003, zc - 0.02 - i * 0.022))
    _box(bm, (0.03, 0.008, 0.015), (0.22, fy - 0.004, zc - 0.195))
    _part(f"{name}__body", bm, root, col)

    bm = bmesh.new()
    _loft(bm, [ring(scw - 0.002, sch - 0.002, fy + 0.0215, scx, scz, 0.04), ring(0.34, 0.28, fy - 0.006, scx, scz, 0.05)])
    _part(f"{name}__screen", bm, root, col, uv=lambda co: ((co.x - scx) / scw + 0.5, (co.z - scz) / sch + 0.5))

    top, ay = sh + h, fy + 0.08
    bm = bmesh.new()
    _lathe(bm, [(0.05, 0.0), (0.05, 0.012), (0.034, 0.028), (0.0, 0.034)], 10, Matrix.Translation((0, ay, top)))
    for side in (-1, 1):
        d = Vector((side * math.sin(math.radians(32)), 0.18, math.cos(math.radians(32)))).normalized()
        p0 = Vector((side * 0.012, ay, top + 0.026))
        p1, p2 = p0 + d * 0.24, p0 + d * 0.44
        _tube(bm, [p0, p1], 0.0045, 6, hint=(0, 1, 0))
        _tube(bm, [p1, p2], 0.003, 6, hint=(0, 1, 0))
        if side < 0:
            _crumple(bm, 0.022, p2, seed=3)  # tinfoil, for reception
        else:
            _lathe(bm, [(0.0, -0.006), (0.006, 0.0), (0.0, 0.006)], 6, Matrix.Translation(p2))
    _part(f"{name}__antenna", bm, root, col)

    if console:
        cz = leg + t  # floor of the stand's bay
        bm = bmesh.new()
        _slab(bm, 0.25, 0.18, cz, cz + 0.055, r=0.012, segs=2, top=0.008, m=Matrix.Translation((-0.12, 0, 0)))
        _box(bm, (0.11, 0.022, 0.075), (-0.12, 0.03, cz + 0.085))  # cartridge, pushed in
        _box(bm, (0.07, 0.004, 0.032), (-0.12, 0.017, cz + 0.098))  # its label
        for x in (-0.2, -0.17):
            _box(bm, (0.018, 0.012, 0.008), (x, -0.055, cz + 0.058))  # power, reset
        for x in (-0.15, -0.09):
            _box(bm, (0.022, 0.006, 0.012), (x, -0.092, cz + 0.025))  # controller ports
        _part(f"{name}__console", bm, root, col)

        pad = _m((0.12, -0.44, 0), (0, 0, 0.35))
        outline = ([(-0.04 + 0.03 * math.cos(math.radians(a)), 0.03 * math.sin(math.radians(a))) for a in range(45, 316, 30)]
                   + [(0.04 + 0.03 * math.cos(math.radians(a)), 0.03 * math.sin(math.radians(a))) for a in range(225, 496, 30)])
        cross = [(0.011, 0.0035), (0.0035, 0.0035), (0.0035, 0.011), (-0.0035, 0.011), (-0.0035, 0.0035), (-0.011, 0.0035),
                 (-0.011, -0.0035), (-0.0035, -0.0035), (-0.0035, -0.011), (0.0035, -0.011), (0.0035, -0.0035), (0.011, -0.0035)]
        bm = bmesh.new()
        _prism(bm, outline, 0.022, pad)
        _prism(bm, cross, 0.004, pad @ Matrix.Translation((-0.04, 0, 0.022)))
        for x, y in ((0.03, 0.0), (0.05, 0.0), (0.04, 0.01), (0.04, -0.01)):
            _lathe(bm, [(0.0045, 0.022), (0.0045, 0.026)], 6, pad @ Matrix.Translation((x, y, 0)))
        start = pad @ Vector((0.0, 0.028, 0.01))
        _tube(bm, [tuple(start), (0.07, -0.36, 0.004), (0.0, -0.31, 0.004), (-0.07, -0.27, 0.005), (-0.09, -0.24, 0.03),
                   (-0.09, -0.232, 0.07), (-0.09, -0.215, 0.085), (-0.09, -0.13, 0.095), (-0.09, -0.1, cz + 0.025)], 0.003, 5)
        _part(f"{name}__controller", bm, root, col)
    return root


# --- the sleep-deprived developer -------------------------------------------------------------------------------
# Anything that shows words takes them as a parameter: Kasper approves all visible copy.

CAN_R, CAN_H = 0.033, 0.152
BOLT = [(0.004, 0.115), (-0.008, 0.072), (0.0, 0.072), (-0.007, 0.032), (0.009, 0.082), (0.001, 0.082), (0.008, 0.115)]


def _can(bm, m=I4):
    """An energy drink can standing at the origin, a lightning bolt raised on its front (-y). Made for ROUND_DEG: the
    base, a sharp shoulder, the rim, the lid and the bolt draw, the side facets don't, so it reads as a cylinder from
    its ellipses."""
    _lathe(bm, [(0.0, 0.0), (0.029, 0.0), (CAN_R, 0.008), (CAN_R, 0.141), (0.026, 0.144), (0.026, CAN_H), (0.023, CAN_H),
                (0.022, CAN_H - 0.004), (0.0, CAN_H - 0.004)], 14, m)
    _prism(bm, BOLT, 0.0012, m @ Matrix.Translation((0, -CAN_R - 0.0002, 0)) @ WALL)
    _box(bm, (0.012, 0.02, 0.002), (0, -0.006, CAN_H - 0.002), m)


def _crushed_can(bm, m=I4):
    """A can stamped flat in the middle and dropped on its side, lying along x."""
    profile = [(0.03, 0.0), (0.034, 0.01), (0.04, 0.03), (0.02, 0.046), (0.041, 0.06), (0.031, 0.078), (0.025, 0.09), (0.022, 0.093)]
    rings = [[(0, 0, 0.0)]]
    for i, (r, z) in enumerate(profile):
        ring = []
        for k in range(8):
            a = 2 * math.pi * k / 8
            rr = r * (1 + 0.22 * math.sin(3 * a + 1.7 * i))
            ring.append((0.65 * rr * math.cos(a), rr * math.sin(a), z + 0.005 * math.cos(2 * a + i)))
        rings.append(ring)
    rings.append([(0, 0, 0.093)])
    _loft(bm, rings, m @ _m((-0.046, 0, 0.027), (0, math.pi / 2, 0)))


def build_energy_can(name, location, rotation_z, parent, col, crushed=False):
    """One energy drink can, standing, or crushed and lying on its side."""
    root = _root(name, location, rotation_z, parent, col)
    bm = bmesh.new()
    (_crushed_can if crushed else _can)(bm)
    _soft(_part(f"{name}__can", bm, root, col), ROUND_DEG)
    return root


def build_can_pyramid(name, location, rotation_z, parent, col, rows=4):
    """A proud pyramid of empties: rows + (rows - 1) + ... + 1 cans (10 for 4 rows, 0.62 m tall), bolts to the front."""
    root = _root(name, location, rotation_z, parent, col)
    bm = bmesh.new()
    pitch = 2 * CAN_R + 0.003
    for row in range(rows):
        n = rows - row
        for i in range(n):
            spin = 0.12 * math.sin(row * 3.1 + i * 1.7)
            _can(bm, _m(((i - (n - 1) / 2) * pitch, 0.002 * math.sin(i + row), row * (CAN_H + 0.001)), (0, 0, spin)))
    _soft(_part(f"{name}__cans", bm, root, col), ROUND_DEG)
    return root


def _wrap_on_mug(obj, z):
    """Bend a text_mesh round the mug's faceted side, centred on its front (-y) facet, its line centre at height z."""
    apothem, facet = MUG_R * math.cos(math.pi / MUG_SEGS), 2 * math.pi / MUG_SEGS
    for v in obj.data.vertices:
        x, y, zz = v.co
        a = x / MUG_R  # arc length round the mug -> angle from the front
        off = (a + facet / 2) % facet - facet / 2  # angle from the nearest facet centre
        rr = apothem / math.cos(off) + 0.0002 - y  # y <= 0 stands out of the surface
        v.co = (rr * math.sin(a), -rr * math.cos(a), zz + z)
    obj.data.update()


def build_mug(name, location, rotation_z, parent, col, text=None):
    """A coffee mug, handle to the right, with optional text round its front: a line or two, \\n between."""
    root = _root(name, location, rotation_z, parent, col)
    bm = bmesh.new()
    _mug(bm)
    _soft(_part(f"{name}__mug", bm, root, col), ROUND_DEG)
    if text:
        _wrap_on_mug(common.text_mesh(f"{name}__text", text, 0.012, 0.0008, (0, 0, 0), root, col), 0.05)
    return root


def build_mug_cluster(name, location, rotation_z, parent, col, count=4):
    """Abandoned mugs, `count` of them (1 to 4): up to three standing about at odd angles, the fourth tipped over in a
    dried puddle, and coffee rings where others used to be."""
    root = _root(name, location, rotation_z, parent, col)
    bm = bmesh.new()
    for x, y, a in ((0.0, 0.0, 0.3), (0.1, 0.06, 2.2), (-0.09, 0.08, -1.0))[:max(1, min(count, 3))]:
        _mug(bm, _m((x, y, 0), (0, 0, a)))
    tipped = _m((0.08, -0.1, 0), (0, 0, -0.6))
    if count >= 4:
        _mug(bm, tipped @ _m((0, 0, MUG_R * math.cos(math.pi / MUG_SEGS)), (math.pi / 2, 0, 0)))  # resting on a facet
    _soft(_part(f"{name}__mugs", bm, root, col), ROUND_DEG)
    bm = bmesh.new()
    if count >= 4:
        puddle = [(0.05 * math.cos(a) * (1 + 0.25 * math.sin(3 * a)), -0.15 + 0.035 * math.sin(a) * (1 + 0.2 * math.cos(2 * a)))
                  for a in (2 * math.pi * k / 12 for k in range(12))]
        _prism(bm, puddle, 0.0006, tipped)
    for x, y in ((-0.18, -0.06), (0.21, -0.03)):
        _strip(bm, _circle(0.04, 12, (x, y)), _circle(0.035, 12, (x, y)), 0.0004, closed=True)
    _part(f"{name}__stains", bm, root, col)
    return root


def build_noodle_cup(name, location, rotation_z, parent, col):
    """Instant noodles, half eaten: a tapered cup with its lid peeled back, a plastic fork standing in it with
    noodles twirled round the tines, and a strand hanging over the rim."""
    root = _root(name, location, rotation_z, parent, col)
    bm = bmesh.new()
    _lathe(bm, [(0.0, 0.0), (0.038, 0.0), (0.05, 0.1), (0.054, 0.104), (0.054, 0.11), (0.049, 0.11), (0.047, 0.095), (0.0, 0.095)], 14)
    _prism(bm, _circle(0.054, 14), 0.001, _m((0, 0.04, 0.11), (math.radians(-110), 0, 0)) @ Matrix.Translation((0, -0.04, 0)))
    fork = _m((0.008, -0.005, 0.03), (math.radians(14), math.radians(-10), 0))
    _box(bm, (0.008, 0.003, 0.11), (0, 0, 0.055), fork)
    _prism(bm, [(-0.004, 0.11), (0.004, 0.11), (0.01, 0.125), (-0.01, 0.125)], 0.003, fork @ Matrix.Translation((0, -0.0015, 0)) @ XZ)
    for i in range(4):
        _box(bm, (0.0025, 0.003, 0.035), (-0.0075 + i * 0.005, 0, 0.1425), fork)
    twirl = [(0.014 * math.cos(a), 0.014 * math.sin(a), 0.128 + 0.0035 * a / math.pi) for a in (k * math.pi / 3 for k in range(16))]
    _tube(bm, twirl, 0.0022, 4, fork)
    strand = [(0.03, -0.02, 0.095), (0.048, -0.03, 0.116), (0.06, -0.034, 0.1), (0.066, -0.036, 0.075), (0.062, -0.034, 0.05)]
    _tube(bm, strand, 0.002, 4)
    _tube(bm, [(-0.035, 0.0, 0.097), (-0.02, 0.02, 0.098), (0.0, 0.01, 0.097), (0.015, 0.03, 0.098)], 0.002, 4)
    _soft(_part(f"{name}__cup", bm, root, col), ROUND_DEG)
    return root


def build_pizza_box(name, location, rotation_z, parent, col, open_deg=55, slices=2):
    """A pizza box with its lid half open (<name>__lid, origin on the hinge), the last `slices` inside and a crust
    someone gave up on."""
    root = _root(name, location, rotation_z, parent, col)
    s, h, t = 0.36, 0.04, 0.004
    bm = bmesh.new()
    _box(bm, (s, s, t), (0, 0, t / 2))
    for side in (-1, 1):
        _box(bm, (s, t, h), (0, side * (s - t) / 2, h / 2))
        _box(bm, (t, s - 2 * t, h), (side * (s - t) / 2, 0, h / 2))
    for k in range(slices):
        a0, a1 = math.radians(200 + 47 * k), math.radians(245 + 47 * k)
        arc = [(math.cos(a0 + (a1 - a0) * j / 4), math.sin(a0 + (a1 - a0) * j / 4)) for j in range(5)]
        mid = (a0 + a1) / 2
        tip = (0.004 * math.cos(mid), 0.004 * math.sin(mid))  # the slices don't share a point
        _prism(bm, [tip] + [(0.15 * x, 0.15 * y) for x, y in arc], 0.007, Matrix.Translation((0, 0, t)))
        _tube(bm, [(0.145 * x, 0.145 * y, t + 0.008) for x, y in arc], 0.008, 5)
        for r in (0.06, 0.105):
            _lathe(bm, [(0.013, 0.0), (0.013, 0.002)], 8, Matrix.Translation((r * math.cos(mid), r * math.sin(mid), t + 0.007)))
    crust = [(0.1 * math.cos(a) + 0.03, 0.1 * math.sin(a) - 0.02, t + 0.008) for a in (math.radians(d) for d in range(10, 91, 20))]
    _tube(bm, crust, 0.008, 5)
    _part(f"{name}__box", bm, root, col)
    bm = bmesh.new()
    _box(bm, (s, s, t), (0, -s / 2, t / 2))
    _box(bm, (s - 0.012, t, 0.035), (0, -s + t / 2, -0.0175))  # the front flap
    _part(f"{name}__lid", bm, root, col, (0, s / 2, h), (math.radians(-open_deg), 0, 0))
    return root


def build_pillow(name, location, rotation_z, parent, col, size=0.45, thick=0.14, tilt=0.0):
    """A plump square throw pillow: two puffed faces meeting at a seam, corners pulled out. `tilt` (degrees) leans
    it back about x, e.g. 70 to prop it against a couch back; the origin stays under its centre at its resting level."""
    root = _root(name, location, rotation_z, parent, col)
    st = (-1, -0.7, -0.35, 0, 0.35, 0.7, 1)

    def face(sign):
        return [[(u * size / 2 * (1 + 0.07 * v * v), v * size / 2 * (1 + 0.07 * u * u),
                  sign * thick / 2 * ((1 - abs(u) ** 3) * (1 - abs(v) ** 3)) ** 0.5) for u in st] for v in st]

    bm = bmesh.new()
    _surface(bm, face(1))
    _surface(bm, face(-1))
    lean = math.radians(tilt)
    _part(f"{name}__pillow", bm, root, col, (0, 0, thick / 2 * math.cos(lean) + size / 2 * math.sin(lean)), (lean, 0, 0))
    return root


def build_blanket(name, location, rotation_z, parent, col, width=0.9, depth=0.6, drape=0.22):
    """A crumpled throw blanket in a heap: lumpy and ridged so its creases draw, its front-left corner flopped over
    the front edge and hanging `drape` m (0 for none). Origin on the surface under the heap; the fold runs along
    y = 0.1 - depth / 2, so put that on the edge of the cushion."""
    root = _root(name, location, rotation_z, parent, col)
    nx, ny = 10, 8
    edge = -depth / 2 + 0.1
    grid = []
    for j in range(ny + 1):
        row = []
        for i in range(nx + 1):
            u, v = -1 + 2 * i / nx, -1 + 2 * j / ny
            x, y = u * width / 2, v * depth / 2
            lump = 0.11 * math.exp(-((u - 0.25) ** 2 / 0.25 + (v - 0.1) ** 2 / 0.35))
            ridges = 0.035 * math.sin(7 * u + 3 * v + 1) * math.cos(5 * v - 2 * u)
            z = max(0.004, lump + ridges * (0.4 + lump * 6)) * (1 - 0.85 * max(abs(u), abs(v)) ** 4)
            if drape and y < edge and u < 0.1:
                y, z = edge - 0.01 * (edge - y), z - (edge - y) / 0.1 * drape
            row.append((x + 0.03 * math.sin(3 * v + 2 * u), y, z))
        grid.append(row)
    bm = bmesh.new()
    _surface(bm, grid)
    _part(f"{name}__blanket", bm, root, col)
    return root


def build_rubber_duck(name, location, rotation_z, parent, col, size=1.5):
    """A rubber duck facing -y, about 0.1 * size m long, drawn for being seen side-on (turn it so the camera looks
    along x, e.g. sat on top of the monitor): body, head and beak only. The body and head are lenses, a side profile
    pinched to a point at either side, so at DUCK_DEG the one crease that draws is each outline. Oversized by default."""
    root = _root(name, location, rotation_z, parent, col)
    sc = Matrix.Scale(size, 4)
    bm = bmesh.new()
    body = [(-0.03, 0.004), (-0.046, 0.016), (-0.05, 0.034), (-0.042, 0.052), (-0.012, 0.058), (0.02, 0.054), (0.042, 0.062),
            (0.06, 0.084), (0.062, 0.06), (0.055, 0.032), (0.04, 0.01), (0.012, 0.0)]  # side profile (y, z), chest to tail
    _loft(bm, [[(-0.032, 0.004, 0.034)], [(0, y, z) for y, z in body], [(0.032, 0.004, 0.034)]], sc)
    head = [(0, -0.03 + 0.03 * math.cos(a), 0.084 + 0.03 * math.sin(a)) for a in (2 * math.pi * k / 12 for k in range(12))]
    _loft(bm, [[(-0.022, -0.03, 0.084)], head, [(0.022, -0.03, 0.084)]], sc)
    beak = [(-0.054, 0.086), (-0.074, 0.084), (-0.086, 0.078), (-0.084, 0.072), (-0.07, 0.07), (-0.054, 0.072)]
    _prism(bm, beak, 0.024, sc @ Matrix.Translation((-0.012, 0, 0)) @ YZ)
    _soft(_part(f"{name}__duck", bm, root, col), DUCK_DEG)
    return root


def build_wall_clock(name, location, rotation_z, parent, col, radius=0.15, hours=3, minutes=47):
    """Round wall clock with hour ticks, its hands (<name>__hands) stopped at hours:minutes, 3:47 by default. Origin
    on the wall plane at its centre."""
    root = _root(name, location, rotation_z, parent, col)
    bm = bmesh.new()
    _strip(bm, _circle(radius, 16), _circle(radius - 0.014, 16), 0.045, WALL, closed=True)
    _poly(bm, [(x, -0.012, z) for x, z in _circle(radius - 0.014, 16)])
    face = Matrix.Translation((0, -0.012, 0)) @ WALL
    for k in range(12):
        a, r0 = 2 * math.pi * k / 12, radius * (0.7 if k % 3 == 0 else 0.77)
        _stroke(bm, [(r0 * math.sin(a), r0 * math.cos(a)), (0.86 * radius * math.sin(a), 0.86 * radius * math.cos(a))],
                0.009 if k % 3 == 0 else 0.005, 0.002, face)
    _part(f"{name}__body", bm, root, col)

    def hand(length, w0, w1, deg, y):
        th = math.radians(deg)  # clockwise from 12
        pts = [(-w0 / 2, -0.02), (w0 / 2, -0.02), (w1 / 2, length), (0, length + 0.012), (-w1 / 2, length)]
        _prism(bm, [(x * math.cos(th) + z * math.sin(th), -x * math.sin(th) + z * math.cos(th)) for x, z in pts], 0.0015,
               Matrix.Translation((0, y, 0)) @ WALL)

    bm = bmesh.new()
    hand(radius * 0.5, 0.012, 0.007, (hours % 12 + minutes / 60) * 30, -0.016)
    hand(radius * 0.76, 0.009, 0.005, minutes * 6, -0.019)
    hand(radius * 0.82, 0.0025, 0.0025, 210, -0.022)
    _lathe(bm, [(0.008, 0.0), (0.008, 0.013), (0.0, 0.013)], 8, Matrix.Translation((0, -0.012, 0)) @ WALL)  # centre cap
    _part(f"{name}__hands", bm, root, col)
    return root


def build_plant_wilted(name, location, rotation_z, parent, col):
    """The forgotten one: a small pot of dry soil, stems flopped over the rim with their leaves hanging limp, and
    two dead leaves already on the floor. Put it next to a healthy plant."""
    root = _root(name, location, rotation_z, parent, col)
    bm = bmesh.new()
    _pot(bm, 0.055, 0.07, 0.12, segs=8, rim=0.009)
    _part(f"{name}__pot", bm, root, col)
    bm = bmesh.new()
    soil = 0.095
    for az, reach, peak in ((20, 0.11, 0.2), (110, 0.13, 0.17), (200, 0.1, 0.22), (290, 0.12, 0.18), (250, 0.04, 0.27)):
        a = math.radians(az)
        out = Vector((math.cos(a), math.sin(a), 0))
        stem = [Vector((0, 0, soil)) + out * (0.01 + reach * f) + Vector((0, 0, peak * math.sin(math.pi * f * 0.75) - 0.12 * f ** 3))
                for f in (0.0, 0.2, 0.4, 0.6, 0.8, 1.0)]
        _tube(bm, stem, 0.0028, 4)
        hang = Matrix.Translation(stem[-1]) @ Matrix.Rotation(a - math.pi / 2, 4, "Z") @ Matrix.Rotation(math.radians(-75), 4, "X")
        _leaf(bm, 0.07, 0.04, hang, fold=20, droop=30, stations=4, shape=0.7, base=0.15)
        _leaf(bm, 0.05, 0.03, Matrix.Translation(stem[3]) @ Matrix.Rotation(a, 4, "Z") @ Matrix.Rotation(math.radians(-60), 4, "X"),
              fold=20, droop=25, stations=3, shape=0.7, base=0.15)
    for x, y, a in ((0.14, -0.06, 0.4), (-0.1, -0.13, 2.0)):
        _leaf(bm, 0.06, 0.035, _m((x, y, 0.002), (0, 0, a)), fold=10, droop=-25, stations=4, shape=0.7, base=0.15)
    _part(f"{name}__stems", bm, root, col)
    return root


def build_bin(name, location, rotation_z, parent, col, missed=True, balls=6):
    """A waste bin with `balls` balls of crumpled paper in it (up to 9). Six or more heap up over the rim; fewer sit
    down in the bin, their tops just showing above it. With missed, three balls that didn't make it lie on the floor
    round it (all in <name>__paper)."""
    root = _root(name, location, rotation_z, parent, col)
    bm = bmesh.new()
    _lathe(bm, [(0.0, 0.0), (0.12, 0.0), (0.15, 0.31), (0.157, 0.31), (0.157, 0.325), (0.148, 0.325), (0.14, 0.31), (0.112, 0.012),
                (0.0, 0.012)], 10)
    _part(f"{name}__bin", bm, root, col)
    bm = bmesh.new()
    heap = ((0.0, 0.0, 0.3, 0.045), (0.07, 0.03, 0.31, 0.04), (-0.07, 0.04, 0.3, 0.042), (-0.04, -0.05, 0.33, 0.038),
            (0.02, 0.02, 0.37, 0.042), (0.0, -0.01, 0.43, 0.04), (0.03, -0.07, 0.3, 0.04), (-0.03, 0.06, 0.38, 0.036),
            (0.06, -0.03, 0.375, 0.035))
    few = ((0.05, 0.03, 0.292, 0.042), (-0.05, 0.04, 0.288, 0.04), (0.0, -0.06, 0.296, 0.041), (-0.03, -0.01, 0.306, 0.038),
           (0.06, -0.05, 0.286, 0.039))  # rim at 0.325: their tops clear it by a centimetre or two
    paper = heap[:balls] if balls >= 6 else few[:max(balls, 0)]
    if missed:
        paper += ((0.26, -0.08, 0.035, 0.035), (-0.2, -0.22, 0.04, 0.04), (0.1, -0.3, 0.033, 0.033))
    for k, (x, y, z, r) in enumerate(paper):
        _crumple(bm, r, (x, y, z), seed=k)
    _part(f"{name}__paper", bm, root, col)
    return root


def _spline(ctrl, per=4):
    """A smooth path through control points (Catmull-Rom), `per` samples per span."""
    p = [Vector(c) for c in ctrl]
    p = [p[0]] + p + [p[-1]]
    out = []
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        for k in range(per):
            t = k / per
            out.append(0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t ** 3))
    out.append(p[-2])
    return out


def build_cable_tangle(name, location, rotation_z, parent, col, height=DESK_HEIGHT):
    """The nest under the desk: a power strip with three plugs in it, cables looping and coiling over the floor
    and climbing to desk height at the back (+y), a spare coil, and one plug lying unplugged. Origin on the floor at
    the strip."""
    root = _root(name, location, rotation_z, parent, col)
    bm = bmesh.new()
    _slab(bm, 0.32, 0.06, 0.0, 0.04, r=0.01, segs=2, top=0.004)
    for k in range(5):
        x = -0.12 + k * 0.06
        _strip(bm, _circle(0.016, 8, (x, 0)), _circle(0.012, 8, (x, 0)), 0.001, Matrix.Translation((0, 0, 0.04)), closed=True)
        if k in (0, 1, 3):
            _box(bm, (0.03, 0.035, 0.03), (x, 0, 0.055))
    _box(bm, (0.02, 0.03, 0.008), (0.145, 0, 0.044))
    _box(bm, (0.03, 0.035, 0.03), (-0.42, -0.2, 0.015), _m(rot=(0, 0, 0.7)))  # the one that came out
    _part(f"{name}__strip", bm, root, col)

    f = 0.004  # cables lie this high
    up = height - 0.02
    coil = []  # four flat turns of spare cable, each a touch smaller and lying on the last
    for k in range(25):
        r, a = 0.09 - 0.004 * k / 6, k * math.pi / 3
        coil.append((0.02 + r * math.cos(a), 0.26 + r * math.sin(a), f + 0.005 * k / 6))
    cables = (
        _spline([(-0.12, 0, 0.07), (-0.13, 0.05, f), (-0.2, 0.02, f), (-0.36, 0.06, f), (-0.38, 0.17, f), (-0.28, 0.2, f), (-0.24, 0.1, f),
                 (-0.32, 0.3, f), (-0.34, 0.4, 0.08), (-0.34, 0.42, up)]),
        _spline([(-0.06, 0, 0.07), (-0.06, 0.06, f), (0.0, 0.14, f), (0.11, 0.26, f)]) + coil[1:]
        + _spline([coil[-1], (0.05, 0.4, 0.05), (0.05, 0.42, up)])[1:],
        _spline([(0.06, 0, 0.07), (0.07, 0.06, f), (0.18, 0.1, f), (0.1, 0.22, f), (0.2, 0.33, f), (0.3, 0.3, f), (0.33, 0.4, 0.08),
                 (0.33, 0.42, up)]),
        _spline([(-0.17, 0, 0.02), (-0.3, -0.05, f), (-0.45, 0.0, f), (-0.55, -0.12, f), (-0.75, -0.08, f)]),
        _spline([(-0.42, -0.2, 0.015), (-0.3, -0.18, f), (-0.2, -0.28, f), (0.0, -0.2, f), (0.15, -0.25, f), (0.2, -0.1, f), (0.2, 0.42, 0.1),
                 (0.2, 0.42, up)], 3),
    )
    bm = bmesh.new()
    for path in cables:
        _tube(bm, path, 0.0035, 4)
    _part(f"{name}__cables", bm, root, col)
    return root


NOTE = 0.076  # sticky note, square


def _note(bm, m, curl=24, flat=0.05):
    """A sticky note on an upright surface, origin at its top centre, face to -y. Below `flat` m from the top its
    free end curls off the surface by `curl` degrees."""
    c, low, y = math.radians(curl), NOTE - flat, -0.0003
    tip_y, tip_z = y - low * math.sin(c), -flat - low * math.cos(c)
    _poly(bm, [(-NOTE / 2, y, 0), (-NOTE / 2, y, -flat), (NOTE / 2, y, -flat), (NOTE / 2, y, 0)], m)
    _poly(bm, [(-NOTE / 2, y, -flat), (-NOTE / 2, tip_y, tip_z), (NOTE / 2, tip_y, tip_z), (NOTE / 2, y, -flat)], m)


def _note_text(name, text, parent, col, m):
    """Tiny handwriting on a note made by _note(m): centred on its flat part, shrunk if a line is too wide."""
    obj = common.text_mesh(name, text, 0.0085, 0.0005, (0, 0, 0), parent, col)
    xs = [v.co.x for v in obj.data.vertices]
    fit = min(1.0, (NOTE - 0.012) / (max(xs) - min(xs)))
    obj.data.transform(Matrix.Scale(fit, 4))
    obj.matrix_basis = m @ Matrix.Translation((0, -0.0004, -0.027))
    return obj


def build_sticky_note(name, location, rotation_z, parent, col, text=None, flat=False, curl=24):
    """One sticky note with optional text (two or three short lines, \\n between; shrunk to fit). Upright for a wall
    or a bezel by default: origin at its top centre on the surface, face to -y. flat=True lays it on a desk with its
    sticky edge to the back (+y) and its free end curling up."""
    root = _root(name, location, rotation_z, parent, col)
    m = Matrix.Rotation(-math.pi / 2, 4, "X") if flat else I4
    bm = bmesh.new()
    _note(bm, m, curl)
    _part(f"{name}__note", bm, root, col)
    if text:
        _note_text(f"{name}__text", text, root, col, m)
    return root


def build_monitor_notes(name, location, rotation_z, parent, col, texts=(), width=0.62, height=0.36, count=12):
    """Sticky notes round a monitor's bezel, some hanging over the screen. Give it the same location, rotation and
    size as the build_monitor it decorates. `count` (up to 12) takes spots in a fixed order: two along the top and
    one down each side first. Six or fewer come out 1.3 times bigger, so they still read from across the room. Mostly
    blank; `texts` go on the first notes placed (<name>__text_00...)."""
    root = _root(name, location, rotation_z, parent, col)
    pose, hw, hh = _monitor_pose(height), width / 2, height / 2
    spots = ((-0.25, hh - 0.004, -6), (-0.13, hh - 0.002, 4), (0.05, hh - 0.004, -3), (0.17, hh - 0.003, 7), (0.27, hh - 0.005, -2),
             (-hw + 0.035, 0.09, 5), (-hw + 0.03, -0.01, -8), (-hw + 0.035, -0.1, 3), (hw - 0.035, 0.05, -5), (hw - 0.03, -0.06, 6),
             (-0.18, -hh + 0.012, 3), (0.12, -hh + 0.012, -4))
    order = (0, 3, 6, 9, 1, 4, 8, 7, 2, 5, 10, 11)
    grow = Matrix.Scale(1.3 if count <= 6 else 1.0, 4)
    bm = bmesh.new()
    for i, (x, z, deg) in enumerate(spots[k] for k in order[:count]):
        m = pose @ Matrix.Translation((x, 0, z)) @ Matrix.Rotation(math.radians(deg), 4, "Y") @ grow
        _note(bm, m, curl=18 + 9 * (i % 3))
        if i < len(texts) and texts[i]:
            _note_text(f"{name}__text_{i:02d}", texts[i], root, col, m)
    _part(f"{name}__notes", bm, root, col)
    return root


def _text_at(name, text, size, depth, x, y, top, parent, col, align="LEFT"):
    """text_mesh with the top of its first line at z = top."""
    obj = common.text_mesh(name, text, size, depth, (x, y, 0), parent, col, align)
    obj.location.z = top - max(v.co.z for v in obj.data.vertices)
    return obj


def build_whiteboard(name, location, rotation_z, parent, col, text="", note="", width=0.6, height=0.45):
    """A small whiteboard: aluminium frame, marker tray with two markers and an eraser, `text` written large (lines
    split on \\n) and underlined, `note` smaller underneath. Origin on the wall plane at its centre."""
    root = _root(name, location, rotation_z, parent, col)

    def rect(rw, rh):
        return [(-rw / 2, -rh / 2), (rw / 2, -rh / 2), (rw / 2, rh / 2), (-rw / 2, rh / 2)]

    face = -0.008
    bm = bmesh.new()
    _strip(bm, rect(width, height), rect(width - 0.03, height - 0.03), 0.02, WALL, closed=True)
    _poly(bm, [(x, face, z) for x, z in rect(width - 0.03, height - 0.03)])
    tray, base = [(0, 0), (-0.05, 0), (-0.05, 0.018), (-0.044, 0.018), (-0.044, 0.005), (0, 0.005)], -height / 2 - 0.006
    _prism(bm, tray, width * 0.7, Matrix.Translation((-width * 0.35, 0, base)) @ YZ)
    for x0 in (-width * 0.28, -width * 0.06):
        _tube(bm, [(x0, -0.026, base + 0.013), (x0 + 0.1, -0.026, base + 0.013)], 0.008, 6, hint=(0, 0, 1))
        _tube(bm, [(x0 + 0.1, -0.026, base + 0.013), (x0 + 0.13, -0.026, base + 0.013)], 0.0095, 6, hint=(0, 0, 1))
    _box(bm, (0.1, 0.04, 0.028), (width * 0.2, -0.025, base + 0.019))
    left, top = -width / 2 + 0.05, height / 2 - 0.05
    if text:
        big = _text_at(f"{name}__text", text, 0.055, 0.0012, left, face, top, root, col)
        xs, zs = [v.co.x for v in big.data.vertices], [v.co.z + big.location.z for v in big.data.vertices]
        under = min(zs) - 0.014
        wave = [(left + (max(xs) + 0.01) * k / 8, under + 0.004 * math.sin(k * 1.9)) for k in range(9)]
        _stroke(bm, wave, 0.004, 0.0012, Matrix.Translation((0, face, 0)) @ WALL)
        top = under - 0.03
    if note:
        _text_at(f"{name}__note", note, 0.04, 0.0012, left + 0.03, face, top, root, col)
    _part(f"{name}__board", bm, root, col)
    return root


# --- posters ----------------------------------------------------------------------------------------------------

POSTER = (0.5, 0.7)
PAPER = 0.006  # the print sits this far out from the wall, inside the frame


def _poster_frame(name, root, col, size=POSTER, border=0.025, depth=0.022):
    """A picture frame with a stepped inner lip round the print. The print's face is at y = -PAPER."""
    w, h = size

    def rect(rw, rh):
        return [(-rw / 2, -rh / 2), (rw / 2, -rh / 2), (rw / 2, rh / 2), (-rw / 2, rh / 2)]

    bm = bmesh.new()
    _strip(bm, rect(w, h), rect(w - 2 * border, h - 2 * border), depth, WALL, closed=True)
    _strip(bm, rect(w - 2 * border, h - 2 * border), rect(w - 2 * border - 0.016, h - 2 * border - 0.016), 0.011, WALL, closed=True)
    _poly(bm, [(x, -PAPER, z) for x, z in rect(w - 2 * border, h - 2 * border)])
    _part(f"{name}__frame", bm, root, col)


def _art(bm, strokes=(), loops=(), fills=(), width=0.007, depth=0.003):
    """Line art on a poster's print: open strokes, closed loops and filled shapes, all raised `depth` off the paper."""
    m = Matrix.Translation((0, -PAPER, 0)) @ WALL
    for pts, wd in strokes:
        _stroke(bm, pts, wd or width, depth, m)
    for pts, wd in loops:
        _stroke(bm, pts, wd or width, depth, m, closed=True)
    for pts in fills:
        _prism(bm, pts, depth, m)


def _ellipse(c, rx, ry, a0, a1, n):
    return [(c[0] + rx * math.cos(math.radians(a0 + (a1 - a0) * k / n)), c[1] + ry * math.sin(math.radians(a0 + (a1 - a0) * k / n)))
            for k in range(n + 1)]


def build_poster_hang_in_there(name, location, rotation_z, parent, col):
    """The classic: a kitten hanging off a branch by its front paws, HANG IN THERE underneath. Line art as raised
    strokes on the print, in a frame. Origin on the wall plane at the poster's centre; 0.5 x 0.7 m."""
    root = _root(name, location, rotation_z, parent, col)
    _poster_frame(name, root, col)

    head_c, hx, hy = (0.0, 0.065), 0.068, 0.058

    def head(deg):
        return (head_c[0] + hx * math.cos(math.radians(deg)), head_c[1] + hy * math.sin(math.radians(deg)))

    head_loop = ([head(140), (-0.062, 0.152), head(108)] + [head(d) for d in (98, 90, 82)] + [head(72), (0.062, 0.152), head(40)]
                 + [head(d) for d in range(15, -180, -25)] + [head(-185), head(-200)])
    paw = {s: _ellipse((s * 0.1, 0.226 + 0.006 * (s > 0)), 0.027, 0.018, 0, 330, 11) for s in (-1, 1)}
    body = ([(-0.062, 0.022), (-0.08, -0.02), (-0.088, -0.07), (-0.084, -0.11), (-0.078, -0.15), (-0.08, -0.19), (-0.074, -0.212),
             (-0.058, -0.218), (-0.042, -0.21), (-0.04, -0.18), (-0.04, -0.152), (-0.02, -0.158), (0.0, -0.16)])
    body += [(-x, y) for x, y in reversed(body[:-1])]

    def arm(s, top):
        """A front leg hanging from its paw, a U open at the top, clear of the head and the body."""
        elbow = [(s * (0.1 + 0.021 * math.cos(math.radians(a))), 0.105 - 0.021 * math.sin(math.radians(a))) for a in (0, 45, 90, 135, 180)]
        return [(s * 0.121, top), (s * 0.122, 0.15)] + elbow + [(s * 0.078, 0.15), (s * 0.079, top)]
    strokes = [
        ([(-0.215, 0.204), (-0.17, 0.21), (-0.127, 0.215)], 0.012),  # branch, broken where the paws grip it
        ([(-0.073, 0.22), (0.0, 0.226), (0.073, 0.231)], 0.012),
        ([(0.127, 0.236), (0.17, 0.242), (0.215, 0.252)], 0.012),
        ([(0.16, 0.243), (0.18, 0.27), (0.19, 0.295)], 0.006),  # twig
        (arm(-1, 0.2147), 0),  # front legs, meeting the paws' outlines
        (arm(1, 0.2207), 0),
        (body, 0),
        ([(0.082, -0.118), (0.125, -0.135), (0.162, -0.118), (0.182, -0.08), (0.176, -0.045), (0.158, -0.035)], 0.012),  # tail
        ([(0.0, 0.045), (0.0, 0.037), (-0.009, 0.031), (-0.018, 0.036)], 0.004),  # mouth
        ([(0.0, 0.037), (0.009, 0.031), (0.018, 0.036)], 0.004),
    ]
    for s in (-1, 1):
        strokes += [([(s * 0.032, 0.048), (s * 0.09, 0.06)], 0.0035), ([(s * 0.034, 0.042), (s * 0.094, 0.042)], 0.0035),
                    ([(s * 0.032, 0.036), (s * 0.088, 0.024)], 0.0035)]  # whiskers
        strokes += [([(s * 0.094, 0.232), (s * 0.094, 0.244)], 0.004), ([(s * 0.106, 0.232), (s * 0.106, 0.244)], 0.004)]  # toes
    loops = [(head_loop, 0), (paw[-1], 0), (paw[1], 0), (_ellipse((0.027, 0.077), 0.017, 0.019, 0, 345, 13)[:-1], 0.005),
             (_ellipse((-0.027, 0.077), 0.017, 0.019, 0, 345, 13)[:-1], 0.005),
             ([(0.19, 0.295), (0.205, 0.304), (0.215, 0.32), (0.214, 0.335), (0.2, 0.322), (0.191, 0.308)], 0.004)]  # eyes, a leaf
    fills = [_ellipse((0.024, 0.071), 0.008, 0.01, 0, 330, 11), _ellipse((-0.024, 0.071), 0.008, 0.01, 0, 330, 11),
             [(-0.009, 0.055), (0.009, 0.055), (0.0, 0.045)]]  # pupils, nose
    bm = bmesh.new()
    _art(bm, strokes, loops, fills)
    _part(f"{name}__art", bm, root, col)
    common.text_mesh(f"{name}__text", "HANG IN THERE", 0.05, 0.003, (0, -PAPER, -0.275), root, col)
    return root


def build_poster_victory(name, location, rotation_z, parent, col):
    """Melbourne Victory, crest-free: no badge or logo, just a big V chevron with a pinstripe chevron under it and
    MELBOURNE VICTORY. Everything renders as white lines, so the shapes carry the club, not its colours. Origin on
    the wall plane at the poster's centre; 0.5 x 0.7 m."""
    root = _root(name, location, rotation_z, parent, col)
    _poster_frame(name, root, col)
    top, apex, arm, inner = 0.285, -0.055, 0.17, 0.09
    v = [(-arm, top), (0.0, apex), (arm, top), (inner, top), (0.0, top - inner * (top - apex) / arm), (-inner, top)]
    _, outside = _offset([(-arm, top), (0.0, apex), (arm, top)], 0.08)  # a pinstripe chevron 4 cm outside the V
    a, b, c = (Vector(p) for p in outside)
    stripe = [tuple(a.lerp(b, 0.15)), tuple(b), tuple(c.lerp(b, 0.15))]
    bm = bmesh.new()
    _art(bm, strokes=[(stripe, 0.012)], fills=[v])
    _part(f"{name}__art", bm, root, col)
    common.text_mesh(f"{name}__text_top", "MELBOURNE", 0.06, 0.003, (0, -PAPER, -0.205), root, col)
    common.text_mesh(f"{name}__text", "VICTORY", 0.085, 0.003, (0, -PAPER, -0.275), root, col)
    return root


# --- preview ----------------------------------------------------------------------------------------------------


def build_all_preview(col):
    """Every prop in a row along +x for a look-over, the row wrapping every `row_length` m into further rows behind
    (+y). Desk-top props sit on the floor like the rest; wall props hang at 1.2 m. Preview text is the current
    draft copy. Returns {name: root}."""
    wall, row_length, row_gap = 1.2, 9.0, 2.6
    lineup = (  # (name, builder, slot width m, z, extra args)
        ("prop_chair", build_chair, 0.75, 0, {}), ("prop_desk", build_desk, 1.6, 0, {}), ("hs_drawer", build_pedestal, 0.6, 0, {}),
        ("hs_monitor", build_monitor, 0.75, 0, {}), ("prop_monitor_notes", build_monitor_notes, 0.75, 0, {"texts": ("fix the fix",)}),
        ("prop_laptop", build_laptop, 0.45, 0, {}), ("prop_keyboard", build_keyboard, 0.45, 0, {}), ("prop_mouse", build_mouse, 0.2, 0, {}),
        ("prop_desk_mess", build_desk_mess, 1.5, 0, {}), ("prop_desk_lamp", build_desk_lamp, 0.45, 0, {}),
        ("hs_crate", build_crate, 0.55, 0, {}), ("hs_shelf", build_shelf, 1.15, wall, {}), ("prop_turntable", build_turntable, 1.4, 0, {}),
        ("prop_now_playing", build_now_playing, 0.4, 0, {}),
        ("prop_couch", build_couch, 1.85, 0, {}), ("prop_old_tv", build_old_tv, 0.9, 0, {}),
        ("prop_monstera", build_monstera, 1.1, 0, {}), ("prop_snake_plant", build_snake_plant, 0.35, 0, {}),
        ("prop_plant_wilted", build_plant_wilted, 0.35, 0, {}), ("prop_book_row", build_book_row, 0.45, 0, {}),
        ("prop_book_stack", build_book_stack, 0.4, 0, {}), ("prop_bin", build_bin, 0.6, 0, {}),
        ("prop_cable_tangle", build_cable_tangle, 1.0, 0, {}),
        ("prop_can_pyramid", build_can_pyramid, 0.4, 0, {}), ("prop_can", build_energy_can, 0.15, 0, {}),
        ("prop_can_crushed", build_energy_can, 0.2, 0, {"crushed": True}),
        ("prop_mug", build_mug, 0.2, 0, {"text": "works on\nmy machine"}), ("prop_mug_cluster", build_mug_cluster, 0.5, 0, {}),
        ("prop_noodles", build_noodle_cup, 0.2, 0, {}), ("prop_pizza", build_pizza_box, 0.45, 0, {}),
        ("prop_pillow", build_pillow, 0.55, 0, {}), ("prop_blanket", build_blanket, 1.0, 0, {"drape": 0}),
        ("prop_duck", build_rubber_duck, 0.2, 0, {}),
        ("prop_sticky_note", build_sticky_note, 0.15, 0, {"text": "it works.\ndon't touch it.", "flat": True}),
        ("prop_wall_clock", build_wall_clock, 0.4, wall, {}),
        ("prop_whiteboard", build_whiteboard, 0.7, wall, {"text": "TODO: sleep", "note": "(next sprint)"}),
        ("prop_poster_hang", build_poster_hang_in_there, 0.65, wall, {}), ("prop_poster_victory", build_poster_victory, 0.65, wall, {}),
    )
    roots, x, y = {}, 0.0, 0.0
    for name, build, width, z, extra in lineup:
        if x + width > row_length:
            x, y = 0.0, y + row_gap
        roots[name] = build(name, (x + width / 2, y, z), 0.0, None, col, **extra)
        x += width + 0.1
    return roots

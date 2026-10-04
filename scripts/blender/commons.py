"""The Commons, 10-20 Gwynne St: the building the walk-in comes down to, modelled on its three OSM footprints.

From photo reference (Street View, Dec 2025; Google Maps photos, 2021): three floors and a rooftop deck. The Gwynne St
frontage is a screen of perforated corten panels in vertical strips, set at slightly different depths so it reads
woven, with a few panels pivoted open over the windows behind. A 5 m glazed lobby runs north from a concrete blade at
the south end, under a band the screen starts from; past it the corten comes down to the footpath. Shape only: no
lettering or street numbers.

The site draws every edge where two faces meet at more than ~20 degrees, so the detail is real geometry: panel
outlines, the rib pressed into each panel, mullions, reveals. Openings are real holes through the front wall with
jambs as deep as the wall. The lobby entrance by the south blade is always one, left without a door leaf for the
walk-in's animated door; `entrance()` gives its position so nothing else has to repeat it. Other openings (the office
window) are passed in by the caller. Behind the entrance the lobby is a clear volume, floor and ceiling only, for the
office model's lobby interior and corridor; `lobby()` gives its extents. Re-runnable: a rebuild replaces the old
object and its mesh, so names stay clean and nothing is orphaned.
"""
import math

import bmesh
import bpy
from mathutils import Matrix, Vector

# Metres. u runs along the frontage from its south end, y out from the front wall towards Gwynne St, z up.
ROOF = 13.6  # three floors: a 5 m lobby, then two of 4.3 m
FLOORS = (5.0, 9.3)  # levels 1 and 2; level 1's slab is the lobby's ceiling
PARAPET = 0.9  # the side and back walls carry on this far past the roof
REVEAL = 0.3  # the front wall's thickness: an opening's jambs are this deep
SLAB = 0.3  # floor and ceiling slab thickness in the lobby
LOBBY = {
    "length": 20.0,  # the glazing runs this far north of the south end; past it the corten comes down to the footpath
    "depth": 10.0,  # the clear volume behind the glazing, front wall to back
    "mullion": (1.6, 0.1, 0.12),  # spacing, width, and depth proud of the glass
    "transom": 3.0,
    "band": (4.8, 5.2, 0.55),  # the band over the lobby that the screen starts from: bottom, top, depth proud
}
# The lobby's glass door, by the south blade: its gap from the blade, width, height, and the jamb it hangs on, as seen
# walking in (left is the blade's side).
ENTRANCE = {"gap": 0.5, "width": 1.2, "height": 2.7, "hinge_side": "left"}
BLADES = ((0.6, 0.9, ROOF + 2.0), (0.4, 0.6, ROOF + 1.4))  # concrete at the south and north ends: width, depth proud, height
SCREEN = {
    "proud": 0.3,  # off the wall, on brackets
    "top": ROOF + 1.2,  # it carries on past the roof as the deck's front parapet
    "column": 1.2,  # panel width
    "panel": 2.4,  # panel height; each column's joints start a third of this higher than the last one's
    "steps": (0.0, 0.09, 0.18),  # panels stand at one of these depths, so the screen looks woven
    "thickness": 0.05,
    "rib": 0.05,  # each panel's middle third is pressed back this much: the vertical rib in the photos
    "gap": 0.02,  # between neighbouring panels
}
# Panels pivoted open over windows: (column from the south end, floor index, angle). A positive angle hangs the panel
# on its south edge, a negative one on its north edge; both swing out towards the street.
PIVOTS = ((2, 1, 55.0), (3, 0, -40.0), (6, 1, 60.0), (7, 0, -35.0), (10, 1, 50.0), (13, 0, -45.0))
WINDOW = (0.9, 2.7)  # the window behind a pivoted panel: sill above its floor, and height
# The roof, as fractions of the frontage (u) and metres back from the front wall (y): a deck behind the screen with a
# balustrade on its other three sides and a few picnic tables, the lift and stair core, and a row of condensers.
DECK = {"u": (0.3, 0.85), "depth": (0.8, 12.5), "rail": 1.1, "post": 1.5, "tables": 3}
CORE = {"u": 0.55, "y": 17.0, "size": (6.0, 4.5, 3.6)}
CONDENSERS = {"u": (0.22, 0.42), "y": 21.0, "size": (1.0, 0.8, 1.2), "count": 6}
# The screen's panels and the deck's railing are child objects whose lines fade with distance (the renderer's
# edge_fade_* props): from the opening shot their edges sit closer than a line is wide and would fill the facade solid.
# The massing stays on the parent at full strength, so the building still reads as a clean volume from afar.
FADE = {"edge_fade_near": 60.0, "edge_fade_far": 220.0, "edge_fade_min": 0.12}


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


def _outline(obj):
    """The footprints' combined outline in world XY, counter-clockwise, and the ground height. Walls the footprints
    share appear twice among their bottom edges and cancel out."""
    me = obj.data
    world = [obj.matrix_world @ v.co for v in me.vertices]
    ground = min(p.z for p in world)
    key = lambda p: (round(p.x, 2), round(p.y, 2))  # noqa: E731
    count, at = {}, {}
    for e in me.edges:
        a, b = (world[i] for i in e.vertices)
        if abs(a.z - ground) < 1e-3 and abs(b.z - ground) < 1e-3:
            k = frozenset((key(a), key(b)))
            count[k] = count.get(k, 0) + 1
            at[key(a)], at[key(b)] = a, b
    links = {}
    for k, n in count.items():
        if n == 1 and len(k) == 2:
            a, b = tuple(k)
            links.setdefault(a, []).append(b)
            links.setdefault(b, []).append(a)
    loop = [next(iter(links))]
    seen = set(loop)
    while nxt := [k for k in links[loop[-1]] if k not in seen]:
        loop.append(nxt[0])
        seen.add(nxt[0])
    ring = [Vector((at[k].x, at[k].y, 0)) for k in loop]
    area = sum(ring[i - 1].x * ring[i].y - ring[i].x * ring[i - 1].y for i in range(len(ring)))
    return (ring if area > 0 else ring[::-1]), ground


def _frontage(ring):
    """The Gwynne St frontage: the outline's longest straight run of edges, as (start, along, out, length, indices).
    The outline runs counter-clockwise, so the run starts at its south end and `out` faces the street."""
    n = len(ring)
    edges = [ring[(i + 1) % n] - ring[i] for i in range(n)]
    keeps_on = [edges[i - 1].normalized().dot(edges[i].normalized()) > math.cos(math.radians(1.0)) for i in range(n)]
    best = (0.0, [0])
    for start in [i for i in range(n) if not keeps_on[i]] or [0]:
        run = [start]
        while keeps_on[(run[-1] + 1) % n] and len(run) < n:
            run.append((run[-1] + 1) % n)
        best = max(best, (sum(edges[i].length for i in run), run))
    length, run = best
    a = ring[run[0]]
    along = (ring[(run[-1] + 1) % n] - a).normalized()
    return a, along, Vector((along.y, -along.x, 0)), length, run


def _layout(footprint):
    """Where everything goes along the frontage, shared by the builder and the functions that report positions."""
    ring, ground = _outline(footprint)
    start, along, out, length, run = _frontage(ring)
    blade_s, blade_n = BLADES[0][0], length - BLADES[1][0]
    cols = max(1, round((blade_n - blade_s) / SCREEN["column"]))
    width = (blade_n - blade_s) / cols
    door = blade_s + ENTRANCE["gap"] + ENTRANCE["width"] / 2
    return {
        "ring": ring, "ground": ground, "start": start, "along": along, "out": out, "length": length, "run": run,
        "blades": (blade_s, blade_n), "cols": cols, "width": width,
        "lobby_end": blade_s + round((LOBBY["length"] - blade_s) / width) * width,  # on a screen column line
        "door": (door - ENTRANCE["width"] / 2, door + ENTRANCE["width"] / 2, 0.0, ENTRANCE["height"]),
    }


def _world(lay, u, y, z):
    """Facade frame (u, y, z) -> Blender world space."""
    return lay["start"] + lay["along"] * u + lay["out"] * y + Vector((0, 0, lay["ground"] + z))


def entrance(footprint):
    """The lobby door's opening, in the same world-space convention as `openings`: `centre` (bottom-centre on the
    front wall's plane), `normal` (outward), `width`, `height`, and `hinge_side` ("left" or "right", walking in)."""
    lay = _layout(footprint)
    u0, u1, z0, z1 = lay["door"]
    return {"centre": _world(lay, (u0 + u1) / 2, 0.0, z0), "normal": lay["out"].copy(), "width": u1 - u0,
            "height": z1 - z0, "hinge_side": ENTRANCE["hinge_side"]}


def lobby(footprint):
    """The lobby's clear interior: `corners` (world XY at floor level, counter-clockwise from inside the front wall
    at the south blade), `floor` and `ceiling` heights. Nothing of the building stands inside it."""
    lay = _layout(footprint)
    (blade_s, _), end, depth = lay["blades"], lay["lobby_end"], LOBBY["depth"]
    corners = [_world(lay, u, y, 0.0) for u, y in ((blade_s, -REVEAL), (end, -REVEAL), (end, -depth), (blade_s, -depth))]
    return {"corners": corners, "floor": lay["ground"], "ceiling": lay["ground"] + FLOORS[0]}


def commons(footprint, col, openings=()):
    """prop_commons on the footprints of osm_commons, origin at their centre on the ground, with the lobby entrance cut
    in, and children prop_commons__screen (the corten panels) and prop_commons__deck (the roof deck's railing and
    tables), whose lines fade with distance. `openings` are further holes through the front wall, each a dict in world space: `centre` (bottom-centre of the
    opening on the front wall's plane), `normal` (outward), `width`, `height`."""
    _remove("prop_commons")
    lay = _layout(footprint)
    ring, ground, south, along, out, length, run = (lay[k] for k in ("ring", "ground", "start", "along", "out", "length", "run"))
    centre = sum(ring, Vector()) / len(ring)
    origin = Vector((centre.x, centre.y, ground))
    # facade frame (u, y, z) -> the object's local space
    frame = Matrix.Translation((south.x - origin.x, south.y - origin.y, 0.0))
    frame = frame @ Matrix(((along.x, out.x, 0, 0), (along.y, out.y, 0, 0), (0, 0, 1, 0), (0, 0, 0, 1)))
    to_frame = frame.inverted()
    holes = [lay["door"]]
    for o in openings:
        p = to_frame @ (Vector(o["centre"]) - origin)
        holes.append((p.x - o["width"] / 2, p.x + o["width"] / 2, p.z, p.z + o["height"]))

    bm, screen, railing = bmesh.new(), bmesh.new(), bmesh.new()  # the massing, and the two children

    def vert(u, y, z):
        return bm.verts.new(frame @ Vector((u, y, z)))

    def block(lo, hi, turn=None, into=None):
        """A box from lo to hi (u, y, z) in the facade frame, optionally through a matrix first."""
        into = into or bm
        verts = bmesh.ops.create_cube(into, size=1.0)["verts"]
        size, mid = Vector(hi) - Vector(lo), (Vector(lo) + Vector(hi)) / 2
        bmesh.ops.scale(into, vec=size, verts=verts)
        bmesh.ops.transform(into, matrix=frame @ (turn or Matrix()) @ Matrix.Translation(mid), verts=verts)

    def clear(u0, u1, z0, z1, pad=0.0):
        """Whether the box [u0, u1] x [z0, z1] keeps clear of every opening."""
        return all(u1 <= h[0] - pad or u0 >= h[1] + pad or z1 <= h[2] - pad or z0 >= h[3] + pad for h in holes)

    # the shell: side and back walls up to the parapet, and the roof
    n = len(ring)
    back = [i for i in range(n) if i not in run]
    local = [Vector((p.x - origin.x, p.y - origin.y, 0.0)) for p in ring]
    for i in back:
        a, b = local[i], local[(i + 1) % n]
        lo = [bm.verts.new((p.x, p.y, 0)) for p in (a, b)]
        hi = [bm.verts.new((p.x, p.y, ROOF + PARAPET)) for p in (a, b)]
        bm.faces.new((lo[0], lo[1], hi[1], hi[0]))
    bm.faces.new([bm.verts.new((p.x, p.y, ROOF)) for p in local])

    # the front wall, a grid around the openings, with jambs as deep as the wall
    blade_s, blade_n = lay["blades"]
    us = sorted({blade_s, blade_n, *(min(max(u, blade_s), blade_n) for h in holes for u in h[:2])})
    zs = sorted({0.0, ROOF, *(min(max(z, 0.0), ROOF) for h in holes for z in h[2:])})
    grid = {(i, j): vert(u, 0.0, z) for i, u in enumerate(us) for j, z in enumerate(zs)}
    for i in range(len(us) - 1):
        for j in range(len(zs) - 1):
            if clear(us[i] + 1e-3, us[i + 1] - 1e-3, zs[j] + 1e-3, zs[j + 1] - 1e-3):
                bm.faces.new((grid[i, j], grid[i, j + 1], grid[i + 1, j + 1], grid[i + 1, j]))  # facing the street
    for u0, u1, z0, z1 in holes:
        rim = [(u0, z0), (u1, z0), (u1, z1), (u0, z1)]
        face = [grid[us.index(u), zs.index(z)] for u, z in rim]
        deep = [vert(u, -REVEAL, z) for u, z in rim]
        for k in range(4):
            if k == 0 and z0 < 0.01:
                continue  # no threshold at the ground: the floor inside runs through
            bm.faces.new((face[k], deep[k], deep[(k + 1) % 4], face[(k + 1) % 4]))

    # the concrete blades at either end of the frontage, standing proud of the screen
    (w_s, d_s, h_s), (w_n, d_n, h_n) = BLADES
    block((0.0, -0.4, 0.0), (w_s, d_s, h_s))
    block((length - w_n, -0.4, 0.0), (length, d_n, h_n))

    # the glazed lobby: mullions and a transom on the glass, the band above; inside, only its floor and ceiling
    lobby_end = lay["lobby_end"]
    band_lo, band_hi, band_d = LOBBY["band"]
    spacing, m_w, m_d = LOBBY["mullion"]
    for k in range(1, round((lobby_end - blade_s) / spacing)):
        u = blade_s + k * (lobby_end - blade_s) / round((lobby_end - blade_s) / spacing)
        if clear(u - m_w, u + m_w, 0.0, band_lo, pad=0.05):
            block((u - m_w / 2, 0.0, 0.0), (u + m_w / 2, m_d, band_lo))
    t_lo, t_hi = LOBBY["transom"] - m_w / 2, LOBBY["transom"] + m_w / 2
    crossing = [h for h in holes if h[2] < t_hi and h[3] > t_lo and h[0] < lobby_end and h[1] > blade_s]
    cuts = sorted([blade_s, lobby_end, *(min(max(u, blade_s), lobby_end) for h in crossing for u in h[:2])])
    for u0, u1 in zip(cuts[::2], cuts[1::2]):
        if u1 - u0 > 0.05:
            block((u0, 0.0, t_lo), (u1, m_d, t_hi))
    block((blade_s, 0.0, band_lo), (lobby_end, band_d, band_hi))
    block((blade_s, -LOBBY["depth"], -SLAB), (lobby_end, 0.0, 0.0))  # floor, its top on the ground
    block((blade_s, -LOBBY["depth"], FLOORS[0]), (lobby_end, -REVEAL, FLOORS[0] + SLAB))  # ceiling: level 1's slab

    # screen columns, south to north
    s = SCREEN
    width = lay["width"]

    def panel(u0, u1, z0, z1, y0, turn=None):
        """A corten panel with its middle third pressed back, front face at y0 + thickness."""
        yf = y0 + s["thickness"]
        ua, ub = u0 + (u1 - u0) / 3, u1 - (u1 - u0) / 3
        outline = [(u0, y0), (u1, y0), (u1, yf), (ub, yf), (ub, yf - s["rib"]), (ua, yf - s["rib"]), (ua, yf), (u0, yf)]
        m = frame @ (turn or Matrix())
        rings = [[screen.verts.new(m @ Vector((u, y, z))) for u, y in outline] for z in (z0, z1)]
        screen.faces.new(rings[0][::-1])
        screen.faces.new(rings[1])
        for k in range(len(outline)):
            screen.faces.new((rings[0][k], rings[0][(k + 1) % len(outline)], rings[1][(k + 1) % len(outline)], rings[1][k]))

    pivots = {(c, f): angle for c, f, angle in PIVOTS}
    window_lo, window_h = WINDOW
    for c in range(lay["cols"]):
        u0, u1 = blade_s + c * width + s["gap"] / 2, blade_s + (c + 1) * width - s["gap"] / 2
        start = band_hi if u1 <= lobby_end + 1e-6 else 0.0
        # joints, staggered column to column, plus the pivoted panels' edges and any opening's sill and head
        lift = (c % 3) * s["panel"] / 3
        breaks = {start, s["top"], *(z for z in (start + lift + k * s["panel"] for k in range(12)) if start < z < s["top"])}
        doors = {}
        for f, floor in enumerate(FLOORS):
            if (c, f) in pivots:
                lo, hi = floor + window_lo - 0.3, floor + window_lo + window_h + 0.3
                breaks = {z for z in breaks if not lo - 0.4 < z < hi + 0.4} | {start, s["top"], lo, hi}
                doors[lo] = (pivots[c, f], floor)
        for h in holes:
            if h[0] < u1 and h[1] > u0:
                breaks |= {min(max(z, start), s["top"]) for z in h[2:]}
        zs = sorted(breaks)
        for z0, z1 in zip(zs, zs[1:]):
            if z1 - z0 < 0.3 or not clear(u0, u1, z0 + 1e-3, z1 - 1e-3, pad=0.0):
                continue
            step = s["steps"][(c * 2 + round(z0 / s["panel"] * 3)) % len(s["steps"])]
            y0 = s["proud"] + step
            if z0 in doors:
                angle, floor = doors[z0]
                hinge = Vector((u0 if angle > 0 else u1, y0, 0))
                turn = Matrix.Translation(hinge) @ Matrix.Rotation(math.radians(angle), 4, "Z") @ Matrix.Translation(-hinge)
                panel(u0, u1, z0 + s["gap"], z1 - s["gap"], y0, turn)
                # the window it opens onto: a frame and a mullion proud of the wall
                w0, w1, wz0, wz1 = u0 + 0.08, u1 - 0.08, floor + window_lo, floor + window_lo + window_h
                for lo, hi in (((w0, 0.0, wz0), (w1, 0.1, wz0 + 0.08)), ((w0, 0.0, wz1 - 0.08), (w1, 0.1, wz1)),
                               ((w0, 0.0, wz0), (w0 + 0.08, 0.1, wz1)), ((w1 - 0.08, 0.0, wz0), (w1, 0.1, wz1)),
                               (((w0 + w1) / 2 - 0.03, 0.0, wz0), ((w0 + w1) / 2 + 0.03, 0.08, wz1))):
                    block(lo, hi, into=screen)
            else:
                panel(u0, u1, z0 + s["gap"] / 2, z1 - s["gap"] / 2, y0)

    # the roof: a deck behind the screen, railed on its other three sides, with picnic tables; the core; condensers
    deck = DECK
    du0, du1 = deck["u"][0] * length, deck["u"][1] * length
    dy0, dy1 = -deck["depth"][1], -deck["depth"][0]
    block((du0, dy0, ROOF), (du1, dy1, ROOF + 0.15))  # the decking
    top = ROOF + 0.15 + deck["rail"]
    for a, b in (((du0, dy1), (du0, dy0)), ((du0, dy0), (du1, dy0)), ((du1, dy0), (du1, dy1))):
        a, b = Vector(a), Vector(b)
        posts = max(1, round((b - a).length / deck["post"]))
        for k in range(posts + 1):
            p = a.lerp(b, k / posts)
            block((p.x - 0.03, p.y - 0.03, ROOF + 0.15), (p.x + 0.03, p.y + 0.03, top), into=railing)
        lo, hi = Vector((min(a.x, b.x) - 0.03, min(a.y, b.y) - 0.03)), Vector((max(a.x, b.x) + 0.03, max(a.y, b.y) + 0.03))
        block((lo.x, lo.y, top - 0.06), (hi.x, hi.y, top), into=railing)
    for t in range(deck["tables"]):
        u = du0 + (t + 1) * (du1 - du0) / (deck["tables"] + 1)
        y = (dy0 + dy1) / 2
        z = ROOF + 0.15
        block((u - 1.0, y - 0.4, z + 0.7), (u + 1.0, y + 0.4, z + 0.76), into=railing)  # table top
        for side in (-1, 1):
            block((u - 1.0, y + side * 0.75 - 0.15, z + 0.42), (u + 1.0, y + side * 0.75 + 0.15, z + 0.47), into=railing)  # bench
    cu, cy, (cw, cd, ch) = CORE["u"] * length, -CORE["y"], CORE["size"]
    block((cu - cw / 2, cy - cd / 2, ROOF), (cu + cw / 2, cy + cd / 2, ROOF + ch))
    (c0, c1), (kw, kd, kh) = CONDENSERS["u"], CONDENSERS["size"]
    for k in range(CONDENSERS["count"]):
        u = (c0 + (c1 - c0) * (k + 0.5) / CONDENSERS["count"]) * length
        block((u - kw / 2, -CONDENSERS["y"] - kd / 2, ROOF), (u + kw / 2, -CONDENSERS["y"] + kd / 2, ROOF + kh))

    bm.normal_update()
    mesh = bpy.data.meshes.new("prop_commons")
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new("prop_commons", mesh)
    obj.location = origin
    door = entrance(footprint)  # also on the object, for anything reading the .blend
    obj["entrance_centre"] = tuple(door["centre"])
    obj["entrance_normal"] = tuple(door["normal"])
    obj["entrance_size"] = (door["width"], door["height"])
    obj["entrance_hinge_side"] = door["hinge_side"]
    col.objects.link(obj)
    for name, part in (("prop_commons__screen", screen), ("prop_commons__deck", railing)):
        part.normal_update()
        mesh = bpy.data.meshes.new(name)
        part.to_mesh(mesh)
        part.free()
        child = bpy.data.objects.new(name, mesh)
        child.parent = obj  # matrix_parent_inverse stays identity: it shares the parent's origin
        for key, value in FADE.items():
            child[key] = value
        col.objects.link(child)
    return obj

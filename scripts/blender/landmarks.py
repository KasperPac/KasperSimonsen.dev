"""AAMI Park and the MCG for the street collection: the opening shot's two landmarks, modelled on their OSM footprints.

Shape only: no names, logos or signage. Each builder reads its footprint's bottom outline in world space and builds
relative to it, so the stadiums follow wherever osm-import.py placed them. Re-runnable: a rebuild replaces the old
objects and their meshes, so names stay clean and nothing is orphaned.

The site draws a black fill plus every edge where two faces meet at more than ~20 degrees, so every line here is a
real crease. The one exception is AAMI Park's roof: a fine triangulation tagged `edge_threshold_deg`, so the renderer
draws every triangle and it reads as the steel bioframe.
"""
import math
import statistics

import bmesh
import bpy
import mathutils.geometry
from mathutils import Matrix, Vector

LATTICE_THRESHOLD_DEG = 1.0  # the renderer draws every edge on a mesh tagged with this
FIELD = 0.5  # the pitch and the arena are floored this far up, over the OSM roads and rails beneath them

# AAMI Park (metres). Its OSM outline traces the roof: a bubble per bay, scalloped between notches (the valleys).
AAMI_VALLEY_DEG = 40.0  # a notch in the outline this sharp is the valley between two roof bubbles
AAMI_STAND_DEPTH = 36.0  # valley line in to the pitch edge
AAMI_PITCH_CORNER = 6.0  # corner radius of the pitch opening; each tier rounds off from it
# Seating, as (distance out from the pitch edge, height): front wall, lower tier, the boxes' fascia, upper tier, back wall
AAMI_STAND_PROFILE = ((0.0, FIELD), (0.0, 1.6), (15.0, 8.2), (15.0, 11.0), (32.0, 18.5), (32.0, 0.0))
# Each bubble is an upright paraboloid, and neighbours meet where their surfaces cross, so the shell curves the same
# way everywhere (no flat spots or saddles) and every lattice edge keeps a crease the renderer can see.
AAMI_ROOF = {
    "depth": 27.0,  # valley line in to the roof's inner edge, which hangs over the lower tier
    "foot": 20.0,  # where two bubbles meet the facade, at a valley
    "rim": 24.0,  # crown of a bubble's outer rim (the top of the facade) and of its inner rim
    "tops": (31.0, 34.5),  # a bubble's top, and a corner bubble's
    "inner_bulge": 0.6,  # the inner rim bulges into the bowl by this much of the outer scallop
    "cell": 4.5,  # lattice edge length, in plan
    "crease": 2.0,  # every lattice edge creases at least this much, well clear of the 1 degree threshold
    "corner": 1.4,  # a bay this many times the median width is one of the big corner bubbles
}

# MCG (metres): an oval bowl fitted to the outer outline, three tiers, roof canopies and the six light towers.
MCG_SEGMENTS = 32
MCG_HARMONICS = 3  # Fourier terms kept when smoothing the outline's radius: enough for an oval, not for the jags
MCG_SPIKE_DEG = 14.0  # radius samples are median-filtered over this half-width first, dropping ramps and annexes
# Stands, as (distance out from the arena's edge, height): fence, lower tier, middle tier fascia and rake, upper tier
# fascia and rake to the rim, the rim walk, then the outside stepping down in two concourse terraces to the street.
MCG_PROFILE = ((0.0, FIELD), (0.0, 2.0), (24.0, 11.5), (24.0, 16.0), (43.0, 26.5), (43.0, 30.0), (66.0, 42.0),
               (69.0, 42.0), (69.0, 29.0), (73.0, 29.0), (73.0, 14.0), (78.0, 14.0), (78.0, 0.0))
MCG_ROOF = {
    "back": (71.0, 50.0),  # back edge, just past the rim: (distance out from the arena's edge, height)
    "front": (40.0, 53.0),  # leading edge, cantilevered over the upper tier
    "thickness": 1.5,
    "swell": 2.5,  # the roofline rises and falls by this much around the ring
    "gaps": 1,  # open segments at each end of the long axis (1: the one centred on it), where the screens stand
    "posts": (67.5, 1.4),  # the roof stands on a post at every other segment: distance out, and width
}
MCG_SCREEN = (34.0, 13.0, 2.5, 40.0)  # an end screen's width, height, depth and underside height: shape only
MCG_TOWERS = {
    "count": 6,
    "out": 4.0,  # base, out from the outer wall
    "height": 84.0,  # pylon top, ~30 m over the roof
    "width": (4.2, 2.0),  # square pylon at its base and top
    "head": (24.0, 14.0),  # light bank width and height
    "rows": 5,  # rows of lamps across the bank
    "tilt": 25.0,  # the bank leans in over the arena by this much
}


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


def _object(name, bm, col, location=(0, 0, 0), parent=None):
    bm.normal_update()
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = location
    obj.parent = parent  # matrix_parent_inverse stays identity: location is in the parent's space
    col.objects.link(obj)
    return obj


def _box(bm, size, matrix):
    verts = bmesh.ops.create_cube(bm, size=1.0)["verts"]
    bmesh.ops.scale(bm, vec=Vector(size), verts=verts)
    bmesh.ops.transform(bm, matrix=matrix, verts=verts)


def _bottom_edges(obj):
    """The footprint's bottom edges (the outline it stands on) as world-space (a, b) pairs, and the ground height."""
    me = obj.data
    world = [obj.matrix_world @ v.co for v in me.vertices]
    ground = min(p.z for p in world)
    edges = []
    for e in me.edges:
        a, b = (world[i] for i in e.vertices)
        if abs(a.z - ground) < 1e-3 and abs(b.z - ground) < 1e-3:
            edges.append((a.to_2d(), b.to_2d()))
    return edges, ground


def triangles(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


# --- AAMI Park ------------------------------------------------------------------------------------------------------


def outline(obj):
    """The footprint's outline (its open bottom edge), in world XY, counter-clockwise."""
    edges, _ = _bottom_edges(obj)
    key = lambda p: (round(p.x, 3), round(p.y, 3))  # noqa: E731
    links, at = {}, {}
    for a, b in edges:
        links.setdefault(key(a), []).append(key(b))
        links.setdefault(key(b), []).append(key(a))
        at[key(a)], at[key(b)] = a, b
    loop = [next(iter(links))]
    seen = set(loop)
    while nxt := [k for k in links[loop[-1]] if k not in seen]:
        loop.append(nxt[0])
        seen.add(nxt[0])
    ring = [Vector((at[k].x, at[k].y, 0)) for k in loop]
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


def _along(points, t):
    """The point a fraction t of the way along a polyline, by length."""
    lengths = [(b - a).length for a, b in zip(points, points[1:])]
    left = t * sum(lengths)
    for a, b, length in zip(points, points[1:], lengths):
        if left <= length:
            return a.lerp(b, left / length if length else 0.0)
        left -= length
    return points[-1].copy()


def _inside(poly, q):
    """Whether 2D point q is inside the polygon."""
    hit = False
    for a, b in zip(poly, poly[1:] + poly[:1]):
        if (a.y > q.y) != (b.y > q.y) and q.x < a.x + (q.y - a.y) * (b.x - a.x) / (b.y - a.y):
            hit = not hit
    return hit


def _clearance(poly, q):
    """Distance from 2D point q to the polygon's outline."""
    best = math.inf
    for a, b in zip(poly, poly[1:] + poly[:1]):
        e = b - a
        t = min(max((q - a).dot(e) / e.length_squared, 0.0), 1.0) if e.length_squared else 0.0
        best = min(best, (a + e * t - q).length)
    return best


def _rounded_rect(hx, hy, r, segments):
    """Counter-clockwise from +x, with the same point count for any size, so neighbouring rings join up quad by quad."""
    pts = []
    for sx, sy, a0 in ((1, 1, 0), (-1, 1, 90), (-1, -1, 180), (1, -1, 270)):
        for i in range(segments + 1):
            a = math.radians(a0 + 90 * i / segments)
            pts.append(Vector((sx * (hx - r) + r * math.cos(a), sy * (hy - r) + r * math.sin(a), 0)))
    return pts


def _relaxed_cdt(boundary, inner, rounds=6):
    """Delaunay triangulation of the polygon `boundary` with the points `inner`, which are nudged towards their
    neighbours' average a few times so the triangles even out where the lattice meets the outline. Two obtuse
    triangles back to back are what put four points nearly on one circle."""
    count = len(boundary)
    for r in range(rounds + 1):
        verts, _, faces, orig, _, _ = mathutils.geometry.delaunay_2d_cdt(boundary + inner, [], [list(range(count))], 1, 1e-6)
        if r == rounds:
            return verts, faces, orig
        index = {src[0]: i for i, src in enumerate(orig) if src}
        near = {}
        for f in faces:
            for a, b in zip(f, f[1:] + f[:1]):
                near.setdefault(a, set()).add(b)
                near.setdefault(b, set()).add(a)
        moved = []
        for n, q in enumerate(inner):
            ring = near.get(index.get(count + n), ())
            if ring:
                q = q.lerp(sum((verts[i] for i in ring), Vector((0, 0))) / len(ring), 0.6)
            if _inside(boundary, q):
                moved.append(q)
        inner = moved


def _ridges(bm, seam):
    """Flip lattice diagonals until every edge off the valley seams is a ridge. Points on a dome can still be joined
    into shallow folds, and a fold flatter than the lattice's threshold would draw as a gap in it."""
    for _ in range(50):
        flipped = 0
        for e in list(bm.edges):
            if not e.is_valid or len(e.link_faces) != 2 or all(v in seam for v in e.verts):
                continue
            a, b = (v.co for v in e.verts)
            c, d = (next(v.co for v in f.verts if v not in e.verts) for f in e.link_faces)
            up = (b - a).cross(c - a)
            if up.z < 0:
                up.negate()
            if (d - a).dot(up.normalized()) <= 1e-4:
                continue  # d is under the plane through a, b and c: already a ridge
            cd = (d - c).to_2d()
            if cd.cross((a - c).to_2d()) * cd.cross((b - c).to_2d()) >= 0:
                continue  # the quad isn't convex in plan, so the other diagonal would fold over
            if bmesh.utils.edge_rotate(e, False):
                flipped += 1
        if not flipped:
            return


def _crisp(bm, seam, least, most=0.35):
    """Move a lattice vertex up or down here and there, by no more than `most` metres in all, until every edge off
    the valley seams creases by at least `least` degrees. Where four points still lie almost in one plane, the
    renderer would skip their edge. Returns the largest move."""
    moved = {}

    def gap(v, a, b):  # plan distance from v to the line through a and b
        p, q = a.co.to_2d(), b.co.to_2d()
        return abs((q - p).cross(v.co.to_2d() - p)) / max((q - p).length, 1e-9)

    for _ in range(200):
        bm.normal_update()
        nudged = 0
        for e in bm.edges:
            if len(e.link_faces) != 2 or all(v in seam for v in e.verts):
                continue
            angle = math.degrees(e.link_faces[0].normal.angle(e.link_faces[1].normal, 0))
            if angle >= least:
                continue
            want = math.radians(least - angle + 0.5)
            far = [next(v for v in f.verts if v not in e.verts) for f in e.link_faces]
            # sharpen the ridge: drop a corner opposite the edge, or lift one of its ends, whichever has moved least
            options = [(v, -want * gap(v, *e.verts)) for v in far] + [(v, want * gap(v, *far) / 2) for v in e.verts]
            options = [(v, step) for v, step in options
                       if v not in seam and not v.is_boundary and abs(moved.get(v, 0.0) + step) <= most]
            if options:
                v, step = min(options, key=lambda o: abs(moved.get(o[0], 0.0)))
                v.co.z += step
                moved[v] = moved.get(v, 0.0) + step
                nudged += 1
        if not nudged:
            break
    return max(map(abs, moved.values()), default=0.0)


def aami_park(footprint, col):
    """prop_aami_park (stands and facade) with child prop_aami_park__roof (the bubble lattice), on the footprint's
    outline. Returns prop_aami_park, origin at the bowl's centre on the ground."""
    _remove("prop_aami_park")
    _remove("prop_aami_park__roof")
    ring = outline(footprint)
    ground = _bottom_edges(footprint)[1]
    runs = valleys(ring)
    if len(runs) < 8:
        raise RuntimeError(f"found {len(runs)} roof valleys in {footprint.name}'s outline, expected about 20")
    n, count = len(ring), len(runs)
    valley = [sum((ring[i] for i in run), Vector()) / len(run) for run in runs]
    centre = sum(valley, Vector()) / count
    ring = [p - centre for p in ring]
    valley = [p - centre for p in valley]

    # the bowl's principal axes, from the valley line: the pitch and the tiers are rectangles on them
    sxx = sum(p.x ** 2 for p in valley)
    syy = sum(p.y ** 2 for p in valley)
    sxy = sum(p.x * p.y for p in valley)
    axes = Matrix.Rotation(-0.5 * math.atan2(2 * sxy, sxx - syy), 3, "Z")  # local -> principal axes
    half = [max(abs((axes @ p)[i]) for p in valley) for i in (0, 1)]

    def inward(p, depth):
        q = axes @ p
        return axes.transposed() @ Vector((q.x * (half[0] - depth) / half[0], q.y * (half[1] - depth) / half[1], 0))

    # each bay's outer rim: the outline from one valley to the next, through its scallop
    rims, crowns = [], []
    for k, run in enumerate(runs):
        nxt = runs[(k + 1) % count]
        pts, i = [valley[k]], (run[-1] + 1) % n
        while i != nxt[0]:
            pts.append(ring[i])
            i = (i + 1) % n
        pts.append(valley[(k + 1) % count])
        rims.append(pts)
        out = (pts[-1] - pts[0]).cross(Vector((0, 0, 1)))
        crowns.append(max(pts, key=lambda p: (p - pts[0]).dot(out)))

    roof = AAMI_ROOF
    inner = [inward(p, roof["depth"]) for p in valley]
    widths = [(valley[(k + 1) % count] - valley[k]).length for k in range(count)]
    big = roof["corner"] * statistics.median(widths)
    controls = []  # each bay's inner rim is a quadratic from inner[k] to inner[k + 1], bulging into the bowl
    for k in range(count):
        j = (k + 1) % count
        mid_o, mid_i = (valley[k] + valley[j]) / 2, (inner[k] + inner[j]) / 2
        controls.append(mid_i - (crowns[k] - mid_o) * 2 * roof["inner_bulge"])  # a quadratic's middle is half way

    def plan(k, u, v):
        """Bay k's patch: u along the ring from valley k to valley k + 1, v from the outline to the inner edge."""
        j = (k + 1) % count
        inner_pt = inner[k] * (1 - u) ** 2 + controls[k] * 2 * u * (1 - u) + inner[j] * u * u
        return _along(rims[k], u).lerp(inner_pt, v)

    # a bubble per bay: an upright paraboloid centred on the chord between its valleys, so both its feet stand at the
    # same height on the facade and the valley it shares with each neighbour starts at the outline's notch
    foot, rim = roof["foot"], roof["rim"]
    bubbles = []
    for k in range(count):
        a, b = valley[k], valley[(k + 1) % count]
        along = (b - a).normalized()
        across = Vector((-along.y, along.x, 0))  # into the bowl: the outline runs counter-clockwise
        middle = (a + b) / 2
        # the top sits midway between the outer and inner rims' crowns, so both crown at `rim`
        apex = middle + across * ((plan(k, 0.5, 0.0) + plan(k, 0.5, 1.0)) / 2 - middle).dot(across)
        top = roof["tops"][1] if widths[k] > big else roof["tops"][0]
        reach = (apex - plan(k, 0.5, 0.0)).dot(across)  # out to the outer rim's crown, which stands at `rim`
        curve_across = (top - rim) / reach ** 2
        curve_along = (top - foot - curve_across * (a - apex).dot(across) ** 2) / (a - apex).dot(along) ** 2
        bubbles.append((apex, along, across, curve_along, curve_across, top))

    def height(k, p):
        apex, along, across, curve_along, curve_across, top = bubbles[k]
        d = p - apex
        return top - curve_along * d.dot(along) ** 2 - curve_across * d.dot(across) ** 2

    # rows across the whole ring, as (ring position g = bay + u, plan point); the bubbles meet where they're equal
    rows, fine = max(4, round(roof["depth"] / (roof["cell"] * 0.866))), 48
    paths, meets = [], []
    for r in range(rows + 1):
        v = r / rows
        path = [(k + s / fine, plan(k % count, s / fine, v)) for k in range(-1, count + 1) for s in range(fine)]
        paths.append(path)

        def at(g, path=path):
            i = min(max(int((g + 1) * fine), 0), len(path) - 2)
            (g0, p0), (g1, p1) = path[i], path[i + 1]
            return p0.lerp(p1, (g - g0) / (g1 - g0))

        row = []
        for k in range(count):  # valley k, between bubbles k - 1 and k
            lo, hi = k - 0.5, k + 0.5
            for _ in range(40):
                mid = (lo + hi) / 2
                if height((k - 1) % count, at(mid)) > height(k, at(mid)):
                    lo = mid
                else:
                    hi = mid
            g = (lo + hi) / 2
            row.append((g, at(g)))
        meets.append(row)

    cell = roof["cell"]

    def resample(path):
        cuts = max(3, round(sum((b - a).length for a, b in zip(path, path[1:])) / cell))
        return [_along(path, i / cuts) for i in range(cuts + 1)]

    bm = bmesh.new()  # roof
    facade = bmesh.new()
    for k in range(count):
        def span(r, k=k):
            """Row r of bubble k: the path from its left valley to its right one."""
            (g0, p0), (g1, p1) = meets[r][k], meets[r][(k + 1) % count]
            g1 += count if k == count - 1 else 0
            return [p0, *(p for g, p in paths[r] if g0 < g < g1), p1]

        # the bubble's outline, counter-clockwise: outer rim, right valley, inner rim, left valley
        outer = resample(span(0))
        edge = outer + [meets[r][(k + 1) % count][1] for r in range(1, rows)] + resample(span(rows))[::-1]
        edge += [meets[r][k][1] for r in range(rows - 1, 0, -1)]

        # Triangulated where the paraboloid is round (scaled by its curvature each way), a Delaunay triangulation is
        # the convex one: every edge a ridge. The interior is an equilateral lattice, so no four neighbours come close
        # to one plane, which is what makes an edge too flat to draw.
        apex, along, across, curve_along, curve_across, _ = bubbles[k]
        scale = Vector((math.sqrt(curve_along), math.sqrt(curve_across)))

        def metric(p, apex=apex, along=along, across=across, scale=scale):
            d = p - apex
            return Vector((d.dot(along) * scale.x, d.dot(across) * scale.y))

        boundary = [metric(p) for p in edge]
        step = cell * (scale.x + scale.y) / 2
        lo_x, hi_x = min(q.x for q in boundary), max(q.x for q in boundary)
        lo_y, hi_y = min(q.y for q in boundary), max(q.y for q in boundary)
        lattice = []
        for j in range(int((hi_y - lo_y) / (step * 0.866)) + 2):
            y = lo_y + j * step * 0.866
            for i in range(int((hi_x - lo_x) / step) + 2):
                q = Vector((lo_x + (i + 0.5 * (j % 2)) * step, y))
                if _inside(boundary, q) and _clearance(boundary, q) > 0.5 * step:
                    lattice.append(q)
        verts, faces, orig = _relaxed_cdt(boundary, lattice)
        made = []
        for q, src in zip(verts, orig):
            if src and src[0] < len(edge):
                p = edge[src[0]]  # the exact point, so a valley's vertices match its neighbour's
            else:
                p = apex + along * (q.x / scale.x) + across * (q.y / scale.y)
            made.append(bm.verts.new((p.x, p.y, height(k, p))))  # on a valley, the neighbour's height too
        for f in faces:
            bm.faces.new([made[i] for i in f])

        # facade: a wall from the ground up to the bubble's outer rim, so its top scallops with the roof
        lo = [facade.verts.new((p.x, p.y, 0)) for p in outer]
        hi = [facade.verts.new((p.x, p.y, height(k, p))) for p in outer]
        for i in range(len(outer) - 1):
            facade.faces.new((lo[i], lo[i + 1], hi[i + 1], hi[i]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-3)
    bmesh.ops.remove_doubles(facade, verts=facade.verts, dist=1e-3)
    seams = {(round(p.x, 2), round(p.y, 2)) for row in meets for _, p in row}
    seam = {v for v in bm.verts if (round(v.co.x, 2), round(v.co.y, 2)) in seams}
    _ridges(bm, seam)
    _crisp(bm, seam, roof["crease"])

    # stands: rounded-rectangle tiers around the pitch, on the principal axes
    pitch = (half[0] - AAMI_STAND_DEPTH, half[1] - AAMI_STAND_DEPTH)
    back = axes.transposed()
    tiers = []
    for d, z in AAMI_STAND_PROFILE:
        pts = _rounded_rect(pitch[0] + d, pitch[1] + d, AAMI_PITCH_CORNER + d, 6)
        tiers.append([facade.verts.new((back @ p) + Vector((0, 0, z))) for p in pts])
    m = len(tiers[0])
    for lo, hi in zip(tiers, tiers[1:]):
        for i in range(m):
            facade.faces.new((lo[i], lo[(i + 1) % m], hi[(i + 1) % m], hi[i]))
    facade.faces.new(tiers[0])  # the pitch

    location = Vector((centre.x, centre.y, ground))
    root = _object("prop_aami_park", facade, col, location)
    lattice = _object("prop_aami_park__roof", bm, col, parent=root)
    lattice["edge_threshold_deg"] = LATTICE_THRESHOLD_DEG
    return root


# --- MCG ------------------------------------------------------------------------------------------------------------


def _ray_hits(origin, direction, edges):
    """Distances along a 2D ray to every edge it crosses."""
    hits = []
    for a, b in edges:
        e = b - a
        den = direction.x * -e.y + direction.y * e.x
        if abs(den) < 1e-12:
            continue
        w = a - origin
        t = (w.x * -e.y + w.y * e.x) / den
        s = (direction.x * w.y - direction.y * w.x) / den
        if t > 0 and 0 <= s <= 1:
            hits.append(t)
    return hits


def fit_oval(footprint, samples=180):
    """The footprint's outer outline as a smooth oval: (centre, radius(theta), long-axis angle, ground)."""
    edges, ground = _bottom_edges(footprint)
    pts = [p for e in edges for p in e]
    centre = Vector(((min(p.x for p in pts) + max(p.x for p in pts)) / 2, (min(p.y for p in pts) + max(p.y for p in pts)) / 2))
    angles = [2 * math.pi * i / samples for i in range(samples)]
    window = round(MCG_SPIKE_DEG / 360 * samples)
    for _ in range(6):  # the first harmonic is the centre's offset: walk it out
        radii = []
        for a in angles:
            hits = _ray_hits(centre, Vector((math.cos(a), math.sin(a))), edges)
            radii.append(max(hits) if hits else 0.0)
        radii = [statistics.median(radii[(i + d) % samples] for d in range(-window, window + 1)) for i in range(samples)]
        coeffs = [(2 / samples * sum(r * math.cos(h * a) for r, a in zip(radii, angles)),
                   2 / samples * sum(r * math.sin(h * a) for r, a in zip(radii, angles))) for h in range(MCG_HARMONICS + 1)]
        shift = Vector(coeffs[1]) / 2
        centre += shift
        if shift.length < 0.05:
            break
    mean = coeffs[0][0] / 2

    def radius(a):
        return mean + sum(c * math.cos(h * a) + s * math.sin(h * a) for h, (c, s) in enumerate(coeffs[2:], start=2))

    axis = 0.5 * math.atan2(coeffs[2][1], coeffs[2][0])  # where the second harmonic peaks: the long axis
    return centre, radius, axis, ground


def mcg(footprint, col):
    """prop_mcg: the bowl, roof canopies and six light towers, fitted to the footprint's outer outline. Origin at the
    arena's centre on the ground."""
    _remove("prop_mcg")
    centre, radius, axis, ground = fit_oval(footprint)
    n = MCG_SEGMENTS
    depth = MCG_PROFILE[-1][0]
    # vertices sit half a segment off the long axis, so a segment is centred on each end
    angles = [axis + 2 * math.pi * (i + 0.5) / n for i in range(n)]
    dirs = [Vector((math.cos(a), math.sin(a), 0)) for a in angles]

    def at(i, out, z):  # out: distance out from the arena's edge
        return dirs[i] * (radius(angles[i]) - depth + out) + Vector((0, 0, z))

    bm = bmesh.new()
    rings = [[bm.verts.new(at(i, d, z)) for i in range(n)] for d, z in MCG_PROFILE]
    for lo, hi in zip(rings, rings[1:]):
        for i in range(n):
            bm.faces.new((lo[i], lo[(i + 1) % n], hi[(i + 1) % n], hi[i]))
    bm.faces.new(rings[0])  # the arena

    # roof canopies over the upper tier, open at both ends of the long axis, the leading edge rising and falling
    roof = MCG_ROOF
    gaps = {(n - 1 - g) % n for g in range(roof["gaps"])} | {(n // 2 - 1 - g) % n for g in range(roof["gaps"])}
    (back_out, back_z), (front_out, front_z), thick = roof["back"], roof["front"], roof["thickness"]

    def section(i):
        side = math.sin(angles[i] - axis)  # +1 on one long side, -1 on the other
        lift = roof["swell"] * (0.5 * side + 0.5 * math.cos(2 * (angles[i] - axis)))
        return [bm.verts.new(p) for p in (at(i, back_out, back_z + lift / 2), at(i, front_out, front_z + lift),
                                         at(i, front_out, front_z + lift - thick), at(i, back_out, back_z + lift / 2 - thick))]

    sections = {}
    for i in range(n):
        if i in gaps:
            continue
        for k in (i, (i + 1) % n):
            if k not in sections:
                sections[k] = section(k)
        a, b = sections[i], sections[(i + 1) % n]
        for s in range(4):
            bm.faces.new((a[s], b[s], b[(s + 1) % 4], a[(s + 1) % 4]))
        if (i - 1) % n in gaps:
            bm.faces.new(a[::-1])
        if (i + 1) % n in gaps:
            bm.faces.new(b)

    # the roof stands clear of the rim on a post at every other segment, so it reads as a canopy, not a wall
    post_out, post_w = roof["posts"]
    rim_out, rim_z = MCG_PROFILE[6]
    for k, (_, _, under_front, under_back) in sections.items():
        if k % 2:
            continue
        top = under_back.co.z + (under_front.co.z - under_back.co.z) * (back_out - post_out) / (back_out - front_out)
        foot = at(k, post_out, (rim_z + top) / 2)
        _box(bm, (post_w, post_w, top - rim_z), Matrix.Translation(foot) @ Matrix.Rotation(angles[k], 4, "Z"))

    # a screen in each gap, facing the arena from the back of the upper tier
    screen_w, screen_h, screen_d, under = MCG_SCREEN
    for i in gaps:
        a = axis + 2 * math.pi * (i + 1) / n  # the gap's middle
        out = Vector((math.cos(a), math.sin(a), 0))
        middle = out * (radius(a) - depth + rim_out + screen_d / 2) + Vector((0, 0, under + screen_h / 2))
        _box(bm, (screen_w, screen_d, screen_h), Matrix.Translation(middle) @ Matrix.Rotation(a - math.pi / 2, 4, "Z"))

    # six light towers spaced around the rim, between the roof's ends: a tapered pylon and a tilted bank of lamps
    towers = MCG_TOWERS
    (w0, w1), (head_w, head_h) = towers["width"], towers["head"]
    for t in range(towers["count"]):
        a = axis + math.pi / towers["count"] + 2 * math.pi * t / towers["count"]
        out = Vector((math.cos(a), math.sin(a), 0))
        base = out * (radius(a) + towers["out"])
        turn = Matrix.Translation(base) @ Matrix.Rotation(a - math.pi / 2, 4, "Z")  # local +y out, +x along the rim
        pylon = []
        for z, w in ((0.0, w0), (towers["height"], w1)):
            pylon.append([bm.verts.new(turn @ Vector((sx * w / 2, sy * w / 2, z))) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
        for i in range(4):
            bm.faces.new((pylon[0][i], pylon[0][(i + 1) % 4], pylon[1][(i + 1) % 4], pylon[1][i]))
        bm.faces.new(pylon[1])
        # the bank hangs off the pylon's inner face, its top leaning in over the arena
        head = turn @ Matrix.Translation((0, -w1 / 2 - 0.8, towers["height"] - head_h * 0.3)) @ Matrix.Rotation(math.radians(towers["tilt"]), 4, "X")
        _box(bm, (head_w, 0.5, head_h), head @ Matrix.Translation((0, 0.3, 0)))  # backing frame
        rows, lamp = towers["rows"], head_h / (towers["rows"] * 1.6)
        for r in range(rows):
            z = -head_h / 2 + lamp * 0.8 + r * (head_h - lamp * 1.6) / (rows - 1)
            _box(bm, (head_w - 1.0, 1.0, lamp), head @ Matrix.Translation((0, -0.45, z)))
        for sx in (-1, 1):
            _box(bm, (0.6, 1.2, head_h), head @ Matrix.Translation((sx * (head_w / 2 - 0.3), -0.3, 0)))

    location = Vector((centre.x, centre.y, ground))
    return _object("prop_mcg", bm, col, location)

"""Co-working lobby furniture and neighbouring offices, in the office root's metre frame.

Glass is represented by open frames: the website's hidden-line renderer makes solid panes
opaque. Door leaves have their own hinge roots, ready for a later interaction without one now.
"""
import math

import bmesh
from mathutils import Matrix

import common
import office_props as p


def boxes(name, spans, parent, col):
    bm = bmesh.new()
    for lo, hi in spans:
        p._box(bm, tuple(b - a for a, b in zip(lo, hi)), tuple((a + b) / 2 for a, b in zip(lo, hi)))
    return p._part(name, bm, parent, col)


def table(name, location, parent, col, width=1.8, depth=0.8, height=0.75):
    root = p._root(name, location, 0, parent, col)
    bm = bmesh.new()
    p._slab(bm, width, depth, height - 0.05, height, r=0.07, segs=2, top=0.005)
    for x in (-width / 2 + 0.15, width / 2 - 0.15):
        for y in (-depth / 2 + 0.12, depth / 2 - 0.12):
            p._box(bm, (0.045, 0.045, height - 0.05), (x, y, (height - 0.05) / 2))
    p._part(f"{name}__frame", bm, root, col)
    return root


def stool(name, location, parent, col):
    root = p._root(name, location, 0, parent, col)
    bm = bmesh.new()
    p._lathe(bm, [(0.0, 0.7), (0.22, 0.7), (0.22, 0.74), (0.0, 0.74)], 12)
    for x in (-0.15, 0.15):
        for y in (-0.15, 0.15):
            p._tube(bm, [(x * 1.3, y * 1.3, 0), (x, y, 0.7)], 0.016, 6)
    p._tube(bm, [(-0.18, -0.18, 0.25), (0.18, -0.18, 0.25), (0.18, 0.18, 0.25), (-0.18, 0.18, 0.25)], 0.011, 6, wrap=True)
    p._part(f"{name}__frame", bm, root, col)


def pendant(name, location, ceiling, parent, col):
    root = p._root(name, location, 0, parent, col)
    bm = bmesh.new()
    p._tube(bm, [(0, 0, 2.75), (0, 0, ceiling - 0.03)], 0.008, 5)
    p._lathe(bm, [(0.0, 2.78), (0.08, 2.78), (0.30, 2.52), (0.30, 2.5), (0.27, 2.5)], 12)
    p._part(f"{name}__shade", bm, root, col)


def coffee_machine(name, location, parent, col):
    root = p._root(name, location, 0, parent, col)
    bm = bmesh.new()
    p._box(bm, (0.68, 0.48, 0.055), (0, 0, 0.028))
    p._box(bm, (0.66, 0.13, 0.46), (0, 0.16, 0.28))
    p._slab(bm, 0.68, 0.36, 0.39, 0.57, r=0.055, segs=2, top=0.01, m=Matrix.Translation((0, 0.04, 0)))
    for x in (-0.16, 0.16):
        p._lathe(bm, [(0.05, 0.31), (0.05, 0.37), (0.035, 0.39)], 10, Matrix.Translation((x, -0.04, 0)))
        p._tube(bm, [(x, -0.04, 0.32), (x, -0.27, 0.32)], 0.018, 8)
        # Small front-mounted pressure gauge and control knob.
        p._lathe(bm, [(0.039, 0), (0.039, 0.012)], 12,
                 Matrix.Translation((x, -0.148, 0.485)) @ Matrix.Rotation(math.pi / 2, 4, "X"))
    for x in (-0.24, -0.16, -0.08, 0, 0.08, 0.16, 0.24):
        p._box(bm, (0.012, 0.31, 0.008), (x, -0.045, 0.063))
    p._tube(bm, [(0.29, 0.01, 0.4), (0.35, -0.09, 0.32), (0.35, -0.16, 0.13)], 0.009, 6)
    p._part(f"{name}__body", bm, root, col)
    p.build_mug(f"{name}__cup", (-0.17, -0.06, 0.065), 0.3, root, col)
    return root


def coffee_point(root, col, back):
    bench = p._root("prop_lobby_coffee", (0, back - 0.43, 0), 0, root, col)
    bm = bmesh.new()
    p._box(bm, (3.8, 0.64, 0.78), (0, 0, 0.49))
    p._box(bm, (3.65, 0.52, 0.1), (0, 0.04, 0.05))
    p._slab(bm, 3.9, 0.76, 0.88, 0.94, r=0.025, segs=1)
    for x in (-1.42, -0.47, 0.47, 1.42):
        p._box(bm, (0.92, 0.012, 0.7), (x, -0.326, 0.49))
        p._box(bm, (0.16, 0.028, 0.015), (x, -0.345, 0.76))
    p._box(bm, (3.8, 0.25, 0.04), (0, 0.12, 1.72))
    p._part("prop_lobby_coffee__cabinet", bm, bench, col)
    coffee_machine("prop_lobby_espresso", (-0.9, -0.02, 0.94), bench, col)
    bm = bmesh.new()
    p._lathe(bm, [(0.0, 0), (0.12, 0), (0.11, 0.25), (0.09, 0.29), (0.14, 0.39), (0.13, 0.61), (0, 0.61)], 10)
    p._box(bm, (0.08, 0.12, 0.05), (0, -0.13, 0.21))
    p._part("prop_lobby_grinder", bm, bench, col, (0.05, 0, 0.94))
    for i in range(4):
        p.build_mug(f"prop_lobby_coffee__shelf_mug_{i}", (0.5 + i * 0.2, 0.1, 1.74), 0.3 * i, bench, col)
    p.build_snake_plant("prop_lobby_coffee__plant", (1.55, 0, 0.94), 0, bench, col)
    table("prop_lobby_workbench", (-0.15, back - 2.0, 0), root, col, 2.25, 0.75, 1.04)
    for i, x in enumerate((-0.8, 0.5)):
        stool(f"prop_lobby_stool_{i}", (x, back - 2.8, 0), root, col)
    pendant("prop_lobby_coffee_pendant", (0, back - 2.0, 0), 5.0, root, col)


def meeting_room(root, col):
    name = "prop_lobby_meeting"
    room = p._root(name, (0.6, 1.95, 0), 0, root, col)
    w, d, h, rail = 4.4, 3.1, 2.8, 0.055
    bm = bmesh.new()
    # Open glazing frames on all sides, leaving the meeting furniture visible.
    for z in (0.035, h - 0.035):
        p._box(bm, (w, rail, rail), (0, -d / 2, z))
        p._box(bm, (w, rail, rail), (0, d / 2, z))
        for x in (-w / 2, w / 2):
            p._box(bm, (rail, d, rail), (x, 0, z))
    for x in (-w / 2, 0, w / 2):
        for y in (-d / 2, d / 2):
            p._box(bm, (rail, rail, h), (x, y, h / 2))
    for x in (-w / 2, w / 2):
        p._box(bm, (rail, rail, h), (x, 0, h / 2))
    p._part(f"{name}__glazing", bm, room, col)
    # Glazed door in the lobby-facing side, separately parented at its hinge.
    door = p._root(f"{name}__door_hinge", (-1.7, d / 2, 0), 0, room, col)
    boxes(f"{name}__door_leaf", [
        ((0, -0.018, 0.04), (0.045, 0.018, 2.35)), ((0.91, -0.018, 0.04), (0.955, 0.018, 2.35)),
        ((0, -0.018, 0.04), (0.955, 0.018, 0.09)), ((0, -0.018, 2.3), (0.955, 0.018, 2.35)),
        ((0.81, 0.04, 0.9), (0.835, 0.065, 1.3)),
    ], door, col)
    label = common.text_mesh(f"{name}__label", "MEETING 01", 0.17, 0.002, (0.5, d / 2 + 0.035, 2.43), room, col)
    label.rotation_euler.z = math.pi
    table(f"{name}__table", (0.1, 0, 0), room, col, 1.9, 0.85, 0.75)
    for i, (x, y, turn) in enumerate(((-0.45, -0.87, math.pi), (0.65, -0.87, math.pi), (-0.45, 0.87, 0), (0.65, 0.87, 0))):
        p.build_chair(f"{name}__chair_{i}", (x, y, 0), turn, room, col, headrest=False)
    # A wall display facing into the room, with a low credenza under it.
    boxes(f"{name}__display", [((-0.7, -1.51, 1.05), (0.7, -1.46, 1.9)), ((-0.64, -1.46, 1.1), (0.64, -1.45, 1.85)),
                                   ((-0.8, -1.5, 0.08), (0.8, -1.15, 0.65))], room, col)
    p.build_snake_plant(f"{name}__plant", (1.72, -1.1, 0), 0, room, col).scale = (1.6,) * 3


def build_lobby(root, col, back, ceiling):
    lounge = p._root("prop_lobby_lounge", (-8.0, 2.0, 0), 0, root, col)
    common.box("prop_lobby_lounge__rug", (4.8, 3.0, 0.008), (0, 0.45, 0.005), lounge, col)
    p.build_couch("prop_lobby_lounge__sofa", (0, -0.65, 0), math.pi, lounge, col, width=2.5, askew=False)
    p.build_pillow("prop_lobby_lounge__pillow", (0.78, -0.58, 0.445), math.pi + 0.18, lounge, col, tilt=70)
    for i, (x, y, turn) in enumerate(((-1.95, 0.5, -math.pi / 2), (1.95, 0.5, math.pi / 2))):
        p.build_couch(f"prop_lobby_lounge__chair_{i}", (x, y, 0), turn, lounge, col, width=0.88, depth=0.78, askew=False)
    table("prop_lobby_lounge__table", (0, 0.7, 0), lounge, col, 1.35, 0.65, 0.38)
    p.build_book_stack("prop_lobby_lounge__books", (-0.28, 0.7, 0.38), 0.15, lounge, col, count=2)
    p.build_mug("prop_lobby_lounge__mug", (0.3, 0.65, 0.38), 0.6, lounge, col)
    pendant("prop_lobby_lounge__pendant", (0, 0.45, 0), ceiling, lounge, col)
    for i, at in enumerate(((-12.15, 1.1, 0), (-11.6, 6.9, 0), (-4.9, 1.5, 0), (2.65, back - 1.2, 0))):
        p.build_monstera(f"prop_lobby_plant_{i}", at, 0.7 * i, root, col)
    p.build_laptop("prop_reception__laptop", (-8.2, back - 1.25, 1.12), 0.1, root, col)
    p.build_snake_plant("prop_reception__plant", (-9.2, back - 1.25, 1.12), 0, root, col)
    coffee_point(root, col, back)
    meeting_room(root, col)


def build_corridor_offices(root, col, start, end, wall_y, height, thickness):
    """Real openings through the corridor wall, and inward-swinging independent doors."""
    centres = (5.6, 7.9, 10.2)
    width, door_h = 1.0, 2.3
    spans, at = [], start
    for x in centres:
        lo, hi = x - width / 2, x + width / 2
        spans += [((at, wall_y, 0), (lo, wall_y + thickness, height)),
                  ((lo, wall_y, door_h), (hi, wall_y + thickness, height))]
        at = hi
    spans.append(((at, wall_y, 0), (end + thickness, wall_y + thickness, height)))
    boxes("prop_corridor_wall_west", spans, root, col)
    bounds = (start, 6.75, 9.05, end)
    for i, (x, angle) in enumerate(zip(centres, (20, 0, 13)), 1):
        name = f"prop_neighbor_office_{i:02d}"
        room = p._root(name, (x, wall_y, 0), 0, root, col)
        a, b = bounds[i - 1] - x, bounds[i] - x
        boxes(f"{name}__shell", [((a, thickness, -0.02), (b, 2.8, 0)), ((a, 2.8, 0), (b, 2.9, height)),
                                      ((a, thickness, 0), (a + thickness, 2.8, height)), ((b - thickness, thickness, 0), (b, 2.8, height))], room, col)
        boxes(f"{name}__jamb", [((-0.54, -0.02, 0), (-0.5, 0.12, door_h)), ((0.5, -0.02, 0), (0.54, 0.12, door_h)),
                                     ((-0.54, -0.02, door_h), (0.54, 0.12, door_h + 0.04))], room, col)
        hinge = p._root(f"{name}__door_hinge", (-0.5, 0.06, 0), math.radians(angle), room, col)
        boxes(f"{name}__door_leaf", [((0.006, -0.021, 0.015), (0.994, 0.021, door_h - 0.01)),
                                          ((0.08, -0.027, 0.17), (0.92, -0.021, 2.12)),
                                          ((0.84, -0.08, 1.02), (0.87, -0.02, 1.05)), ((0.74, -0.09, 1.03), (0.88, -0.07, 1.055))], hinge, col)
        boxes(f"{name}__plaque", [((0.64, -0.035, 1.42), (0.95, -0.005, 1.68))], room, col)
        common.text_mesh(f"{name}__number", f"{i:02d}", 0.17, 0.002, (0.795, -0.038, 1.55), room, col)
        if angle:
            p.build_desk(f"{name}__desk", (0, 2.25, 0), 0, room, col, width=1.25, depth=0.6)
            p.build_chair(f"{name}__chair", (0, 1.4, 0), math.pi, room, col, headrest=False)

"""The Commons, its lobby, the corridor and the office, camera poses and the walk-in camera for art/office.blend.

Builds prop_commons (commons.py) with the office window cut in, hangs the lobby and office doors, fits out the lobby
and the corridor, furnishes the office (office_props.py) and keys the walk-in: down over Gwynne St to the lobby
door, across the lobby, up the corridor and into the office.

Run after setup_street.py. Re-runnable: rebuilds the office collection, The Commons, both doors and cam_walkin.
Tune the walk-in by editing WALKIN_KEYS, re-running this, then export.py.
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
import commons  # noqa: E402
import office_props  # noqa: E402

importlib.reload(common)
importlib.reload(commons)
importlib.reload(office_props)

FPS = 24
WALKIN_FRAMES = 240  # clip length only; scroll maps onto it
CAMERA_FOV_DEG = 50.0  # vertical; shared by the walk-in and the standing spot so there's no jump
PORTRAIT_FOV_DEG = 85.0  # wide enough for crate-to-shelf across the office on a phone

# Every line of visible text, in one place for Kasper to approve or swap.
COPY = {
    "nameplate": "KASPER SIMONSEN.DEV",
    "note_bezel": "it works.\ndon't touch it.",
    "note_wall": "fix the fix",
    "mug": "works on my\nmachine",
    "whiteboard": "TODO: sleep",
    "whiteboard_note": "(next sprint)",
}

# The office frame: metres, origin at meta.door on The Commons' frontage, +x north along Gwynne St (right when facing
# in), +y west into the building, +z up. The lobby (commons.lobby) runs along the frontage from the south blade to
# x 4.3; the office sits north of it against the facade, so it keeps a window onto Gwynne St. A corridor leaves the
# lobby through its north wall, runs up the office's west side and turns along its north side to the office door.
WALL = 0.1
ROOM = (4.5, 5.0, 2.7)  # interior width (along the frontage), depth and ceiling height: a one-person office
OFFICE_AT = (9.7, 2.37)  # the office's front (north) wall face and its centre line, just behind the facade
ROOM_DOOR = (0.8, 1.0, 2.1)  # the office door's clear opening: centre (room frame x), width, height
LINING = 0.02  # jamb and head lining round the office doorway
ROOM_WINDOW = (2.6, 1.4, 0.9, 2.2)  # in the street-side wall: centre (room frame y), width, sill, head
# The room's own frame: origin on the face of its front wall, +y into the room (south, towards the desk), +x towards
# the corridor side (west). Its street-side wall sits just behind the facade.
ROOM_FRAME = Matrix.Translation((*OFFICE_AT, 0)) @ Matrix.Rotation(math.pi / 2, 4, "Z")
CORRIDOR = (1.6, 2.7)  # width, ceiling height
OFFICE_WEST = OFFICE_AT[1] + ROOM[0] / 2 + WALL  # the office's west wall face: the corridor's east side
CORRIDOR_Y = OFFICE_WEST + CORRIDOR[0] / 2  # centre line of the corridor up the office's west side
STUB_X = OFFICE_AT[0] + CORRIDOR[0] / 2  # centre line of the stub along its north side
STUB_END = 2.1  # where the stub stops, just past the office door
ENTRY = -13.6  # office-frame x of the lobby entrance (commons.entrance), checked when the lobby is built
LIFTS = (-6.2, -4.2)  # lift doors in the lobby's back wall, office-frame x
MAILBOXES = (2.0, 4.4)  # mailbox wall on the lobby's back wall, metres north of its south end
COUNTER = (-9.6, -7.4)  # reception counter in front of the back wall, office-frame x
# room frame: the standing spot, back to the front wall so the couch and the TV are in frame with the desk
STAND = ((0.0, 0.42, 1.6), (-0.05, 4.7, 0.85))
PORTRAIT = ((0.0, 0.25, 1.6), (0.0, 4.6, 0.95))  # room frame, back against the front wall
CHAIR = (-0.35, -0.75, math.pi - 0.35)  # x and y from the desk's centre, turn: pulled out, clear of drawer and crate
# Room-frame floor spots for the couch and the old TV on its stand: (centre x, centre y, rotation_z, width, depth).
# Both face into the room, in view from cam_stand.
RESERVED = {"couch": (-1.825, 4.2, math.pi / 2, 1.7, 0.85), "tv": (2.0, 4.0, -math.pi / 2, 0.7, 0.5)}


def in_office(pose):
    """(eye, look-at) in the room frame -> the office frame."""
    return tuple(tuple(ROOM_FRAME @ Vector(p)) for p in pose)


# (scroll fraction, eye, look-at) in the office frame.
WALKIN_KEYS = [
    (0.00, (-40.0, -230.0, 195.0), (63.0, 254.0, 0.0)),  # 21.5 deg down over Cremorne; Nylex, AAMI, MCG, CBD beyond
    (0.45, (ENTRY, -45.0, 24.0), (ENTRY, 30.0, 2.0)),  # descending towards the lobby entrance
    (0.57, (ENTRY, -10.5, 9.0), (ENTRY, 20.0, 2.0)),  # over the 7 m roof across Gwynne St, which starts 10.1 m out
    (0.64, (ENTRY, -4.0, 1.65), (ENTRY, 10.0, 1.6)),  # at the lobby door, eye height
    (0.72, (ENTRY, -1.4, 1.65), (ENTRY, 10.0, 1.6)),  # up to it while it swings open
    (0.77, (ENTRY + 0.4, 2.0, 1.65), (ENTRY + 6.0, 4.5, 1.6)),  # inside, turning right up the lobby
    (0.82, (-6.0, 4.4, 1.65), (4.4, 5.5, 1.6)),  # crossing the lobby towards the corridor
    (0.865, (3.4, CORRIDOR_Y, 1.65), (11.0, CORRIDOR_Y, 1.6)),  # into the corridor
    (0.885, (7.0, CORRIDOR_Y, 1.65), (14.0, CORRIDOR_Y, 1.6)),  # halfway: keeps the curve on the centre line
    (0.905, (STUB_X, CORRIDOR_Y, 1.65), (STUB_X, 0.0, 1.55)),  # end of the corridor, turned right along the stub
    (0.93, *in_office(((ROOM_DOOR[0], -0.7, 1.65), (ROOM_DOOR[0], 4.0, 1.5)))),  # turned right, facing the nameplate
    (0.945, *in_office(((ROOM_DOOR[0], -0.7, 1.65), (ROOM_DOOR[0], 4.0, 1.5)))),  # held there as the door opens
    (0.98, *in_office(((ROOM_DOOR[0] - 0.3, 0.42, 1.62), (0.1, 4.7, 0.95)))),  # through it
    (1.00, *in_office(STAND)),  # standing spot
]
# The doors swing over these scroll fractions, each before the camera reaches it: the lobby door into the lobby
# about its hinge jamb (the sign follows commons.entrance's hinge side), the office door into the office.
LOBBY_DOOR_SWING = (0.645, 0.715, 100.0)
OFFICE_DOOR_SWING = (0.935, 0.965, -90.0)
NAMEPLATE = (0.08, 1.55)  # font size (~5.6 cm capitals) and height of the plate's centre


def office_frame(m):
    door = common.gl_to_bl(m["door"])
    forward = -common.gl_to_bl(m["normal"]).normalized()  # into the building
    return Matrix.Translation(door) @ Matrix.Rotation(math.atan2(forward.y, forward.x) - math.pi / 2, 4, "Z")


def look(eye, target):
    return (Vector(target) - Vector(eye)).to_track_quat("-Z", "Y")


def camera(name, fov_deg, col, parent=None):
    data = bpy.data.cameras.new(name)
    data.sensor_fit = "VERTICAL"
    data.angle_y = math.radians(fov_deg)
    data.clip_start = 0.1
    data.clip_end = 10000
    obj = bpy.data.objects.new(name, data)
    obj.rotation_mode = "QUATERNION"
    obj.parent = parent
    col.objects.link(obj)
    return obj


def span(name, lo, hi, parent, col):
    """A box between two opposite corners, in the parent's space."""
    lo, hi = Vector(lo), Vector(hi)
    return common.box(name, hi - lo, (lo + hi) / 2, parent, col)


def boxes(name, spans, parent, col):
    """One mesh of several boxes, each given by two opposite corners in the parent's space."""
    bm = bmesh.new()
    for lo, hi in spans:
        lo, hi = Vector(lo), Vector(hi)
        verts = bmesh.ops.create_cube(bm, size=1.0)["verts"]
        bmesh.ops.scale(bm, vec=hi - lo, verts=verts)
        bmesh.ops.translate(bm, vec=(lo + hi) / 2, verts=verts)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    return common._place(bpy.data.objects.new(name, mesh), (0, 0, 0), parent, col)


def build_office(frame, col):
    root = common.empty("office_root", (0, 0, 0), None, col)
    root.matrix_world = frame
    room = common.empty("office_room", (0, 0, 0), root, col)
    room.matrix_basis = ROOM_FRAME

    # room shell: the front wall onto the corridor has the doorway, the street-side wall the window
    w, back, h = ROOM[0] / 2, WALL + ROOM[1], ROOM[2]
    door_x, door_w, door_h = ROOM_DOOR
    hole_w, hole_h = door_w + 2 * LINING, door_h + LINING
    win_y, win_w, sill, head = ROOM_WINDOW
    span("prop_floor", (-w, WALL, -0.05), (w, back, 0), room, col)
    span("prop_ceiling", (-w, WALL, h), (w, back, h + 0.05), room, col)
    span("prop_wall_back", (-w - WALL, back, 0), (w + WALL, back + WALL, h), room, col)
    span("prop_wall_right", (w, WALL, 0), (w + WALL, back, h), room, col)
    span("prop_wall_front_left", (-w - WALL, 0, 0), (door_x - hole_w / 2, WALL, h), room, col)
    span("prop_wall_front_right", (door_x + hole_w / 2, 0, 0), (w + WALL, WALL, h), room, col)
    span("prop_wall_front_lintel", (door_x - hole_w / 2, 0, hole_h), (door_x + hole_w / 2, WALL, h), room, col)
    span("prop_office_door_jamb_l", (door_x - hole_w / 2, 0, 0), (door_x - door_w / 2, WALL, door_h), room, col)
    span("prop_office_door_jamb_r", (door_x + door_w / 2, 0, 0), (door_x + hole_w / 2, WALL, door_h), room, col)
    span("prop_office_door_head", (door_x - hole_w / 2, 0, door_h), (door_x + hole_w / 2, WALL, hole_h), room, col)
    span("prop_wall_left_front", (-w - WALL, WALL, 0), (-w, win_y - win_w / 2, h), room, col)
    span("prop_wall_left_back", (-w - WALL, win_y + win_w / 2, 0), (-w, back, h), room, col)
    span("prop_window_sill", (-w - WALL, win_y - win_w / 2, 0), (-w, win_y + win_w / 2, sill), room, col)
    span("prop_window_head", (-w - WALL, win_y - win_w / 2, head), (-w, win_y + win_w / 2, h), room, col)
    furnish(room, col, w, back)
    return root, room


def furnish(room, col, w, back):
    """Furniture and dressing from office_props.py, laid out for one person. Fronts face -y, towards the camera."""
    props = office_props
    desk = Vector((-0.1, back - 0.38, 0))  # the desk's centre on the floor, its back edge 3 cm off the wall

    def on_desk(x, y):
        return Vector((desk.x + x, desk.y + y, props.DESK_HEIGHT))

    props.build_desk("prop_desk", desk, 0, room, col)
    props.build_pedestal("hs_drawer", (desk.x + 0.4, desk.y - 0.04, 0), 0, room, col)  # under the right side
    # on the desk, where build_desk_mess expects them: monitor back left of centre, laptop to its right
    monitor = on_desk(-0.15, 0.2)
    screen = props.build_monitor("hs_monitor", monitor, 0, room, col)
    # the notes stuck round its bezel are part of the monitor hotspot, so they light up with it
    props.build_monitor_notes("hs_monitor__notes", (0, 0, 0), 0, screen, col, texts=(COPY["note_bezel"],))
    # the duck sits side-on along the top of the bezel
    props.build_rubber_duck("prop_rubber_duck", monitor + Vector((0.1, 0.051, 0.441)), -math.pi / 2, room, col)
    props.build_laptop("prop_laptop", on_desk(0.32, 0.1), -0.25, room, col)
    props.build_keyboard("prop_keyboard", on_desk(-0.05, -0.15), 0, room, col)
    props.build_mouse("prop_mouse", on_desk(0.08, -0.29), 0.1, room, col)
    props.build_desk_mess("prop_desk_mess", on_desk(0, 0), 0, room, col)
    props.build_desk_lamp("prop_desk_lamp", on_desk(0.6, 0.2), 0.3, room, col)
    props.build_can_pyramid("prop_can_pyramid", on_desk(-0.565, 0.315), 0, room, col)  # the left end, clear of the monitor
    props.build_noodle_cup("prop_noodle_cup", on_desk(-0.32, 0.07), 0.4, room, col)
    props.build_mug("prop_mug", on_desk(0.03, 0.03), 0, room, col, text=COPY["mug"])
    # under the desk, turned so its climbing cables go up the left leg rather than through the pedestal
    props.build_cable_tangle("prop_cable_tangle", (desk.x - 0.3, back - 0.34, 0), math.pi / 2, room, col)
    chair_x, chair_y, chair_turn = CHAIR
    props.build_chair("prop_chair", (desk.x + chair_x, desk.y + chair_y, 0), chair_turn, room, col)
    props.build_bin("prop_bin", (0.85, 3.95, 0), 0.3, room, col)

    # record crate on the floor left of the desk; sideboard with the turntable right of it, the shelf above
    props.build_crate("hs_crate", (desk.x - 1.0, back - 0.3, 0), 0.1, room, col)
    sideboard = Vector((1.3, back - 0.23, 0))
    props.build_turntable("prop_turntable", sideboard, 0, room, col)
    # in the 0.2 m between the deck and the right speaker
    props.build_book_row("prop_book_row", sideboard + Vector((0.2, -0.05, 0.6)), 0, room, col, count=2)
    # the now-playing stand on top of the right speaker, turned to face the standing spot: the gap beside the deck
    # can't take a 0.315 m sleeve without it clipping the deck or the speaker, even turned 57 degrees
    stand_at = sideboard + Vector((0.43, -0.03, 0.9))
    to_eye = Vector(STAND[0]) - stand_at
    props.build_now_playing("prop_now_playing", stand_at, math.atan2(to_eye.x, -to_eye.y), room, col)
    props.build_shelf("hs_shelf", (sideboard.x, back, 1.55), 0, room, col)

    # on the back wall: the clock over the desk, the whiteboard and a note left of it, the Victory poster over the couch
    props.build_wall_clock("prop_wall_clock", (desk.x, back, 2.25), 0, room, col)
    props.build_whiteboard("prop_whiteboard", (-1.0, back, 1.8), 0, room, col, text=COPY["whiteboard"], note=COPY["whiteboard_note"])
    props.build_sticky_note("prop_sticky_note", (-0.6, back, 1.72), 0.05, room, col, text=COPY["note_wall"])
    props.build_poster_victory("prop_poster_victory", (-w + 0.5, back, 1.65), 0, room, col)

    # the couch on the street side with its pillow and blanket, the pizza box in front, abandoned mugs and books by it
    couch, tv = RESERVED["couch"], RESERVED["tv"]
    at_couch = Matrix.Translation((couch[0], couch[1], 0)) @ Matrix.Rotation(couch[2], 4, "Z")
    seat = 0.445  # build_couch's seat tops
    props.build_couch("prop_couch", at_couch.translation, couch[2], room, col)
    props.build_pillow("prop_pillow", at_couch @ Vector((-0.5, -0.1, seat)), couch[2], room, col, tilt=70)
    props.build_blanket("prop_blanket", at_couch @ Vector((0.34, -0.225, seat)), couch[2], room, col)  # fold on the seat edge
    props.build_pizza_box("prop_pizza_box", at_couch @ Vector((-0.35, -0.85, 0)), couch[2] + 0.3, room, col)
    props.build_mug_cluster("prop_mug_cluster", (-0.75, 3.35, 0), 0.2, room, col)
    props.build_book_stack("prop_book_stack", (couch[0] + 0.6, couch[1] - couch[3] / 2 - 0.25, 0), 0.3, room, col)

    # the old telly facing the couch, a poster over it, and on top the healthy snake plant beside the wilted one
    at_tv = Matrix.Translation((tv[0], tv[1], 0)) @ Matrix.Rotation(tv[2], 4, "Z")
    props.build_old_tv("prop_old_tv", at_tv.translation, tv[2], room, col)
    props.build_snake_plant("prop_snake_plant", at_tv @ Vector((-0.17, 0.13, 0.89)), tv[2], room, col)
    props.build_plant_wilted("prop_plant_wilted", at_tv @ Vector((0.14, 0.12, 0.89)), tv[2], room, col)
    props.build_poster_hang_in_there("prop_poster_hang", (w, tv[1], 1.7), -math.pi / 2, room, col)

    props.build_monstera("prop_monstera", (-w + 0.73, WALL + 0.65, 0), 0, room, col)  # by the window, 5 cm off both walls


def build_corridor(root, col, lobby_north):
    """The corridor from the lobby's north wall up the office's west side, and the stub along the office's north side
    to its door. The office's own walls are its east and south sides."""
    width, height = CORRIDOR
    office_back = OFFICE_AT[0] - ROOM[1] - 2 * WALL
    west, north = OFFICE_WEST + width, OFFICE_AT[0] + width
    span("prop_corridor_floor", (lobby_north, OFFICE_WEST, -0.01), (north, west, 0), root, col)
    span("prop_corridor_stub_floor", (OFFICE_AT[0], STUB_END, -0.01), (north, OFFICE_WEST, 0), root, col)
    span("prop_corridor_ceiling", (office_back, OFFICE_WEST, height), (north, west, height + 0.05), root, col)
    span("prop_corridor_stub_ceiling", (OFFICE_AT[0], STUB_END, height), (north, OFFICE_WEST, height + 0.05), root, col)
    span("prop_corridor_wall_west", (office_back, west, 0), (north + WALL, west + WALL, height), root, col)
    span("prop_corridor_wall_north", (north, STUB_END - WALL, 0), (north + WALL, west, height), root, col)
    span("prop_corridor_wall_end", (OFFICE_AT[0], STUB_END - WALL, 0), (north, STUB_END, height), root, col)


def build_lobby(frame, root, col, fp):
    """Fits out commons.lobby(), which has a floor, a ceiling and the glazed front: a north wall with the corridor's
    opening, a back wall with two lifts and the mailboxes, and a reception counter. Returns the lobby's north edge."""
    lobby = commons.lobby(fp)
    inv = frame.inverted()
    corners = [inv @ Vector(c) for c in lobby["corners"]]
    south, north = min(p.x for p in corners), max(p.x for p in corners)
    back, floor, ceiling = max(p.y for p in corners), lobby["floor"], lobby["ceiling"]
    office_back = OFFICE_AT[0] - ROOM[1] - 2 * WALL
    entry = inv @ Vector(commons.entrance(fp)["centre"])
    if north > office_back - 0.05 or abs(entry.x - ENTRY) > 0.05:
        raise RuntimeError(f"the lobby moved (north edge {north:.2f}, entrance {entry.x:.2f}): update OFFICE_AT and ENTRY")
    width, height = CORRIDOR
    span("prop_lobby_wall_north", (north, 0, floor), (office_back, OFFICE_WEST, ceiling), root, col)
    span("prop_lobby_wall_north_head", (north, OFFICE_WEST, height), (office_back, OFFICE_WEST + width, ceiling), root, col)
    span("prop_lobby_wall_north_back", (north, OFFICE_WEST + width, floor), (office_back, back + 0.15, ceiling), root, col)
    span("prop_lobby_wall_back", (south, back, floor), (north, back + 0.15, ceiling), root, col)

    # each lift: a surround proud of the wall, two door panels meeting in the middle, a call button and an indicator
    for i, x in enumerate(LIFTS):
        boxes(f"prop_lift_{i}", [
            ((x - 0.65, back - 0.03, 0), (x - 0.55, back, 2.35)), ((x + 0.55, back - 0.03, 0), (x + 0.65, back, 2.35)),
            ((x - 0.65, back - 0.03, 2.2), (x + 0.65, back, 2.35)),
            ((x - 0.545, back - 0.012, 0), (x - 0.005, back, 2.19)), ((x + 0.005, back - 0.012, 0), (x + 0.545, back, 2.19)),
            ((x + 0.75, back - 0.02, 1.0), (x + 0.83, back, 1.18)), ((x - 0.25, back - 0.02, 2.45), (x + 0.25, back, 2.55)),
        ], root, col)
    # a cabinet of 8 x 4 mailbox doors
    x0, x1 = south + MAILBOXES[0], south + MAILBOXES[1]
    z0, z1, cols, rows = 0.9, 2.1, 8, 4
    doors = [((x0, back - 0.25, z0), (x1, back, z1))]
    for c in range(cols):
        for r in range(rows):
            u0, v0 = x0 + (x1 - x0) * c / cols, z0 + (z1 - z0) * r / rows
            u1, v1 = x0 + (x1 - x0) * (c + 1) / cols, z0 + (z1 - z0) * (r + 1) / rows
            doors.append(((u0 + 0.015, back - 0.256, v0 + 0.015), (u1 - 0.015, back - 0.25, v1 - 0.015)))
    boxes("prop_mailboxes", doors, root, col)
    c0, c1 = COUNTER
    boxes("prop_reception", [
        ((c0, back - 1.6, 0), (c1, back - 0.9, 1.08)), ((c0 - 0.03, back - 1.63, 1.08), (c1 + 0.03, back - 0.87, 1.12)),
        ((c0 + 0.1, back - 0.9, 0), (c1 - 0.1, back - 0.85, 0.75)),
    ], root, col)
    return north


def place(cam, eye, target):
    cam.location = eye
    cam.rotation_quaternion = look(eye, target)


def build_walkin(frame, street):
    old = bpy.data.objects.get("cam_walkin")
    if old:
        data = old.data
        bpy.data.objects.remove(old, do_unlink=True)
        if data.users == 0:
            bpy.data.cameras.remove(data)  # or the new camera's data gets a .001 name
    for action in [a for a in bpy.data.actions if a.name.startswith("cam_walkin")]:
        bpy.data.actions.remove(action)

    scene = bpy.context.scene
    scene.render.fps = FPS
    scene.frame_start = 0
    scene.frame_end = WALKIN_FRAMES

    cam = camera("cam_walkin", CAMERA_FOV_DEG, street)
    previous = None
    for fraction, eye, target in WALKIN_KEYS:
        eye_w, target_w = frame @ Vector(eye), frame @ Vector(target)
        q = look(eye_w, target_w)
        if previous is not None and previous.dot(q) < 0:
            q.negate()  # stay in one hemisphere so Blender doesn't spin the long way round
        cam.location = eye_w
        cam.rotation_quaternion = q
        f = round(fraction * WALKIN_FRAMES)
        cam.keyframe_insert("location", frame=f)
        cam.keyframe_insert("rotation_quaternion", frame=f)
        previous = q
    return cam


def build_commons(frame, street, fp):
    """prop_commons (commons.py) on helper_commons_footprint, with the office window cut through its front wall."""
    win_y, win_w, sill, head = ROOM_WINDOW
    window = {"centre": frame @ ROOM_FRAME @ Vector((-ROOM[0] / 2, win_y, sill)), "normal": commons.entrance(fp)["normal"],
              "width": win_w, "height": head - sill}
    return commons.commons(fp, street, [window])


def swing(name, action, closed, spec):
    """Keys `action` on the object `name`: a turn about its hinge from `closed` (radians about z) by spec[2] degrees,
    between scroll fractions spec[0] and spec[1] of the walk-in."""
    obj = bpy.data.objects.get(name)
    if obj is None:
        return None
    obj.animation_data_clear()
    for old in [a for a in bpy.data.actions if a.name.startswith(action)]:
        bpy.data.actions.remove(old)
    start, end, angle = spec
    for fraction, z in ((start, closed), (end, closed + math.radians(angle))):
        obj.rotation_euler.z = z
        obj.keyframe_insert("rotation_euler", index=2, frame=round(fraction * WALKIN_FRAMES))
    obj.animation_data.action.name = action
    return obj


def remove_tree(name):
    """Removes an object, its children and the meshes they leave unused."""
    obj = bpy.data.objects.get(name)
    if obj is None:
        return
    for o in [obj, *obj.children_recursive]:
        data = o.data
        bpy.data.objects.remove(o, do_unlink=True)
        if data is not None and data.users == 0:
            bpy.data.meshes.remove(data)


def leaf(name, parts, location, turn, street):
    """A door leaf: one mesh of boxes (two opposite corners each, in its hinge frame), origin on the hinge."""
    remove_tree(name)
    bm = bmesh.new()
    for lo, hi in parts:
        lo, hi = Vector(lo), Vector(hi)
        verts = bmesh.ops.create_cube(bm, size=1.0)["verts"]
        bmesh.ops.scale(bm, vec=hi - lo, verts=verts)
        bmesh.ops.translate(bm, vec=(lo + hi) / 2, verts=verts)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = location
    obj.rotation_euler.z = turn
    street.objects.link(obj)
    return obj


def lobby_door(fp, street):
    """prop_lobby_door: the glazed lobby door in commons.entrance(), hung on its hinge jamb at the inside of the reveal
    so it swings into the lobby. A slim frame round a black pane (it renders opaque) and a pull handle on the street
    side. It lives in street, on the walk-in's timeline. Returns it and the sign of its opening turn."""
    entrance = commons.entrance(fp)
    inward = -Vector(entrance["normal"]).normalized()
    across = Vector((inward.y, -inward.x, 0))  # to the right, walking in
    hand = 1 if entrance["hinge_side"] == "left" else -1  # the leaf runs from the hinge towards +x for a left hinge
    width, height, thick = entrance["width"] - 0.01, entrance["height"] - 0.01, 0.05
    stile, rail, kick, z0 = 0.06, 0.08, 0.18, 0.005

    def x(a, b):
        return sorted((hand * a, hand * b))

    def part(x0, x1, y0, y1, za, zb):
        lo, hi = x(x0, x1)
        return (lo, y0, za), (hi, y1, zb)

    top = z0 + height
    parts = [
        part(0, stile, -thick, 0, z0, top), part(width - stile, width, -thick, 0, z0, top),
        part(stile, width - stile, -thick, 0, top - rail, top), part(stile, width - stile, -thick, 0, z0, z0 + kick),
        part(stile, width - stile, -thick / 2 - 0.006, -thick / 2 + 0.006, z0 + kick, top - rail),  # the pane
        part(width - 0.14, width - 0.115, -thick - 0.08, -thick - 0.055, 0.55, 1.65),  # pull bar, street side
        part(width - 0.137, width - 0.118, -thick - 0.055, -thick, 0.65, 0.67),
        part(width - 0.137, width - 0.118, -thick - 0.055, -thick, 1.53, 1.55),
    ]
    hinge = Vector(entrance["centre"]) - across * hand * (entrance["width"] / 2 - 0.005) + inward * commons.REVEAL
    turn = math.atan2(inward.y, inward.x) - math.pi / 2
    return leaf("prop_lobby_door", parts, hinge, turn, street), hand


def office_door(frame, street):
    """prop_office_door: a solid interior door with lever handles, hinged on the office doorway's west jamb and
    opening into the office, with the nameplate on its corridor face. It lives in street so it shares the walk-in's
    timeline. Origin on the hinge, on the room-side face of the wall."""
    door_x, width, height = ROOM_DOOR
    leaf_w, leaf_h, thick = width - 0.006, height - 0.008, 0.04

    def part(size, centre):
        size, centre = Vector(size), Vector(centre)
        return centre - size / 2, centre + size / 2

    # the leaf runs from the hinge along -x and sits in the wall towards the corridor (-y)
    parts = [part((leaf_w, thick, leaf_h), (-leaf_w / 2, -thick / 2, 0.004 + leaf_h / 2))]
    handle_x = -leaf_w + 0.07
    for face, out in ((-thick, -1), (0.0, 1)):  # a lever on each face, pointing back towards the hinge
        parts += [part((0.05, 0.01, 0.05), (handle_x, face + out * 0.005, 1.0)),  # rose
                  part((0.02, 0.03, 0.02), (handle_x, face + out * 0.02, 1.0)),  # neck
                  part((0.13, 0.02, 0.02), (handle_x + 0.055, face + out * 0.04, 1.0))]  # lever
    size, plate_z = NAMEPLATE
    parts.append(part((leaf_w - 0.08, 0.004, 0.1), (-leaf_w / 2, -thick - 0.002, plate_z)))
    hinge = frame @ ROOM_FRAME
    door = leaf("prop_office_door", parts, hinge @ Vector((door_x + width / 2 - 0.003, WALL, 0)), hinge.to_euler().z, street)
    common.text_mesh("prop_office_door__sign", COPY["nameplate"], size, 0.004, (-leaf_w / 2, -thick - 0.004, plate_z), door, street)
    return door


def main():
    m = common.meta()
    frame = office_frame(m)
    fp = bpy.data.objects["helper_commons_footprint"]
    office = common.collection("office")
    street = common.collection("street")
    common.clear(office)
    root, room = build_office(frame, office)
    build_corridor(root, office, build_lobby(frame, root, office, fp))
    place(camera("cam_stand", CAMERA_FOV_DEG, office, room), *STAND)
    place(camera("cam_stand_portrait", PORTRAIT_FOV_DEG, office, room), *PORTRAIT)
    build_commons(frame, street, fp)
    build_walkin(frame, street)
    door, hand = lobby_door(fp, street)
    start, end, angle = LOBBY_DOOR_SWING
    swing("prop_lobby_door", "anim_lobby_door_swing", door.rotation_euler.z, (start, end, hand * angle))
    office_door(frame, street)
    swing("prop_office_door", "anim_office_door_swing", (frame @ ROOM_FRAME).to_euler().z, OFFICE_DOOR_SWING)
    common.save()
    return {"office_objects": len(office.all_objects), "origin": [round(v, 2) for v in frame.translation], "frames": WALKIN_FRAMES}


if __name__ == "__main__":
    SUMMARY = main()

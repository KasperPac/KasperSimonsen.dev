"""Grey-box hallway and office, camera poses and the walk-in camera for art/office.blend.

Run after setup_street.py. Re-runnable: rebuilds the office collection and cam_walkin.
Tune the walk-in by editing WALKIN_KEYS, re-running this, then export.py.
"""
import importlib
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, str(Path(__file__).parent))
import common  # noqa: E402

importlib.reload(common)

FPS = 24
WALKIN_FRAMES = 240  # clip length only; scroll maps onto it
CAMERA_FOV_DEG = 50.0  # vertical; shared by the walk-in and the standing spot so there's no jump
PORTRAIT_FOV_DEG = 85.0  # wide enough for crate-to-shelf across a 3.5 m office on a phone

# The office frame: metres, origin at the door on the facade, +x along the facade (right when facing in),
# +y into the building, +z up. A hallway runs in from the door; the office opens off its left wall, against the
# facade so it can have a window back to Gwynne St, and the hallway carries on past it.
HALL = (1.9, 8.0, 2.7)  # interior width, length and ceiling height
HALL_START = 0.02  # just behind the facade, which runs a fraction of a degree off square to the door normal
WALL = 0.1
ROOM = (3.5, 4.0, 2.7)  # interior width (along the hallway), depth and ceiling height: a one-person office
ROOM_DOOR = (0.8, 1.1, 2.2)  # centre (room frame x), width, height; clear of the open street door
ROOM_WINDOW = (2.0, 1.4, 0.9, 2.2)  # in the street-side wall: centre (room frame y), width, sill, head
# The room's own frame: origin on the face of the hallway's left wall, +y into the room, +x along the hallway
# (deeper into the building). Its street-side wall sits just behind the facade.
ROOM_FRAME = Matrix.Translation((-HALL[0] / 2, HALL_START + WALL + ROOM[0] / 2, 0)) @ Matrix.Rotation(math.pi / 2, 4, "Z")
STAND = ((0.35, 1.1, 1.6), (0.05, 3.7, 0.95))  # room frame: the standing spot, facing the desk
PORTRAIT = ((0.0, 0.25, 1.6), (0.0, 3.6, 0.95))  # room frame, back against the front wall


def in_office(pose):
    """(eye, look-at) in the room frame -> the office frame."""
    return tuple(tuple(ROOM_FRAME @ Vector(p)) for p in pose)


# (scroll fraction, eye, look-at) in the office frame.
WALKIN_KEYS = [
    (0.00, (-40.0, -230.0, 195.0), (63.0, 254.0, 0.0)),  # 21.5 deg down over Cremorne; Nylex, AAMI, MCG, CBD beyond
    (0.45, (0.0, -45.0, 22.0), (0.0, 30.0, 2.0)),  # descending towards the facade
    (0.60, (0.0, -10.0, 9.0), (0.0, 20.0, 2.0)),  # over the roof across Gwynne St, clear of its edge
    (0.70, (0.0, -4.0, 1.65), (0.0, 10.0, 1.6)),  # at the door, eye height
    (0.80, (0.0, -1.6, 1.65), (0.0, 10.0, 1.6)),  # up to the door while it swings open
    (0.86, (0.0, 1.2, 1.65), (-1.5, 4.5, 1.55)),  # through the door, looking along the hallway to the office door
    (0.91, *in_office(((ROOM_DOOR[0], -0.7, 1.65), (ROOM_DOOR[0] + 0.1, 4.0, 1.3)))),  # turned left at the office door
    (0.95, *in_office(((ROOM_DOOR[0] - 0.1, 0.6, 1.62), (0.1, 3.8, 1.05)))),  # through it
    (1.00, *in_office(STAND)),  # standing spot
]
# prop_commons_door (built by setup_street.py) swings in over these scroll fractions, before the camera reaches
# it. It stops at 90 degrees: the leaf is as wide as the doorway, so any further and it would hit the hallway wall.
DOOR_SWING = (0.72, 0.82, 90.0)


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


def build_office(frame, col):
    box, cyl = common.box, common.cylinder
    root = common.empty("office_root", (0, 0, 0), None, col)
    root.matrix_world = frame

    def span(name, lo, hi, parent):
        """A box between two opposite corners, in the parent's space."""
        lo, hi = Vector(lo), Vector(hi)
        return box(name, hi - lo, (lo + hi) / 2, parent, col)

    # hallway in from the street door; the office's front wall is its left wall as far as the office goes
    width, length, height = HALL
    side, y0 = width / 2, HALL_START
    office_end = ROOM_FRAME.translation.y + ROOM[0] / 2 + WALL
    # thin floor, so its front edge under the street door sits on the facade's base line
    span("prop_hall_floor", (-side - WALL, y0, -0.01), (side + WALL, length, 0), root)
    span("prop_hall_ceiling", (-side - WALL, y0, height), (side + WALL, length, height + 0.05), root)
    span("prop_hall_wall_right", (side, y0, 0), (side + WALL, length, height), root)
    span("prop_hall_wall_left", (-side - WALL, office_end, 0), (-side, length, height), root)
    span("prop_hall_wall_end", (-side, length, 0), (side + WALL, length + WALL, height), root)

    room = common.empty("office_room", (0, 0, 0), root, col)
    room.matrix_basis = ROOM_FRAME

    # room shell: the front wall onto the hallway has the doorway, the street-side wall the window
    w, back, h = ROOM[0] / 2, WALL + ROOM[1], ROOM[2]
    door_x, door_w, door_h = ROOM_DOOR
    win_y, win_w, sill, head = ROOM_WINDOW
    span("prop_floor", (-w, WALL, -0.05), (w, back, 0), room)
    span("prop_ceiling", (-w, WALL, h), (w, back, h + 0.05), room)
    span("prop_wall_back", (-w - WALL, back, 0), (w + WALL, back + WALL, h), room)
    span("prop_wall_right", (w, WALL, 0), (w + WALL, back, h), room)
    span("prop_wall_front_left", (-w - WALL, 0, 0), (door_x - door_w / 2, WALL, h), room)
    span("prop_wall_front_right", (door_x + door_w / 2, 0, 0), (w + WALL, WALL, h), room)
    span("prop_wall_front_lintel", (door_x - door_w / 2, 0, door_h), (door_x + door_w / 2, WALL, h), room)
    span("prop_wall_left_front", (-w - WALL, WALL, 0), (-w, win_y - win_w / 2, h), room)
    span("prop_wall_left_back", (-w - WALL, win_y + win_w / 2, 0), (-w, back, h), room)
    span("prop_window_sill", (-w - WALL, win_y - win_w / 2, 0), (-w, win_y + win_w / 2, sill), room)
    span("prop_window_head", (-w - WALL, win_y - win_w / 2, head), (-w, win_y + win_w / 2, h), room)

    # desk against the back wall, drawer pedestal under its right side, chair tucked in left of centre so it
    # hides neither the drawer nor the crate from the standing spot
    y = back - 0.45  # the desk's centre line
    box("prop_desk_top", (1.6, 0.8, 0.04), (0, y, 0.74), room, col)
    box("prop_desk_leg_l0", (0.04, 0.04, 0.72), (-0.76, y - 0.36, 0.36), room, col)
    box("prop_desk_leg_l1", (0.04, 0.04, 0.72), (-0.76, y + 0.36, 0.36), room, col)
    box("prop_pedestal", (0.45, 0.7, 0.72), (0.55, y, 0.36), room, col)
    box("hs_drawer", (0.41, 0.03, 0.2), (0.55, y - 0.365, 0.6), room, col)
    box("prop_chair_seat", (0.45, 0.45, 0.05), (-0.2, y - 0.55, 0.45), room, col)
    box("prop_chair_back", (0.45, 0.05, 0.5), (-0.2, y - 0.77, 0.72), room, col)

    # on the desk
    box("hs_monitor", (0.64, 0.04, 0.38), (0, y + 0.25, 1.12), room, col)
    box("prop_monitor_stand", (0.05, 0.04, 0.18), (0, y + 0.28, 0.85), room, col)
    box("prop_monitor_base", (0.24, 0.17, 0.015), (0, y + 0.28, 0.768), room, col)
    box("prop_keyboard", (0.44, 0.15, 0.022), (0, y - 0.2, 0.771), room, col)
    cyl("prop_mug", 0.04, 0.1, (-0.5, y - 0.2, 0.81), room, col)
    packet = box("prop_chip_packet", (0.17, 0.24, 0.05), (-0.35, y + 0.05, 0.785), room, col)
    packet.rotation_euler.z = 0.5

    # record crate on the floor, left of the desk
    crate = common.empty("hs_crate", (-1.15, y - 0.2, 0), room, col)
    box("hs_crate__side_l", (0.02, 0.4, 0.32), (-0.19, 0, 0.16), crate, col)
    box("hs_crate__side_r", (0.02, 0.4, 0.32), (0.19, 0, 0.16), crate, col)
    box("hs_crate__front", (0.4, 0.02, 0.32), (0, -0.19, 0.16), crate, col)
    box("hs_crate__back", (0.4, 0.02, 0.32), (0, 0.19, 0.16), crate, col)
    box("hs_crate__bottom", (0.4, 0.4, 0.02), (0, 0, 0.01), crate, col)
    for i in range(9):
        record = box(f"hs_crate__record_{i:02d}", (0.31, 0.006, 0.31), (0, -0.13 + i * 0.032, 0.17), crate, col)
        record.rotation_euler.x = -0.18 + i * 0.012

    # ornament shelf on the back wall, right of the desk
    shelf = common.empty("hs_shelf", (1.1, back - 0.15, 1.55), room, col)
    box("hs_shelf__board", (0.8, 0.25, 0.03), (0, 0, 0), shelf, col)
    box("hs_shelf__ornament_00", (0.14, 0.14, 0.14), (-0.2, 0, 0.085), shelf, col)
    cyl("hs_shelf__ornament_01", 0.07, 0.16, (0.2, 0, 0.095), shelf, col)
    return root, room


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


def cut_window(frame):
    """The office window, cut through The Commons' facade too: a second boolean on osm_commons."""
    commons = bpy.data.objects.get("osm_commons")
    if commons is None:
        return None
    old = bpy.data.objects.get("helper_window_cutter")
    if old:
        data = old.data
        bpy.data.objects.remove(old, do_unlink=True)
        bpy.data.meshes.remove(data)
    win_y, win_w, sill, head = ROOM_WINDOW
    centre = ROOM_FRAME @ Vector((0, win_y, (sill + head) / 2))
    centre.y = 0.0  # on the facade
    cutter = common.box("helper_window_cutter", (win_w, 1.0, head - sill), frame @ centre, None, common.collection("helpers"))
    cutter.rotation_euler.z = frame.to_euler().z
    cutter.display_type = "WIRE"
    cutter.hide_render = True
    mod = commons.modifiers.get("window") or commons.modifiers.new("window", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.object = cutter
    mod.solver = "EXACT"
    mod.use_self = True
    mod.use_hole_tolerant = True
    return cutter


def swing_door(frame):
    """anim_door_swing on prop_commons_door, on the walk-in's timeline. It opens inwards about its hinge."""
    door = bpy.data.objects.get("prop_commons_door")
    if door is None:
        return None
    door.animation_data_clear()
    for action in [a for a in bpy.data.actions if a.name.startswith("anim_door_swing")]:
        bpy.data.actions.remove(action)
    closed = frame.to_euler().z
    start, end, angle = DOOR_SWING
    for fraction, z in ((start, closed), (end, closed + math.radians(angle))):
        door.rotation_euler.z = z
        door.keyframe_insert("rotation_euler", index=2, frame=round(fraction * WALKIN_FRAMES))
    door.animation_data.action.name = "anim_door_swing"
    return door


def main():
    m = common.meta()
    frame = office_frame(m)
    office = common.collection("office")
    common.clear(office)
    _, room = build_office(frame, office)
    cut_window(frame)
    place(camera("cam_stand", CAMERA_FOV_DEG, office, room), *STAND)
    place(camera("cam_stand_portrait", PORTRAIT_FOV_DEG, office, room), *PORTRAIT)
    build_walkin(frame, common.collection("street"))
    swing_door(frame)
    common.save()
    return {"office_objects": len(office.all_objects), "door": [round(v, 2) for v in frame.translation], "frames": WALKIN_FRAMES}


if __name__ == "__main__":
    SUMMARY = main()

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
PORTRAIT_FOV_DEG = 75.0

# The office frame: metres, origin at the door on the facade, +x along the facade (right when facing in),
# +y into the building, +z up. A hallway runs in from the door and the room opens off its left wall.
HALL = (1.9, 8.0, 2.7)  # interior width, length and ceiling height
ROOM_DOOR_Y = 6.8  # centre of the room's doorway in the hallway's left wall
# The room's own frame: origin on its doorway's centre line, +y into the room. Its front wall is at y = 0.25
# in that frame, so this puts the wall on the hallway's left wall, with the room facing out of it.
ROOM_FRAME = Matrix.Translation((-HALL[0] / 2 - 0.05 + 0.25, ROOM_DOOR_Y, 0)) @ Matrix.Rotation(math.pi / 2, 4, "Z")
STAND = ((0.0, 1.6, 1.6), (0.0, 6.6, 1.0))  # room frame: the standing spot, facing the desk
PORTRAIT = ((0.0, 0.6, 1.7), (0.3, 6.6, 1.1))  # room frame


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
    (0.86, (0.0, 1.6, 1.65), (0.0, 10.0, 1.6)),  # through the door into the hallway
    (0.92, (0.0, 5.2, 1.65), (-2.0, 9.0, 1.5)),  # down the hallway, starting to look left
    (0.96, (-0.3, 6.8, 1.65), (-6.0, 7.0, 1.3)),  # turning left into the room
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

    # hallway in from the street door
    width, length, height = HALL
    wall_x = width / 2 + 0.05
    y0 = 0.02  # just behind the facade, which runs a fraction of a degree off square to the door normal
    y1 = ROOM_DOOR_Y - 4.0  # the room's front wall (8 m, centred on its doorway) takes over the left side here
    # thin, so its front edge under the street door sits on the facade's base line
    box("prop_hall_floor", (width + 0.2, length - y0, 0.01), (0, (y0 + length) / 2, -0.005), root, col)
    box("prop_hall_ceiling", (width + 0.2, length - y0, 0.05), (0, (y0 + length) / 2, height + 0.025), root, col)
    box("prop_hall_wall_right", (0.1, length - y0, height), (wall_x, (y0 + length) / 2, height / 2), root, col)
    box("prop_hall_wall_left", (0.1, y1 - y0, height), (-wall_x, (y0 + y1) / 2, height / 2), root, col)
    box("prop_hall_wall_end", (width + 0.1, 0.1, height), (0.05, length + 0.05, height / 2), root, col)

    room = common.empty("office_room", (0, 0, 0), root, col)
    room.matrix_basis = ROOM_FRAME

    # room shell, 8 x 7 x 3.2 m, with a doorway in the front wall onto the hallway
    box("prop_floor", (8, 7, 0.05), (0, 3.8, -0.025), room, col)
    box("prop_ceiling", (8, 7, 0.05), (0, 3.8, 3.225), room, col)
    box("prop_wall_back", (8, 0.1, 3.2), (0, 7.35, 1.6), room, col)
    box("prop_wall_left", (0.1, 7, 3.2), (-4.05, 3.8, 1.6), room, col)
    box("prop_wall_right", (0.1, 7, 3.2), (4.05, 3.8, 1.6), room, col)
    box("prop_wall_front_left", (3.1, 0.1, 3.2), (-2.45, 0.25, 1.6), room, col)
    box("prop_wall_front_right", (3.1, 0.1, 3.2), (2.45, 0.25, 1.6), room, col)
    box("prop_wall_front_lintel", (1.8, 0.1, 0.6), (0, 0.25, 2.9), room, col)

    # desk against the back wall, drawer pedestal under its right side
    box("prop_desk_top", (1.6, 0.8, 0.04), (0, 6.5, 0.74), room, col)
    box("prop_desk_leg_l0", (0.04, 0.04, 0.72), (-0.76, 6.14, 0.36), room, col)
    box("prop_desk_leg_l1", (0.04, 0.04, 0.72), (-0.76, 6.86, 0.36), room, col)
    box("prop_pedestal", (0.45, 0.7, 0.72), (0.55, 6.5, 0.36), room, col)
    box("hs_drawer", (0.41, 0.03, 0.2), (0.55, 6.135, 0.6), room, col)

    # on the desk
    box("hs_monitor", (0.64, 0.04, 0.38), (0, 6.75, 1.12), room, col)
    box("prop_monitor_stand", (0.05, 0.04, 0.18), (0, 6.78, 0.85), room, col)
    box("prop_monitor_base", (0.24, 0.17, 0.015), (0, 6.78, 0.768), room, col)
    box("prop_keyboard", (0.44, 0.15, 0.022), (0, 6.3, 0.771), room, col)
    cyl("prop_mug", 0.04, 0.1, (-0.5, 6.3, 0.81), room, col)
    packet = box("prop_chip_packet", (0.17, 0.24, 0.05), (-0.35, 6.55, 0.785), room, col)
    packet.rotation_euler.z = 0.5
    box("prop_chair_seat", (0.45, 0.45, 0.05), (0.6, 5.6, 0.45), room, col)
    box("prop_chair_back", (0.45, 0.05, 0.5), (0.6, 5.38, 0.72), room, col)

    # record crate on the floor, left of the desk
    crate = common.empty("hs_crate", (-1.4, 6.3, 0), room, col)
    box("hs_crate__side_l", (0.02, 0.4, 0.32), (-0.19, 0, 0.16), crate, col)
    box("hs_crate__side_r", (0.02, 0.4, 0.32), (0.19, 0, 0.16), crate, col)
    box("hs_crate__front", (0.4, 0.02, 0.32), (0, -0.19, 0.16), crate, col)
    box("hs_crate__back", (0.4, 0.02, 0.32), (0, 0.19, 0.16), crate, col)
    box("hs_crate__bottom", (0.4, 0.4, 0.02), (0, 0, 0.01), crate, col)
    for i in range(9):
        record = box(f"hs_crate__record_{i:02d}", (0.31, 0.006, 0.31), (0, -0.13 + i * 0.032, 0.17), crate, col)
        record.rotation_euler.x = -0.18 + i * 0.012

    # ornament shelf on the back wall, right of the desk
    shelf = common.empty("hs_shelf", (2.0, 7.15, 1.55), room, col)
    box("hs_shelf__board", (1.4, 0.25, 0.03), (0, 0, 0), shelf, col)
    box("hs_shelf__ornament_00", (0.14, 0.14, 0.14), (-0.35, 0, 0.085), shelf, col)
    cyl("hs_shelf__ornament_01", 0.07, 0.16, (0.35, 0, 0.095), shelf, col)
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
    place(camera("cam_stand", CAMERA_FOV_DEG, office, room), *STAND)
    place(camera("cam_stand_portrait", PORTRAIT_FOV_DEG, office, room), *PORTRAIT)
    build_walkin(frame, common.collection("street"))
    swing_door(frame)
    common.save()
    return {"office_objects": len(office.all_objects), "door": [round(v, 2) for v in frame.translation], "frames": WALKIN_FRAMES}


if __name__ == "__main__":
    SUMMARY = main()

"""Saves art/office.blend and exports the street and office collections to art/export/*.glb."""
import importlib
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).parent))
import common  # noqa: E402

importlib.reload(common)

# The site plays one street clip, so the street bakes the scene: the camera and the door on one 0-240 timeline.
EXPORTS = {"street": ("street.glb", "SCENE"), "office": ("office.glb", "ACTIONS")}


def export(collection_name, filename, animation_mode):
    objects = set(bpy.data.collections[collection_name].all_objects)
    for obj in bpy.context.view_layer.objects:
        obj.select_set(obj in objects)
    out = common.REPO / "art" / "export" / filename
    out.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(out),
        export_format="GLB",
        use_selection=True,
        export_cameras=True,
        export_animations=True,
        export_animation_mode=animation_mode,
        export_anim_scene_split_object=False,  # SCENE only: one animation, not one per object
        export_force_sampling=True,
        export_anim_slide_to_zero=True,
        export_apply=True,  # applies the doorway boolean
        export_yup=True,
        export_normals=False,  # the clean-edge renderer doesn't light anything
        export_texcoords=False,
        export_materials="NONE",
        export_extras=True,
    )
    return {"objects": len(objects), "kb": round(out.stat().st_size / 1024)}


def main():
    common.save()
    return {name: export(name, *args) for name, args in EXPORTS.items()}


if __name__ == "__main__":
    SUMMARY = main()

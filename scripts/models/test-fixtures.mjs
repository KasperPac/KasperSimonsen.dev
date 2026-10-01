import { Document } from "@gltf-transform/core";

/** A small office-like glTF: hotspots under office_root, a shared mesh, an empty pivot, an animated camera. */
export function sampleDocument({ withAnimation = true } = {}) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const accessor = (type, array) => doc.createAccessor().setType(type).setArray(array).setBuffer(buffer);

  const cube = doc.createMesh("cube").addPrimitive(
    doc
      .createPrimitive()
      .setAttribute("POSITION", accessor("VEC3", new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1])))
      .setIndices(accessor("SCALAR", new Uint16Array([0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0]))),
  );
  const drawer = doc.createNode("hs_drawer").setMesh(cube).setTranslation([0.5, 0.3, 6.5]);
  const shelf = doc.createNode("hs_shelf").setMesh(cube).setTranslation([2.2, 1.55, 7.15]);
  const pivot = doc.createNode("hs_monitor_pivot").setTranslation([0, 1.1, 6.7]);
  const root = doc.createNode("office_root").setTranslation([10, 0, 5]).addChild(drawer).addChild(shelf).addChild(pivot);
  const camera = doc.createCamera("lens").setType("perspective").setYFov(0.87).setZNear(0.1).setZFar(10000);
  const walkin = doc.createNode("cam_walkin").setCamera(camera).setTranslation([0, 90, 180]);
  doc.createScene("scene").addChild(root).addChild(walkin);

  if (withAnimation) {
    const sampler = doc
      .createAnimationSampler()
      .setInput(accessor("SCALAR", new Float32Array([0, 10])))
      .setOutput(accessor("VEC3", new Float32Array([0, 90, 180, 0, 1.6, 1.6])))
      .setInterpolation("LINEAR");
    const channel = doc.createAnimationChannel().setTargetNode(walkin).setTargetPath("translation").setSampler(sampler);
    doc.createAnimation("cam_walkinAction").addSampler(sampler).addChannel(channel);
  }
  return doc;
}

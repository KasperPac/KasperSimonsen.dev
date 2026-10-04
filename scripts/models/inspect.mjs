/** What the runtime cares about in a glTF Document: node names, camera nodes, animated nodes. */
export function inspectDocument(doc) {
  const root = doc.getRoot();
  const nodes = root.listNodes();
  const animated = new Set();
  for (const animation of root.listAnimations()) {
    for (const channel of animation.listChannels()) {
      const name = channel.getTargetNode()?.getName();
      if (name) animated.add(name);
    }
  }
  return {
    nodes: nodes.map((n) => n.getName()),
    cameras: nodes.filter((n) => n.getCamera()).map((n) => n.getName()),
    animated: [...animated],
  };
}

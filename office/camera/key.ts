/**
 * What the camera is set to show: a change starts a move. It changes with the director's state, the object, a record
 * going onto the player (the crate's other view), and the object's cameras arriving with the model, so a click made
 * before the office has loaded still gets its move once it lands.
 */
export function cameraKey(kind: string, hotspot: string | null, playing: boolean, hasCams: boolean): string {
  return `${kind}:${hotspot ?? ""}${playing ? ":playing" : ""}${hasCams ? "" : ":nocams"}`;
}

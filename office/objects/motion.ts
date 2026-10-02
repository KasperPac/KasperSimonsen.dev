import { Vector3, type Object3D } from "three";
import { work } from "@/content/work";
import type { HotspotName } from "../hotspots/registry";

/** Runtime node names (office.glb). office/nodes.test.ts keeps them required by the manifest. */
export const DRAWER_NODE = "hs_drawer__drawer";
export const CARD_NODE = "hs_drawer__card";
export const SCREEN_NODE = "hs_monitor__screen";
export const RECORD_NODE = /^hs_crate__record_(\d\d)$/;
export const ORNAMENT_NODE = /^hs_shelf__ornament_(\d\d)$/;

/** The drawer slides along its local -Y in Blender, which the glTF exporter turns into local +Z. */
export const DRAWER_AXIS = new Vector3(0, 0, 1);
export const DRAWER_OPEN_M = 0.3;
export const DRAWER_PEEK_M = 0.03;
/** The drawer settles within DRAWER_SECONDS: an exponential ease at DRAWER_RATE per second (~95% there in 0.25 s). */
export const DRAWER_SECONDS = 0.5;
export const DRAWER_RATE = 12;
export const TEASE_SECONDS = 0.25;
export const RECORD_NUDGE_M = 0.03;
export const ORNAMENT_BOB_M = 0.012;

/** Exponential ease-out toward `target`; snaps the last millimetre so it arrives exactly. `rate` Infinity jumps. */
export function easeToward(current: number, target: number, dt: number, rate: number): number {
  if (!Number.isFinite(rate)) return target;
  const next = current + (target - current) * (1 - Math.exp(-dt * rate));
  return Math.abs(target - next) < 0.001 ? target : next;
}

/** Moves `current` toward `target` at a rate that covers 0→1 in `seconds`; 0 seconds jumps there. */
export function approach(current: number, target: number, dt: number, seconds: number): number {
  if (seconds <= 0) return target;
  const step = dt / seconds;
  return current < target ? Math.min(target, current + step) : Math.max(target, current - step);
}

export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/** Drawer travel in metres: fully out while open, a peek while hovered, shut otherwise. */
export function drawerTarget(open: boolean, hovered: boolean): number {
  return open ? DRAWER_OPEN_M : hovered ? DRAWER_PEEK_M : 0;
}

/** The monitor's tease: two short blinks just after hover begins. */
export function screenVisible(sinceHover: number): boolean {
  return !((sinceHover > 0.04 && sinceHover < 0.08) || (sinceHover > 0.13 && sinceHover < 0.18));
}

/** Vertical bob of ornament `index` while the shelf is teased; `amount` (0–1) scales it in and out. */
export function ornamentBob(index: number, seconds: number, amount: number): number {
  return ORNAMENT_BOB_M * amount * Math.sin(seconds * 6 + index * 1.3);
}

export type MotionNodes = {
  drawer: Object3D | null;
  drawerRest: Vector3;
  records: Object3D[];
  recordRest: number[];
  ornaments: Object3D[];
  ornamentRest: number[];
  screen: Object3D | null;
};

/** Finds the moving parts by name and remembers where they rest. Missing parts are simply absent. */
export function findMotionNodes(root: Object3D): MotionNodes {
  const records: { i: number; o: Object3D }[] = [];
  const ornaments: { i: number; o: Object3D }[] = [];
  root.traverse((o) => {
    const r = RECORD_NODE.exec(o.name);
    if (r) records.push({ i: Number(r[1]), o });
    const m = ORNAMENT_NODE.exec(o.name);
    if (m) ornaments.push({ i: Number(m[1]), o });
  });
  const byIndex = (a: { i: number }, b: { i: number }) => a.i - b.i;
  const drawer = root.getObjectByName(DRAWER_NODE) ?? null;
  const sortedRecords = records.sort(byIndex).map((x) => x.o);
  const sortedOrnaments = ornaments.sort(byIndex).map((x) => x.o);
  return {
    drawer,
    drawerRest: drawer ? drawer.position.clone() : new Vector3(),
    records: sortedRecords,
    recordRest: sortedRecords.map((o) => o.position.y),
    ornaments: sortedOrnaments,
    ornamentRest: sortedOrnaments.map((o) => o.position.y),
    screen: root.getObjectByName(SCREEN_NODE) ?? null,
  };
}

/** Per-frame easing of the drawer, the teases and the monitor flicker. Pure state: no React, no clocks. */
export class ObjectMotion {
  private drawerM = 0;
  private tease: Record<HotspotName, number> = { hs_crate: 0, hs_drawer: 0, hs_monitor: 0, hs_shelf: 0 };
  private hoverSince = -1;
  private lastHovered: HotspotName | null = null;
  private target = 0;

  /** True once the drawer has finished opening (cards wait for it). */
  get drawerOpen(): boolean {
    return this.target === DRAWER_OPEN_M && this.drawerM === DRAWER_OPEN_M;
  }

  update(nodes: MotionNodes, input: { open: HotspotName | null; hovered: HotspotName | null; reduced: boolean }, dt: number, now: number): void {
    const hovered = input.reduced ? null : input.hovered;
    if (hovered !== this.lastHovered) {
      this.hoverSince = hovered ? now : -1;
      this.lastHovered = hovered;
    }
    for (const h of Object.keys(this.tease) as HotspotName[]) {
      this.tease[h] = approach(this.tease[h], hovered === h ? 1 : 0, dt, input.reduced ? 0 : TEASE_SECONDS);
    }

    this.target = drawerTarget(input.open === "hs_drawer", hovered === "hs_drawer");
    this.drawerM = easeToward(this.drawerM, this.target, dt, input.reduced ? Infinity : DRAWER_RATE);
    if (nodes.drawer) nodes.drawer.position.copy(nodes.drawerRest).addScaledVector(DRAWER_AXIS, this.drawerM);

    nodes.records.forEach((r, i) => {
      r.position.y = nodes.recordRest[i] + (i < work.length ? RECORD_NUDGE_M * easeOutCubic(this.tease.hs_crate) : 0);
    });
    nodes.ornaments.forEach((o, i) => {
      o.position.y = nodes.ornamentRest[i] + ornamentBob(i, now, this.tease.hs_shelf);
    });
    if (nodes.screen) nodes.screen.visible = hovered === "hs_monitor" ? screenVisible(now - this.hoverSince) : true;
  }
}

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  CircleGeometry,
  Color,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Vector2,
  type Object3D,
} from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import type { DirectorState } from "../director/director";
import { palettes, theme } from "../theme";
import { useTheme } from "../themeState";
import { flickerElapsedMs, useLight } from "./lightState";
import { lightHitBox } from "./hit";
import { lightBrightness } from "./sequence";

/** Where the switch and the bulb sit, in the room's frame (the back wall is z = -5.1, the ceiling y = 2.72). */
export const SWITCH_AT = [-0.1, 1.6, -5.09] as const;
export const BULB_AT = [0.4, 1.9, -3.6] as const;
const CEILING_Y = 2.72;
/** The hit boxes' sizes (metres): the plate with a margin, and the glass (0.13 wide, 0.15 tall) with its cap. */
const SWITCH_HIT = [0.3, 0.36, 0.12] as const;
const BULB_HIT = [0.15, 0.2, 0.15] as const;

const WARM = new Color("#ffd98a"); // the glass when lit
const FILAMENT_ON = { dark: "#fff4e2", light: "#b45f00" } as const;

/** A closed outline of the glass: a pear, neck up, in the bulb's own frame (metres, y up). */
const GLASS: [number, number][] = [
  [0.022, 0.07], [0.03, 0.05], [0.052, 0.025], [0.065, -0.005], [0.064, -0.03], [0.05, -0.055], [0.028, -0.072], [0, -0.078],
];

const flat = (pts: [number, number][], z = 0) => pts.flatMap(([x, y]) => [x, y, z]);
const mirror = (pts: [number, number][]): [number, number][] => pts.map(([x, y]) => [-x, y]);
const rect = (w: number, h: number, cx = 0, cy = 0): [number, number][] => [
  [cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2], [cx - w / 2, cy - h / 2],
];

type Fixture = {
  root: Group;
  lines: LineMaterial[];
  ink: LineMaterial; // the outlines and the cord
  filament: LineMaterial;
  fills: MeshBasicMaterial; // what hides the wall behind the plate
  lever: MeshBasicMaterial;
  glass: MeshBasicMaterial;
  glow: MeshBasicMaterial;
  leverMesh: Mesh;
  leverLine: Line2;
  dispose: () => void;
};

function build(): Fixture {
  const root = new Group();
  root.name = "office_light";
  const lines: LineMaterial[] = [];
  const geometries: { dispose: () => void }[] = [];
  const material = (width: number) => {
    const m = new LineMaterial({ color: "#000000", linewidth: width, fog: false });
    lines.push(m);
    return m;
  };
  const ink = material(theme.lineWidth);
  const filament = material(theme.lineWidth);
  const fills = new MeshBasicMaterial({ side: DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const lever = new MeshBasicMaterial({ side: DoubleSide });
  const glass = new MeshBasicMaterial({ side: DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const glow = new MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0, color: WARM });
  const line = (points: number[], m: LineMaterial) => {
    const g = new LineGeometry().setPositions(points);
    geometries.push(g);
    const l = new Line2(g, m);
    l.raycast = () => {}; // decoration: the invisible hit shapes take the pointer
    return l;
  };
  const mesh = (g: PlaneGeometry | CircleGeometry | LatheGeometry, m: MeshBasicMaterial) => {
    geometries.push(g);
    return new Mesh(g, m);
  };

  // The switch: a plate on the wall with a rocker that sits up for on, down for off.
  const wall = new Group();
  wall.position.set(...SWITCH_AT);
  const plate = mesh(new PlaneGeometry(0.16, 0.22), fills);
  const trim = line(flat(rect(0.16, 0.22)), ink);
  const slot = line(flat(rect(0.07, 0.13), 0.002), ink);
  const leverMesh = mesh(new PlaneGeometry(0.06, 0.06), lever);
  leverMesh.position.z = 0.004;
  const leverLine = line(flat(rect(0.06, 0.06), 0.005), ink);
  wall.add(plate, trim, slot, leverMesh, leverLine);
  root.add(wall);

  // The bulb: a cord from the ceiling, a screw cap, the glass and its filament, and a glow round it.
  const bulb = new Group();
  bulb.position.set(...BULB_AT);
  const cordTop = CEILING_Y - BULB_AT[1];
  bulb.add(
    line([0, 0.125, 0, 0, cordTop, 0], ink),
    line(flat(rect(0.05, 0.05, 0, 0.1)), ink),
    line([-0.025, 0.09, 0, 0.025, 0.09, 0], ink),
    line([-0.025, 0.105, 0, 0.025, 0.105, 0], ink),
    line(flat([...GLASS, ...mirror([...GLASS].reverse())]), ink),
    line(flat([[-0.012, 0.07], [-0.012, 0.02], [-0.02, 0.012], [-0.01, 0.002], [0, 0.012], [0.01, 0.002], [0.02, 0.012], [0.012, 0.02], [0.012, 0.07]]), filament),
  );
  const half = new LatheGeometry([...GLASS].reverse().map(([x, y]) => new Vector2(x, y)), 16);
  const glassMesh = mesh(half, glass);
  glassMesh.userData.cleanEdges = true;
  const halo = mesh(new CircleGeometry(0.3, 32), glow);
  halo.position.z = -0.02;
  halo.raycast = () => {};
  bulb.add(glassMesh, halo);
  root.add(bulb);

  return { root, lines, ink, filament, fills, lever, glass, glow, leverMesh, leverLine, dispose: () => geometries.forEach((g) => g.dispose()) };
}

type Props = {
  scene: Object3D;
  director: RefObject<DirectorState>;
  reduced: boolean;
};

/**
 * The switch on the back wall and the halogen bulb hanging from the ceiling, drawn in the room's white-line style.
 * The bulb follows the light's state (flicker, steady on, off); the switch's rocker follows it too. The hit shapes
 * answer only when the room is idle, so they never take a click from an open object or from the walk-in.
 */
export default function LightFixture({ scene, director, reduced }: Props) {
  const mode = useTheme();
  const light = useLight();
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const seed = useMemo(() => Math.floor(Math.random() * 2 ** 32), []);
  const fixture = useRef<Fixture | null>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    const f = build();
    fixture.current = f;
    const parent = scene.getObjectByName("office_room") ?? scene;
    // Invisible shapes over the plate and the bulb take the pointer, only while the room is idle.
    const hitMaterial = new MeshBasicMaterial({ visible: false });
    const enabled = () => director.current.kind === "idle";
    const switchHit = lightHitBox(SWITCH_HIT, SWITCH_AT, hitMaterial, enabled);
    // Just the drawn glass and its cap, and a little margin: anything wider could reach over a hotspot beside it.
    const bulbHit = lightHitBox(BULB_HIT, [BULB_AT[0], BULB_AT[1] + 0.02, BULB_AT[2]], hitMaterial, enabled);
    f.root.add(switchHit, bulbHit);
    parent.add(f.root);
    return () => {
      f.root.removeFromParent();
      switchHit.geometry.dispose();
      bulbHit.geometry.dispose();
      hitMaterial.dispose();
      f.lines.forEach((m) => m.dispose());
      [f.fills, f.lever, f.glass, f.glow].forEach((m) => m.dispose());
      f.dispose();
      fixture.current = null;
    };
  }, [scene, director]);

  useEffect(() => {
    const f = fixture.current;
    if (f) f.lines.forEach((m) => m.resolution.set(width, height));
  }, [width, height, scene]);

  const lastKey = useRef("");
  useFrame(() => {
    const f = fixture.current;
    if (!f) return;
    const palette = palettes[modeRef.current];
    const k = lightBrightness(light, flickerElapsedMs() / 1000, seed, reduced);
    const key = `${modeRef.current}:${light}:${k.toFixed(3)}`;
    if (key === lastKey.current) return;
    lastKey.current = key;
    f.lines.forEach((m) => m.resolution.lengthSq() === 0 && m.resolution.set(width, height));
    f.ink.color.set(palette.line);
    f.fills.color.set(palette.background);
    f.lever.color.set(palette.line);
    f.glass.color.set(palette.background).lerp(WARM, k);
    f.filament.color.set(palette.line).lerp(new Color(FILAMENT_ON[modeRef.current]), k);
    f.glow.opacity = 0.22 * k;
    const on = light !== "off";
    f.leverMesh.position.y = on ? 0.03 : -0.03;
    f.leverLine.position.y = on ? 0.03 : -0.03;
  });

  return null;
}

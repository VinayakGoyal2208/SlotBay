export const journeyLabels = [
  "Hero",
  "Problem",
  "Search",
  "Discover",
  "Compare",
  "Reserve",
  "Navigate",
  "Park",
];
export const clampProgress = (value) => Math.min(1, Math.max(0, value));
const ease = (value) => {
  const t = clampProgress(value);
  return t * t * (3 - 2 * t);
};
// The same path is followed in both scroll directions; no random lane wobble.
const path = [
  [0, 24, 0, 1],
  [0.125, 40, 0, 1],
  [0.25, 56, 0, 1],
  [0.375, 68, 0, 1],
  [0.5, 57, 0, 1],
  [0.625, 40, 0, 1],
  [0.75, 60, 0, 1],
  [0.85, 57, 9, 0.85],
  [0.97, 73, 23, 0.68],
  [1, 73, 23, 0.68],
];
export function journeyMotion(value) {
  const progress = clampProgress(value);
  let start = path[0] ?? [0, 52, 8, 1];
  let end = start;
  for (let i = 1; i < path.length; i++) {
    const next = path[i];
    if (!next) continue;
    end = next;
    if (progress <= (next[0] ?? 1)) break;
    start = next;
  }
  const t = ease((progress - (start[0] ?? 0)) / Math.max(0.001, (end[0] ?? 1) - (start[0] ?? 0)));
  const mix = (index) => (start[index] ?? 0) + ((end[index] ?? 0) - (start[index] ?? 0)) * t;
  const active = Math.min(7, Math.floor(progress * 8));
  return {
    progress,
    active,
    x: mix(1),
    y: mix(2),
    scale: mix(3),
    garage: ease((progress - 0.75) / 0.08),
    map: ease((progress - 0.35) / 0.05) * (1 - ease((progress - 0.52) / 0.06)),
    route: ease((progress - 0.35) / 0.15),
    travel: Math.min(progress, 0.8) * 180,
    turn: ease((progress - 0.77) / 0.07),
    portal: ease((progress - 0.69) / 0.13),
    parked: progress >= 0.97,
    // Slide the interface into the scene, then hold it still for reading.
    panel: (1 - ease((progress - 0.24) / 0.035)) * 100 - ease((progress - 0.73) / 0.02) * 100,
  };
}

import { Suspense } from "react";
import SystemsTile from "./SystemsTile";
import CommitsTile from "./CommitsTile";
import StackTile from "./StackTile";

function TileSkeleton() {
  return (
    <div
      className="flex flex-col gap-3 p-5 min-h-[180px] animate-pulse"
      style={{ borderRight: "0.5px solid var(--border)", opacity: 0.3 }}
    />
  );
}

export default function TileRow() {
  return (
    <div
      className="grid grid-cols-3"
      style={{
        borderTop: "0.5px solid var(--border)",
        borderBottom: "0.5px solid var(--border)",
      }}
    >
      <SystemsTile />
      <Suspense fallback={<TileSkeleton />}>
        <CommitsTile />
      </Suspense>
      <StackTile />
    </div>
  );
}

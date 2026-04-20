import Hero from "@/app/components/Hero";
import TileRow from "@/app/components/tiles/TileRow";
import WorkCards from "@/app/components/WorkCards";
import ActivityLog from "@/app/components/ActivityLog";

export default function Home() {
  return (
    <main className="flex-1">
      <Hero />
      <TileRow />
      <WorkCards />
      <ActivityLog />
    </main>
  );
}

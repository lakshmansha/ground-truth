import VerdictMatrix from "@/components/VerdictMatrix";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Ground Truth</h1>
          <p className="text-gray-400 mt-1">
            Cloud security posture audit — every verdict grounded in cited evidence
          </p>
        </div>
        <VerdictMatrix />
      </div>
    </main>
  );
}

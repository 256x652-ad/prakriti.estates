export default function HomePage() {
  return (
    <main className="min-h-screen p-8 bg-gray-50 flex flex-col items-center justify-center">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-4xl font-bold text-green-900">
          Welcome to Prakriti Estates 🌿
        </h1>
        <p className="text-lg text-gray-700">
          The foundation is successfully running! The PostGIS database is connected, and Redis background jobs are active.
        </p>
        <div className="p-6 bg-white rounded-lg shadow-md border text-left space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Architecture Status:</h2>
          <ul className="list-disc pl-5 space-y-2 text-gray-600">
            <li>✅ Modular Monolith Pattern (Next.js App Router)</li>
            <li>✅ Database Layer (Supabase PostgreSQL + Prisma)</li>
            <li>✅ Geospatial Extensions (PostGIS Enabled)</li>
            <li>✅ Distributed Locks & Queues (Upstash Redis + BullMQ)</li>
          </ul>
        </div>
      </div>
    </main>
  );
}

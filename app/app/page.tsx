import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-500 via-purple-600 to-pink-500">
      <main className="container mx-auto px-4 py-16">
        <nav className="flex justify-between items-center mb-16">
          <h1 className="text-3xl font-bold text-white">SpeedLink</h1>
          <div className="space-x-4">
            <Link
              href="/login"
              className="px-4 py-2 text-white hover:text-gray-200 transition-colors"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="px-6 py-2 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-medium"
            >
              Sign Up
            </Link>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-5xl md:text-7xl font-bold mb-6">
            Ride Together,
            <br />
            Stay Connected
          </h2>
          <p className="text-xl md:text-2xl mb-12 text-white/90">
            Real-time location sharing for motorcycle riders and spirited drivers.
            <br />
            Share your ride, avoid speed cameras, stay connected.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/signup"
              className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-lg"
            >
              Get Started Free
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg hover:bg-white/10 transition-colors font-semibold text-lg"
            >
              Sign In
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <div className="text-4xl mb-4">🏍️</div>
              <h3 className="text-xl font-semibold mb-2">Party Mode</h3>
              <p className="text-white/80">Create or join riding groups with simple 6-digit codes</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <div className="text-4xl mb-4">📍</div>
              <h3 className="text-xl font-semibold mb-2">Live Location</h3>
              <p className="text-white/80">Real-time tracking with ultra-low latency updates</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <div className="text-4xl mb-4">🚨</div>
              <h3 className="text-xl font-semibold mb-2">Speed Alerts</h3>
              <p className="text-white/80">Get notified about speed cameras and hazards</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

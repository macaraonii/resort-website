import { Link } from 'react-router-dom';

export default function Hero() {
  return (
    <section className="section relative overflow-hidden bg-tropical-sky pt-10">
      <div className="pointer-events-none absolute inset-0 tropical-dots opacity-40" />
      <div className="pointer-events-none absolute -left-2 top-8 h-40 w-28 bg-palm-left bg-contain bg-no-repeat opacity-80 palm-sway sm:-left-6 sm:h-52 sm:w-36" />
      <div className="pointer-events-none absolute -right-2 top-4 h-44 w-32 bg-palm-right bg-contain bg-no-repeat opacity-80 palm-sway sm:-right-6 sm:h-56 sm:w-40" />
      <div className="relative z-10">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="tag">Family-friendly tropical escape</span>
            <h1 className="mt-4 font-display text-4xl text-ocean-800 sm:text-5xl">
              Caribbean Waves Waterpark Resort
            </h1>
            <p className="mt-4 text-base text-ocean-700 sm:text-lg">
              Slide into a refreshing day, night, or overnight swim experience.
              Build your reservation in minutes, pick the perfect cottage or room,
              and let the island vibes handle the rest.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link to="/booking" className="btn-primary">
                Start Reservation
              </Link>
              <a href="/#policies" className="btn-secondary">
                View Resort Policies
              </a>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="glass-panel p-4">
                <p className="text-xs font-semibold text-ocean-500">Entrance</p>
                <p className="mt-1 text-sm text-ocean-700">
                  Day, night, or overnight passes with live pricing updates.
                </p>
              </div>
              <div className="glass-panel p-4">
                <p className="text-xs font-semibold text-ocean-500">Stay</p>
                <p className="mt-1 text-sm text-ocean-700">
                  Choose from cottages or resort rooms with verified capacity.
                </p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-8 -top-10 h-24 w-24 rounded-full bg-sun-200/80 blur-2xl" />
            <div className="absolute -bottom-12 -right-12 h-28 w-28 rounded-full bg-aqua-200/80 blur-2xl" />
            <div className="glass-panel relative overflow-hidden p-6">
              <div className="absolute -right-10 top-4 h-28 w-28 rounded-full bg-aqua-200/70 blur-2xl" />
              <div className="absolute -left-10 bottom-4 h-28 w-28 rounded-full bg-sun-200/70 blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-4">
                  <img
                    src="/caribbean%20logo.jpg"
                    alt="Caribbean Waves logo"
                    className="h-16 w-16 rounded-2xl border border-white shadow"
                  />
                  <div>
                    <p className="text-sm font-semibold text-ocean-700">
                      Mahabang Parang, Sitio Abo
                    </p>
                    <p className="text-xs text-ocean-500">
                      Pulong Sampaloc, Dona Remedios Trinidad, Bulacan
                    </p>
                  </div>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white/70 p-4 shadow">
                    <p className="text-xs font-semibold text-ocean-500">
                      Open Daily
                    </p>
                    <p className="mt-1 text-sm text-ocean-700">8AM - 12MN</p>
                  </div>
                  <div className="rounded-2xl bg-white/70 p-4 shadow">
                    <p className="text-xs font-semibold text-ocean-500">
                      Room Deposit
                    </p>
                    <p className="mt-1 text-sm text-ocean-700">PHP 700 refundable</p>
                  </div>
                </div>
                <div className="mt-6 rounded-2xl bg-gradient-to-r from-ocean-500 to-aqua-400 p-4 text-white shadow">
                  <p className="text-sm font-semibold">Prototype Booking Engine</p>
                  <p className="mt-1 text-xs text-white/90">
                    No real payments collected. Reserve and print your receipt.
                  </p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-6 left-6 flex gap-4">
              <div className="floaty h-12 w-12 rounded-full bg-aqua-200/80" />
              <div className="floaty h-8 w-8 rounded-full bg-sun-200/80" />
            </div>
          </div>
        </div>
        <div className="relative mt-12 h-20 w-full overflow-hidden rounded-3xl">
          <div className="absolute inset-0 bg-wave-crest bg-cover bg-center opacity-90 wave-drift" />
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-wave-sand bg-cover bg-center opacity-90 wave-drift" />
        </div>
      </div>
    </section>
  );
}

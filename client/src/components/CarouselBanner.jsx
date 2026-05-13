import { useEffect, useState } from 'react';

const slides = [
  {
    title: 'Wave Pool Highlights',
    subtitle: 'Big waves, safe zones, and lifeguard-ready fun.',
    detail: 'Perfect for families looking for a gentle surf experience.'
  },
  {
    title: 'Night Swim Vibes',
    subtitle: 'Glow lighting, chill music, and cooler air.',
    detail: 'Night swimming is the new after-work escape.'
  },
  {
    title: 'Overnight Adventure',
    subtitle: 'Stay in resort rooms and wake up by the pool.',
    detail: 'Rooms include security deposit and verified capacity limits.'
  }
];

export default function CarouselBanner() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="section">
      <div className="glass-panel relative overflow-hidden p-8 sm:p-10">
        <div className="absolute inset-0 opacity-20 gradient-sheen" />
        <div className="relative grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <span className="tag">Seasonal Highlights</span>
            <h2 className="mt-4 font-display text-3xl text-ocean-800">
              {slides[active].title}
            </h2>
            <p className="mt-3 text-sm text-ocean-700">
              {slides[active].subtitle}
            </p>
            <p className="mt-2 text-sm text-ocean-600">
              {slides[active].detail}
            </p>
            <div className="mt-6 flex gap-2">
              {slides.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setActive(index)}
                  className={`h-2 w-8 rounded-full transition ${
                    active === index ? 'bg-ocean-500' : 'bg-ocean-200'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-white/80 p-6 shadow">
            <p className="text-xs font-semibold text-ocean-500">
              Caribbean Waves Notes
            </p>
            <h3 className="mt-2 text-xl font-semibold text-ocean-800">
              Summer-ready booking perks
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-ocean-700">
              <li>Quick reservation flow with live pricing.</li>
              <li>Dedicated cottages for day and night swimming.</li>
              <li>Rooms required for overnight stays.</li>
              <li>Prototype payment options for admin testing.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

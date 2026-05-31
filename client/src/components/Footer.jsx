export default function Footer() {
  return (
    <footer className="section pb-12 pt-6">
      <div className="glass-panel flex flex-col gap-6 p-8 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-display text-xl text-ocean-800">
            Caribbean Waves Waterpark Resort
          </p>
          <p className="mt-2 text-sm text-ocean-600">
            Mahabang Parang, Sitio Abo, Pulong Sampaloc,
            Dona Remedios Trinidad, Bulacan
          </p>
        </div>
        <div className="text-sm text-ocean-600">
          <p>Contact: 0917 000 1234</p>
          <p>Email: hello@caribbeanwaves.test</p>
        </div>
        <div className="text-sm text-ocean-600">
          <p>Prototype reservation system</p>
          <p>Built for Caribbean Waves Waterpark Resort</p>
        </div>
      </div>
    </footer>
  );
}

import Navbar from '../components/Navbar.jsx';
import Hero from '../components/Hero.jsx';
import CarouselBanner from '../components/CarouselBanner.jsx';
import BookingProcessHighlights from '../components/BookingProcessHighlights.jsx';
import ResortInfo from '../components/ResortInfo.jsx';
import Policies from '../components/Policies.jsx';
import Footer from '../components/Footer.jsx';

export default function HomePage() {
  return (
    <div>
      <Navbar />
      <Hero />
      <CarouselBanner />
      <BookingProcessHighlights />
      <ResortInfo />
      <Policies />
      <Footer />
    </div>
  );
}

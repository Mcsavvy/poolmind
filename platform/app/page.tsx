
import HeroSection from '@/components/hero-section';
import HowItWorksSection from '@/components/how-it-works-section';
import FeaturesGridSection from '@/components/features-grid-section';

export default function Home() {
  return (  
    <div className="min-h-screen">
      <HeroSection />
      <HowItWorksSection />
      <FeaturesGridSection />
    </div>
  );
}

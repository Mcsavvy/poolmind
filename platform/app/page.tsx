import HeroSection from '@/components/hero-section';
import HowItWorksSection from '@/components/how-it-works-section';

export default function Home() {
  return (  
    <div className="min-h-screen">
      <HeroSection />
      <HowItWorksSection />
    </div>
  );
}

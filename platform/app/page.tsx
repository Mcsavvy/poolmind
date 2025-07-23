
import HeroSection from '@/components/hero-section';
import HowItWorksSection from '@/components/how-it-works-section';
import FeaturesGridSection from '@/components/features-grid-section';
import StatsSection from '@/components/stats-section';
import TestimonialsSection from '@/components/testimonials-section';

export default function Home() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <HowItWorksSection />
      <FeaturesGridSection />
      <StatsSection />
      <TestimonialsSection />
    </div>
  );
}

'use client';

import { Easing, motion } from 'framer-motion';
import Navbar from '@/components/landing/navbar';
import HeroSection from '@/components/landing/hero-section';
import HowItWorksSection from '@/components/landing/how-it-works-section';
import FeaturesGridSection from '@/components/landing/features-grid-section';
import StatsSection from '@/components/landing/stats-section';
import TestimonialsSection from '@/components/landing/testimonials-section';
import TelegramCTASection from '@/components/landing/telegram-cta-section';
import FAQSection from '@/components/landing/faq-section';
import Footer from '@/components/landing/footer';

// Animation variants for section entrance
const sectionVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.8,
      ease: "easeOut" as Easing
    }
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1
    }
  }
};

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
    <motion.div 
      className="min-h-screen"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Navbar />
      
      <motion.div variants={sectionVariants}>
        <HeroSection />
      </motion.div>
      
      <motion.div variants={sectionVariants} id="how-it-works">
        <HowItWorksSection />
      </motion.div>
      
      <motion.div variants={sectionVariants} id="features">
        <FeaturesGridSection />
      </motion.div>
      
      <motion.div variants={sectionVariants} id="stats">
        <StatsSection />
      </motion.div>
      
      <motion.div variants={sectionVariants} id="testimonials">
        <TestimonialsSection />
      </motion.div>
      
      <motion.div variants={sectionVariants}>
        <TelegramCTASection />
      </motion.div>
      
      <motion.div variants={sectionVariants} id="faq">
        <FAQSection />
      </motion.div>
    </motion.div>
    <Footer />
    </div>
  );
}

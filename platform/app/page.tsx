'use client';

import { Easing, motion } from 'framer-motion';
import HeroSection from '@/components/hero-section';
import HowItWorksSection from '@/components/how-it-works-section';
import FeaturesGridSection from '@/components/features-grid-section';
import StatsSection from '@/components/stats-section';
import TestimonialsSection from '@/components/testimonials-section';
import TelegramCTASection from '@/components/telegram-cta-section';
import FAQSection from '@/components/faq-section';

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
    <motion.div 
      className="min-h-screen"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={sectionVariants}>
        <HeroSection />
      </motion.div>
      
      <motion.div variants={sectionVariants}>
        <HowItWorksSection />
      </motion.div>
      
      <motion.div variants={sectionVariants}>
        <FeaturesGridSection />
      </motion.div>
      
      <motion.div variants={sectionVariants}>
        <StatsSection />
      </motion.div>
      
      <motion.div variants={sectionVariants}>
        <TestimonialsSection />
      </motion.div>
      
      <motion.div variants={sectionVariants}>
        <TelegramCTASection />
      </motion.div>
      
      <motion.div variants={sectionVariants}>
        <FAQSection />
      </motion.div>
    </motion.div>
  );
}

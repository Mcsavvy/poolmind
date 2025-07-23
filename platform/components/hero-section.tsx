'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Play } from 'lucide-react';

/**
 * Animated crypto icon component with floating animation
 */
const AnimatedCryptoIcon = ({ 
  symbol, 
  delay = 0, 
  className = '' 
}: { 
  symbol: string; 
  delay?: number; 
  className?: string; 
}) => (
  <motion.div 
    className={`absolute ${className}`}
    initial={{ opacity: 0, scale: 0 }}
    animate={{ 
      opacity: 1, 
      scale: 1,
      y: [0, -20, 0],
    }}
    transition={{ 
      delay,
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }}
  >
    <div className="bg-blue-500/20 rounded-full p-2 backdrop-blur-sm border border-blue-400/30">
      <span className="text-blue-300 text-sm font-semibold">{symbol}</span>
    </div>
  </motion.div>
);

/**
 * Dashboard mockup component showing connected wallet and pool stats
 */
const DashboardMockup = () => {
  const [navValue, setNavValue] = useState(1247.83);
  const [earnings, setEarnings] = useState(156.42);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setNavValue(prev => prev + (Math.random() - 0.5) * 2);
      setEarnings(prev => prev + (Math.random() - 0.5) * 0.5);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      className="relative"
      initial={{ opacity: 0, x: 100, rotateY: -15 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      transition={{ delay: 0.6, duration: 1, ease: "easeOut" }}
    >
      {/* Animated crypto icons */}
      <AnimatedCryptoIcon symbol="BTC" delay={1} className="top-4 left-8" />
      <AnimatedCryptoIcon symbol="ETH" delay={1.5} className="top-16 right-4" />
      <AnimatedCryptoIcon symbol="STX" delay={2} className="bottom-16 left-4" />
      <AnimatedCryptoIcon symbol="USDC" delay={2.5} className="bottom-4 right-8" />

      {/* Main dashboard card with glassmorphism */}
      <motion.div 
        className="relative bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl max-w-md mx-auto"
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-white/80 text-sm">Live Portfolio</span>
          </div>
          <Badge variant="secondary" className="bg-green-500/20 text-green-300 border-green-400/30">
            Active
          </Badge>
        </div>

        {/* NAV section */}
        <motion.div 
          className="mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
        >
          <div className="text-white/60 text-sm mb-1">Net Asset Value</div>
          <motion.div 
            className="text-3xl font-bold text-white"
            key={navValue}
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            ${navValue.toFixed(2)}
          </motion.div>
          <div className="text-green-400 text-sm">↗ +2.4% (24h)</div>
        </motion.div>

        {/* Earnings section */}
        <motion.div 
          className="mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.5 }}
        >
          <div className="text-white/60 text-sm mb-1">Total Earnings</div>
          <motion.div 
            className="text-2xl font-semibold text-green-400"
            key={earnings}
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            +${earnings.toFixed(2)}
          </motion.div>
        </motion.div>

        {/* Pool status */}
        <motion.div 
          className="grid grid-cols-2 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.5 }}
        >
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="text-white/60 text-xs mb-1">Pool Share</div>
            <div className="text-white font-semibold">0.42%</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="text-white/60 text-xs mb-1">APY</div>
            <div className="text-green-400 font-semibold">18.3%</div>
          </div>
        </motion.div>

        {/* Connected wallet */}
        <motion.div 
          className="mt-6 pt-4 border-t border-white/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.5 }}
        >
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-white/80 text-sm">Wallet Connected</span>
          </div>
          <div className="text-white/60 text-xs mt-1 font-mono">
            ST1PQHQKV...R5J2ZX
          </div>
        </motion.div>
      </motion.div>

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-blue-400/30 rounded-full"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}
    </motion.div>
  );
};

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 pt-20 pb-32">
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Left content */}
          <motion.div 
            className="text-center lg:text-left"
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            {/* Platform badge */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="flex justify-center lg:justify-start mb-6"
            >
              <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-400/30 px-4 py-2">
                Built on Stacks Blockchain
              </Badge>
            </motion.div>

            {/* Main headline */}
            <motion.h1 
              className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-6 leading-tight"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              Earn Smarter with{' '}
              <motion.span 
                className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.8 }}
              >
                Pooled Crypto Arbitrage
              </motion.span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p 
              className="text-xl md:text-2xl text-gray-300 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              PoolMind uses blockchain-powered automation to let you invest in crypto arbitrage with zero trading expertise.
            </motion.p>

            {/* CTA buttons */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.8 }}
            >
              {/* Primary CTA button */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  size="lg"
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold px-8 py-6 text-lg rounded-2xl shadow-lg hover:shadow-green-500/25 transition-all duration-300"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>

              {/* Secondary CTA button */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  variant="outline"
                  size="lg"
                  className="border-2 border-white/30 hover:border-white/50 text-white font-semibold px-8 py-6 text-lg rounded-2xl backdrop-blur-sm bg-white/5 hover:bg-white/10 transition-all duration-300"
                >
                  <Play className="mr-2 h-5 w-5" />
                  Watch Demo
                </Button>
              </motion.div>
            </motion.div>

            {/* Trust indicators */}
            <motion.div 
              className="mt-12 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-gray-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.8 }}
            >
              <motion.div 
                className="flex items-center space-x-2"
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">S</span>
                </div>
                <span className="text-sm">Stacks Blockchain</span>
              </motion.div>
              <motion.div 
                className="flex items-center space-x-2"
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm">Secure & Transparent</span>
              </motion.div>
              <motion.div 
                className="flex items-center space-x-2"
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="text-sm">Automated Trading</span>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Right content - Dashboard mockup */}
          <div className="relative">
            <DashboardMockup />
          </div>
        </div>
      </div>

      {/* Background decorative elements */}
      <motion.div 
        className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{ 
          duration: 8, 
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div 
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl"
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.5, 0.2]
        }}
        transition={{ 
          duration: 10, 
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
      />
    </section>
  );
}

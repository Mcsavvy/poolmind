'use client';

import { cn } from '@/lib/utils';
import { ReactNode, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Wave from 'react-wavify';
import { Coins, TrendingUp, Activity, Zap } from 'lucide-react';
import Image from 'next/image';

interface FullPageLoaderProps {
  text?: string;
  className?: string;
  icon?: ReactNode;
}

const loadingTexts = [
  'Analyzing market opportunities...',
  'Connecting to liquidity pools...',
  'Optimizing arbitrage strategies...',
  'Synchronizing with Stacks network...',
  'Calculating optimal returns...',
];

const FloatingCryptoIcon = ({ 
  Icon, 
  delay = 0, 
  className = '',
  position 
}: { 
  Icon: ReactNode; 
  delay?: number; 
  className?: string;
  position: { top?: string; left?: string; right?: string; bottom?: string };
}) => (
  <motion.div
    className={`absolute ${className}`}
    style={position}
    initial={{ opacity: 0, scale: 0 }}
    animate={{ 
      opacity: [0, 1, 0.7, 1],
      scale: [0, 1, 1.1, 1],
      y: [0, -20, 0, -15, 0],
    }}
    transition={{
      delay,
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  >
    <div className="relative bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full p-3 backdrop-blur-sm border border-primary/30 animate-golden-glow">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full animate-coin-shimmer"></div>
      <div className="relative text-primary">
        {Icon}
      </div>
    </div>
  </motion.div>
);

export function FullPageLoader({ text, className, icon }: FullPageLoaderProps) {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Cycle through loading texts
    const textInterval = setInterval(() => {
      setCurrentTextIndex((prev) => (prev + 1) % loadingTexts.length);
    }, 2000);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 0; // Reset for demo purposes
        return prev + Math.random() * 3;
      });
    }, 100);

    return () => {
      clearInterval(textInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex flex-col items-center justify-center",
      "bg-gradient-to-br from-background via-accent/5 to-background",
      "backdrop-blur-sm",
      className
    )}>
      {/* Floating crypto icons */}
      <FloatingCryptoIcon 
        Icon={<Coins className="w-6 h-6" />}
        delay={0}
        position={{ top: '15%', left: '15%' }}
      />
      <FloatingCryptoIcon 
        Icon={<TrendingUp className="w-6 h-6" />}
        delay={1}
        position={{ top: '20%', right: '20%' }}
      />
      <FloatingCryptoIcon 
        Icon={<Activity className="w-6 h-6" />}
        delay={2}
        position={{ bottom: '25%', left: '20%' }}
      />
      <FloatingCryptoIcon 
        Icon={<Zap className="w-6 h-6" />}
        delay={3}
        position={{ bottom: '20%', right: '15%' }}
      />

      {/* Main loader container */}
      <motion.div 
        className="relative w-full max-w-md mx-auto px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Wave container representing liquid crypto pools */}
        <div className="relative h-48 mb-8 rounded-3xl overflow-hidden bg-gradient-to-b from-card/50 to-accent/20 border border-primary/20 backdrop-blur-sm">
          {/* Background waves - deeper pool */}
          <Wave
            fill="url(#gradient1)"
            paused={false}
            style={{ 
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '60%'
            }}
            options={{
              height: 30,
              amplitude: 25,
              speed: 0.1,
              points: 4
            }}
          >
            <defs>
              <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(255, 152, 0, 0.4)" />
                <stop offset="50%" stopColor="rgba(244, 81, 30, 0.5)" />
                <stop offset="100%" stopColor="rgba(255, 193, 7, 0.3)" />
              </linearGradient>
            </defs>
          </Wave>

          {/* Middle waves - active trading layer */}
          <Wave
            fill="url(#gradient2)"
            paused={false}
            style={{ 
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '45%'
            }}
            options={{
              height: 20,
              amplitude: 20,
              speed: 0.15,
              points: 3
            }}
          >
            <defs>
              <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(255, 152, 0, 0.6)" />
                <stop offset="100%" stopColor="rgba(244, 81, 30, 0.7)" />
              </linearGradient>
            </defs>
          </Wave>

          {/* Top waves - surface volatility */}
          <Wave
            fill="url(#gradient3)"
            paused={false}
            style={{ 
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '30%'
            }}
            options={{
              height: 15,
              amplitude: 15,
              speed: 0.2,
              points: 5
            }}
          >
            <defs>
              <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(255, 193, 7, 0.8)" />
                <stop offset="100%" stopColor="rgba(255, 152, 0, 0.9)" />
              </linearGradient>
            </defs>
          </Wave>

          {/* Floating particles representing micro-transactions */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-primary rounded-full"
              style={{
                top: `${20 + Math.random() * 60}%`,
                left: `${10 + Math.random() * 80}%`,
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [0.3, 1, 0.3],
                scale: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}

          {/* Pool statistics overlay */}
          <motion.div 
            className="absolute top-4 left-4 right-4 flex justify-between items-start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <div className="bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-primary/20">
              <div className="text-xs text-muted-foreground">Pool Depth</div>
              <div className="text-sm font-semibold gradient-text-gold">
                {(progress * 10.34).toFixed(1)}M STX
              </div>
            </div>
            <div className="bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-primary/20">
              <div className="text-xs text-muted-foreground">Active Trades</div>
              <div className="text-sm font-semibold text-primary">
                {Math.floor(progress / 10) + 3}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Logo and brand */}
        <motion.div 
          className="text-center mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-center space-x-3 mb-4">
            <span className="text-2xl font-bold gradient-text-premium">PoolMind</span>
          </div>
          <div className="w-16 h-1 bg-gradient-to-r from-primary to-secondary rounded-full mx-auto animate-coin-shimmer"></div>
        </motion.div>

        {/* Dynamic loading text */}
        <div className="text-center mb-6 h-6">
          <AnimatePresence mode="wait">
            <motion.p
              key={currentTextIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-muted-foreground"
            >
              {text || loadingTexts[currentTextIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Progress indicator */}
        <motion.div 
          className="space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span>{Math.floor(progress)}%</span>
          </div>
          <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-secondary rounded-full animate-coin-shimmer"
              style={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </motion.div>

      </motion.div>

      {/* Background ambient glow */}
      <motion.div 
        className="absolute inset-0 pointer-events-none opacity-30"
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.2, 0.4, 0.2] 
        }}
        transition={{ 
          duration: 8, 
          repeat: Infinity,
          ease: "easeInOut" 
        }}
      >
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
      </motion.div>
    </div>
  );
}

export default FullPageLoader;



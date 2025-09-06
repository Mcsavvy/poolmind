'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { ArrowRight, Play, Coins, ShieldCheck, ChartLine } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import config from '@/lib/config';

/**
 * Animated crypto icon component with premium coin styling
 */
const AnimatedCryptoIcon = ({
  symbol,
  delay = 0,
  className = '',
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
      ease: 'easeInOut',
    }}
  >
    <div className='relative bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full p-3 backdrop-blur-sm border border-primary/30 animate-golden-glow'>
      <div className='absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full animate-coin-shimmer'></div>
      <span className='relative text-primary font-bold text-sm'>{symbol}</span>
    </div>
  </motion.div>
);

/**
 * Premium dashboard mockup with coin-inspired design
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
      className='relative'
      initial={{ opacity: 0, x: 100, rotateY: -15 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      transition={{ delay: 0.6, duration: 1, ease: 'easeOut' }}
    >
      {/* Animated crypto icons */}
      <AnimatedCryptoIcon symbol='BTC' delay={1} className='top-4 left-8' />
      <AnimatedCryptoIcon symbol='ETH' delay={1.5} className='top-16 right-4' />
      <AnimatedCryptoIcon symbol='STX' delay={2} className='bottom-16 left-4' />
      <AnimatedCryptoIcon
        symbol='USDC'
        delay={2.5}
        className='bottom-4 right-8'
      />

      {/* Premium dashboard card */}
      <motion.div
        className='relative bg-card/95 backdrop-blur-lg rounded-3xl p-8 border border-border shadow-2xl max-w-md mx-auto animate-premium-pulse'
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.3 }}
        style={{
          background:
            'linear-gradient(135deg, var(--card) 0%, var(--accent) 100%)',
          boxShadow:
            '0 20px 40px rgba(255, 152, 0, 0.1), 0 0 20px rgba(255, 193, 7, 0.05)',
        }}
      >
        {/* Header */}
        <div className='flex items-center justify-between mb-6'>
          <div className='flex items-center space-x-2'>
            <motion.div
              className='w-3 h-3 bg-primary rounded-full animate-pulse'
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className='text-muted-foreground text-sm'>
              Live Portfolio
            </span>
          </div>
          <Badge
            variant='secondary'
            className='bg-primary/20 text-primary border-primary/30 animate-coin-shimmer'
          >
            Active
          </Badge>
        </div>

        {/* NAV section */}
        <motion.div
          className='mb-6'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
        >
          <div className='text-muted-foreground text-sm mb-1'>
            Net Asset Value
          </div>
          <motion.div
            className='text-3xl font-bold gradient-text-gold'
            key={navValue}
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            ${navValue.toFixed(2)}
          </motion.div>
          <div className='text-primary text-sm font-medium'>↗ +2.4% (24h)</div>
        </motion.div>

        {/* Earnings section */}
        <motion.div
          className='mb-6'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.5 }}
        >
          <div className='text-muted-foreground text-sm mb-1'>
            Total Earnings
          </div>
          <motion.div
            className='text-2xl font-semibold gradient-text-stacks'
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
          className='grid grid-cols-2 gap-4'
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.5 }}
        >
          <div className='bg-accent/30 rounded-xl p-3 border border-primary/20'>
            <div className='text-muted-foreground text-xs mb-1'>Pool Share</div>
            <div className='text-foreground font-semibold'>0.42%</div>
          </div>
          <div className='bg-accent/30 rounded-xl p-3 border border-primary/20'>
            <div className='text-muted-foreground text-xs mb-1'>APY</div>
            <div className='text-primary font-semibold'>18.3%</div>
          </div>
        </motion.div>

        {/* Connected wallet */}
        <motion.div
          className='mt-6 pt-4 border-t border-border'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.5 }}
        >
          <div className='flex items-center space-x-2'>
            <div className='w-2 h-2 bg-primary rounded-full'></div>
            <span className='text-muted-foreground text-sm'>
              Wallet Connected
            </span>
          </div>
          <div className='text-muted-foreground text-xs mt-1 font-mono'>
            ST1PQHQKV...R5J2ZX
          </div>
        </motion.div>
      </motion.div>

      {/* Floating particles with coin styling */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className='absolute w-2 h-2 bg-primary/40 rounded-full animate-float'
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
    <section className='relative overflow-hidden bg-gradient-to-br from-background via-accent/10 to-background min-h-screen flex items-center'>
      <div className='container mx-auto px-4 relative z-10 py-20'>
        <div className='grid lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-[80vh]'>
          {/* Left content */}
          <motion.div
            className='text-center lg:text-left flex flex-col justify-center'
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          >
            {/* Logo at the top */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className='flex justify-center lg:justify-start mb-8'
            >
              <div className='flex items-center space-x-3'>
                <Image
                  src='/logo.png'
                  alt='PoolMind Logo'
                  width={24}
                  height={24}
                  className='w-6 h-6'
                />
                <div className='flex items-center space-x-2'>
                  <Image
                    src='/stx.png'
                    alt='Stacks Logo'
                    width={24}
                    height={24}
                    className='w-6 h-6'
                  />
                  <span className='text-sm text-muted-foreground'>
                    Powered by Stacks
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Platform badge */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className='flex justify-center lg:justify-start mb-6'
            >
              <Badge
                variant='outline'
                className='bg-primary/10 text-primary border-primary/30 px-4 py-2 animate-coin-shimmer'
              >
                <Coins className='w-4 h-4 mr-2' />
                Built on Stacks Blockchain
              </Badge>
            </motion.div>

            {/* Main headline */}
            <motion.h1
              className='text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6 leading-tight'
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              <span className='text-foreground'>Earn Smarter with</span>{' '}
              <motion.span
                className='gradient-text-premium animate-stacks-gradient'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.8 }}
              >
                Pooled Crypto Arbitrage
              </motion.span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              className='text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0'
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              PoolMind uses blockchain-powered automation to let you invest in
              crypto arbitrage with zero trading expertise.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              className='flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12'
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
                  size='lg'
                  className='bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground font-semibold px-8 py-6 text-lg rounded-2xl shadow-lg hover:shadow-primary/25 transition-all duration-300 animate-golden-glow'
                  asChild
                >
                  <Link href='/dashboard'>
                    Get Started
                    <ArrowRight className='ml-2 h-5 w-5' />
                  </Link>
                </Button>
              </motion.div>

              {/* Secondary CTA button */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant='outline'
                  size='lg'
                  className='border-2 border-primary/30 hover:border-primary/50 text-foreground font-semibold px-8 py-6 text-lg rounded-2xl backdrop-blur-sm bg-card/50 hover:bg-accent/30 transition-all duration-300'
                  asChild
                >
                  <Link href={config.demoLink} target='_blank'>
                    <Play className='mr-2 h-5 w-5' />
                    Watch Demo
                  </Link>
                </Button>
              </motion.div>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              className='flex flex-wrap items-center justify-center lg:justify-start gap-6 text-muted-foreground'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.8 }}
            >
              <motion.div
                className='flex items-center space-x-2'
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.2 }}
              >
                <Image
                  src='/stx.png'
                  alt='Stacks Logo'
                  width={20}
                  height={20}
                  className='w-5 h-5'
                />
                <span className='text-sm'>Stacks Blockchain</span>
              </motion.div>
              <motion.div
                className='flex items-center space-x-2'
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.2 }}
              >
                <ShieldCheck className='w-5 h-5 text-primary' />
                <span className='text-sm'>Secure & Transparent</span>
              </motion.div>
              <motion.div
                className='flex items-center space-x-2'
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.2 }}
              >
                <ChartLine className='w-5 h-5 text-primary' />
                <span className='text-sm'>Automated Trading</span>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Right content - Dashboard mockup */}
          <div className='relative'>
            <DashboardMockup />
          </div>
        </div>
      </div>

      {/* Background decorative elements with coin theme */}
      <motion.div
        className='absolute top-1/4 left-1/4 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-stacks-gradient'
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className='absolute bottom-1/4 right-1/4 w-48 h-48 bg-secondary/10 rounded-full blur-3xl animate-stacks-gradient'
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.15, 0.3, 0.15],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 3,
        }}
      />
    </section>
  );
}

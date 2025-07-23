'use client';

import { useState, useEffect } from 'react';

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
  <div 
    className={`absolute animate-pulse ${className}`}
    style={{ 
      animationDelay: `${delay}s`,
      animationDuration: '3s'
    }}
  >
    <div className="bg-blue-500/20 rounded-full p-2 backdrop-blur-sm border border-blue-400/30">
      <span className="text-blue-300 text-sm font-semibold">{symbol}</span>
    </div>
  </div>
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
    <div className="relative">
      {/* Animated crypto icons */}
      <AnimatedCryptoIcon symbol="BTC" delay={0} className="top-4 left-8" />
      <AnimatedCryptoIcon symbol="ETH" delay={1} className="top-16 right-12" />
      <AnimatedCryptoIcon symbol="STX" delay={2} className="bottom-20 left-4" />
      <AnimatedCryptoIcon symbol="USDC" delay={0.5} className="bottom-8 right-8" />

      {/* Dashboard mockup */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 shadow-2xl max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-semibold text-lg">PoolMind Dashboard</h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-400 text-sm">Connected</span>
          </div>
        </div>

        {/* Wallet section */}
        <div className="bg-white/5 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-300 text-sm">Wallet Address</span>
            <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
          </div>
          <p className="text-white font-mono text-sm truncate">SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7</p>
        </div>

        {/* Pool stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-gray-300 text-sm mb-1">NAV</p>
            <p className="text-white font-bold text-xl">${navValue.toFixed(2)}</p>
            <p className="text-green-400 text-xs">+2.4%</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-gray-300 text-sm mb-1">Balance</p>
            <p className="text-white font-bold text-xl">847.3</p>
            <p className="text-blue-400 text-xs">PLMD</p>
          </div>
        </div>

        {/* Earnings */}
        <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm mb-1">Total Earnings</p>
              <p className="text-white font-bold text-2xl">${earnings.toFixed(2)}</p>
            </div>
            <div className="text-green-400">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {/* Mini chart placeholder */}
        <div className="mt-4 h-16 bg-white/5 rounded-xl flex items-end justify-center space-x-1 p-2">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="bg-gradient-to-t from-blue-500 to-green-400 rounded-sm animate-pulse"
              style={{
                width: '6px',
                height: `${Math.random() * 40 + 20}px`,
                animationDelay: `${i * 0.1}s`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Main hero section component
 */
export default function HeroSection() {
  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      {/* Dark blue gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.03%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
      </div>

      {/* Content container */}
      <div className="relative z-10 container mx-auto px-4 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Left content */}
          <div className="text-center lg:text-left">
            {/* Main headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-6 leading-tight">
              Earn Smarter with{' '}
              <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                Pooled Crypto Arbitrage
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-gray-300 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              PoolMind uses blockchain-powered automation to let you invest in crypto arbitrage with zero trading expertise.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              {/* Primary CTA button */}
              <button className="group relative px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-green-500/25">
                <span className="relative z-10">Get Started</span>
                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
              </button>

              {/* Secondary CTA button */}
              <button className="group px-8 py-4 border-2 border-white/30 hover:border-white/50 text-white font-semibold rounded-2xl transition-all duration-300 hover:bg-white/10 backdrop-blur-sm">
                Learn More
                <svg className="inline-block ml-2 w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            </div>

            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-gray-400">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">S</span>
                </div>
                <span className="text-sm">Stacks Blockchain</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm">Secure & Transparent</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-sm">Automated Trading</span>
              </div>
            </div>
          </div>

          {/* Right content - Dashboard mockup */}
          <div className="relative">
            <DashboardMockup />
          </div>
        </div>
      </div>

      {/* Background decorative elements */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl"></div>
    </section>
  );
}

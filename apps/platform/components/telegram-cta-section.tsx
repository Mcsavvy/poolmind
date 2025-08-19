'use client';

import { AlertCircle, ArrowRight, Check, TrendingUp, Zap } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { config } from '@/lib/config';
import Link from 'next/link';

/**
 * Animated notification component
 */
const NotificationCard = ({ 
  message, 
  time, 
  type = 'trade',
  delay = 0 
}: {
  message: string;
  time: string;
  type?: 'trade' | 'update' | 'alert';
  delay?: number;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  
  const getIcon = () => {
    switch (type) {
      case 'trade':
        return (
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <TrendingUp className="size-4 text-white" />
          </div>
        );
      case 'update':
        return (
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <Zap className="size-4 text-white" />
          </div>
        );
      case 'alert':
        return (
          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
            <AlertCircle className="size-4 text-white" />
          </div>
        );
      default:
        return null;
    }
  };
  
  return (
    <div 
      className={`bg-white rounded-2xl p-4 shadow-lg border border-gray-100 transition-all duration-500 transform ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
      }`}
    >
      <div className="flex items-start space-x-3">
        {getIcon()}
        <div className="flex-1">
          <p className="text-gray-900 text-sm font-medium leading-relaxed">{message}</p>
          <p className="text-gray-500 text-xs mt-1">{time}</p>
        </div>
      </div>
    </div>
  );
};

/**
 * Phone mockup with PLMD alerts
 */
const PhoneMockup = () => {
  const [currentAlert, setCurrentAlert] = useState(0);
  
  const alerts = [
    "🚀 New arbitrage opportunity detected",
    "💰 Trade executed: +2.4% profit",
    "📊 NAV updated: $1.0847",
    "⚡ Portfolio rebalanced successfully"
  ];
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentAlert((prev) => (prev + 1) % alerts.length);
    }, 3000);
    
    return () => clearInterval(timer);
  }, [alerts.length]);
  
  return (
    <div className="relative">
      {/* Phone frame */}
      <div className="bg-gray-900 rounded-3xl p-2 shadow-2xl max-w-[280px] mx-auto">
        <div className="bg-black rounded-2xl p-4 relative overflow-hidden">
          {/* Phone screen */}
          <div className="bg-gradient-to-b from-blue-600 to-blue-700 rounded-xl p-4 h-[500px] relative">
            {/* Status bar */}
            <div className="flex justify-between items-center text-white text-xs mb-4">
              <span>9:41</span>
              <div className="flex space-x-1">
                <div className="w-4 h-2 bg-white rounded-sm opacity-60"></div>
                <div className="w-4 h-2 bg-white rounded-sm opacity-80"></div>
                <div className="w-4 h-2 bg-white rounded-sm"></div>
              </div>
            </div>
            
            {/* Telegram header */}
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">PoolMind Alerts</p>
                <p className="text-blue-200 text-xs">1,247 members</p>
              </div>
            </div>
            
            {/* Alert messages */}
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`bg-white/10 backdrop-blur-sm rounded-xl p-3 transition-all duration-500 ${
                    index === currentAlert ? 'bg-white/20 scale-105' : 'opacity-70'
                  }`}
                >
                  <p className="text-white text-sm">{alert}</p>
                  <p className="text-blue-200 text-xs mt-1">
                    {index === currentAlert ? 'Just now' : `${(index + 1) * 2}m ago`}
                  </p>
                </div>
              ))}
            </div>
            
            {/* Typing indicator */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <p className="text-blue-200 text-xs">PoolMind is typing...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Floating notifications around the phone
 */
const FloatingNotifications = () => {
  const notifications = [
    {
      message: "Arbitrage trade completed successfully! Profit: +$127.50",
      time: "2 min ago",
      type: "trade" as const,
      delay: 0
    },
    {
      message: "Portfolio NAV updated: $1.0847 (+0.3%)",
      time: "5 min ago", 
      type: "update" as const,
      delay: 1000
    },
    {
      message: "New opportunity detected on Binance vs Coinbase",
      time: "8 min ago",
      type: "alert" as const,
      delay: 2000
    }
  ];
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top notification */}
      <div className="absolute top-8 -left-4 w-72">
        <NotificationCard {...notifications[0]} />
      </div>
      
      {/* Middle notification */}
      <div className="absolute top-1/2 -right-8 w-64 transform -translate-y-1/2">
        <NotificationCard {...notifications[1]} />
      </div>
      
      {/* Bottom notification */}
      <div className="absolute bottom-16 -left-8 w-80">
        <NotificationCard {...notifications[2]} />
      </div>
    </div>
  );
};

/**
 * Main Telegram CTA section component
 */
export default function TelegramCTASection() {
  return (
    <section className="py-20 bg-gradient-to-br from-blue-50 via-white to-indigo-50 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center max-w-7xl mx-auto">
          
          {/* Left side - Illustration */}
          <div className="relative order-2 lg:order-1">
            <div className="relative max-w-md mx-auto lg:mx-0">
              <PhoneMockup />
              <FloatingNotifications />
            </div>
          </div>
          
          {/* Right side - Content */}
          <div className="order-1 lg:order-2 text-center lg:text-left">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Stay Connected to{' '}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                the Fund
              </span>
            </h2>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Join our Telegram channel for real-time trade alerts, portfolio updates, and community news.
            </p>
            
            {/* Features list */}
            <div className="mb-10 flex flex-col gap-4 items-start">
              <div className="flex items-center justify-center lg:justify-start space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-gray-700 text-lg">Real-time trade notifications</span>
              </div>
              
              <div className="flex items-center justify-center lg:justify-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-gray-700 text-lg">Portfolio performance updates</span>
              </div>
              
              <div className="flex items-center justify-center lg:justify-start space-x-3">
                <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-gray-700 text-lg">Community insights & discussions</span>
              </div>
            </div>
            
            {/* CTA Button */}
            <Button size="lg" className="bg-telegram text-white hover:bg-telegram/80 w-full py-6 text-lg" asChild>
              <Link href={config.telegramChannelLink} target="_blank">
                Join Telegram
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

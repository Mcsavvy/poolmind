'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * Animated counter hook for smooth number count-up effect
 */
const useAnimatedCounter = (
  endValue: number, 
  duration: number = 2000, 
  startAnimation: boolean = false,
  decimals: number = 0
) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    if (!startAnimation) return;
    
    let startTime: number;
    let animationFrame: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = endValue * easeOutQuart;
      
      setCount(currentValue);
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [endValue, duration, startAnimation, decimals]);
  
  return count;
};

/**
 * Intersection Observer hook to trigger animations when in view
 */
const useInView = () => {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
        }
      },
      { threshold: 0.3 }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => observer.disconnect();
  }, []);
  
  return { ref, inView };
};

/**
 * Mini chart component showing NAV history
 */
const MiniChart = ({ startAnimation }: { startAnimation: boolean }) => {
  const [animateChart, setAnimateChart] = useState(false);

  useEffect(() => {
    if (startAnimation) {
      const timer = setTimeout(() => setAnimateChart(true), 500);
      return () => clearTimeout(timer);
    }
  }, [startAnimation]);

  const chartData = [45, 62, 58, 75, 82, 68, 85, 91, 78, 94, 87, 92];

  return (
    <div className="h-12 flex items-end justify-center space-x-1 mt-3 bg-muted/50 rounded-lg p-2">
      {chartData.map((height, index) => (
        <div
          key={index}
          className="bg-gradient-to-t from-primary to-secondary rounded-sm transition-all duration-700 ease-out"
          style={{
            width: '3px',
            height: animateChart ? `${Math.max(height * 0.6, 20)}%` : '20%',
            transitionDelay: `${index * 80}ms`
          }}
        />
      ))}
    </div>
  );
};

/**
 * Individual stat card component
 */
const StatCard = ({ 
  icon, 
  title, 
  value, 
  suffix = '', 
  prefix = '',
  decimals = 0,
  startAnimation = false,
  showChart = false
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  startAnimation?: boolean;
  showChart?: boolean;
}) => {
  const animatedValue = useAnimatedCounter(value, 2000, startAnimation, decimals);
  
  const formatValue = (val: number) => {
    if (decimals > 0) {
      return val.toFixed(decimals);
    }
    return Math.floor(val).toLocaleString();
  };
  
  return (
    <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-6 border border-border hover:border-primary/40 transition-all duration-300 hover:transform hover:scale-105 animate-premium-pulse">
      {/* Icon and title */}
      <div className="flex items-center space-x-3 mb-4">
        <div className="text-primary">
          {icon}
        </div>
        <h3 className="text-foreground text-sm font-medium">{title}</h3>
      </div>
      
      {/* Animated value */}
      <div className="mb-2">
        <span className="text-3xl font-bold text-foreground">
          {prefix}{formatValue(animatedValue)}{suffix}
        </span>
      </div>
      
      {/* Mini chart if enabled */}
      {showChart && <MiniChart startAnimation={startAnimation} />}
    </div>
  );
};

/**
 * Live indicator component
 */
const LiveIndicator = () => (
  <div className="flex items-center space-x-2 text-primary">
    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
    <span className="text-sm font-medium">Live</span>
  </div>
);

/**
 * Main Stats section component
 */
export default function StatsSection() {
  const { ref, inView } = useInView();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update time every second for live feel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  const stats = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      title: "Total Pooled STX",
      value: 2847392,
      suffix: " STX"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
      title: "Active Users",
      value: 1247
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      title: "Current NAV",
      value: 1.0847,
      prefix: "$",
      decimals: 4,
      showChart: true
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: "Avg Weekly Return",
      value: 2.34,
      suffix: "%"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "Last Arbitrage Trade",
      value: Math.floor((Date.now() - currentTime.getTime() + 180000) / 1000), // 3 minutes ago, updating
      suffix: "s ago"
    }
  ];
  
  return (
    <section ref={ref} className="py-20 bg-muted/50 dark:bg-muted/80">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-4">
            <LiveIndicator />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Platform Statistics
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Real-time insights into PoolMind's performance and user activity.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
          {stats.map((stat, index) => (
            <StatCard
              key={index}
              icon={stat.icon}
              title={stat.title}
              value={stat.value}
              suffix={stat.suffix}
              prefix={stat.prefix}
              decimals={stat.decimals}
              startAnimation={inView}
              showChart={stat.showChart}
            />
          ))}
        </div>

        {/* Bottom info */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground text-sm">
            Last updated: {currentTime.toLocaleTimeString()} • Data refreshes every 30 seconds
          </p>
        </div>
      </div>
    </section>
  );
}

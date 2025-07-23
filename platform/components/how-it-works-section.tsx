'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, ArrowRight, RefreshCcw, TrendingUp } from 'lucide-react';

/**
 * Icon components for each step using Lucide icons
 */
const WalletTokenIcon = () => (
  <div className="relative">
    <motion.div
      whileHover={{ scale: 1.1, rotate: 5 }}
      transition={{ duration: 0.3 }}
    >
      <Wallet className="w-12 h-12 text-blue-600" />
    </motion.div>
    {/* Token overlay */}
    <motion.div 
      className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 0.5, duration: 0.3 }}
    >
      <span className="text-white text-xs font-bold">P</span>
    </motion.div>
  </div>
);

const ArbitrageIcon = () => (
  <div className="relative">
    {/* Exchange logos background */}
    <motion.div 
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.2 }}
      transition={{ delay: 0.3 }}
    >
      <div className="flex space-x-2">
        <motion.div 
          className="w-4 h-4 bg-orange-500 rounded-full"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0 }}
        />
        <motion.div 
          className="w-4 h-4 bg-purple-500 rounded-full"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.7 }}
        />
        <motion.div 
          className="w-4 h-4 bg-blue-500 rounded-full"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, delay: 1.4 }}
        />
      </div>
    </motion.div>
    {/* Circular arrows */}
    <motion.div
      whileHover={{ rotate: 180 }}
      transition={{ duration: 0.6 }}
    >
      <RefreshCcw className="w-12 h-12 text-green-600" />
    </motion.div>
  </div>
);

const WithdrawIcon = () => (
  <div className="relative">
    <motion.div
      whileHover={{ scale: 1.1, y: -5 }}
      transition={{ duration: 0.3 }}
    >
      <TrendingUp className="w-12 h-12 text-purple-600" />
    </motion.div>
    {/* Success indicator */}
    <motion.div 
      className="absolute -bottom-1 -right-1"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 0.7, duration: 0.3 }}
    >
      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </div>
    </motion.div>
  </div>
);

/**
 * Step connector component with animated line
 */
const StepConnector = () => (
  <motion.div 
    className="flex items-center justify-center"
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ delay: 0.8, duration: 0.5 }}
  >
    <motion.div 
      className="w-16 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400"
      initial={{ width: 0 }}
      animate={{ width: 64 }}
      transition={{ delay: 1, duration: 0.8 }}
    />
    <motion.div
      animate={{ x: [0, 10, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      <ArrowRight className="w-4 h-4 text-purple-400 ml-2" />
    </motion.div>
  </motion.div>
);

/**
 * Individual step card component using shadcn/ui Card
 */
const StepCard = ({ 
  icon, 
  title, 
  description, 
  stepNumber,
  delay = 0
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  stepNumber: number;
  delay?: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div 
      ref={ref}
      className="group relative"
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 50, scale: 0.9 }}
      transition={{ delay, duration: 0.6, ease: "easeOut" }}
    >
      {/* Step number badge */}
      <motion.div 
        className="absolute -top-3 -left-3 w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg z-10"
        initial={{ scale: 0, rotate: -180 }}
        animate={isInView ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -180 }}
        transition={{ delay: delay + 0.2, duration: 0.5 }}
      >
        {stepNumber}
      </motion.div>
      
      {/* Main card using shadcn/ui Card */}
      <Card className="h-full bg-white/90 backdrop-blur-sm border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:-translate-y-2">
        <CardContent className="p-8">
          {/* Icon container */}
          <motion.div 
            className="flex justify-center mb-6"
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-4 bg-gray-50 rounded-2xl group-hover:bg-gray-100 transition-colors duration-300">
              {icon}
            </div>
          </motion.div>
          
          {/* Content */}
          <div className="text-center">
            <motion.h3 
              className="text-xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors duration-300"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: delay + 0.4, duration: 0.5 }}
            >
              {title}
            </motion.h3>
            <motion.p 
              className="text-gray-600 leading-relaxed"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: delay + 0.6, duration: 0.5 }}
            >
              {description}
            </motion.p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default function HowItWorksSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const steps = [
    {
      icon: <WalletTokenIcon />,
      title: "Connect Your Wallet",
      description: "Connect your Stacks wallet and deposit STX tokens to join our automated arbitrage pool. Minimum investment starts at just 10 STX."
    },
    {
      icon: <ArbitrageIcon />,
      title: "Automated Arbitrage",
      description: "Our smart contract algorithms scan multiple exchanges 24/7, identifying profitable price differences and executing trades automatically."
    },
    {
      icon: <WithdrawIcon />,
      title: "Earn & Withdraw",
      description: "Watch your earnings grow in real-time through our dashboard. Withdraw your profits anytime with just a few clicks."
    }
  ];

  return (
    <section ref={ref} className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="flex justify-center mb-6"
          >
            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 px-4 py-2">
              Simple Process
            </Badge>
          </motion.div>
          
          <motion.h2 
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            How PoolMind Works
          </motion.h2>
          
          <motion.p 
            className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            Get started with crypto arbitrage in three simple steps. No trading experience required.
          </motion.p>
        </motion.div>

        {/* Steps grid */}
        <div className="relative max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <StepCard
                  icon={step.icon}
                  title={step.title}
                  description={step.description}
                  stepNumber={index + 1}
                  delay={index * 0.2}
                />
                {/* Connector positioned absolutely */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-6 transform -translate-y-1/2 z-20">
                    <StepConnector />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div 
          className="text-center mt-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-8 py-6 text-lg rounded-2xl shadow-lg hover:shadow-blue-500/25 transition-all duration-300"
            >
              Start Earning Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

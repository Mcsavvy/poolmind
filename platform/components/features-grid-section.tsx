'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Zap, 
  TrendingUp, 
  Clock, 
  Users, 
  Lock,
  BarChart3,
  Smartphone,
  CheckCircle
} from 'lucide-react';

/**
 * Enhanced feature icons with custom styling
 */
const SecurityIcon = () => (
  <motion.div
    whileHover={{ scale: 1.1, rotate: 5 }}
    transition={{ duration: 0.3 }}
  >
    <Shield className="w-12 h-12 text-blue-600" />
  </motion.div>
);

const AutomationIcon = () => (
  <motion.div
    whileHover={{ scale: 1.1 }}
    transition={{ duration: 0.3 }}
  >
    <Zap className="w-12 h-12 text-yellow-500" />
  </motion.div>
);

const ProfitabilityIcon = () => (
  <motion.div
    whileHover={{ scale: 1.1, y: -5 }}
    transition={{ duration: 0.3 }}
  >
    <TrendingUp className="w-12 h-12 text-green-600" />
  </motion.div>
);

const RealTimeIcon = () => (
  <motion.div
    whileHover={{ scale: 1.1 }}
    animate={{ rotate: [0, 360] }}
    transition={{ 
      rotate: { duration: 2, repeat: Infinity, ease: "linear" },
      scale: { duration: 0.3 }
    }}
  >
    <Clock className="w-12 h-12 text-purple-600" />
  </motion.div>
);

const CommunityIcon = () => (
  <motion.div
    whileHover={{ scale: 1.1 }}
    transition={{ duration: 0.3 }}
  >
    <Users className="w-12 h-12 text-indigo-600" />
  </motion.div>
);

const TransparencyIcon = () => (
  <motion.div
    whileHover={{ scale: 1.1, rotateY: 180 }}
    transition={{ duration: 0.6 }}
  >
    <Lock className="w-12 h-12 text-emerald-600" />
  </motion.div>
);

/**
 * Individual feature card component using shadcn/ui Card
 */
const FeatureCard = ({ 
  icon, 
  title, 
  description,
  delay = 0
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  delay?: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60, scale: 0.8 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 60, scale: 0.8 }}
      transition={{ delay, duration: 0.6, ease: "easeOut" }}
    >
      <Card className="group h-full bg-white/90 backdrop-blur-sm border-gray-200 shadow-lg hover:shadow-xl transition-all duration-500 hover:-translate-y-2 hover:border-blue-300">
        <CardContent className="p-8 text-center">
          {/* Icon */}
          <motion.div 
            className="flex justify-center mb-6"
            initial={{ opacity: 0, scale: 0 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
            transition={{ delay: delay + 0.2, duration: 0.5 }}
          >
            <motion.div 
              className="p-4 bg-gray-50 rounded-2xl group-hover:bg-blue-50 transition-all duration-300"
              whileHover={{ scale: 1.05 }}
            >
              {icon}
            </motion.div>
          </motion.div>
          
          {/* Content */}
          <motion.h3 
            className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors duration-300"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: delay + 0.4, duration: 0.5 }}
          >
            {title}
          </motion.h3>
          
          <motion.p 
            className="text-gray-600 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: delay + 0.6, duration: 0.5 }}
          >
            {description}
          </motion.p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

/**
 * Trust indicator component with animation
 */
const TrustIndicator = ({ 
  color, 
  text, 
  delay = 0 
}: { 
  color: string; 
  text: string; 
  delay?: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div 
      ref={ref}
      className="flex items-center space-x-2"
      initial={{ opacity: 0, x: -20 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ scale: 1.05 }}
    >
      <motion.div 
        className={`w-3 h-3 rounded-full ${color}`}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity, delay }}
      />
      <span className="text-sm font-medium text-gray-500">{text}</span>
    </motion.div>
  );
};

export default function FeaturesGridSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const features = [
    {
      icon: <SecurityIcon />,
      title: "Blockchain Security",
      description: "Built on Stacks blockchain with smart contracts ensuring your funds are always secure and transactions are transparent."
    },
    {
      icon: <AutomationIcon />,
      title: "Fully Automated",
      description: "Our AI-powered algorithms work 24/7 to identify and execute profitable arbitrage opportunities without any manual intervention."
    },
    {
      icon: <ProfitabilityIcon />,
      title: "Consistent Returns",
      description: "Earn steady returns from market inefficiencies across multiple exchanges with our proven arbitrage strategies."
    },
    {
      icon: <RealTimeIcon />,
      title: "Real-Time Monitoring",
      description: "Track your investments and earnings in real-time through our intuitive dashboard with live updates."
    },
    {
      icon: <CommunityIcon />,
      title: "Community Driven",
      description: "Join a thriving community of investors and stay updated with our integrated Telegram notifications."
    },
    {
      icon: <TransparencyIcon />,
      title: "Full Transparency",
      description: "Every transaction is recorded on the blockchain, providing complete transparency and auditability of all operations."
    }
  ];

  const trustIndicators = [
    { color: "bg-green-500", text: "Blockchain Secured" },
    { color: "bg-blue-500", text: "24/7 Automated" },
    { color: "bg-purple-500", text: "Transparent & Audited" }
  ];

  return (
    <section ref={ref} className="py-20 bg-white">
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
            <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 px-4 py-2">
              Advanced Features
            </Badge>
          </motion.div>

          <motion.h2 
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            Why Choose PoolMind?
          </motion.h2>
          
          <motion.p 
            className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            Built with cutting-edge technology and designed for both beginners and experienced investors.
          </motion.p>
        </motion.div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              delay={index * 0.15}
            />
          ))}
        </div>

        {/* Bottom section with trust indicators */}
        <motion.div 
          className="mt-20 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          <motion.div 
            className="flex flex-wrap items-center justify-center gap-8 text-gray-500"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 1.4, duration: 0.8 }}
          >
            {trustIndicators.map((indicator, index) => (
              <TrustIndicator
                key={index}
                color={indicator.color}
                text={indicator.text}
                delay={1.6 + index * 0.2}
              />
            ))}
          </motion.div>

          {/* Additional stats */}
          <motion.div 
            className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ delay: 1.8, duration: 0.8 }}
          >
            <motion.div 
              className="text-center"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div 
                className="text-2xl font-bold text-blue-600 mb-2"
                initial={{ opacity: 0, scale: 0 }}
                animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
                transition={{ delay: 2, duration: 0.5 }}
              >
                99.9%
              </motion.div>
              <div className="text-gray-600 text-sm">Uptime</div>
            </motion.div>
            
            <motion.div 
              className="text-center"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div 
                className="text-2xl font-bold text-green-600 mb-2"
                initial={{ opacity: 0, scale: 0 }}
                animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
                transition={{ delay: 2.2, duration: 0.5 }}
              >
                &lt;1s
              </motion.div>
              <div className="text-gray-600 text-sm">Response Time</div>
            </motion.div>
            
            <motion.div 
              className="text-center"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div 
                className="text-2xl font-bold text-purple-600 mb-2"
                initial={{ opacity: 0, scale: 0 }}
                animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
                transition={{ delay: 2.4, duration: 0.5 }}
              >
                24/7
              </motion.div>
              <div className="text-gray-600 text-sm">Monitoring</div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

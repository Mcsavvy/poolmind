'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Quote, Star, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';

/**
 * Hook for auto-sliding testimonials
 */
const useAutoSlide = (length: number, interval = 4000) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % length);
    }, interval);

    return () => clearInterval(timer);
  }, [length, interval]);

  return { currentIndex, setCurrentIndex };
};

/**
 * Individual testimonial card component using shadcn/ui
 */
const TestimonialCard = ({ 
  quote, 
  name, 
  username,
  imageUrl,
  rating = 5,
  delay = 0
}: {
  quote: string;
  name: string;
  username: string;
  imageUrl?: string;
  rating?: number;
  delay?: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 50, scale: 0.9 }}
      transition={{ delay, duration: 0.6, ease: "easeOut" }}
    >
      <Card className="group h-full bg-white/95 backdrop-blur-sm border-gray-200 shadow-lg hover:shadow-xl transition-all duration-500 hover:-translate-y-2 hover:border-blue-300">
        <CardContent className="p-8 flex flex-col justify-between h-full">
          {/* Quote icon */}
          <motion.div 
            className="flex justify-start mb-4"
            initial={{ opacity: 0, scale: 0 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
            transition={{ delay: delay + 0.2, duration: 0.5 }}
          >
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors duration-300">
              <Quote className="w-4 h-4 text-blue-600" />
            </div>
          </motion.div>

          {/* Rating stars */}
          <motion.div 
            className="flex items-center space-x-1 mb-4"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: delay + 0.3, duration: 0.5 }}
          >
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
                transition={{ delay: delay + 0.4 + i * 0.1, duration: 0.3 }}
              >
                <Star 
                  className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                />
              </motion.div>
            ))}
          </motion.div>
          
          {/* Quote */}
          <motion.div 
            className="mb-6 flex-grow"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: delay + 0.5, duration: 0.5 }}
          >
            <p className="text-gray-700 text-lg leading-relaxed italic">
              "{quote}"
            </p>
          </motion.div>
          
          {/* User info */}
          <motion.div 
            className="flex items-center space-x-3"
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ delay: delay + 0.7, duration: 0.5 }}
          >
            <Avatar className="h-12 w-12 border-2 border-gray-200 group-hover:border-blue-300 transition-colors duration-300">
              <AvatarImage src={imageUrl} alt={name} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold">
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{name}</p>
              <p className="text-gray-500 text-xs">@{username}</p>
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

/**
 * Navigation dots component
 */
const NavigationDots = ({ 
  total, 
  current, 
  onSelect 
}: { 
  total: number; 
  current: number; 
  onSelect: (index: number) => void;
}) => (
  <motion.div 
    className="flex justify-center space-x-2"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 1, duration: 0.5 }}
  >
    {[...Array(total)].map((_, index) => (
      <motion.button
        key={index}
        onClick={() => onSelect(index)}
        className={`w-3 h-3 rounded-full transition-all duration-300 ${
          index === current 
            ? 'bg-blue-500 scale-110' 
            : 'bg-gray-300 hover:bg-gray-400'
        }`}
        whileHover={{ scale: 1.2 }}
        whileTap={{ scale: 0.9 }}
      />
    ))}
  </motion.div>
);

/**
 * Navigation arrows component
 */
const NavigationArrows = ({ 
  onPrev, 
  onNext 
}: { 
  onPrev: () => void; 
  onNext: () => void;
}) => (
  <motion.div 
    className="flex justify-center space-x-4 mt-8"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 1.2, duration: 0.5 }}
  >
    <Button
      variant="outline"
      size="lg"
      onClick={onPrev}
      className="rounded-full w-12 h-12 p-0 hover:bg-blue-50 hover:border-blue-300"
    >
      <ChevronLeft className="w-5 h-5" />
    </Button>
    <Button
      variant="outline"
      size="lg"
      onClick={onNext}
      className="rounded-full w-12 h-12 p-0 hover:bg-blue-50 hover:border-blue-300"
    >
      <ChevronRight className="w-5 h-5" />
    </Button>
  </motion.div>
);

/**
 * Telegram community badge component
 */
const TelegramBadge = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ delay: 0.5, duration: 0.8 }}
    >
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 p-6">
        <CardContent className="flex items-center justify-between p-0">
          <div className="flex items-center space-x-4">
            <motion.div 
              className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.3 }}
            >
              <MessageCircle className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h4 className="font-semibold text-gray-900">Join Our Community</h4>
              <p className="text-gray-600 text-sm">Get real-time updates and connect with other investors</p>
            </div>
          </div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button className="bg-blue-500 hover:bg-blue-600 text-white">
              Join Telegram
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

/**
 * Main Testimonials section component
 */
export default function TestimonialsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const testimonials = [
    {
      quote: "PoolMind made crypto arbitrage accessible to me as a beginner. Great returns with zero stress!",
      name: "Sarah Chen",
      username: "sarahc_crypto",
      imageUrl: undefined,
      rating: 5
    },
    {
      quote: "Finally, a platform that does the heavy lifting. My STX is working harder than ever before.",
      name: "Mike Rodriguez",
      username: "mikerodz",
      imageUrl: undefined,
      rating: 5
    },
    {
      quote: "Transparent, automated, and profitable. PoolMind delivers exactly what it promises.",
      name: "Alex Thompson",
      username: "alexthompson",
      imageUrl: undefined,
      rating: 5
    },
    {
      quote: "The real-time updates and Telegram integration keep me informed without being overwhelming.",
      name: "Emma Wilson",
      username: "emmaw_defi",
      imageUrl: undefined,
      rating: 5
    },
    {
      quote: "Smart contracts give me peace of mind. My funds are secure while earning consistent returns.",
      name: "David Park",
      username: "davidpark_stx",
      imageUrl: undefined,
      rating: 5
    },
    {
      quote: "Best decision I made this year. PoolMind's arbitrage engine is incredibly efficient.",
      name: "Lisa Zhang",
      username: "lisaz_crypto",
      imageUrl: undefined,
      rating: 5
    }
  ];

  const { currentIndex, setCurrentIndex } = useAutoSlide(testimonials.length);
  
  // Calculate visible testimonials (3 at a time on desktop, 1 on mobile)
  const getVisibleTestimonials = () => {
    const visible = [];
    for (let i = 0; i < 3; i++) {
      const index = (currentIndex + i) % testimonials.length;
      visible.push(testimonials[index]);
    }
    return visible;
  };

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length);
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
  };

  return (
    <section ref={ref} className="py-20 bg-gradient-to-b from-gray-50 to-white">
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
            <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200 px-4 py-2">
              User Reviews
            </Badge>
          </motion.div>

          <motion.h2 
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            What Our Users Say
          </motion.h2>
          
          <motion.p 
            className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            Join thousands of satisfied investors who are earning with PoolMind's automated arbitrage platform.
          </motion.p>
        </motion.div>

        {/* Testimonials carousel */}
        <div className="max-w-6xl mx-auto mb-12">
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentIndex}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              {getVisibleTestimonials().map((testimonial, index) => (
                <TestimonialCard
                  key={`${currentIndex}-${index}`}
                  quote={testimonial.quote}
                  name={testimonial.name}
                  username={testimonial.username}
                  imageUrl={testimonial.imageUrl}
                  rating={testimonial.rating}
                  delay={index * 0.1}
                />
              ))}
            </motion.div>
          </AnimatePresence>
          
          {/* Navigation */}
          <div className="mt-8 space-y-6">
            <NavigationDots
              total={testimonials.length}
              current={currentIndex}
              onSelect={setCurrentIndex}
            />
            <NavigationArrows
              onPrev={handlePrev}
              onNext={handleNext}
            />
          </div>
        </div>

        {/* Telegram community badge */}
        <div className="max-w-2xl mx-auto">
          <TelegramBadge />
        </div>
      </div>
    </section>
  );
}

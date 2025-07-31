'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Quote, Star, MessageCircle, Coins } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";



/**
 * Individual testimonial card component using shadcn/ui with premium styling
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
      <Card className="group h-full bg-card/95 backdrop-blur-sm border-border shadow-lg hover:shadow-xl transition-all duration-500 hover:-translate-y-2 hover:border-primary/40 animate-premium-pulse">
        <CardContent className="p-8 flex flex-col justify-between h-full min-h-[300px]">
          {/* Quote icon with premium styling */}
          <motion.div 
            className="flex justify-start mb-4"
            initial={{ opacity: 0, scale: 0 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
            transition={{ delay: delay + 0.2, duration: 0.5 }}
          >
            <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center group-hover:bg-primary/30 transition-colors duration-300 animate-coin-shimmer">
              <Quote className="w-4 h-4 text-primary" />
            </div>
          </motion.div>

          {/* Rating stars with premium styling */}
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
                  className={`w-4 h-4 ${i < rating ? 'text-primary fill-current animate-golden-glow' : 'text-muted-foreground/40'}`}
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
            <p className="text-foreground text-lg leading-relaxed italic">
              "{quote}"
            </p>
          </motion.div>
          
          {/* User info with premium styling */}
          <motion.div 
            className="flex items-center space-x-3"
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ delay: delay + 0.7, duration: 0.5 }}
          >
            <Avatar className="h-12 w-12 border-2 border-primary/30 group-hover:border-primary/50 transition-colors duration-300 animate-coin-shimmer">
              <AvatarImage src={imageUrl} alt={name} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground font-semibold">
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground text-sm">{name}</p>
              <p className="text-muted-foreground text-xs">@{username}</p>
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};



/**
 * Telegram community badge component with premium styling
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
      <Card className="bg-gradient-to-r from-accent/30 to-accent/50 border-primary/30 p-6 animate-premium-pulse">
        <CardContent className="flex flex-col lg:flex-row items-center justify-between p-0 space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4 text-center lg:text-left">
            <motion.div 
              className="w-12 h-12 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center animate-golden-glow flex-shrink-0"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.3 }}
            >
              <MessageCircle className="w-6 h-6 text-primary-foreground" />
            </motion.div>
            <div>
              <h4 className="font-semibold text-foreground">Join Our Community</h4>
              <p className="text-muted-foreground text-sm">Get real-time updates and connect with other investors</p>
            </div>
          </div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full lg:w-auto"
          >
            <Button className="w-full lg:w-auto bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground animate-coin-shimmer px-6 py-2">
              Join Telegram
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

/**
 * Main Testimonials section component with premium styling
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



  return (
    <section ref={ref} className="py-20 bg-gradient-to-b from-background via-accent/5 to-background">
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
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 px-4 py-2 animate-coin-shimmer">
              <Coins className="w-4 h-4 mr-2" />
              User Reviews
            </Badge>
          </motion.div>

          <motion.h2 
            className="text-4xl md:text-5xl font-bold mb-6 gradient-text-premium animate-stacks-gradient"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            What Our Users Say
          </motion.h2>
          
          <motion.p 
            className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            Join thousands of satisfied investors who are earning with PoolMind's automated arbitrage platform.
          </motion.p>
        </motion.div>

        {/* Testimonials carousel */}
        <div className="max-w-6xl mx-auto mb-12">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {testimonials.map((testimonial, index) => (
                <CarouselItem key={index} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                  <div className="h-full">
                    <TestimonialCard
                      quote={testimonial.quote}
                      name={testimonial.name}
                      username={testimonial.username}
                      imageUrl={testimonial.imageUrl}
                      rating={testimonial.rating}
                      delay={index * 0.1}
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
        </div>

        {/* Telegram community badge */}
        <div className="max-w-2xl mx-auto">
          <TelegramBadge />
        </div>
      </div>
    </section>
  );
}

'use client';

import { useState, useEffect } from 'react';

/**
 * Avatar component with initials or profile photo
 */
const Avatar = ({ 
  name, 
  imageUrl 
}: { 
  name: string; 
  imageUrl?: string; 
}) => {
  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500', 
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-teal-500'
    ];
    const index = name.length % colors.length;
    return colors[index];
  };

  if (imageUrl) {
    return (
      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200">
        <img 
          src={imageUrl} 
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm ${getAvatarColor(name)}`}>
      {getInitials(name)}
    </div>
  );
};

/**
 * Individual testimonial card component
 */
const TestimonialCard = ({ 
  quote, 
  name, 
  username,
  imageUrl 
}: {
  quote: string;
  name: string;
  username: string;
  imageUrl?: string;
}) => (
  <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 min-h-[160px] flex flex-col justify-between">
    {/* Quote */}
    <div className="mb-4">
      <p className="text-gray-700 text-lg leading-relaxed italic">
        "{quote}"
      </p>
    </div>
    
    {/* User info */}
    <div className="flex items-center space-x-3">
      <Avatar name={name} imageUrl={imageUrl} />
      <div>
        <p className="font-semibold text-gray-900 text-sm">{name}</p>
        <p className="text-gray-500 text-xs">@{username}</p>
      </div>
    </div>
  </div>
);

/**
 * Telegram community badge component
 */
const TelegramBadge = () => (
  <div className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer group">
    <div className="flex items-center space-x-4">
      {/* Telegram icon */}
      <div className="flex-shrink-0">
        <svg className="w-8 h-8 text-white group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      </div>
      
      {/* Text content */}
      <div className="flex-1">
        <p className="font-semibold text-lg mb-1">Join 1,000+ crypto investors</p>
        <p className="text-blue-100 text-sm">Get real-time updates and connect with our community</p>
      </div>
      
      {/* Arrow icon */}
      <div className="flex-shrink-0">
        <svg className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </div>
    </div>
  </div>
);

/**
 * Auto-sliding testimonials hook
 */
const useAutoSlide = (itemsLength: number, interval: number = 5000) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % itemsLength);
    }, interval);
    
    return () => clearInterval(timer);
  }, [itemsLength, interval]);
  
  return { currentIndex, setCurrentIndex };
};

/**
 * Main Testimonials section component
 */
export default function TestimonialsSection() {
  const testimonials = [
    {
      quote: "PoolMind made crypto arbitrage accessible to me as a beginner. Great returns with zero stress!",
      name: "Sarah Chen",
      username: "sarahc_crypto",
      imageUrl: undefined
    },
    {
      quote: "Finally, a platform that does the heavy lifting. My STX is working harder than ever before.",
      name: "Mike Rodriguez",
      username: "mikerodz",
      imageUrl: undefined
    },
    {
      quote: "Transparent, automated, and profitable. PoolMind delivers exactly what it promises.",
      name: "Alex Thompson",
      username: "alexthompson",
      imageUrl: undefined
    },
    {
      quote: "The real-time updates and Telegram integration keep me informed without being overwhelming.",
      name: "Emma Wilson",
      username: "emmaw_defi",
      imageUrl: undefined
    },
    {
      quote: "Smart contracts give me peace of mind. My funds are secure while earning consistent returns.",
      name: "David Park",
      username: "davidpark_stx",
      imageUrl: undefined
    },
    {
      quote: "Best decision I made this year. PoolMind's arbitrage engine is incredibly efficient.",
      name: "Lisa Zhang",
      username: "lisaz_crypto",
      imageUrl: undefined
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

  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            What Our Users Say
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Join thousands of satisfied investors who are earning with PoolMind's automated arbitrage platform.
          </p>
        </div>

        {/* Testimonials slider */}
        <div className="max-w-6xl mx-auto mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {getVisibleTestimonials().map((testimonial, index) => (
              <TestimonialCard
                key={`${currentIndex}-${index}`}
                quote={testimonial.quote}
                name={testimonial.name}
                username={testimonial.username}
                imageUrl={testimonial.imageUrl}
              />
            ))}
          </div>
          
          {/* Slider indicators */}
          <div className="flex justify-center mt-8 space-x-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? 'bg-blue-500 scale-110' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
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

'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  return (
    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
      <Button
        variant='outline'
        size='icon'
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        className='relative border-primary/20 bg-background/80 backdrop-blur-sm hover:bg-accent/50 hover:border-primary/40 transition-all duration-300'
      >
        <div className='relative flex items-center justify-center'>
          <Sun className='h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0 text-primary' />
          <Moon className='h-[1.2rem] w-[1.2rem] absolute inset-0 m-auto rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100 text-primary' />
        </div>
        <span className='sr-only'>Toggle theme</span>
      </Button>
    </motion.div>
  );
}

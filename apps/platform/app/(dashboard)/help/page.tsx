'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  HelpCircle,
  MessageCircle,
  FileText,
  ExternalLink,
} from 'lucide-react';

export default function HelpPage() {
  const faqItems = [
    {
      question: 'How does the arbitrage pool work?',
      answer:
        'Our pool automatically identifies price differences across exchanges and executes trades to capture profit.',
    },
    {
      question: 'What are the fees?',
      answer:
        'We charge a 2% management fee and 20% performance fee on profits.',
    },
    {
      question: 'How do I withdraw my funds?',
      answer:
        'You can withdraw anytime from your wallet page. Withdrawals are processed within 24 hours.',
    },
  ];

  return (
    <div className='flex flex-col space-y-8'>
      <div className='flex items-center space-x-2'>
        <HelpCircle className='h-8 w-8' />
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Help & Support</h1>
          <p className='text-muted-foreground'>
            Get answers to your questions and contact support
          </p>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center space-x-2'>
              <MessageCircle className='h-5 w-5' />
              <span>Contact Support</span>
            </CardTitle>
            <CardDescription>Get help from our support team</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <Button className='w-full flex items-center space-x-2'>
              <MessageCircle className='h-4 w-4' />
              <span>Start Live Chat</span>
            </Button>
            <Button
              variant='outline'
              className='w-full flex items-center space-x-2'
            >
              <ExternalLink className='h-4 w-4' />
              <span>Email Support</span>
            </Button>
            <Button
              variant='outline'
              className='w-full flex items-center space-x-2'
            >
              <ExternalLink className='h-4 w-4' />
              <span>Join Discord</span>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center space-x-2'>
              <FileText className='h-5 w-5' />
              <span>Resources</span>
            </CardTitle>
            <CardDescription>Documentation and guides</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <Button
              variant='outline'
              className='w-full flex items-center space-x-2'
            >
              <FileText className='h-4 w-4' />
              <span>User Guide</span>
              <ExternalLink className='h-4 w-4 ml-auto' />
            </Button>
            <Button
              variant='outline'
              className='w-full flex items-center space-x-2'
            >
              <FileText className='h-4 w-4' />
              <span>API Documentation</span>
              <ExternalLink className='h-4 w-4 ml-auto' />
            </Button>
            <Button
              variant='outline'
              className='w-full flex items-center space-x-2'
            >
              <FileText className='h-4 w-4' />
              <span>Terms of Service</span>
              <ExternalLink className='h-4 w-4 ml-auto' />
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
          <CardDescription>Quick answers to common questions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-6'>
            {faqItems.map((item, index) => (
              <div key={index} className='space-y-2'>
                <h3 className='font-medium'>{item.question}</h3>
                <p className='text-sm text-muted-foreground'>{item.answer}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

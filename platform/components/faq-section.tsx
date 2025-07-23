'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { HelpCircle, ArrowRight, MessageCircle } from 'lucide-react';

/**
 * Individual FAQ item with animation
 */
const FAQItem = ({ 
  question, 
  answer, 
  value,
  delay = 0 
}: { 
  question: string; 
  answer: string; 
  value: string;
  delay?: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ delay, duration: 0.6, ease: "easeOut" }}
    >
      <AccordionItem value={value} className="border-gray-200 bg-white/50 rounded-lg mb-2">
        <AccordionTrigger className="text-left p-6 hover:no-underline group">
          <div className="flex items-center space-x-3 w-full">
            <motion.div
              className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors duration-300 flex-shrink-0"
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.2 }}
            >
              <HelpCircle className="w-4 h-4 text-blue-600" />
            </motion.div>
            <span className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
              {question}
            </span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-6">
          <motion.div 
            className="pt-2 pl-11"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-gray-600 leading-relaxed">{answer}</p>
          </motion.div>
        </AccordionContent>
      </AccordionItem>
    </motion.div>
  );
};

/**
 * Support card component
 */
const SupportCard = ({ delay = 0 }: { delay?: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.9 }}
      transition={{ delay, duration: 0.6, ease: "easeOut" }}
    >
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
        <CardContent className="p-8 text-center">
          <motion.div 
            className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ duration: 0.3 }}
          >
            <MessageCircle className="w-8 h-8 text-white" />
          </motion.div>
          
          <motion.h3 
            className="text-xl font-bold text-gray-900 mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: delay + 0.2, duration: 0.5 }}
          >
            Still Have Questions?
          </motion.h3>
          
          <motion.p 
            className="text-gray-600 mb-6 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: delay + 0.4, duration: 0.5 }}
          >
            Join our Telegram community or reach out to our support team for personalized assistance.
          </motion.p>
          
          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: delay + 0.6, duration: 0.5 }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white">
                Join Telegram Community
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button variant="outline" className="w-full border-blue-300 text-blue-600 hover:bg-blue-50">
                Contact Support
              </Button>
            </motion.div>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default function FAQSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const faqs = [
    {
      question: "How does PoolMind's arbitrage system work?",
      answer: "PoolMind uses advanced algorithms to continuously scan multiple cryptocurrency exchanges for price differences. When profitable opportunities are identified, our smart contracts automatically execute trades to capture the arbitrage profit, which is then distributed proportionally to all pool participants."
    },
    {
      question: "What is the minimum investment required?",
      answer: "The minimum investment to join our arbitrage pool is 10 STX tokens. This low barrier to entry makes crypto arbitrage accessible to investors of all sizes while maintaining the efficiency of our pooled approach."
    },
    {
      question: "How are profits distributed among investors?",
      answer: "Profits are distributed proportionally based on your share of the total pool. For example, if you contribute 100 STX to a 10,000 STX pool, you'll receive 1% of all arbitrage profits. Distribution happens automatically through smart contracts."
    },
    {
      question: "What fees does PoolMind charge?",
      answer: "PoolMind operates on a performance-based fee structure. We only charge a small percentage (typically 10-15%) of the actual profits generated. There are no management fees, entry fees, or hidden charges. You only pay when you earn."
    },
    {
      question: "How secure are my funds in the pool?",
      answer: "Your funds are secured by audited smart contracts on the Stacks blockchain. The contracts are designed to be non-custodial, meaning PoolMind never has direct access to your funds. All transactions are transparent and verifiable on the blockchain."
    },
    {
      question: "Can I withdraw my investment anytime?",
      answer: "Yes, you can withdraw your investment at any time. The withdrawal process typically takes 1-3 business days to complete, depending on network conditions. There are no lock-up periods or withdrawal penalties."
    },
    {
      question: "What returns can I expect from arbitrage trading?",
      answer: "Returns vary based on market conditions and arbitrage opportunities available. Historically, our pool has generated annualized returns between 12-25%. However, past performance doesn't guarantee future results, and all investments carry risk."
    },
    {
      question: "How do I track my investment performance?",
      answer: "You can monitor your investment in real-time through our web dashboard, which shows your current balance, profits earned, and detailed transaction history. We also provide optional Telegram notifications for major updates."
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
            <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200 px-4 py-2">
              FAQ
            </Badge>
          </motion.div>

          <motion.h2 
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            Frequently Asked Questions
          </motion.h2>
          
          <motion.p 
            className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            Everything you need to know about PoolMind's automated arbitrage platform.
          </motion.p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* FAQ Accordion */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
                transition={{ delay: 0.8, duration: 0.8 }}
              >
                <Accordion type="single" collapsible className="space-y-2">
                  {faqs.map((faq, index) => (
                    <FAQItem
                      key={index}
                      question={faq.question}
                      answer={faq.answer}
                      value={`item-${index}`}
                      delay={0.8 + index * 0.1}
                    />
                  ))}
                </Accordion>
              </motion.div>
            </div>

            {/* Support card */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <SupportCard delay={1.5} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

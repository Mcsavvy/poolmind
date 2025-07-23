'use client';

/**
 * Icon components for each step
 */
const WalletTokenIcon = () => (
  <div className="relative">
    <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
    {/* Token overlay */}
    <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
      <span className="text-white text-xs font-bold">P</span>
    </div>
  </div>
);

const ArbitrageIcon = () => (
  <div className="relative">
    {/* Exchange logos background */}
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex space-x-2 opacity-20">
        <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
        <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
        <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
      </div>
    </div>
    {/* Circular arrows */}
    <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  </div>
);

const WithdrawIcon = () => (
  <div className="relative">
    <svg className="w-12 h-12 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
    </svg>
    {/* Hand gesture */}
    <div className="absolute -bottom-1 -right-1">
      <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
  </div>
);

/**
 * Step connector component
 */
const StepConnector = () => (
  <div className="hidden lg:flex items-center justify-center">
    <div className="flex items-center space-x-2">
      <div className="w-8 h-0.5 bg-gradient-to-r from-gray-300 to-gray-400"></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
      <div className="w-8 h-0.5 bg-gradient-to-r from-gray-400 to-gray-300"></div>
    </div>
  </div>
);

/**
 * Individual step card component
 */
const StepCard = ({ 
  icon, 
  title, 
  description, 
  stepNumber 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  stepNumber: number;
}) => (
  <div className="group relative">
    {/* Step number badge */}
    <div className="absolute -top-3 -left-3 w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg z-10">
      {stepNumber}
    </div>
    
    {/* Main card */}
    <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 h-full">
      {/* Icon container */}
      <div className="flex justify-center mb-6">
        <div className="p-4 bg-gray-50 rounded-2xl group-hover:bg-gray-100 transition-colors duration-300">
          {icon}
        </div>
      </div>
      
      {/* Content */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors duration-300">
          {title}
        </h3>
        <p className="text-gray-600 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  </div>
);

/**
 * Main How It Works section component
 */
export default function HowItWorksSection() {
  const steps = [
    {
      icon: <WalletTokenIcon />,
      title: "Deposit STX & Get PLMD",
      description: "Connect your wallet and deposit STX tokens. Receive PLMD tokens representing your share in the arbitrage pool."
    },
    {
      icon: <ArbitrageIcon />,
      title: "We Run Arbitrage",
      description: "Our automated system continuously scans multiple exchanges to identify and execute profitable arbitrage opportunities."
    },
    {
      icon: <WithdrawIcon />,
      title: "Withdraw Anytime",
      description: "Redeem your PLMD tokens for STX plus earned profits whenever you want. No lock-up periods or restrictions."
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            How PoolMind Works
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Get started with crypto arbitrage in three simple steps. No trading experience required.
          </p>
        </div>

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
        <div className="text-center mt-16">
          <button className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-blue-500/25">
            Start Earning Today
            <svg className="inline-block ml-2 w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}

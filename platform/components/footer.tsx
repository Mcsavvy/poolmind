'use client';

/**
 * Logo component with Stacks branding
 */
const FooterLogo = () => (
  <div className="flex flex-col space-y-3">
    {/* PoolMind Logo */}
    <div className="flex items-center space-x-2">
      <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center">
        <span className="text-primary-foreground font-bold text-sm">P</span>
      </div>
      <span className="text-foreground font-bold text-xl">PoolMind</span>
    </div>
    
    {/* Powered by Stacks */}
    <div className="flex items-center space-x-2 text-muted-foreground">
      <span className="text-sm">Powered by</span>
      <div className="flex items-center space-x-1">
        <div className="w-5 h-5 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
          <span className="text-primary-foreground text-xs font-bold">S</span>
        </div>
        <span className="text-sm font-medium">Stacks</span>
      </div>
    </div>
  </div>
);

/**
 * Navigation links component
 */
const NavigationLinks = () => {
  const links = [
    { name: 'Docs', href: '#', external: false },
    { name: 'Whitepaper', href: '#', external: true },
    { name: 'GitHub', href: '#', external: true },
    { name: 'Terms', href: '#', external: false },
    { name: 'Privacy', href: '#', external: false }
  ];

  return (
    <div>
      <h3 className="text-foreground font-semibold text-sm uppercase tracking-wider mb-4">
        Resources
      </h3>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.name}>
            <a
              href={link.href}
              className="text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm flex items-center space-x-1"
              target={link.external ? '_blank' : undefined}
              rel={link.external ? 'noopener noreferrer' : undefined}
            >
              <span>{link.name}</span>
              {link.external && (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              )}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * Social media icons component
 */
const SocialIcons = () => {
  const socials = [
    {
      name: 'Telegram',
      href: '#',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      )
    },
    {
      name: 'Twitter',
      href: '#',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      )
    },
    {
      name: 'Discord',
      href: '#',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0189 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/>
        </svg>
      )
    }
  ];

  return (
    <div>
      <h3 className="text-foreground font-semibold text-sm uppercase tracking-wider mb-4">
        Community
      </h3>
      <div className="flex space-x-4">
        {socials.map((social) => (
          <a
            key={social.name}
            href={social.href}
            className="text-muted-foreground hover:text-foreground transition-colors duration-200 p-2 hover:bg-accent/50 rounded-lg"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={social.name}
          >
            {social.icon}
          </a>
        ))}
      </div>
    </div>
  );
};

/**
 * Contact information component
 */
const ContactInfo = () => (
  <div>
    <h3 className="text-foreground font-semibold text-sm uppercase tracking-wider mb-4">
      Contact
    </h3>
    <div className="space-y-3">
      <div className="text-muted-foreground text-sm">
        <p>Questions or support?</p>
        <a 
          href="mailto:hello@poolmind.io" 
          className="text-primary hover:text-primary-foreground transition-colors duration-200"
        >
          hello@poolmind.io
        </a>
      </div>
      <div className="text-muted-foreground text-sm">
        <p>Join our community for updates</p>
      </div>
    </div>
  </div>
);

/**
 * Main Footer component
 */
export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-muted/80 dark:bg-muted/60 text-foreground">
      {/* Main footer content */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Logo and branding */}
          <div className="lg:col-span-1">
            <FooterLogo />
            <p className="text-muted-foreground text-sm mt-4 leading-relaxed">
              Automated crypto arbitrage platform built on Stacks blockchain. 
              Earn passive income through smart contract-secured trading.
            </p>
          </div>
          
          {/* Navigation links */}
          <div className="lg:col-span-1">
            <NavigationLinks />
          </div>
          
          {/* Social media */}
          <div className="lg:col-span-1">
            <SocialIcons />
          </div>
          
          {/* Contact info */}
          <div className="lg:col-span-1">
            <ContactInfo />
          </div>
        </div>
      </div>
      
      {/* Bottom bar */}
      <div className="border-t border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            
            {/* Copyright */}
            <div className="text-muted-foreground text-sm">
              © {currentYear} PoolMind. All rights reserved.
            </div>
            
            {/* Additional links */}
            <div className="flex items-center space-x-6 text-sm">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors duration-200">
                Security
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors duration-200">
                Status
              </a>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-xs">All systems operational</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

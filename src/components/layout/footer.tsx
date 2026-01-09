import Link from 'next/link';
import { Github, Twitter } from 'lucide-react';

const footerLinks = {
  product: [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/points', label: 'Points' },
  ],
  resources: [
    { href: '/docs', label: 'Documentation' },
    { href: '/faq', label: 'FAQ' },
  ],
  legal: [
    { href: '/terms', label: 'Terms of Service' },
    { href: '/privacy', label: 'Privacy Policy' },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="font-heading font-bold text-white">P</span>
              </div>
              <span className="font-heading text-xl font-bold text-white">PRISM</span>
            </Link>
            <p className="text-sm text-secondary-400 mb-4">
              The smart way to maximize your DeFi yields on Base.
            </p>
            <div className="flex gap-4">
              <a
                href="https://twitter.com/prismfi"
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary-400 hover:text-white transition-colors"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://github.com/prismfi"
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary-400 hover:text-white transition-colors"
              >
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-heading font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-secondary-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-heading font-semibold text-white mb-4">Resources</h4>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-secondary-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-heading font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-secondary-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-secondary-400">
            © {new Date().getFullYear()} PRISM. All rights reserved.
          </p>
          <p className="text-sm text-secondary-500">
            Built on Base. Not financial advice.
          </p>
        </div>
      </div>
    </footer>
  );
}

'use client'; // This component uses client-side hooks (usePathname)

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Heart } from "lucide-react";


export default function Footer() {
  const pathname = usePathname();

  const navLinks = [
    { name: 'Ask Questions', href: '/ask' },
    { name: 'Upload Documents', href: '/upload-docs' },
    { name: 'Upload Image', href: '/upload-image' },
  ];

  return (
    <footer className="mt-60 row-start-3 bg-blue-900 backdrop-blur-md border-t text-white">
      <div className="container mx-auto px-4 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Brand
            </div>
            <p className="leading-relaxed opacity-80">
              Building the future of digital experiences with cutting-edge technology and innovative solutions.
            </p>
          </div>

          {/* Product Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Product</h3>
            <div className="space-y-2">
              <a href="#" className="block opacity-80 hover:opacity-100 transition-opacity">
                Features
              </a>
              <a href="#" className="block opacity-80 hover:opacity-100 transition-opacity">
                Pricing
              </a>
              <a href="#" className="block opacity-80 hover:opacity-100 transition-opacity">
                Integrations
              </a>
              <a href="#" className="block opacity-80 hover:opacity-100 transition-opacity">
                API Docs
              </a>
            </div>
          </div>

          {/* Company Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Company</h3>
            <div className="space-y-2">
              <a href="#" className="block opacity-80 hover:opacity-100 transition-opacity">
                About Us
              </a>
              <a href="#" className="block opacity-80 hover:opacity-100 transition-opacity">
                Careers
              </a>
              <a href="#" className="block opacity-80 hover:opacity-100 transition-opacity">
                Blog
              </a>
              <a href="#" className="block opacity-80 hover:opacity-100 transition-opacity">
                Press Kit
              </a>
            </div>
          </div>

          {/* Newsletter */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Stay Updated</h3>
            <p className="text-sm opacity-80">
              Get the latest news and updates delivered to your inbox.
            </p>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          <div className="text-sm opacity-60">
            © 2024 Brand. All rights reserved.
          </div>
          <div className="flex items-center space-x-6 text-sm">
            <a href="#" className="opacity-60 hover:opacity-100 transition-opacity">
              Privacy Policy
            </a>
            <a href="#" className="opacity-60 hover:opacity-100 transition-opacity">
              Terms of Service
            </a>
            <a href="#" className="opacity-60 hover:opacity-100 transition-opacity">
              Cookie Policy
            </a>
          </div>
          <div className="flex items-center text-sm opacity-60">
            Made with
            <Heart className="w-4 h-4 mx-1 text-pink-400" />
            by Remiges
          </div>
        </div>
      </div>
    </footer>
  );
}
'use client'; // This component uses client-side hooks (usePathname)

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const navLinks = [
    { name: 'Ask Questions', href: '/ask' },
    { name: 'Upload Documents', href: '/upload-docs' },
    { name: 'Upload Image', href: '/upload-image' },
  ];

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0">
              <Image
                src="/logo.png"
                alt="logo"
                width={150}
                height={30}
                sizes="(max-width: 768px) 120px, 150px"
              />
            </Link>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navLinks.map((link) => {
                const isActive = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`
                  px-3 py-2 rounded-md text-sm font-medium
                  ${isActive
                        ? 'text-fuchsia-700'
                        : 'text-blue-800 hover:text-sky-500'
                      }
                `}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>

  );
}
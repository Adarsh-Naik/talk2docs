'use client';

import { useState, useEffect } from "react";
import Image from "next/image";

export default function Home() {
  const fullText = "R etrieval Engine For Your Assistance __";
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setDisplayedText((prev) => prev + fullText.charAt(index));
      index++;
      if (index >= fullText.length) clearInterval(interval);
    }, 100); // typing speed in ms
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="font-sans items-center justify-items-center">
      <main className="grid grid-cols-1 md:grid-cols-2 items-center bg-white px-8 md:px-16 pt-15">
        
        {/* Left Side */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left p-10">
          
          {/* Logo */}
          <div>
            <Image
              src="/talk2docs.png"
              alt="talk2docs Logo"
              width={200}
              height={200}
              className="mb-6"
              priority
            />
          </div>

          {/* Title with typing animation */}
          <h1 className="text-4xl sm:text-2xl font-bold text-gray-900 mb-4">
            {displayedText}
            <span className="">😊</span>
          </h1>

          {/* Description */}
          <p className="text-lg text-gray-600 max-w-md mb-8">
            Turns your data into answers :) AI-powered retrieval meets intelligent generation for fast, precise, and insightful search results.
          </p>

          {/* Get Started Button */}
          <a
            href="/ask"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors transition delay-150 duration-400 ease-in-out hover:-translate-y-1 hover:scale-110 hover:bg-fuchsia-700/30"
          >
            Get Started
          </a>
        </div>

        {/* Right Side */}
        <div className="flex justify-center md:justify-end self-center animate-pulse p-10 ">
          <Image
            src="/image.jpg"
            alt="Image here"
            width={600}
            height={600}
            className="rounded-lg object-contain"
          />
        </div>
      </main>
    </div>
  );
}
'use client'

import { Button } from './Button'
import Image from 'next/image'

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#c9c9c9]">
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex items-center justify-between h-[70px]">
          <div className="flex items-center gap-3">
            <div className="relative w-[44px] h-[44px]">
              <img
                alt="Civiq Logo"
                className="w-full h-full object-contain"
                src="/civiq-logo.png"
              />
            </div>
            <p className="font-bold text-[24px] text-civiq-purple">Civiq</p>
          </div>

          <div className="flex items-center gap-8">
            <a href="#about" className="font-normal text-[22px] text-civiq-dark hover:text-civiq-purple transition-colors">
              About Civiq
            </a>
            <Button variant="primary">Contact Us</Button>
          </div>
        </div>
      </div>
    </header>
  )
}

'use client'

import { Header } from '@/components/Header'
import { TitleSection } from '@/components/TitleSection'
import { SimulationControls } from '@/components/SimulationControls'
import { AboutSection } from '@/components/AboutSection'
import { ResearchersSection } from '@/components/ResearchersSection'
import { Footer } from '@/components/Footer'

export default function Home() {
  return (
    <main className="w-full bg-gray-50">
      {/* Header */}
      <Header />

      {/* Hero Section with Title and Simulation Controls */}
      <section className="relative w-full pt-10 pb-10 bg-gray-50">
        {/* Background Image */}
        <div className="absolute inset-0 opacity-40 pointer-events-none overflow-hidden">
          <img 
            alt="" 
            className="absolute h-[142.97%] left-0 max-w-none top-[-43.02%] w-[116.79%]" 
            src="https://www.figma.com/api/mcp/asset/5608de9b-06dd-4684-a0da-f76a2c904f0d" 
          />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-[1400px] mx-auto px-6">
          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="font-bold text-civiq-dark text-[52px] leading-tight">
              Civiq
            </h1>
            <div className="font-italic text-civiq-blue text-[28px] mt-4 leading-tight">
              <p className="mb-0">A Hierarchical Multi-Agent Coordination Framework</p>
              <p>using QMIX for Urban Optimization</p>
            </div>
          </div>

          {/* Simulation Controls */}
          <SimulationControls />
        </div>
      </section>

      {/* About Section */}
      <section className="relative w-full py-16 bg-white">
        <div className="max-w-[1400px] mx-auto px-6">
          <AboutSection />
        </div>
      </section>

      {/* Researchers Section */}
      <section className="relative w-full py-20 bg-[#f9f9f9]">
        <div className="max-w-7xl mx-auto px-8">
          <ResearchersSection />
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </main>
  )
}

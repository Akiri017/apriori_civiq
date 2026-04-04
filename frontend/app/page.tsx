'use client'

import { useState, useEffect } from 'react'
import { AnimatedBackground } from '@/components/AnimatedBackground'
import { SimulationControls } from '@/components/SimulationControls'
import { AboutSection } from '@/components/AboutSection'
import { ResearchersSection } from '@/components/ResearchersSection'
import { Footer } from '@/components/Footer'

const StatusBar = () => {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const timeStr = now
    ? now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    : '--:--'
  const dateStr = now
    ? now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : ''

  return (
    <div
      className="flex items-center justify-between px-7 py-2.5 flex-shrink-0"
      style={{
        background: 'rgba(0,0,0,0.35)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Left — logo */}
      <div className="flex items-center gap-2.5">
        <img src="/icons/civiq-logo.png" alt="Civiq" className="w-5 h-5 object-contain brightness-0 invert opacity-80" />
        <span className="font-bold text-[13px] tracking-widest" style={{ color: 'rgba(255,255,255,0.75)' }}>
          CIVIQ
        </span>
        <span className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>
          ·&nbsp; A Hierarchical Multi-Agent Coordination Framework
        </span>
      </div>

      {/* Center — status icons */}
      <div className="flex items-center gap-3.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
        {/* WiFi */}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
          <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
          <line x1="12" y1="20" x2="12.01" y2="20"/>
        </svg>
        {/* Signal bars */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <rect x="1"  y="14" width="4" height="8" rx="1" opacity="1"/>
          <rect x="7"  y="9"  width="4" height="13" rx="1" opacity="1"/>
          <rect x="13" y="4"  width="4" height="18" rx="1" opacity="1"/>
          <rect x="19" y="1"  width="4" height="21" rx="1" opacity="0.3"/>
        </svg>
        {/* 4G label */}
        <span className="text-[10px] font-bold tracking-wider">4G</span>
      </div>

      {/* Right — date + time */}
      <div className="flex items-center gap-4">
        <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {dateStr}
        </span>
        <span className="font-bold text-[17px] tabular-nums" style={{ color: 'rgba(255,255,255,0.9)' }}>
          {timeStr}
        </span>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <main className="w-full">
      {/* ── Base gradient ── */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, #dde8f8 0%, #e6dff8 30%, #f7dff0 65%, #d9eef8 100%)',
          zIndex: -1,
        }}
      />

      {/* ── Animated blobs ── */}
      <AnimatedBackground />

      {/* ── HERO SECTION ── */}
      <section
        className="relative min-h-screen flex items-center justify-center px-8 py-12"
        style={{ zIndex: 2 }}
      >
        {/* ── OBU device frame ── */}
        <div
          className="w-full"
          style={{
            maxWidth: '1200px',
            background: 'linear-gradient(160deg, #1c2035 0%, #111626 50%, #0b0f1c 100%)',
            borderRadius: '22px',
            padding: '14px',
            boxShadow:
              '0 40px 100px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.07), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          {/* Side screw details */}
          <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 flex flex-col gap-3 pointer-events-none">
            {[0,1,2].map(i => (
              <div key={i} className="w-3 h-3 rounded-full" style={{ background: 'linear-gradient(135deg,#2a2e42,#1a1e30)', boxShadow: '0 1px 3px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.08)' }} />
            ))}
          </div>
          <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 flex flex-col gap-3 pointer-events-none">
            {[0,1,2].map(i => (
              <div key={i} className="w-3 h-3 rounded-full" style={{ background: 'linear-gradient(135deg,#2a2e42,#1a1e30)', boxShadow: '0 1px 3px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.08)' }} />
            ))}
          </div>

          {/* ── Screen ── */}
          <div
            className="relative w-full flex flex-col"
            style={{
              background: '#060d1a',
              borderRadius: '12px',
              boxShadow: 'inset 0 2px 24px rgba(0,0,0,0.9), inset 0 0 0 1px rgba(255,255,255,0.04)',
            }}
          >
            {/* Screen gloss */}
            <div
              className="absolute inset-x-0 top-0 h-1/3 pointer-events-none rounded-t-[12px]"
              style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)' }}
            />

            {/* Status bar */}
            <StatusBar />

            {/* ── Content ── */}
            <div className="flex flex-col items-center px-12 pt-10 pb-12 gap-7">

              {/* Title */}
              <div className="text-center max-w-[760px]">
                <h1
                  className="font-extrabold leading-[1.1] mb-5 select-none"
                  style={{
                    fontSize: 'clamp(32px, 3.2vw, 50px)',
                    backgroundImage: 'linear-gradient(140deg, #93C5FD 0%, #60A5FA 40%, #38BDF8 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Solving Urban Congestion Through Hierarchical Coordination.
                </h1>

                <p className="text-[14px] leading-[1.8] mb-7" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  An undergraduate thesis applying{' '}
                  <span className="font-semibold" style={{ color: '#38BDF8' }}>
                    Hierarchical Multi-Agent Reinforcement Learning
                  </span>{' '}
                  to urban traffic management. Vehicles act as intelligent agents that
                  cooperatively learn routing decisions — reducing congestion across a simulated road network.
                </p>

                <div className="flex gap-3 justify-center">
                  <a
                    href="#about"
                    className="px-6 py-2.5 text-[13.5px] font-semibold rounded-full transition-all duration-200 text-white"
                    style={{
                      background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                      boxShadow: '0 4px 20px rgba(59,130,246,0.45)',
                      border: 'none',
                    }}
                    onMouseEnter={(e) => {
                      ;(e.currentTarget as HTMLElement).style.boxShadow = '0 6px 28px rgba(59,130,246,0.65)'
                      ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(59,130,246,0.45)'
                      ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                    }}
                  >
                    Explore Research
                  </a>
                  <a
                    href="#"
                    className="px-6 py-2.5 text-[13.5px] font-semibold rounded-full transition-all duration-200"
                    style={{
                      background: 'rgba(56,189,248,0.08)',
                      border: '1.5px solid rgba(56,189,248,0.4)',
                      color: '#38BDF8',
                    }}
                    onMouseEnter={(e) => {
                      ;(e.currentTarget as HTMLElement).style.background = 'rgba(56,189,248,0.15)'
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLElement).style.background = 'rgba(56,189,248,0.08)'
                    }}
                  >
                    Thesis Paper
                  </a>
                </div>
              </div>

              {/* Divider */}
              <div
                className="w-full"
                style={{
                  height: '1px',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                }}
              />

              {/* Simulation controls card */}
              <div
                className="w-full"
                style={{
                  maxWidth: '900px',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: '20px',
                  border: '1px solid rgba(255,255,255,0.09)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                  padding: '28px 24px',
                }}
              >
                <SimulationControls darkMode />
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ── ABOUT SECTION ── */}
      <section id="about" className="relative w-full py-16 bg-white" style={{ zIndex: 2 }}>
        <div className="max-w-[1400px] mx-auto px-6">
          <AboutSection />
        </div>
      </section>

      {/* ── RESEARCHERS SECTION ── */}
      <section
        id="researchers"
        className="relative w-full py-20"
        style={{ background: '#f9f9f9', zIndex: 2 }}
      >
        <div className="max-w-7xl mx-auto px-8">
          <ResearchersSection />
        </div>
      </section>

      {/* ── FOOTER ── */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <Footer />
      </div>
    </main>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/Header'
import { SimulationControls } from '@/components/SimulationControls'
import { Footer } from '@/components/Footer'

const mapSizeLabels: Record<string, string> = {
  '2km': '2 km²',
  '0.75km': '0.75 km²',
  '4x4': '4x4 Grid (2.25 km²)'
}

const trafficScaleLabels: Record<string, string> = {
  'free_flow': 'Free Flow (LOS A)',
  'stable_flow': 'Stable Flow (LOS C)',
  'forced_flow': 'Forced Flow (LOS E)'
}

const viewLabels: Record<string, string> = {
  'focused': 'Focused',
  'comparative': 'Comparative'
}

const algorithmLabels: Record<string, string> = {
  'selfish_routing': 'Selfish Routing',
  'monolithic_qmix': 'Monolithic QMIX',
  'hierarchical_qmix': 'Hierarchical QMIX (Civiq)'
}

export default function SimulationDashboard() {
  const searchParams = useSearchParams()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(119) // Default 1:59, will be updated when video loads
  
  // Pan and zoom state
  const [scale, setScale] = useState(3)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  
  const mapSize = searchParams.get('mapSize') || ''
  const trafficScale = searchParams.get('trafficScale') || ''
  const view = searchParams.get('view') || ''
  const algorithm1 = searchParams.get('algorithm1') || ''
  const algorithm2 = searchParams.get('algorithm2') || ''

  // Sync video playback with state
  useEffect(() => {
    if (!videoRef.current) return
    
    if (isPlaying) {
      videoRef.current.play()
    } else {
      videoRef.current.pause()
    }
  }, [isPlaying])

  // Update duration when video metadata loads
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      setDuration(video.duration || 119)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime || 0)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(video.duration || 0)
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('ended', handleEnded)

    // Initialize duration if metadata is already loaded
    if (video.duration) {
      setDuration(video.duration)
    }
    
    // Ensure video is always muted
    video.volume = 0
    video.muted = true

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('ended', handleEnded)
    }
  }, [])

  const handleStop = () => {
    setIsPlaying(false)
    if (videoRef.current) {
      videoRef.current.currentTime = 0
    }
    setCurrentTime(0)
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const newTime = percentage * duration
    
    if (videoRef.current) {
      videoRef.current.currentTime = newTime
    }
    setCurrentTime(newTime)
  }

  const handleSeek = (seconds: number) => {
    if (!videoRef.current) return
    const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds))
    videoRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY * -0.001
    const newScale = Math.min(Math.max(0.5, scale + delta), 3)
    setScale(newScale)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <main className="w-full bg-gray-50 min-h-screen">
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
          <SimulationControls 
            initialMapSize={mapSize}
            initialTrafficScale={trafficScale}
            initialView={view}
            initialAlgorithm1={algorithm1}
            initialAlgorithm2={algorithm2}
          />
        </div>
      </section>
      
      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-6 py-8">

        {/* Map Visualization */}
        <div className="bg-white rounded-[32px] shadow-sm border border-gray-200 p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-civiq-dark text-[20px]">Interactive Simulation Map</h3>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-civiq-blue">
                  <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
                </svg>
                Pan with mouse
              </span>
              <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-civiq-blue">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 5v2m0 10v2m7-7h-2M5 12h2"/>
                </svg>
                Scroll to zoom
              </span>
            </div>
          </div>
          
          {/* Video Container with Map Styling */}
          <div className="relative">
            <div 
              className={`aspect-video bg-gray-900 rounded-[20px] overflow-hidden relative border-4 border-gray-300 shadow-lg ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.15), inset 0 0 0 1px rgba(255,255,255,0.1)' }}
            >
              <div 
                className="w-full h-full"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                  transformOrigin: 'center center'
                }}
              >
                <video
                  ref={videoRef}
                  src="/simulation.mp4"
                  className="w-full h-full object-contain select-none pointer-events-none"
                  draggable={false}
                  preload="metadata"
                  muted
                  playsInline
                />
              </div>
              
              {/* Map Grid Overlay */}
              <div className="absolute inset-0 pointer-events-none" style={{
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
                `,
                backgroundSize: '50px 50px'
              }} />
              
              {/* Top overlays */}
              <div className="absolute top-4 left-4 right-4 flex items-start justify-between pointer-events-none">
                {/* Time overlay */}
                <div className="bg-civiq-dark/90 backdrop-blur-sm px-4 py-2 rounded-lg text-white font-mono text-sm shadow-lg border border-white/10">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                </div>
                
                {/* Zoom indicator */}
                <div className="bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg text-civiq-dark font-semibold text-sm shadow-lg border border-gray-200">
                  🔍 {Math.round(scale * 100)}%
                </div>
              </div>
              
              {/* Map Controls - Right side */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 pointer-events-auto">
                {/* Zoom In */}
                <button
                  className="w-10 h-10 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 flex items-center justify-center hover:bg-civiq-blue hover:text-white transition-all font-bold text-xl"
                  onClick={() => setScale(Math.min(3, scale + 0.25))}
                  title="Zoom In"
                >
                  +
                </button>
                
                {/* Zoom Out */}
                <button
                  className="w-10 h-10 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 flex items-center justify-center hover:bg-civiq-blue hover:text-white transition-all font-bold text-xl"
                  onClick={() => setScale(Math.max(0.5, scale - 0.25))}
                  title="Zoom Out"
                >
                  −
                </button>
                
                {/* Reset View */}
                <button
                  className="w-10 h-10 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 flex items-center justify-center hover:bg-civiq-blue hover:text-white transition-all"
                  onClick={() => {
                    setScale(1)
                    setPosition({ x: 0, y: 0 })
                  }}
                  title="Reset View"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
                  </svg>
                </button>
                
                {/* Fit to Screen */}
                <button
                  className="w-10 h-10 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 flex items-center justify-center hover:bg-civiq-blue hover:text-white transition-all"
                  onClick={() => {
                    setScale(1)
                    setPosition({ x: 0, y: 0 })
                  }}
                  title="Fit to Screen"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 5v4h2V5h4V3H5c-1.1 0-2 .9-2 2zm2 10H3v4c0 1.1.9 2 2 2h4v-2H5v-4zm14 4h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4zm0-16h-4v2h4v4h2V5c0-1.1-.9-2-2-2z"/>
                  </svg>
                </button>
              </div>
              
              {/* Compass indicator - Bottom left */}
              <div className="absolute bottom-4 left-4 w-12 h-12 bg-white/95 backdrop-blur-sm rounded-full shadow-lg border-2 border-gray-200 flex items-center justify-center pointer-events-none">
                <div className="text-civiq-blue font-bold text-xs">N</div>
                <div className="absolute w-0.5 h-5 bg-civiq-blue top-1"></div>
              </div>
            </div>
          </div>
          
          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-6 mt-6 mb-5">
            {/* Restart Button */}
            <button 
              className="w-11 h-11 rounded-full bg-gray-300 text-civiq-dark flex items-center justify-center hover:bg-gray-400 transition-all shadow-sm"
              onClick={handleStop}
              title="Restart Simulation"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
              </svg>
            </button>
            
            {/* Rewind Button */}
            <button 
              className="w-11 h-11 rounded-full bg-civiq-purple text-white flex items-center justify-center hover:bg-opacity-90 transition-all shadow-sm"
              onClick={() => handleSeek(-10)}
              title="Rewind 10s"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/>
              </svg>
            </button>
            
            {/* Play/Pause Button */}
            <button 
              className="w-16 h-16 rounded-full bg-civiq-purple text-white flex items-center justify-center hover:bg-opacity-90 transition-all shadow-lg hover:shadow-xl"
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
              ) : (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>
            
            {/* Forward Button */}
            <button 
              className="w-11 h-11 rounded-full bg-civiq-purple text-white flex items-center justify-center hover:bg-opacity-90 transition-all shadow-sm"
              onClick={() => handleSeek(10)}
              title="Forward 10s"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/>
              </svg>
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="bg-gray-50 rounded-[20px] p-5 border border-gray-200">
            <div className="flex items-center justify-between mb-3 text-sm font-semibold">
              <span className="text-civiq-dark">{formatTime(currentTime)}</span>
              <span className="text-gray-500 text-xs">Duration: {formatTime(duration)}</span>
            </div>
            <div 
              className="relative h-3 bg-gray-200 rounded-full overflow-hidden cursor-pointer group hover:h-4 transition-all shadow-inner"
              onClick={handleProgressClick}
            >
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-civiq-purple to-civiq-blue transition-all rounded-full"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
              {/* Playhead */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-civiq-purple rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `calc(${(currentTime / duration) * 100}% - 8px)` }}
              />
            </div>
            <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1.5 font-medium">
                <span className={`${isPlaying ? 'text-green-500' : 'text-gray-400'}`}>
                  {isPlaying ? '▶' : '⏸'}
                </span>
                {isPlaying ? 'Playing' : 'Paused'}
              </span>
              <span className="font-medium">
                {Math.round((currentTime / duration) * 100)}% Complete
              </span>
            </div>
          </div>
        </div>

        {/* Simulation Metrics */}
        <h2 className="font-bold text-civiq-dark text-[24px] mb-6">Simulation Metrics</h2>
        
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Average Travel Time */}
          <div className="bg-white rounded-[32px] shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-civiq-dark text-[18px]">Average Travel Time (ATT)</h3>
              <div className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs">
                i
              </div>
            </div>
            <div className="flex items-end gap-3">
              <p className="text-[48px] font-bold text-civiq-blue">4.2</p>
              <p className="text-gray-500 mb-3">min/km</p>
            </div>
            <div className="h-24 flex items-end">
              <svg className="w-full h-full" viewBox="0 0 200 60">
                <polyline 
                  points="0,50 40,45 80,40 120,35 160,25 200,20" 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth="2"
                />
              </svg>
            </div>
          </div>

          {/* Learning Convergence */}
          <div className="bg-white rounded-[32px] shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-civiq-dark text-[18px]">Learning Convergence</h3>
              <div className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs">
                i
              </div>
            </div>
            <div className="h-32 bg-gradient-to-t from-blue-200 to-transparent opacity-50 rounded-lg" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Average Waiting Time */}
          <div className="bg-white rounded-[32px] shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-civiq-dark text-[18px]">Average Waiting Time</h3>
              <div className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs">
                i
              </div>
            </div>
            <div className="flex items-end gap-3">
              <p className="text-[48px] font-bold text-civiq-blue">18.5</p>
              <p className="text-gray-500 mb-3">sec/km</p>
            </div>
            <div className="h-24 flex items-end">
              <svg className="w-full h-full" viewBox="0 0 200 60">
                <polyline 
                  points="0,40 40,35 80,30 120,28 160,22 200,18" 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth="2"
                />
              </svg>
            </div>
          </div>

          {/* Traffic Wave Pattern */}
          <div className="bg-white rounded-[32px] shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-civiq-dark text-[18px]">Traffic Wave Pattern</h3>
              <div className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs">
                i
              </div>
            </div>
            <div className="h-32 flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 200 80">
                <polyline 
                  points="0,40 30,35 60,30 90,28 120,32 150,38 180,35 200,30" 
                  fill="none" 
                  stroke="#ef4444" 
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                <polyline 
                  points="0,45 30,42 60,38 90,36 120,40 150,45 180,42 200,38" 
                  fill="none" 
                  stroke="#3b82f6" 
                  strokeWidth="2"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Network Throughput */}
          <div className="bg-white rounded-[32px] shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-civiq-dark text-[18px]">Network Throughput</h3>
              <div className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs">
                i
              </div>
            </div>
            <div className="flex items-end gap-3">
              <p className="text-[48px] font-bold text-civiq-blue">1,875</p>
              <p className="text-gray-500 mb-3">veh/km</p>
            </div>
            <div className="h-24 flex items-end">
              <svg className="w-full h-full" viewBox="0 0 200 60">
                <polyline 
                  points="0,50 40,48 80,45 120,42 160,38 200,35" 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth="2"
                />
              </svg>
            </div>
          </div>

          {/* Real-Time Factor */}
          <div className="bg-white rounded-[32px] shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-civiq-dark text-[18px]">Real-Time Factor</h3>
              <div className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs">
                i
              </div>
            </div>
            <div className="flex items-end gap-3">
              <p className="text-[48px] font-bold text-civiq-blue">1.5x</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Network Pressure Mapping */}
          <div className="bg-white rounded-[32px] shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-civiq-dark text-[18px]">Network Pressure Mapping</h3>
              <div className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs">
                i
              </div>
            </div>
            <div className="aspect-square bg-gradient-to-br from-yellow-200 via-orange-300 to-red-400 rounded-[20px] relative overflow-hidden">
              <img 
                src="https://www.figma.com/api/mcp/asset/ba7168d7-379e-4206-8bc0-c8704ed27949" 
                alt="Heatmap" 
                className="w-full h-full object-cover opacity-70"
              />
            </div>
          </div>

          {/* Compute Time & Emissions */}
          <div className="flex flex-col gap-6">
            {/* Average Compute Time */}
            <div className="bg-white rounded-[32px] shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-civiq-dark text-[16px]">Average Compute Time</h3>
                    <div className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs">
                      i
                    </div>
                  </div>
                </div>
                <p className="text-[32px] font-bold text-civiq-blue">22.35 ms</p>
              </div>
            </div>

            {/* CO2 Emissions */}
            <div className="bg-white rounded-[32px] shadow-sm border border-gray-200 p-6 flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="relative w-32 h-32 mx-auto mb-3">
                  <svg className="w-full h-full -rotate-90">
                    <circle 
                      cx="64" 
                      cy="64" 
                      r="56" 
                      fill="none" 
                      stroke="#e5e7eb" 
                      strokeWidth="12"
                    />
                    <circle 
                      cx="64" 
                      cy="64" 
                      r="56" 
                      fill="none" 
                      stroke="#10b981" 
                      strokeWidth="12"
                      strokeDasharray="352"
                      strokeDashoffset="88"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-[40px] font-bold text-civiq-dark">142</p>
                    <p className="text-sm text-gray-600">g/km</p>
                  </div>
                </div>
                <p className="text-xs italic text-gray-600">Average CO2 Emissions per kilometer</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}

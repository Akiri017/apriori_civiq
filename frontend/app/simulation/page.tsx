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
  
  // Video Player 1 state
  const videoRef1 = useRef<HTMLVideoElement>(null)
  const [isPlaying1, setIsPlaying1] = useState(false)
  const [currentTime1, setCurrentTime1] = useState(0)
  const [duration1, setDuration1] = useState(119)
  const [scale1, setScale1] = useState(3)
  const [position1, setPosition1] = useState({ x: 0, y: 0 })
  const [isDragging1, setIsDragging1] = useState(false)
  const [dragStart1, setDragStart1] = useState({ x: 0, y: 0 })
  
  // Video Player 2 state (for comparative mode)
  const videoRef2 = useRef<HTMLVideoElement>(null)
  const [isPlaying2, setIsPlaying2] = useState(false)
  const [currentTime2, setCurrentTime2] = useState(0)
  const [duration2, setDuration2] = useState(119)
  const [scale2, setScale2] = useState(3)
  const [position2, setPosition2] = useState({ x: 0, y: 0 })
  const [isDragging2, setIsDragging2] = useState(false)
  const [dragStart2, setDragStart2] = useState({ x: 0, y: 0 })
  
  const mapSize = searchParams.get('mapSize') || ''
  const trafficScale = searchParams.get('trafficScale') || ''
  const view = searchParams.get('view') || ''
  const algorithm1 = searchParams.get('algorithm1') || ''
  const algorithm2 = searchParams.get('algorithm2') || ''

  // Sync video playback with state - Player 1
  useEffect(() => {
    if (!videoRef1.current) return
    
    if (isPlaying1) {
      videoRef1.current.play()
    } else {
      videoRef1.current.pause()
    }
  }, [isPlaying1])

  // Sync video playback with state - Player 2
  useEffect(() => {
    if (!videoRef2.current) return
    
    if (isPlaying2) {
      videoRef2.current.play()
    } else {
      videoRef2.current.pause()
    }
  }, [isPlaying2])

  // Update duration when video metadata loads - Player 1
  useEffect(() => {
    const video = videoRef1.current
    if (!video) return

    const handleLoadedMetadata = () => {
      setDuration1(video.duration || 119)
    }

    const handleTimeUpdate = () => {
      setCurrentTime1(video.currentTime || 0)
    }

    const handleEnded = () => {
      setIsPlaying1(false)
      setCurrentTime1(video.duration || 0)
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('ended', handleEnded)

    if (video.duration) {
      setDuration1(video.duration)
    }
    
    video.volume = 0
    video.muted = true

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('ended', handleEnded)
    }
  }, [])

  // Update duration when video metadata loads - Player 2
  useEffect(() => {
    const video = videoRef2.current
    if (!video) return

    const handleLoadedMetadata = () => {
      setDuration2(video.duration || 119)
    }

    const handleTimeUpdate = () => {
      setCurrentTime2(video.currentTime || 0)
    }

    const handleEnded = () => {
      setIsPlaying2(false)
      setCurrentTime2(video.duration || 0)
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('ended', handleEnded)

    if (video.duration) {
      setDuration2(video.duration)
    }
    
    video.volume = 0
    video.muted = true

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('ended', handleEnded)
    }
  }, [])

  // Player 1 handlers
  const handleStop1 = () => {
    setIsPlaying1(false)
    if (videoRef1.current) {
      videoRef1.current.currentTime = 0
    }
    setCurrentTime1(0)
  }

  const handleProgressClick1 = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const newTime = percentage * duration1
    
    if (videoRef1.current) {
      videoRef1.current.currentTime = newTime
    }
    setCurrentTime1(newTime)
  }

  const handleSeek1 = (seconds: number) => {
    if (!videoRef1.current) return
    const newTime = Math.max(0, Math.min(duration1, videoRef1.current.currentTime + seconds))
    videoRef1.current.currentTime = newTime
    setCurrentTime1(newTime)
  }

  const handleMouseDown1 = (e: React.MouseEvent) => {
    setIsDragging1(true)
    setDragStart1({
      x: e.clientX - position1.x,
      y: e.clientY - position1.y
    })
  }

  const handleMouseMove1 = (e: React.MouseEvent) => {
    if (!isDragging1) return
    setPosition1({
      x: e.clientX - dragStart1.x,
      y: e.clientY - dragStart1.y
    })
  }

  const handleMouseUp1 = () => {
    setIsDragging1(false)
  }

  const handleWheel1 = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY * -0.001
    const newScale = Math.min(Math.max(0.5, scale1 + delta), 3)
    setScale1(newScale)
  }

  // Player 2 handlers
  const handleStop2 = () => {
    setIsPlaying2(false)
    if (videoRef2.current) {
      videoRef2.current.currentTime = 0
    }
    setCurrentTime2(0)
  }

  const handleProgressClick2 = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const newTime = percentage * duration2
    
    if (videoRef2.current) {
      videoRef2.current.currentTime = newTime
    }
    setCurrentTime2(newTime)
  }

  const handleSeek2 = (seconds: number) => {
    if (!videoRef2.current) return
    const newTime = Math.max(0, Math.min(duration2, videoRef2.current.currentTime + seconds))
    videoRef2.current.currentTime = newTime
    setCurrentTime2(newTime)
  }

  const handleMouseDown2 = (e: React.MouseEvent) => {
    setIsDragging2(true)
    setDragStart2({
      x: e.clientX - position2.x,
      y: e.clientY - position2.y
    })
  }

  const handleMouseMove2 = (e: React.MouseEvent) => {
    if (!isDragging2) return
    setPosition2({
      x: e.clientX - dragStart2.x,
      y: e.clientY - dragStart2.y
    })
  }

  const handleMouseUp2 = () => {
    setIsDragging2(false)
  }

  const handleWheel2 = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY * -0.001
    const newScale = Math.min(Math.max(0.5, scale2 + delta), 3)
    setScale2(newScale)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Render function for a single video player
  const renderVideoPlayer = (
    playerNum: number,
    algorithm: string,
    videoRef: React.RefObject<HTMLVideoElement>,
    isPlaying: boolean,
    setIsPlaying: (playing: boolean) => void,
    currentTime: number,
    duration: number,
    scale: number,
    setScale: (scale: number) => void,
    position: { x: number; y: number },
    setPosition: (pos: { x: number; y: number }) => void,
    isDragging: boolean,
    handleMouseDown: (e: React.MouseEvent) => void,
    handleMouseMove: (e: React.MouseEvent) => void,
    handleMouseUp: () => void,
    handleWheel: (e: React.WheelEvent) => void,
    handleStop: () => void,
    handleSeek: (seconds: number) => void,
    handleProgressClick: (e: React.MouseEvent<HTMLDivElement>) => void
  ) => (
    <div className="bg-white rounded-[32px] shadow-sm border border-gray-200 p-8 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-civiq-dark text-[20px]">
          {view === 'comparative' ? algorithmLabels[algorithm] : 'Interactive Simulation Map'}
        </h3>
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
            <button
              className="w-10 h-10 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 flex items-center justify-center hover:bg-civiq-blue hover:text-white transition-all font-bold text-xl"
              onClick={() => setScale(Math.min(3, scale + 0.25))}
              title="Zoom In"
            >
              +
            </button>
            
            <button
              className="w-10 h-10 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 flex items-center justify-center hover:bg-civiq-blue hover:text-white transition-all font-bold text-xl"
              onClick={() => setScale(Math.max(0.5, scale - 0.25))}
              title="Zoom Out"
            >
              −
            </button>
            
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
          
          {/* Compass indicator */}
          <div className="absolute bottom-4 left-4 w-12 h-12 bg-white/95 backdrop-blur-sm rounded-full shadow-lg border-2 border-gray-200 flex items-center justify-center pointer-events-none">
            <div className="text-civiq-blue font-bold text-xs">N</div>
            <div className="absolute w-0.5 h-5 bg-civiq-blue top-1"></div>
          </div>
        </div>
      </div>
      
      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-6 mt-6 mb-5"></div>
      <div className="flex items-center justify-center gap-6 mt-6 mb-5">
        <button 
          className="w-11 h-11 rounded-full bg-gray-300 text-civiq-dark flex items-center justify-center hover:bg-gray-400 transition-all shadow-sm"
          onClick={handleStop}
          title="Restart Simulation"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
          </svg>
        </button>
        
        <button 
          className="w-11 h-11 rounded-full bg-civiq-purple text-white flex items-center justify-center hover:bg-opacity-90 transition-all shadow-sm"
          onClick={() => handleSeek(-10)}
          title="Rewind 10s"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/>
          </svg>
        </button>
        
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
        
        <button 
          className="w-11 h-11 rounded-full bg-civiq-purple text-white flex items-center justify-center hover:bg-opacity-90 transition-all shadow-sm"
          onClick={() => handleSeek(10)}
          title="Forward 10s"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M 4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/>
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
  )

  return (
    <main className="w-full bg-gray-50 min-h-screen">
      <Header />
      
      {/* Hero Section with Title and Simulation Controls */}
      <section className="relative w-full pt-10 pb-10 bg-gray-50">
        {/* Background Image */}
        <div className="absolute inset-0 opacity-25 pointer-events-none overflow-hidden">
          <img 
            alt="" 
            className="absolute h-[142.97%] left-0 max-w-none top-[-43.02%] w-[116.79%]" 
            src="https://www.figma.com/api/mcp/asset/5608de9b-06dd-4684-a0da-f76a2c904f0d"
            style={{ filter: 'grayscale(100%) brightness(0.6)' }}
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

        {/* Map Visualization - Conditional Rendering based on View Mode */}
        {view === 'comparative' ? (
          // Comparative Mode - Two Players Side by Side
          <div className="grid grid-cols-2 gap-6 mb-6">
            {renderVideoPlayer(
              1,
              algorithm1,
              videoRef1,
              isPlaying1,
              setIsPlaying1,
              currentTime1,
              duration1,
              scale1,
              setScale1,
              position1,
              setPosition1,
              isDragging1,
              handleMouseDown1,
              handleMouseMove1,
              handleMouseUp1,
              handleWheel1,
              handleStop1,
              handleSeek1,
              handleProgressClick1
            )}
            
            {renderVideoPlayer(
              2,
              algorithm2,
              videoRef2,
              isPlaying2,
              setIsPlaying2,
              currentTime2,
              duration2,
              scale2,
              setScale2,
              position2,
              setPosition2,
              isDragging2,
              handleMouseDown2,
              handleMouseMove2,
              handleMouseUp2,
              handleWheel2,
              handleStop2,
              handleSeek2,
              handleProgressClick2
            )}
          </div>
        ) : (
          // Focused Mode - Single Player
          <div className="mb-6">
            {renderVideoPlayer(
              1,
              algorithm1,
              videoRef1,
              isPlaying1,
              setIsPlaying1,
              currentTime1,
              duration1,
              scale1,
              setScale1,
              position1,
              setPosition1,
              isDragging1,
              handleMouseDown1,
              handleMouseMove1,
              handleMouseUp1,
              handleWheel1,
              handleStop1,
              handleSeek1,
              handleProgressClick1
            )}
          </div>
        )}
      </div>

      {/* Simulation Metrics */}
      <section className="bg-[#E5E7EB] py-12 w-full">
        <div className="max-w-[1400px] mx-auto px-6">
          <h2 className="font-bold text-civiq-dark text-[28px] mb-8">Simulation Metrics</h2>
          
          <div className="grid grid-cols-12 gap-6">
            {/* Left Column - Small Metric Cards */}
            <div className="col-span-3 space-y-6">
              {/* Average Travel Time */}
              <div className="bg-white rounded-[32px] shadow-md p-6">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-base font-bold text-civiq-dark">Average Travel Time (ATT)</h3>
                  <div className="w-4 h-4 rounded-full border-2 border-gray-400 flex items-center justify-center text-xs text-gray-400">i</div>
                </div>
                <div className="flex items-baseline gap-2 mb-3">
                  <p className="text-4xl font-bold text-civiq-dark">4.2</p>
                  <span className="text-sm text-civiq-dark">min</span>
                  <span className="text-sm text-green-600 ml-auto">+12.34%</span>
                </div>
                <div className="h-16 flex items-end">
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

              {/* Average Waiting Time */}
              <div className="bg-white rounded-[32px] shadow-md p-6">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-base font-bold text-civiq-dark">Average Waiting Time</h3>
                  <div className="w-4 h-4 rounded-full border-2 border-gray-400 flex items-center justify-center text-xs text-gray-400">i</div>
                </div>
                <div className="flex items-baseline gap-2 mb-3">
                  <p className="text-4xl font-bold text-civiq-dark">18.5</p>
                  <span className="text-sm text-civiq-dark">sec</span>
                  <span className="text-sm text-green-600 ml-auto">+22.25%</span>
                </div>
                <div className="h-16 flex items-end">
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

              {/* Network Throughput */}
              <div className="bg-white rounded-[32px] shadow-md p-6">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-base font-bold text-civiq-dark">Network Throughput</h3>
                  <div className="w-4 h-4 rounded-full border-2 border-gray-400 flex items-center justify-center text-xs text-gray-400">i</div>
                </div>
                <div className="flex items-baseline gap-2 mb-3">
                  <p className="text-4xl font-bold text-civiq-dark">1,875</p>
                  <span className="text-sm text-civiq-dark">veh/hr</span>
                  <span className="text-sm text-green-600 ml-auto">+4.32%</span>
                </div>
                <div className="h-16 flex items-end">
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
              <div className="bg-white rounded-[32px] shadow-md p-6">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-base font-bold text-civiq-dark">Real-Time Factor</h3>
                  <div className="w-4 h-4 rounded-full border-2 border-gray-400 flex items-center justify-center text-xs text-gray-400">i</div>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-bold text-civiq-dark">1.5x</p>
                </div>
              </div>
            </div>

            {/* Middle Column - Charts */}
            <div className="col-span-6 space-y-6">
              {/* Learning Convergence */}
              <div className="bg-white rounded-[32px] shadow-md p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-xl font-bold text-civiq-dark">Learning Convergence</h3>
                  <div className="w-4 h-4 rounded-full border-2 border-gray-400 flex items-center justify-center text-xs text-gray-400">i</div>
                </div>
                <div className="h-56 bg-gradient-to-t from-blue-200 to-transparent opacity-50 rounded-lg" />
              </div>

              {/* Traffic Wave Pattern */}
              <div className="bg-white rounded-[32px] shadow-md p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-xl font-bold text-civiq-dark">Traffic Wave Pattern</h3>
                  <div className="w-4 h-4 rounded-full border-2 border-gray-400 flex items-center justify-center text-xs text-gray-400">i</div>
                </div>
                <div className="h-56 flex items-center justify-center">
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

              {/* Network Pressure Mapping */}
              <div className="bg-white rounded-[32px] shadow-md p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-xl font-bold text-civiq-dark">Network Pressure Mapping</h3>
                  <div className="w-4 h-4 rounded-full border-2 border-gray-400 flex items-center justify-center text-xs text-gray-400">i</div>
                </div>
                <div className="aspect-square bg-gradient-to-br from-yellow-200 via-orange-300 to-red-400 rounded-[20px] relative overflow-hidden">
                  <img 
                    src="https://www.figma.com/api/mcp/asset/ba7168d7-379e-4206-8bc0-c8704ed27949" 
                    alt="Heatmap" 
                    className="w-full h-full object-cover opacity-70"
                  />
                </div>
              </div>
            </div>

            {/* Right Column - Compute Time & Gauges */}
            <div className="col-span-3 space-y-6">
              {/* Average Compute Time */}
              <div className="bg-white rounded-[32px] shadow-md p-6">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-base font-bold text-civiq-dark">Average Compute Time</h3>
                  <div className="w-4 h-4 rounded-full border-2 border-gray-400 flex items-center justify-center text-xs text-gray-400">i</div>
                </div>
                <p className="text-3xl font-bold text-civiq-dark text-right">22.35 ms</p>
              </div>

              {/* Average CO2 Emissions */}
              <div className="bg-white rounded-[32px] shadow-md p-8">
                <div className="text-center">
                  <div className="relative w-full aspect-square max-w-[180px] mx-auto mb-3">
                    <svg className="w-full h-full -rotate-90">
                      <circle 
                        cx="50%" 
                        cy="50%" 
                        r="45%" 
                        fill="none" 
                        stroke="#e5e7eb" 
                        strokeWidth="16"
                      />
                      <circle 
                        cx="50%" 
                        cy="50%" 
                        r="45%" 
                        fill="none" 
                        stroke="#7FE47E" 
                        strokeWidth="16"
                        strokeDasharray="282.7"
                        strokeDashoffset="70"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-5xl font-bold text-civiq-dark">142</p>
                      <p className="text-lg text-civiq-dark">g/km</p>
                    </div>
                  </div>
                  <p className="text-xs italic text-civiq-dark">Average CO2 Emissions per kilometer</p>
                </div>
              </div>

              {/* Average Fuel Consumption */}
              <div className="bg-white rounded-[32px] shadow-md p-8">
                <div className="text-center">
                  <div className="relative w-full aspect-square max-w-[180px] mx-auto mb-3">
                    <svg className="w-full h-full -rotate-90">
                      <circle 
                        cx="50%" 
                        cy="50%" 
                        r="45%" 
                        fill="none" 
                        stroke="#e5e7eb" 
                        strokeWidth="16"
                      />
                      <circle 
                        cx="50%" 
                        cy="50%" 
                        r="45%" 
                        fill="none" 
                        stroke="#04CE00" 
                        strokeWidth="16"
                        strokeDasharray="282.7"
                        strokeDashoffset="140"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-5xl font-bold text-civiq-dark">23</p>
                      <p className="text-lg text-civiq-dark">g/km</p>
                    </div>
                  </div>
                  <p className="text-xs italic text-civiq-dark">Average Fuel Consumption of a Vehicle</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}

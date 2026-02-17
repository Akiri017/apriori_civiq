'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
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
  const router = useRouter()
  
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
  
  // Tooltip state
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)
  
  const mapSize = searchParams.get('mapSize') || ''
  const trafficScale = searchParams.get('trafficScale') || ''
  const view = searchParams.get('view') || ''
  const algorithm1 = searchParams.get('algorithm1') || ''
  const algorithm2 = searchParams.get('algorithm2') || ''

  // Security: Validate required parameters and redirect if missing/invalid
  useEffect(() => {
    const validateAccess = () => {
      // Check if basic required fields are present
      if (!mapSize || !trafficScale || !view || !algorithm1) {
        router.push('/')
        return false
      }

      // Validate that values are from allowed options
      const validMapSizes = ['2km', '0.75km', '4x4']
      const validTrafficScales = ['free_flow', 'stable_flow', 'forced_flow']
      const validViews = ['focused', 'comparative']
      const validAlgorithms = ['selfish_routing', 'monolithic_qmix', 'hierarchical_qmix']

      if (!validMapSizes.includes(mapSize) || 
          !validTrafficScales.includes(trafficScale) || 
          !validViews.includes(view) ||
          !validAlgorithms.includes(algorithm1)) {
        router.push('/')
        return false
      }

      // For comparative view, check algorithm2 is present and different from algorithm1
      if (view === 'comparative') {
        if (!algorithm2 || algorithm1 === algorithm2 || !validAlgorithms.includes(algorithm2)) {
          router.push('/')
          return false
        }
      }

      return true
    }

    validateAccess()
  }, [mapSize, trafficScale, view, algorithm1, algorithm2, router])

  // Algorithm ranking: selfish_routing < monolithic_qmix < hierarchical_qmix
  const algorithmRank: Record<string, number> = {
    'selfish_routing': 1,
    'monolithic_qmix': 2,
    'hierarchical_qmix': 3
  }

  // Compute time ranking (for scalability): monolithic_qmix > selfish_routing > hierarchical_qmix
  // Lower compute time is better, so higher rank means better performance
  const computeTimeRank: Record<string, number> = {
    'monolithic_qmix': 1,
    'selfish_routing': 2,
    'hierarchical_qmix': 3
  }

  // Determine superior and inferior algorithms for comparative mode
  const getSuperiorAlgorithm = () => {
    const rank1 = algorithmRank[algorithm1] || 0
    const rank2 = algorithmRank[algorithm2] || 0
    if (rank1 > rank2) {
      return { superior: algorithm1, inferior: algorithm2 }
    } else {
      return { superior: algorithm2, inferior: algorithm1 }
    }
  }

  // Determine superior algorithm for compute time (lower is better)
  const getSuperiorAlgorithmForComputeTime = () => {
    const rank1 = computeTimeRank[algorithm1] || 0
    const rank2 = computeTimeRank[algorithm2] || 0
    if (rank1 > rank2) {
      return { superior: algorithm1, inferior: algorithm2 }
    } else {
      return { superior: algorithm2, inferior: algorithm1 }
    }
  }

  const { superior: superiorAlgo, inferior: inferiorAlgo } = view === 'comparative' ? getSuperiorAlgorithm() : { superior: algorithm1, inferior: algorithm2 }
  const { superior: superiorComputeAlgo, inferior: inferiorComputeAlgo } = view === 'comparative' ? getSuperiorAlgorithmForComputeTime() : { superior: algorithm1, inferior: algorithm2 }

  // Metrics state - populated from API
  const [metrics, setMetrics] = useState({
    averageTravelTime: '4.2',
    averageWaitTime: '156',
    networkThroughput: '78',
    averageSpeed: '45.2',
    systemCongestion: 389,
    averageSystemWait: '41.4',
    totalVehiclesMeasured: 360,
    co2Emissions: '142',
    fuelConsumption: '23',
    computeTime: '22.35',
    realTimeFactor: '0.00',
    convergenceEpisode: 150,
    cumulativeReward: 1250,
  })

  // Fetch real results data when algorithm changes
  useEffect(() => {
    if (!algorithm1) return

    const fetchResults = async () => {
      try {
        const trafficLevel = trafficScale.includes('high') ? 'high'
          : trafficScale.includes('low') ? 'low'
          : 'med'
        
        const response = await fetch(
          `/api/results?algorithm=${algorithm1}&trafficLevel=${trafficLevel}`
        )
        const data = await response.json()
        
        if (data.success) {
          setMetrics(data.metrics)
        }
      } catch (error) {
        console.error('Failed to fetch results:', error)
      }
    }

    fetchResults()
  }, [algorithm1, trafficScale])

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
  );

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
              superiorAlgo,
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
              inferiorAlgo,
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
          
          {view === 'comparative' ? (
            /* Comparative Metrics Layout */
            <>
              {/* Performance Profile & Explanation */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                {/* Performance Profile Spider Chart */}
                <div className="bg-white rounded-[32px] shadow-lg p-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-civiq-dark">Performance Profile</h3>
                      <div className="w-4 h-4 rounded-full border-2 border-gray-400 flex items-center justify-center text-xs text-gray-400">
                        i
                      </div>
                    </div>
                    
                    {/* Legend - Top Right */}
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#8b5cf6]"></div>
                        <span className="text-xs font-medium text-civiq-dark">{algorithmLabels[superiorAlgo] || superiorAlgo}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div>
                        <span className="text-xs text-gray-600">{algorithmLabels[inferiorAlgo] || inferiorAlgo}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="relative w-full h-[280px] flex items-center justify-center">
                    <svg viewBox="0 0 400 400" className="w-auto h-full max-w-[280px]">
                      {/* Background circles */}
                      <circle cx="200" cy="200" r="160" fill="none" stroke="#f1f1f1" strokeWidth="1"/>
                      <circle cx="200" cy="200" r="120" fill="none" stroke="#f1f1f1" strokeWidth="1"/>
                      <circle cx="200" cy="200" r="80" fill="none" stroke="#f1f1f1" strokeWidth="1"/>
                      <circle cx="200" cy="200" r="40" fill="none" stroke="#f1f1f1" strokeWidth="1"/>
                      
                      {/* Axis lines - 7 metrics evenly distributed */}
                      <line x1="200" y1="200" x2="200" y2="40" stroke="#f1f1f1" strokeWidth="1"/>
                      <line x1="200" y1="200" x2="325" y2="100" stroke="#f1f1f1" strokeWidth="1"/>
                      <line x1="200" y1="200" x2="356" y2="164" stroke="#f1f1f1" strokeWidth="1"/>
                      <line x1="200" y1="200" x2="269" y2="344" stroke="#f1f1f1" strokeWidth="1"/>
                      <line x1="200" y1="200" x2="131" y2="344" stroke="#f1f1f1" strokeWidth="1"/>
                      <line x1="200" y1="200" x2="44" y2="164" stroke="#f1f1f1" strokeWidth="1"/>
                      <line x1="200" y1="200" x2="75" y2="100" stroke="#f1f1f1" strokeWidth="1"/>
                      
                      {/* Scale labels */}
                      <text x="200" y="205" fontSize="12" fill="#f1f1f1" textAnchor="middle" fontWeight="bold">20</text>
                      <text x="200" y="165" fontSize="12" fill="#f1f1f1" textAnchor="middle" fontWeight="bold">40</text>
                      <text x="200" y="125" fontSize="12" fill="#f1f1f1" textAnchor="middle" fontWeight="bold">60</text>
                      <text x="200" y="85" fontSize="12" fill="#f1f1f1" textAnchor="middle" fontWeight="bold">80</text>
                      <text x="200" y="45" fontSize="12" fill="#f1f1f1" textAnchor="middle" fontWeight="bold">100</text>
                      
                      {/* Superior algorithm polygon (purple) - Hierarchical QMIX */}
                      <polygon 
                        points="200,64 231,175 247,189 224,250 180,241 153,189 106,125"
                        fill="#8b5cf6"
                        fillOpacity="0.3"
                        stroke="#8b5cf6"
                        strokeWidth="3"
                        strokeLinejoin="round"
                      />
                      
                      {/* Inferior algorithm polygon (red) - Selfish Routing */}
                      <polygon 
                        points="200,104 281,135 309,175 235,272 148,308 88,174 131,145"
                        fill="#ef4444"
                        fillOpacity="0.3"
                        stroke="#ef4444"
                        strokeWidth="3"
                        strokeLinejoin="round"
                      />
                    </svg>
                    
                    {/* Metric labels - aligned with 7 axes */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 text-xs font-medium text-civiq-dark">
                      Throughput
                    </div>
                    <div className="absolute top-[10%] right-[8%] text-xs font-medium text-civiq-dark">
                      Waiting Time
                    </div>
                    <div className="absolute top-[30%] right-0 text-xs font-medium text-civiq-dark">
                      Travel Time
                    </div>
                    <div className="absolute bottom-[8%] right-[18%] text-xs font-medium text-civiq-dark">
                      Compute Time
                    </div>
                    <div className="absolute bottom-[8%] left-[18%] text-xs font-medium text-civiq-dark">
                      CO2 Emissions
                    </div>
                    <div className="absolute top-[30%] left-0 text-xs font-medium text-civiq-dark text-right">
                      Fuel Consumption
                    </div>
                    <div className="absolute top-[10%] left-[8%] text-xs font-medium text-civiq-dark text-right">
                      Real Time Factor
                    </div>
                  </div>
                </div>
                
                {/* Explanation */}
                <div className="bg-white rounded-[32px] shadow-lg p-8 flex flex-col justify-center">
                  <h3 className="text-xl font-bold text-civiq-dark mb-4">Understanding the Results</h3>
                  <p className="text-civiq-dark leading-relaxed mb-4">
                    The Performance Profile provides a comprehensive view of how different traffic management algorithms perform across multiple dimensions. The radar chart visualizes seven key metrics simultaneously, allowing for quick comparative analysis.
                  </p>
                  <p className="text-civiq-dark leading-relaxed">
                    <span className="font-bold text-[#8b5cf6]">{algorithmLabels[superiorAlgo] || superiorAlgo}</span> demonstrates superior performance across most metrics, particularly in reducing travel time and emissions while maintaining network efficiency. In contrast, <span className="font-bold text-[#ef4444]">{algorithmLabels[inferiorAlgo] || inferiorAlgo}</span> shows comparatively lower performance but requires less computational resources. The optimal choice depends on your priorities: environmental impact, user experience, or system scalability.
                  </p>
                </div>
              </div>
              
              {/* Divider */}
              <div className="flex items-center gap-4 my-10">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Detailed Metrics</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
              </div>
              
              <div className="bg-white rounded-[32px] shadow-lg p-8 mb-6">
                <div className="grid grid-cols-12 gap-6">
                  {/* Left Column - ATT, AWT, Network Throughput */}
                  <div className="col-span-5 space-y-6">
                    {/* Average Travel Time */}
                    <div className="bg-gray-50 rounded-[24px] p-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 relative">
                          <h3 className="text-base font-bold text-civiq-dark">Average Travel Time (ATT)</h3>
                          <div 
                            className="w-4 h-4 rounded-full border-2 border-gray-400 flex items-center justify-center text-xs text-gray-400 cursor-help"
                            onMouseEnter={() => setActiveTooltip('att')}
                            onMouseLeave={() => setActiveTooltip(null)}
                          >
                            i
                          </div>
                          {activeTooltip === 'att' && (
                            <div className="absolute left-0 top-6 z-10 w-64 p-3 bg-civiq-dark text-white text-sm rounded-lg shadow-lg">
                              The average time taken for vehicles to complete their journey from origin to destination.
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                            <path d="M6 2L4 6h4L6 2z"/>
                          </svg>
                          +12.34%
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex-shrink-0 flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full bg-[#1877f2]"></span>
                              <p className="text-lg font-bold text-[#1877f2]">{algorithmLabels[superiorAlgo] || superiorAlgo}</p>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                              <p className="text-3xl font-bold text-[#1877f2]">4.2</p>
                              <span className="text-sm text-[#1877f2]">mins</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-600 ml-5">{algorithmLabels[inferiorAlgo] || inferiorAlgo}</p>
                            <p className="text-sm text-gray-600">6.7 mins</p>
                          </div>
                        </div>
                        <div className="flex-shrink-0 h-16 w-32 flex items-end">
                          <svg className="w-full h-full" viewBox="0 0 130 60" preserveAspectRatio="none">
                            <polyline points="0,50 30,45 60,40 90,35 120,30" fill="none" stroke="#10b981" strokeWidth="2.5"/>
                            <polyline points="0,45 30,43 60,40 90,38 120,36" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="3 3"/>
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Average Waiting Time */}
                    <div className="bg-gray-50 rounded-[24px] p-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 relative">
                          <h3 className="text-base font-bold text-civiq-dark">Average Waiting Time</h3>
                          <div 
                            className="w-4 h-4 rounded-full border-2 border-gray-400 flex items-center justify-center text-xs text-gray-400 cursor-help"
                            onMouseEnter={() => setActiveTooltip('awt')}
                            onMouseLeave={() => setActiveTooltip(null)}
                          >
                            i
                          </div>
                          {activeTooltip === 'awt' && (
                            <div className="absolute left-0 top-6 z-10 w-64 p-3 bg-civiq-dark text-white text-sm rounded-lg shadow-lg">
                              The average time vehicles spend waiting at intersections and in traffic congestion.
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                            <path d="M6 2L4 6h4L6 2z"/>
                          </svg>
                          +22.25%
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex-shrink-0 flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full bg-[#1877f2]"></span>
                              <p className="text-lg font-bold text-[#1877f2]">{algorithmLabels[superiorAlgo] || superiorAlgo}</p>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                              <p className="text-3xl font-bold text-[#1877f2]">18.5</p>
                              <span className="text-sm text-[#1877f2]">sec</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-600 ml-5">{algorithmLabels[inferiorAlgo] || inferiorAlgo}</p>
                            <p className="text-sm text-gray-600">35 sec</p>
                          </div>
                        </div>
                        <div className="flex-shrink-0 h-16 w-32 flex items-end">
                          <svg className="w-full h-full" viewBox="0 0 130 60" preserveAspectRatio="none">
                            <polyline points="0,55 30,50 60,45 90,40 120,35" fill="none" stroke="#10b981" strokeWidth="2.5"/>
                            <polyline points="0,48 30,46 60,44 90,42 120,40" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="3 3"/>
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Network Throughput */}
                    <div className="bg-gray-50 rounded-[24px] p-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 relative">
                          <h3 className="text-base font-bold text-civiq-dark">Network Throughput</h3>
                          <div 
                            className="w-4 h-4 rounded-full border-2 border-gray-400 flex items-center justify-center text-xs text-gray-400 cursor-help"
                            onMouseEnter={() => setActiveTooltip('throughput')}
                            onMouseLeave={() => setActiveTooltip(null)}
                          >
                            i
                          </div>
                          {activeTooltip === 'throughput' && (
                            <div className="absolute left-0 top-6 z-10 w-64 p-3 bg-civiq-dark text-white text-sm rounded-lg shadow-lg">
                              The number of vehicles that successfully pass through the network per hour.
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                            <path d="M6 2L4 6h4L6 2z"/>
                          </svg>
                          +8.32%
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex-shrink-0 flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full bg-[#1877f2]"></span>
                              <p className="text-lg font-bold text-[#1877f2]">{algorithmLabels[superiorAlgo] || superiorAlgo}</p>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                              <p className="text-3xl font-bold text-[#1877f2]">1,875</p>
                              <span className="text-sm text-[#1877f2]">veh/hr</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-600 ml-5">{algorithmLabels[inferiorAlgo] || inferiorAlgo}</p>
                            <p className="text-sm text-gray-600">1,928 veh/hr</p>
                          </div>
                        </div>
                        <div className="flex-shrink-0 h-16 w-32 flex items-end">
                          <svg className="w-full h-full" viewBox="0 0 130 60" preserveAspectRatio="none">
                            <polyline points="0,52 30,50 60,48 90,46 120,44" fill="none" stroke="#10b981" strokeWidth="2.5"/>
                            <polyline points="0,48 30,47 60,46 90,45 120,44" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="3 3"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Traffic Wave Pattern & Compute Time */}
                  <div className="col-span-7 space-y-6">
                    {/* Traffic Wave Pattern */}
                    <div className="bg-gray-50 rounded-[24px] p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2 relative">
                          <h3 className="text-xl font-bold text-civiq-dark">Traffic Wave Pattern</h3>
                          <div 
                            className="w-4 h-4 rounded-full border-2 border-gray-400 flex items-center justify-center text-xs text-gray-400 cursor-help"
                            onMouseEnter={() => setActiveTooltip('traffic-wave')}
                            onMouseLeave={() => setActiveTooltip(null)}
                          >
                            i
                          </div>
                          {activeTooltip === 'traffic-wave' && (
                            <div className="absolute left-0 top-6 z-10 w-64 p-3 bg-civiq-dark text-white text-sm rounded-lg shadow-lg">
                              Visualization of how traffic congestion propagates through the network over time.
                            </div>
                          )}
                        </div>
                        
                        {/* Legend - Grouped by Algorithm */}
                        <div className="flex flex-col gap-1">
                          {/* Superior Algorithm */}
                          <div className="flex items-center gap-4">
                            <p className="text-[15px] font-bold text-civiq-dark min-w-[120px]">{algorithmLabels[superiorAlgo] || superiorAlgo}</p>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-[#ef4444]"></div>
                                <p className="text-sm text-[#615e83]">Queue Length</p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-[#f97316]"></div>
                                <p className="text-sm text-[#615e83]">Waiting Time</p>
                              </div>
                            </div>
                          </div>
                          {/* Inferior Algorithm */}
                          <div className="flex items-center gap-4">
                            <p className="text-[15px] font-bold text-civiq-dark min-w-[120px]">{algorithmLabels[inferiorAlgo] || inferiorAlgo}</p>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-[#3b82f6]"></div>
                                <p className="text-sm text-[#615e83]">Queue Length</p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-[#1e40af]"></div>
                                <p className="text-sm text-[#615e83]">Waiting Time</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Chart */}
                      <div className="relative h-[225px]">
                        <svg className="w-full h-full" viewBox="0 0 680 220" preserveAspectRatio="none">
                          {/* Y-axis labels */}
                          <text x="10" y="15" fontSize="13" fill="#615e83" textAnchor="start">45</text>
                          <text x="10" y="75" fontSize="13" fill="#615e83" textAnchor="start">30</text>
                          <text x="10" y="135" fontSize="13" fill="#615e83" textAnchor="start">15</text>
                          <text x="18" y="195" fontSize="13" fill="#615e83" textAnchor="start">0</text>

                          {/* Y-axis label (rotated) */}
                          <text x="0" y="110" fontSize="10" fill="#031661" textAnchor="middle" transform="rotate(-90 0 110)">Vehicles / Second</text>

                          {/* Horizontal grid line */}
                          <line x1="50" y1="190" x2="670" y2="190" stroke="#E5E5EF" strokeWidth="1.5"/>

                          {/* Traffic wave lines */}
                          {/* Civiq - Queue Length (red) */}
                          <polyline 
                            points="50,185 110,165 180,130 250,100 320,90 390,100 460,130 530,160 600,175 640,183 670,187" 
                            fill="none" 
                            stroke="#ef4444" 
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* Civiq - Waiting Time (orange) */}
                          <polyline 
                            points="50,188 110,178 180,160 250,140 320,130 390,135 460,150 530,170 600,182 640,187 670,189" 
                            fill="none" 
                            stroke="#f97316" 
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* Selfish Routing - Queue Length (blue) */}
                          <polyline 
                            points="50,180 110,155 180,115 250,80 320,65 390,80 460,115 530,150 600,170 640,180 670,185" 
                            fill="none" 
                            stroke="#3b82f6" 
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* Selfish Routing - Waiting Time (dark blue) */}
                          <polyline 
                            points="50,188 110,186 180,178 250,170 320,165 390,168 460,175 530,182 600,187 640,189 670,190" 
                            fill="none" 
                            stroke="#1e40af" 
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* X-axis labels */}
                          <text x="50" y="210" fontSize="12" fill="#615e83" textAnchor="middle">2:50</text>
                          <text x="140" y="210" fontSize="12" fill="#615e83" textAnchor="middle">5:00</text>
                          <text x="230" y="210" fontSize="12" fill="#615e83" textAnchor="middle">7:50</text>
                          <text x="320" y="210" fontSize="12" fill="#615e83" textAnchor="middle">10:00</text>
                          <text x="390" y="210" fontSize="12" fill="#615e83" textAnchor="middle">12:50</text>
                          <text x="460" y="210" fontSize="12" fill="#615e83" textAnchor="middle">15:00</text>
                          <text x="530" y="210" fontSize="12" fill="#615e83" textAnchor="middle">17:50</text>
                          <text x="600" y="210" fontSize="12" fill="#615e83" textAnchor="middle">20:00</text>
                          <text x="650" y="210" fontSize="12" fill="#615e83" textAnchor="middle">22:50</text>

                          {/* X-axis label */}
                          <text x="655" y="218" fontSize="10" fill="#031661" textAnchor="end">Simulation Time</text>
                        </svg>
                      </div>
                    </div>

                    {/* Average Compute Time */}
                    <div className="bg-gray-50 rounded-[24px] p-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 relative">
                          <h3 className="text-base font-bold text-civiq-dark">Average Compute Time</h3>
                          <div 
                            className="w-4 h-4 rounded-full border-2 border-gray-400 flex items-center justify-center text-xs text-gray-400 cursor-help"
                            onMouseEnter={() => setActiveTooltip('compute-time')}
                            onMouseLeave={() => setActiveTooltip(null)}
                          >
                            i
                          </div>
                          {activeTooltip === 'compute-time' && (
                            <div className="absolute left-0 top-6 z-10 w-64 p-3 bg-civiq-dark text-white text-sm rounded-lg shadow-lg">
                              The average time required to compute routing decisions per simulation step. Lower values indicate better scalability.
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                            <path d="M6 2L4 6h4L6 2z"/>
                          </svg>
                          +45.8%
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex-shrink-0 flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full bg-[#1877f2]"></span>
                              <p className="text-lg font-bold text-[#1877f2]">{algorithmLabels[superiorComputeAlgo] || superiorComputeAlgo}</p>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                              <p className="text-3xl font-bold text-[#1877f2]">22.35</p>
                              <span className="text-sm text-[#1877f2]">ms</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-600 ml-5">{algorithmLabels[inferiorComputeAlgo] || inferiorComputeAlgo}</p>
                            <p className="text-sm text-gray-600">41.2 ms</p>
                          </div>
                        </div>
                        <div className="flex-shrink-0 h-16 w-32 flex items-end">
                          <svg className="w-full h-full" viewBox="0 0 130 60" preserveAspectRatio="none">
                            <polyline points="0,52 30,50 60,47 90,44 120,40" fill="none" stroke="#10b981" strokeWidth="2.5"/>
                            <polyline points="0,45 30,44 60,42 90,41 120,40" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="3 3"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CO2 and Fuel Consumption - 2 comparison cards */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                {/* CO2 Emissions Card */}
                <div className="bg-white rounded-[32px] shadow-lg p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <h3 className="text-base font-bold text-civiq-dark">Average CO2 Emissions</h3>
                    <div 
                      className="w-4 h-4 rounded-full border-2 border-gray-400 flex items-center justify-center text-xs text-gray-400 cursor-help"
                      onMouseEnter={() => setActiveTooltip('co2')}
                      onMouseLeave={() => setActiveTooltip(null)}
                    >
                      i
                    </div>
                    {activeTooltip === 'co2' && (
                      <div className="absolute mt-6 z-10 w-64 p-3 bg-civiq-dark text-white text-sm rounded-lg shadow-lg">
                        Carbon dioxide emissions per kilometer traveled. Lower values indicate better environmental performance.
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    {/* Superior Algorithm */}
                    <div>
                      <p className="text-sm font-bold text-[#1877f2] mb-3 text-center">{algorithmLabels[superiorAlgo] || superiorAlgo}</p>
                      <div className="relative w-full aspect-square max-w-[160px] mx-auto">
                        <svg className="w-full h-full -rotate-90">
                          <circle cx="50%" cy="50%" r="45%" fill="none" stroke="#e5e7eb" strokeWidth="14"/>
                          <circle 
                            cx="50%" 
                            cy="50%" 
                            r="45%" 
                            fill="none" 
                            stroke="#7FE47E" 
                            strokeWidth="14"
                            strokeDasharray="282.7"
                            strokeDashoffset={282.7 * (1 - 142 / 500)}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <p className="text-3xl font-bold text-civiq-dark">142</p>
                          <p className="text-sm text-civiq-dark">g/km</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Inferior Algorithm */}
                    <div>
                      <p className="text-sm text-gray-600 mb-3 text-center">{algorithmLabels[inferiorAlgo] || inferiorAlgo}</p>
                      <div className="relative w-full aspect-square max-w-[160px] mx-auto">
                        <svg className="w-full h-full -rotate-90">
                          <circle cx="50%" cy="50%" r="45%" fill="none" stroke="#e5e7eb" strokeWidth="14"/>
                          <circle 
                            cx="50%" 
                            cy="50%" 
                            r="45%" 
                            fill="none" 
                            stroke="#FF718B" 
                            strokeWidth="14"
                            strokeDasharray="282.7"
                            strokeDashoffset={282.7 * (1 - 420 / 500)}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <p className="text-3xl font-bold text-civiq-dark">420</p>
                          <p className="text-sm text-civiq-dark">g/km</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center gap-1 text-green-600 text-sm font-medium mt-4">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                      <path d="M6 2L4 6h4L6 2z"/>
                    </svg>
                    +66.2% improvement
                  </div>
                </div>

                {/* Fuel Consumption Card */}
                <div className="bg-white rounded-[32px] shadow-lg p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <h3 className="text-base font-bold text-civiq-dark">Average Fuel Consumption</h3>
                    <div 
                      className="w-4 h-4 rounded-full border-2 border-gray-400 flex items-center justify-center text-xs text-gray-400 cursor-help"
                      onMouseEnter={() => setActiveTooltip('fuel')}
                      onMouseLeave={() => setActiveTooltip(null)}
                    >
                      i
                    </div>
                    {activeTooltip === 'fuel' && (
                      <div className="absolute mt-6 z-10 w-64 p-3 bg-civiq-dark text-white text-sm rounded-lg shadow-lg">
                        Fuel consumed per kilometer traveled. Lower values indicate better fuel efficiency.
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    {/* Superior Algorithm */}
                    <div>
                      <p className="text-sm font-bold text-[#1877f2] mb-3 text-center">{algorithmLabels[superiorAlgo] || superiorAlgo}</p>
                      <div className="relative w-full aspect-square max-w-[160px] mx-auto">
                        <svg className="w-full h-full -rotate-90">
                          <circle cx="50%" cy="50%" r="45%" fill="none" stroke="#e5e7eb" strokeWidth="14"/>
                          <circle 
                            cx="50%" 
                            cy="50%" 
                            r="45%" 
                            fill="none" 
                            stroke="#04CE00" 
                            strokeWidth="14"
                            strokeDasharray="282.7"
                            strokeDashoffset={282.7 * (1 - 23 / 100)}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <p className="text-3xl font-bold text-civiq-dark">23</p>
                          <p className="text-sm text-civiq-dark">g/km</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Inferior Algorithm */}
                    <div>
                      <p className="text-sm text-gray-600 mb-3 text-center">{algorithmLabels[inferiorAlgo] || inferiorAlgo}</p>
                      <div className="relative w-full aspect-square max-w-[160px] mx-auto">
                        <svg className="w-full h-full -rotate-90">
                          <circle cx="50%" cy="50%" r="45%" fill="none" stroke="#e5e7eb" strokeWidth="14"/>
                          <circle 
                            cx="50%" 
                            cy="50%" 
                            r="45%" 
                            fill="none" 
                            stroke="#FF718B" 
                            strokeWidth="14"
                            strokeDasharray="282.7"
                            strokeDashoffset={282.7 * (1 - 67 / 100)}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <p className="text-3xl font-bold text-civiq-dark">67</p>
                          <p className="text-sm text-civiq-dark">g/km</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center gap-1 text-green-600 text-sm font-medium mt-4">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                      <path d="M6 2L4 6h4L6 2z"/>
                    </svg>
                    +65.7% improvement
                  </div>
                </div>
              </div>

              {/* Network Pressure Mapping */}
              <div className="bg-white rounded-[32px] shadow-lg p-8">
                <h3 className="text-2xl font-bold text-civiq-dark mb-6">Network Pressure Mapping</h3>
                
                {/* Legend */}
                <div className="mb-8">
                  <p className="text-sm text-civiq-dark text-center mb-3">Traffic Intensity</p>
                  <div className="relative w-full h-14">
                    {/* Gradient bar */}
                    <div className="absolute inset-0 rounded-2xl" style={{
                      background: 'linear-gradient(to right, #ef4444 0%, #f97316 12.5%, #fbbf24 25%, #facc15 37.5%, #a3e635 50%, #4ade80 62.5%, #22c55e 75%, #10b981 87.5%, #059669 100%)'
                    }}></div>
                    
                    {/* Scale numbers */}
                    <div className="absolute -bottom-6 left-0 text-xs text-civiq-dark">90</div>
                    <div className="absolute -bottom-6 left-[11.11%] text-xs text-civiq-dark">80</div>
                    <div className="absolute -bottom-6 left-[22.22%] text-xs text-civiq-dark">70</div>
                    <div className="absolute -bottom-6 left-[33.33%] text-xs text-civiq-dark">60</div>
                    <div className="absolute -bottom-6 left-[44.44%] text-xs text-civiq-dark">50</div>
                    <div className="absolute -bottom-6 left-[55.55%] text-xs text-civiq-dark">40</div>
                    <div className="absolute -bottom-6 left-[66.66%] text-xs text-civiq-dark">30</div>
                    <div className="absolute -bottom-6 left-[77.77%] text-xs text-civiq-dark">20</div>
                    <div className="absolute -bottom-6 right-0 text-xs text-civiq-dark">10</div>
                  </div>
                </div>
                
                {/* Heatmaps */}
                <div className="grid grid-cols-2 gap-8 mt-12">
                  {/* Superior Algorithm Heatmap */}
                  <div>
                    <h4 className="text-2xl font-bold text-civiq-dark text-center mb-4">
                      {algorithmLabels[superiorAlgo] || superiorAlgo}
                    </h4>
                    <div className="relative aspect-[3/4] border-2 border-civiq-dark rounded-lg overflow-hidden bg-gray-100">
                      {/* Placeholder - will be replaced with actual heatmap visualization */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-sm text-gray-500">Heatmap Visualization</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Inferior Algorithm Heatmap */}
                  <div>
                    <h4 className="text-2xl font-bold text-civiq-dark text-center mb-4">
                      {algorithmLabels[inferiorAlgo] || inferiorAlgo}
                    </h4>
                    <div className="relative aspect-[3/4] border-2 border-civiq-dark rounded-lg overflow-hidden bg-gray-100">
                      {/* Placeholder - will be replaced with actual heatmap visualization */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-sm text-gray-500">Heatmap Visualization</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
          <>
          {/* Focused Mode - Original Metrics Layout */}
          {/* Primary Metrics Container */}
          <div className="bg-white rounded-[32px] shadow-lg p-8 mb-6">
            <div className="grid grid-cols-12 gap-2 auto-rows-max">
              {/* Left Column - Three Metrics Stacked */}
              <div className="col-span-5 row-span-3 flex flex-col gap-1">
                {/* Average Travel Time */}
                <div className="flex-1 bg-gray-50 rounded-[24px] p-5">
                  <div className="flex items-center gap-2 mb-1 group">
                    <h3 className="text-sm font-bold text-civiq-dark">Average Travel Time (ATT)</h3>
                    <div className="relative w-3.5 h-3.5 rounded-full border-2 border-gray-400 flex items-center justify-center text-xs text-gray-400 cursor-help hover:border-civiq-blue hover:text-civiq-blue transition-colors">
                      i
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-civiq-dark text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">Average trip duration in minutes</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-10 flex-1">
                    <div className="flex-shrink-0">
                      <div className="flex items-baseline gap-1.5">
                        <p className="text-3xl font-bold text-civiq-dark">{metrics.averageTravelTime}</p>
                        <span className="text-xs text-civiq-dark">min</span>
                      </div>
                      <span className="text-xs text-green-600">+12.34%</span>
                    </div>
                    <div className="flex-1 h-14 flex items-end">
                      <svg className="w-full h-full" viewBox="0 0 200 60" preserveAspectRatio="none">
                        <line x1="0" y1="50" x2="200" y2="50" stroke="#e5e7eb" strokeWidth="0.5"/>
                        <line x1="0" y1="40" x2="200" y2="40" stroke="#e5e7eb" strokeWidth="0.5"/>
                        <line x1="0" y1="30" x2="200" y2="30" stroke="#e5e7eb" strokeWidth="0.5"/>
                        <polyline points="0,50 40,45 80,40 120,35 160,25 200,20" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="0,50 40,45 80,40 120,35 160,25 200,20 200,60 0,60" fill="url(#gradientATT)" opacity="0.2"/>
                        <defs>
                          <linearGradient id="gradientATT" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Average Waiting Time */}
                <div className="flex-1 bg-gray-50 rounded-[24px] p-4">
                  <div className="flex items-center gap-2 mb-1 group">
                    <h3 className="text-sm font-bold text-civiq-dark">Average Waiting Time</h3>
                    <div className="relative w-3.5 h-3.5 rounded-full border-2 border-gray-400 flex items-center justify-center text-xs text-gray-400 cursor-help hover:border-civiq-blue hover:text-civiq-blue transition-colors">
                      i
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-civiq-dark text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">Time vehicles spend waiting at intersections</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-12">
                    <div className="flex-shrink-0">
                      <div className="flex items-baseline gap-1.5">
                        <p className="text-3xl font-bold text-civiq-dark">18.5</p>
                        <span className="text-xs text-civiq-dark">sec</span>
                      </div>
                      <span className="text-xs text-green-600">+22.25%</span>
                    </div>
                    <div className="flex-1 h-14 flex items-end">
                      <svg className="w-full h-full" viewBox="0 0 200 60" preserveAspectRatio="none">
                        <line x1="0" y1="40" x2="200" y2="40" stroke="#e5e7eb" strokeWidth="0.5"/>
                        <line x1="0" y1="30" x2="200" y2="30" stroke="#e5e7eb" strokeWidth="0.5"/>
                        <line x1="0" y1="20" x2="200" y2="20" stroke="#e5e7eb" strokeWidth="0.5"/>
                        <polyline points="0,40 40,35 80,30 120,28 160,22 200,18" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="0,40 40,35 80,30 120,28 160,22 200,18 200,60 0,60" fill="url(#gradientAWT)" opacity="0.2"/>
                        <defs>
                          <linearGradient id="gradientAWT" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Network Throughput */}
                <div className="flex-1 bg-gray-50 rounded-[24px] p-5">
                  <div className="flex items-center gap-2 mb-2 group">
                    <h3 className="text-sm font-bold text-civiq-dark">Network Throughput</h3>
                    <div className="relative w-3.5 h-3.5 rounded-full border-2 border-gray-400 flex items-center justify-center text-xs text-gray-400 cursor-help hover:border-civiq-blue hover:text-civiq-blue transition-colors">
                      i
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-civiq-dark text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">Total vehicles passing per hour</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-12">
                    <div className="flex-shrink-0">
                      <div className="flex items-baseline gap-1.5">
                        <p className="text-3xl font-bold text-civiq-dark">{metrics.networkThroughput}</p>
                        <span className="text-xs text-civiq-dark">vehicles</span>
                      </div>
                      <span className="text-xs text-green-600">+4.32%</span>
                    </div>
                    <div className="flex-1 h-14 flex items-end">
                      <svg className="w-full h-full" viewBox="0 0 200 60" preserveAspectRatio="none">
                        <line x1="0" y1="48" x2="200" y2="48" stroke="#e5e7eb" strokeWidth="0.5"/>
                        <line x1="0" y1="36" x2="200" y2="36" stroke="#e5e7eb" strokeWidth="0.5"/>
                        <line x1="0" y1="24" x2="200" y2="24" stroke="#e5e7eb" strokeWidth="0.5"/>
                        <polyline points="0,50 40,48 80,45 120,42 160,38 200,35" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="0,50 40,48 80,45 120,42 160,38 200,35 200,60 0,60" fill="url(#gradientNT)" opacity="0.2"/>
                        <defs>
                          <linearGradient id="gradientNT" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Learning Convergence - Row 1-3, Right */}
              <div className="col-span-7 row-span-3 bg-gray-50 rounded-[24px] p-5">
                <div className="flex items-center gap-2 mb-3 group">
                  <h3 className="text-base font-bold text-civiq-dark">Learning Convergence</h3>
                  <div className="relative w-3.5 h-3.5 rounded-full border-2 border-gray-400 flex items-center justify-center text-xs text-gray-400 cursor-help hover:border-civiq-blue hover:text-civiq-blue transition-colors">
                    i
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-civiq-dark text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">Agent learning progress over time</div>
                  </div>
                </div>
                <div className="h-full flex items-center justify-center">
                  <svg className="w-full h-full" viewBox="0 0 420 230" preserveAspectRatio="xMidYMid meet">
                    <defs>
                      <linearGradient id="learningGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.15" />
                      </linearGradient>
                    </defs>
                    <line x1="50" y1="35" x2="400" y2="35" stroke="#e5e7eb" strokeWidth="0.5"/>
                    <line x1="50" y1="70" x2="400" y2="70" stroke="#e5e7eb" strokeWidth="0.5"/>
                    <line x1="50" y1="105" x2="400" y2="105" stroke="#e5e7eb" strokeWidth="0.5"/>
                    <line x1="50" y1="140" x2="400" y2="140" stroke="#e5e7eb" strokeWidth="0.5"/>
                    <line x1="50" y1="10" x2="50" y2="175" stroke="#d1d5db" strokeWidth="0.8"/>
                    <line x1="50" y1="175" x2="400" y2="175" stroke="#d1d5db" strokeWidth="0.8"/>
                    <line x1="45" y1="175" x2="50" y2="175" stroke="#d1d5db" strokeWidth="1.5"/>
                    <text x="42" y="180" fontSize="10" fill="#999" textAnchor="end">0</text>
                    <line x1="45" y1="140" x2="50" y2="140" stroke="#d1d5db" strokeWidth="1.5"/>
                    <text x="42" y="145" fontSize="10" fill="#999" textAnchor="end">-50</text>
                    <line x1="45" y1="105" x2="50" y2="105" stroke="#d1d5db" strokeWidth="1.5"/>
                    <text x="42" y="110" fontSize="10" fill="#999" textAnchor="end">-100</text>
                    <line x1="45" y1="70" x2="50" y2="70" stroke="#d1d5db" strokeWidth="1.5"/>
                    <text x="42" y="75" fontSize="10" fill="#999" textAnchor="end">-150</text>
                    <line x1="45" y1="35" x2="50" y2="35" stroke="#d1d5db" strokeWidth="1.5"/>
                    <text x="42" y="40" fontSize="10" fill="#999" textAnchor="end">50</text>
                    <line x1="70" y1="175" x2="70" y2="180" stroke="#d1d5db" strokeWidth="1.5"/>
                    <text x="70" y="200" fontSize="9" fill="#999" textAnchor="middle">0</text>
                    <line x1="105" y1="175" x2="105" y2="180" stroke="#d1d5db" strokeWidth="1.5"/>
                    <text x="105" y="200" fontSize="9" fill="#999" textAnchor="middle">10</text>
                    <line x1="140" y1="175" x2="140" y2="180" stroke="#d1d5db" strokeWidth="1.5"/>
                    <text x="140" y="200" fontSize="9" fill="#999" textAnchor="middle">20</text>
                    <line x1="175" y1="175" x2="175" y2="180" stroke="#d1d5db" strokeWidth="1.5"/>
                    <text x="175" y="200" fontSize="9" fill="#999" textAnchor="middle">30</text>
                    <line x1="210" y1="175" x2="210" y2="180" stroke="#d1d5db" strokeWidth="1.5"/>
                    <text x="210" y="200" fontSize="9" fill="#999" textAnchor="middle">40</text>
                    <line x1="245" y1="175" x2="245" y2="180" stroke="#d1d5db" strokeWidth="1.5"/>
                    <text x="245" y="200" fontSize="9" fill="#999" textAnchor="middle">50</text>
                    <line x1="280" y1="175" x2="280" y2="180" stroke="#d1d5db" strokeWidth="1.5"/>
                    <text x="280" y="200" fontSize="9" fill="#999" textAnchor="middle">60</text>
                    <line x1="315" y1="175" x2="315" y2="180" stroke="#d1d5db" strokeWidth="1.5"/>
                    <text x="315" y="200" fontSize="9" fill="#999" textAnchor="middle">70</text>
                    <line x1="350" y1="175" x2="350" y2="180" stroke="#d1d5db" strokeWidth="1.5"/>
                    <text x="350" y="200" fontSize="9" fill="#999" textAnchor="middle">80</text>
                    <line x1="385" y1="175" x2="385" y2="180" stroke="#d1d5db" strokeWidth="1.5"/>
                    <text x="385" y="200" fontSize="9" fill="#999" textAnchor="middle">90</text>
                    <polyline points="55,170 85,160 115,145 145,130 175,115 205,105 235,95 265,88 295,82 325,78 355,75 385,72" fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="55,170 85,160 115,145 145,130 175,115 205,105 235,95 265,88 295,82 325,78 355,75 385,72 385,175 55,175" fill="url(#learningGradient)"/>
                    <text x="12" y="95" fontSize="9" fill="#999" textAnchor="middle" fontWeight="400" transform="rotate(-90 12 95)">Cumulative Reward</text>
                    <text x="380" y="220" fontSize="9" fill="#999" textAnchor="end" fontWeight="400">Training Episode</text>
                  </svg>
                </div>
              </div>
            </div>
          {/* Secondary Metrics */}
          <div className="grid grid-cols-12 gap-6 h-auto">
            {/* Network Pressure Mapping */}
            <div className="col-span-6">
              <div className="bg-white rounded-[32px] shadow-md p-5 h-full flex flex-col">
                <div className="flex items-center gap-2 mb-4 group">
                  <h3 className="text-base font-bold text-civiq-dark">Network Pressure Mapping</h3>
                  <div className="relative w-3.5 h-3.5 rounded-full border-2 border-gray-400 flex items-center justify-center text-xs text-gray-400 cursor-help hover:border-civiq-blue hover:text-civiq-blue transition-colors">
                    i
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-civiq-dark text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">Congestion levels across the network</div>
                  </div>
                </div>
                <div className="flex gap-4 flex-1">
                  <div className="flex-1 bg-gradient-to-br from-yellow-200 via-orange-300 to-red-400 rounded-[20px] relative overflow-hidden">
                    <img 
                      src="https://www.figma.com/api/mcp/asset/ba7168d7-379e-4206-8bc0-c8704ed27949" 
                      alt="Heatmap" 
                      className="w-full h-full object-cover opacity-70"
                    />
                  </div>
                  {/* Color bar legend with tick marks */}
                  <div className="flex gap-2 items-stretch">
                    {/* Gradient bar */}
                    <div 
                      className="w-10 rounded-lg shadow-md"
                      style={{background: 'linear-gradient(to bottom, #ef4444 0%, #fbbf24 50%, #22c55e 100%)'}}
                    ></div>
                    
                    {/* Tick marks and labels */}
                    <div className="flex flex-col justify-between">
                      <p className="text-xs text-gray-500 font-normal">90</p>
                      <p className="text-xs text-gray-500 font-normal">80</p>
                      <p className="text-xs text-gray-500 font-normal">70</p>
                      <p className="text-xs text-gray-500 font-normal">60</p>
                      <p className="text-xs text-gray-500 font-normal">50</p>
                      <p className="text-xs text-gray-500 font-normal">40</p>
                      <p className="text-xs text-gray-500 font-normal">30</p>
                      <p className="text-xs text-gray-500 font-normal">20</p>
                      <p className="text-xs text-gray-500 font-normal">10</p>
                    </div>

                    {/* Vertical label */}
                    <div className="flex items-center">
                      <p className="text-xs text-gray-500 font-normal" style={{writingMode: 'vertical-rl', transform: 'rotate(180deg)'}}>Traffic Intensity</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Gauges & Traffic Wave Pattern */}
            <div className="col-span-6 flex flex-col gap-5">
              {/* Environmental Impact Stats */}
              <div className="grid grid-cols-2 gap-5">
                {/* Average CO2 Emissions */}
                <div className="bg-white rounded-[32px] shadow-md p-6">
                  <div className="text-center">
                    <div className="relative w-full aspect-square max-w-[150px] mx-auto mb-2">
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
                        <p className="text-4xl font-bold text-civiq-dark">{metrics.co2Emissions}</p>
                        <p className="text-sm text-civiq-dark">g/km</p>
                      </div>
                    </div>
                    <p className="text-xs italic text-civiq-dark">Average CO2 Emissions per kilometer</p>
                  </div>
                </div>

                {/* Average Fuel Consumption */}
                <div className="bg-white rounded-[32px] shadow-md p-6">
                  <div className="text-center">
                    <div className="relative w-full aspect-square max-w-[150px] mx-auto mb-2">
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
                        <p className="text-4xl font-bold text-civiq-dark">{metrics.fuelConsumption}</p>
                        <p className="text-sm text-civiq-dark">g/km</p>
                      </div>
                    </div>
                    <p className="text-xs italic text-civiq-dark">Average Fuel Consumption of a Vehicle</p>
                  </div>
                </div>
              </div>

              {/* Traffic Wave Pattern - Expanded */}
              <div className="bg-white rounded-[32px] shadow-md p-5 flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-3 group">
                  <h3 className="text-base font-bold text-civiq-dark">Traffic Wave Pattern</h3>
                  <div className="relative w-3.5 h-3.5 rounded-full border-2 border-gray-400 flex items-center justify-center text-xs text-gray-400 cursor-help hover:border-civiq-blue hover:text-civiq-blue transition-colors">
                    i
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-civiq-dark text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">Traffic flow variations over time</div>
                  </div>
                </div>
                {/* Legend */}
                <div className="flex gap-6 mb-3 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-civiq-dark">Queue Length</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-civiq-dark">Waiting Time</span>
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <svg className="w-full h-full" viewBox="0 0 450 200" preserveAspectRatio="xMidYMid meet">
                    {/* Grid lines - horizontal */}
                    <line x1="60" y1="30" x2="430" y2="30" stroke="#e5e7eb" strokeWidth="0.5"/>
                    <line x1="60" y1="70" x2="430" y2="70" stroke="#e5e7eb" strokeWidth="0.5"/>
                    <line x1="60" y1="110" x2="430" y2="110" stroke="#e5e7eb" strokeWidth="0.5"/>
                    <line x1="60" y1="150" x2="430" y2="150" stroke="#e5e7eb" strokeWidth="0.5"/>
                    
                    {/* Axes */}
                    <line x1="60" y1="10" x2="60" y2="150" stroke="#d1d5db" strokeWidth="0.8"/>
                    <line x1="60" y1="150" x2="430" y2="150" stroke="#d1d5db" strokeWidth="0.8"/>
                    
                    {/* Y-axis ticks and labels */}
                    <line x1="55" y1="150" x2="60" y2="150" stroke="#d1d5db" strokeWidth="1.5"/>
                    <text x="52" y="155" fontSize="10" fill="#999" textAnchor="end">0</text>
                    
                    <line x1="55" y1="110" x2="60" y2="110" stroke="#d1d5db" strokeWidth="1.5"/>
                    <text x="52" y="115" fontSize="10" fill="#999" textAnchor="end">15</text>
                    
                    <line x1="55" y1="70" x2="60" y2="70" stroke="#d1d5db" strokeWidth="1.5"/>
                    <text x="52" y="75" fontSize="10" fill="#999" textAnchor="end">30</text>
                    
                    <line x1="55" y1="30" x2="60" y2="30" stroke="#d1d5db" strokeWidth="1.5"/>
                    <text x="52" y="35" fontSize="10" fill="#999" textAnchor="end">45</text>
                    
                    {/* X-axis ticks and labels */}
                    <line x1="80" y1="150" x2="80" y2="155" stroke="#d1d5db" strokeWidth="1.5"/>
                    <text x="80" y="168" fontSize="9" fill="#999" textAnchor="middle">2:50</text>
                    
                    <line x1="125" y1="150" x2="125" y2="155" stroke="#d1d5db" strokeWidth="1.5"/>
                    <text x="125" y="168" fontSize="9" fill="#999" textAnchor="middle">5:00</text>
                    
                    <line x1="170" y1="150" x2="170" y2="155" stroke="#d1d5db" strokeWidth="1.5"/>
                    <text x="170" y="168" fontSize="9" fill="#999" textAnchor="middle">7:50</text>
                    
                    <line x1="215" y1="150" x2="215" y2="155" stroke="#d1d5db" strokeWidth="1.5"/>
                    <text x="215" y="168" fontSize="9" fill="#999" textAnchor="middle">10:00</text>
                    
                    <line x1="260" y1="150" x2="260" y2="155" stroke="#d1d5db" strokeWidth="1.5"/>
                    <text x="260" y="168" fontSize="9" fill="#999" textAnchor="middle">12:50</text>
                    
                    <line x1="305" y1="150" x2="305" y2="155" stroke="#d1d5db" strokeWidth="1.5"/>
                    <text x="305" y="168" fontSize="9" fill="#999" textAnchor="middle">15:00</text>
                    
                    <line x1="350" y1="150" x2="350" y2="155" stroke="#d1d5db" strokeWidth="1.5"/>
                    <text x="350" y="168" fontSize="9" fill="#999" textAnchor="middle">17:50</text>
                    
                    <line x1="395" y1="150" x2="395" y2="155" stroke="#d1d5db" strokeWidth="1.5"/>
                    <text x="395" y="168" fontSize="9" fill="#999" textAnchor="middle">20:00</text>
                    
                    {/* Queue Length (red) */}
                    <polyline 
                      points="80,140 125,125 170,100 215,70 260,50 305,65 350,110 395,130" 
                      fill="none" 
                      stroke="#ef4444" 
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Waiting Time (orange) */}
                    <polyline 
                      points="80,138 125,120 170,95 215,75 260,65 305,75 350,105 395,128" 
                      fill="none" 
                      stroke="#f97316" 
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    
                    {/* Y-axis label */}
                    <text x="15" y="85" fontSize="9" fill="#999" textAnchor="middle" fontWeight="400" transform="rotate(-90 15 85)">Vehicles / Second</text>
                    
                    {/* X-axis label */}
                    <text x="425" y="185" fontSize="9" fill="#999" textAnchor="end" fontWeight="400">Simulation Time</text>
                  </svg>
                </div>
              </div>
            </div>
          </div>
          </div>
          </>
          )}
        </div>
      </section>

      <Footer />
    </main>
  )
}

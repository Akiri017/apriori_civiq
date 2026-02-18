'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from './Button'
import { IconChevronDown } from './icons'

interface DropdownOption {
  label: string
  value: string
}

const mapSizeOptions: DropdownOption[] = [
  { label: '2 km²', value: '2km' },
  { label: '0.75 km²', value: '0.75km' },
  { label: '4x4 Grid (2.25 km²)', value: '4x4' },
]

const trafficScaleOptions: DropdownOption[] = [
  { label: 'Free Flow (LOS A)', value: 'free_flow' },
  { label: 'Stable Flow (LOS C)', value: 'stable_flow' },
  { label: 'Forced Flow (LOS E)', value: 'forced_flow' },
]

const viewOptions: DropdownOption[] = [
  { label: 'Focused', value: 'focused' },
  { label: 'Comparative', value: 'comparative' },
]

const algorithmOptions: DropdownOption[] = [
  { label: 'Selfish Routing', value: 'selfish_routing' },
  { label: 'Monolithic QMIX', value: 'monolithic_qmix' },
  { label: 'Hierarchical QMIX (Civiq)', value: 'hierarchical_qmix' },
]

interface DropdownProps {
  label: string
  options: DropdownOption[]
  selected: string
  onSelect: (value: string) => void
  isOpen: boolean
  onToggle: () => void
}

const Dropdown = ({ label, options, selected, onSelect, isOpen, onToggle }: DropdownProps) => {
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(opt => opt.value === selected)
  const displayText = selectedOption?.label || label

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        className="bg-white rounded-[30px] px-5 py-3.5 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow shadow-sm border border-gray-200"
        onClick={onToggle}
      >
        <p className={`font-semibold text-[15px] ${selectedOption ? 'text-civiq-blue' : 'text-gray-500'}`}>
          {displayText}
        </p>
        <div className={`transition-transform ${selectedOption ? 'text-civiq-blue' : 'text-gray-400'} ${isOpen ? 'rotate-180' : ''}`}>
          <IconChevronDown size={20} />
        </div>
      </div>
      
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-[20px] shadow-xl z-[100] overflow-hidden border border-gray-100">
          {options.map((option) => (
            <div
              key={option.value}
              className="px-5 py-3 hover:bg-civiq-blue/10 cursor-pointer text-civiq-dark font-medium text-[14px] transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                onSelect(option.value)
                onToggle()
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface SimulationControlsProps {
  initialMapSize?: string
  initialTrafficScale?: string
  initialView?: string
  initialAlgorithm1?: string
  initialAlgorithm2?: string
}

export const SimulationControls = ({
  initialMapSize = '',
  initialTrafficScale = '',
  initialView = '',
  initialAlgorithm1 = '',
  initialAlgorithm2 = ''
}: SimulationControlsProps = {}) => {
  const router = useRouter()
  const [mapSize, setMapSize] = useState(initialMapSize)
  const [trafficScale, setTrafficScale] = useState(initialTrafficScale)
  const [view, setView] = useState('')
  const [algorithm1, setAlgorithm1] = useState('')
  const [algorithm2, setAlgorithm2] = useState('')
  
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const toggleDropdown = (name: string) => {
    setOpenDropdown(openDropdown === name ? null : name)
  }

  // Validation logic
  const isFormValid = () => {
    // Check if basic required fields are filled
    if (!mapSize || !trafficScale || !view) {
      return false
    }
    
    // Check algorithm selection based on view type
    if (view === 'focused') {
      return !!algorithm1
    } else if (view === 'comparative') {
      return !!algorithm1 && !!algorithm2 && algorithm1 !== algorithm2
    }
    
    return false
  }

  const handleRunSimulation = () => {
    // Validate before navigation
    if (!isFormValid()) {
      return
    }
    
    const params = new URLSearchParams()
    params.set('mapSize', mapSize)
    params.set('trafficScale', trafficScale)
    params.set('view', view)
    params.set('algorithm1', algorithm1)
    if (view === 'comparative' && algorithm2) {
      params.set('algorithm2', algorithm2)
    }
    
    router.push(`/simulation?${params.toString()}`)
  }

  // Sync with initial values when they change
  useEffect(() => {
    if (initialMapSize) setMapSize(initialMapSize)
    if (initialTrafficScale) setTrafficScale(initialTrafficScale)
    if (initialView) setView(initialView)
    if (initialAlgorithm1) setAlgorithm1(initialAlgorithm1)
    if (initialAlgorithm2) setAlgorithm2(initialAlgorithm2)
  }, [initialMapSize, initialTrafficScale, initialView, initialAlgorithm1, initialAlgorithm2])

  // Reset algorithm selections when view changes (but not on initial load)
  useEffect(() => {
    if (!initialView) {
      setAlgorithm1('')
      setAlgorithm2('')
    }
  }, [view, initialView])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      // Check if click is outside all dropdown containers
      const isOutside = !target.closest('.relative')
      if (isOutside && openDropdown) {
        setOpenDropdown(null)
      }
    }

    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openDropdown])

  return (
    <div className="w-full">
      {/* Title */}
      <h2 className="font-bold text-civiq-dark text-[18px] mb-3 flex items-center gap-2">
        <img alt="Simulation Controls Icon" src="/icons/simulation_controls.svg" className="w-5 h-5" style={{filter: 'invert(1) hue-rotate(210deg) brightness(0.9) saturate(1.5)'}} />
        Simulation Controls
      </h2>

      {/* Control Panel */}
      <div className="bg-gray-100 rounded-[40px] shadow-sm p-5 mb-4 border border-gray-200">
        <div className="grid grid-cols-4 gap-3">
          {/* Map Size */}
          <Dropdown
            label="Map Size"
            options={mapSizeOptions}
            selected={mapSize}
            onSelect={setMapSize}
            isOpen={openDropdown === 'mapSize'}
            onToggle={() => toggleDropdown('mapSize')}
          />

          {/* Traffic Scale */}
          <Dropdown
            label="Traffic Scale"
            options={trafficScaleOptions}
            selected={trafficScale}
            onSelect={setTrafficScale}
            isOpen={openDropdown === 'trafficScale'}
            onToggle={() => toggleDropdown('trafficScale')}
          />

          {/* View */}
          <Dropdown
            label="View"
            options={viewOptions}
            selected={view}
            onSelect={setView}
            isOpen={openDropdown === 'view'}
            onToggle={() => toggleDropdown('view')}
          />

          {/* Run Simulation */}
          <Button 
            variant="primary" 
            fullWidth 
            onPress={handleRunSimulation}
            disabled={!mapSize || !trafficScale || !view || !algorithm1 || (view === 'comparative' && !algorithm2)}
          >
            Run Simulation
          </Button>
        </div>
      </div>

      {/* Algorithm Selection - Show only after view is selected */}
      {view && (
        <>
          <div className={`grid ${view === 'comparative' ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
            {/* First Algorithm Option */}
            <Dropdown
              label={view === 'comparative' ? 'Algorithm 1' : 'Algorithm Selection'}
              options={view === 'comparative' ? algorithmOptions.filter(opt => opt.value !== algorithm2) : algorithmOptions}
              selected={algorithm1}
              onSelect={setAlgorithm1}
              isOpen={openDropdown === 'algorithm1'}
              onToggle={() => toggleDropdown('algorithm1')}
            />

            {/* Second Algorithm Option - Only for Comparative View */}
            {view === 'comparative' && (
              <Dropdown
                label="Algorithm 2"
                options={algorithmOptions.filter(opt => opt.value !== algorithm1)}
                selected={algorithm2}
                onSelect={setAlgorithm2}
                isOpen={openDropdown === 'algorithm2'}
                onToggle={() => toggleDropdown('algorithm2')}
              />
            )}
          </div>
          
          {/* Validation Message */}
          {!isFormValid() && (
            <div className="mt-3 text-sm text-red-500 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              <span>
                {!algorithm1 && 'Please select an algorithm to continue.'}
                {algorithm1 && view === 'comparative' && !algorithm2 && 'Please select a second algorithm for comparison.'}
              </span>
            </div>
          )}
        </>
      )}
      
      {/* Message when view is not selected */}
      {!view && (
        <div className="mt-3 text-sm text-gray-500 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <span>Select map size, traffic scale, and view to configure algorithm options.</span>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useRef, useEffect } from 'react'
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
        <IconChevronDown 
          size={20} 
          className={`transition-transform ${selectedOption ? 'text-civiq-blue' : 'text-gray-400'} ${isOpen ? 'rotate-180' : ''}`} 
        />
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

export const SimulationControls = () => {
  const [mapSize, setMapSize] = useState('')
  const [trafficScale, setTrafficScale] = useState('')
  const [view, setView] = useState('')
  
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const toggleDropdown = (name: string) => {
    setOpenDropdown(openDropdown === name ? null : name)
  }

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
        <img alt="Icon" src="http://localhost:3845/assets/0d6c25a108d6d37b7161f5d7e9f9725c00cc2801.png" className="w-5 h-5" />
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
          <Button variant="primary" fullWidth>Run Simulation</Button>
        </div>
      </div>

      {/* Algorithm Selection - Show only after view is selected */}
      {view && (
        <div className={`grid ${view === 'comparative' ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
          {/* First Algorithm Option */}
          <div className="bg-white rounded-[30px] shadow-sm px-5 py-3.5 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-civiq-blue text-[15px]">
                {view === 'comparative' ? 'Monolithic QMIX' : 'Algorithm Selection'}
              </p>
              <IconChevronDown size={20} className="text-civiq-blue" />
            </div>
          </div>

          {/* Second Algorithm Option - Only for Comparative View */}
          {view === 'comparative' && (
            <div className="bg-white rounded-[30px] shadow-sm px-5 py-3.5 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-civiq-blue text-[15px]">Hierarchical QMIX (Civiq)</p>
                <IconChevronDown size={20} className="text-civiq-blue" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

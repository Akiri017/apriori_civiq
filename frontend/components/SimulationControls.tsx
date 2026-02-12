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
        className="bg-white rounded-[30px] p-6 flex items-center justify-between cursor-pointer hover:shadow-lg transition-shadow shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] h-full"
        onClick={onToggle}
      >
        <p className={`font-bold text-[16px] ${selectedOption ? 'text-civiq-blue' : 'text-gray-400'}`}>
          {displayText}
        </p>
        <IconChevronDown 
          size={24} 
          className={`transition-transform ${selectedOption ? 'text-civiq-blue' : 'text-gray-400'} ${isOpen ? 'rotate-180' : ''}`} 
        />
      </div>
      
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-[20px] shadow-lg z-10 overflow-hidden">
          {options.map((option) => (
            <div
              key={option.value}
              className="px-6 py-4 hover:bg-civiq-blue/10 cursor-pointer text-civiq-dark font-semibold text-[14px] transition-colors"
              onClick={() => {
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
      if (openDropdown) {
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
      <h2 className="font-bold text-civiq-dark text-[22px] mb-6 flex items-center gap-2">
        <img alt="Icon" src="http://localhost:3845/assets/0d6c25a108d6d37b7161f5d7e9f9725c00cc2801.png" className="w-7 h-7" />
        Simulation Controls
      </h2>

      {/* Control Panel */}
      <div className="bg-[#e5e7eb] rounded-[45px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-8 mb-6">
        <div className="grid grid-cols-4 gap-4">
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
        <div className={`grid ${view === 'comparative' ? 'grid-cols-2' : 'grid-cols-1'} gap-6`}>
          {/* First Algorithm Option */}
          <div className="bg-white rounded-[30px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-6">
            <div className="flex items-center justify-between">
              <p className="font-bold text-civiq-blue text-[16px]">
                {view === 'comparative' ? 'Monolithic QMIX' : 'Algorithm Selection'}
              </p>
              <IconChevronDown size={24} className="text-civiq-blue" />
            </div>
          </div>

          {/* Second Algorithm Option - Only for Comparative View */}
          {view === 'comparative' && (
            <div className="bg-white rounded-[30px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-6">
              <div className="flex items-center justify-between">
                <p className="font-bold text-civiq-blue text-[16px]">Hierarchical QMIX (Civiq)</p>
                <IconChevronDown size={24} className="text-civiq-blue" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

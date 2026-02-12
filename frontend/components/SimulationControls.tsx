'use client'

import { Button } from './Button'
import { IconChevronDown } from './icons'

export const SimulationControls = () => {
  return (
    <div className="w-full">
      {/* Background */}
      <div className="relative h-48 -mx-8 mb-8 opacity-50">
        <img
          alt="Background"
          className="w-full h-full object-cover"
          src="http://localhost:3845/assets/6745d8ab2a042ff305cf9101c16503a3063a2896.png"
        />
      </div>

      {/* Title */}
      <h2 className="font-bold text-civiq-dark text-[22px] mb-8 flex items-center gap-2">
        <img alt="Icon" src="http://localhost:3845/assets/0d6c25a108d6d37b7161f5d7e9f9725c00cc2801.png" className="w-7 h-7" />
        Simulation Controls
      </h2>

      {/* Algorithm Selection */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Monolithic QMIX */}
        <div className="bg-white rounded-[30px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-6">
          <div className="flex items-center justify-between">
            <p className="font-bold text-civiq-blue text-[24px]">Monolithic QMIX</p>
            <IconChevronDown size={48} className="text-civiq-blue" />
          </div>
        </div>

        {/* Hierarchical QMIX */}
        <div className="bg-white rounded-[30px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-6">
          <div className="flex items-center justify-between">
            <p className="font-bold text-civiq-blue text-[24px]">Hierarchical QMIX (Civiq)</p>
            <IconChevronDown size={48} className="text-civiq-blue" />
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-[#e5e7eb] rounded-[45px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-8">
        <div className="grid grid-cols-4 gap-4">
          {/* Map Size */}
          <div className="bg-white rounded-[30px] p-6 flex items-center justify-between">
            <p className="font-bold text-civiq-blue text-[24px]">Map Size</p>
            <IconChevronDown size={48} className="text-civiq-blue" />
          </div>

          {/* Traffic Scale */}
          <div className="bg-white rounded-[30px] p-6 flex items-center justify-between">
            <p className="font-bold text-civiq-blue text-[24px]">Traffic Scale</p>
            <IconChevronDown size={48} className="text-civiq-blue" />
          </div>

          {/* View */}
          <div className="bg-white rounded-[30px] p-6 flex items-center justify-between">
            <p className="font-bold text-civiq-blue text-[24px]">View</p>
            <IconChevronDown size={48} className="text-civiq-blue" />
          </div>

          {/* Run Simulation */}
          <div className="flex items-center justify-center">
            <Button variant="primary">Run Simulation</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

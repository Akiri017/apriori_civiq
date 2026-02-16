'use client'

import { useState } from 'react';
import { IconAlertCircle } from './icons'

// Simple Line Chart Component
const LineChart = ({ data = [2, 4, 3, 5, 4, 6, 5, 7] }: { data?: number[] }) => {
  const max = Math.max(...data);
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: 100 - (d / max) * 80,
  }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg viewBox="0 0 100 100" className="w-20 h-20">
      <path d={pathD} stroke="#04CE00" strokeWidth="2" fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

// Simple Circular Metric Component - cleaner design
const CircleMetric = ({ 
  value, 
  max = 100, 
  size = 'small'
}: { 
  value: number; 
  max?: number; 
  size?: 'small' | 'large' | 'xlarge' | 'xxlarge';
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  const sizeConfig = {
    small: { radius: 35, viewBox: '0 0 120 120', center: 60, strokeWidth: 8, className: 'w-12 h-12' },
    large: { radius: 45, viewBox: '0 0 140 140', center: 70, strokeWidth: 10, className: 'w-20 h-20' },
    xlarge: { radius: 55, viewBox: '0 0 160 160', center: 80, strokeWidth: 12, className: 'w-32 h-32' },
    xxlarge: { radius: 65, viewBox: '0 0 180 180', center: 90, strokeWidth: 14, className: 'w-40 h-40' }
  };
  
  const config = sizeConfig[size || 'small'];
  const { radius, viewBox, center: centerX, strokeWidth, className: svgClassName } = config;
  const centerY = centerX;
  
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg viewBox={viewBox} className={svgClassName} style={{ transform: 'rotate(-90deg)' }}>
      {/* Background circle */}
      <circle cx={centerX} cy={centerY} r={radius} fill="none" stroke="#e8e8e8" strokeWidth={strokeWidth} />
      
      {/* Progress circle */}
      <circle
        cx={centerX}
        cy={centerY}
        r={radius}
        fill="none"
        stroke="#04CE00"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.3s ease' }}
      />
    </svg>
  );
};

export const AboutSection = () => {
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null);

  return (
    <div className="w-full space-y-16">
      {/* About Civiq */}
      <div>
        <h2 className="font-bold text-civiq-purple text-[42px] mb-6">About Civiq</h2>
        <p className="text-civiq-dark text-[18px] text-justify leading-relaxed">
          Civiq is a hierarchical software framework designed to redefine urban traffic management
          through cooperative intelligence. Built around the QMIX algorithm, Civiq addresses the
          scalability challenges of traditional Multi-Agent Reinforcement Learning (MARL) by utilizing
          a three-level architecture: individual vehicle agents, local coordination via Roadside Units
          (RSUs), and a central server for global optimization. By integrating directly with the SUMO
          (Simulation of Urban Mobility) environment, Civiq transforms selfish routing behaviors into
          a synchronized network, significantly improving throughput and reducing urban congestion.
        </p>
      </div>

      {/* Smart Traffic Routing */}
      <div>
        <h2 className="font-bold text-civiq-purple text-[42px] mb-8">Smart Traffic Routing, Scalable</h2>
        
        <div className="grid grid-cols-2 gap-8">
          {/* Left: Metrics */}
          <div className="space-y-4">
            {/* ACT */}
            <div 
              className="bg-white rounded-[24px] shadow-md p-5 relative"
              onMouseEnter={() => setHoveredTooltip('act')}
              onMouseLeave={() => setHoveredTooltip(null)}
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <p className="text-civiq-blue text-[15px] font-medium">Average Compute Time</p>
                  <IconAlertCircle size={16} />
                </div>
                <p className="font-bold text-civiq-dark text-[36px] ml-auto">22.35 ms</p>
              </div>
              
              {/* Tooltip */}
              {hoveredTooltip === 'act' && (
                <div className="absolute left-0 bottom-full mb-2 bg-civiq-dark text-white text-[12px] px-3 py-2 rounded-lg whitespace-nowrap z-10 shadow-lg">
                  Time taken to compute optimal routing decisions
                </div>
              )}
            </div>

            {/* ATT */}
            <div 
              className="bg-white rounded-[24px] shadow-md p-5 relative"
              onMouseEnter={() => setHoveredTooltip('att')}
              onMouseLeave={() => setHoveredTooltip(null)}
            >
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-civiq-blue text-[15px] font-medium">Average Travel Time (ATT)</p>
                    <IconAlertCircle size={16} />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <p className="font-bold text-civiq-dark text-[36px]">4.2</p>
                    <p className="text-civiq-dark text-[15px]">min</p>
                    <img alt="Arrow" src="http://localhost:3845/assets/45b728e1f2bff40b5bec0c72fae372cd901faff5.svg" className="w-3 h-3 mx-1" />
                    <p className="text-civiq-green text-[15px]">+12.34%</p>
                  </div>
                </div>
                <LineChart data={[2, 3, 2.5, 4, 3.5, 5, 4, 4.2]} />
              </div>
              
              {/* Tooltip */}
              {hoveredTooltip === 'att' && (
                <div className="absolute left-0 bottom-full mb-2 bg-civiq-dark text-white text-[12px] px-3 py-2 rounded-lg whitespace-nowrap z-10 shadow-lg">
                  Average time for vehicles to complete their journeys
                </div>
              )}
            </div>

            {/* Network Throughput */}
            <div 
              className="bg-white rounded-[24px] shadow-md p-5 relative"
              onMouseEnter={() => setHoveredTooltip('throughput')}
              onMouseLeave={() => setHoveredTooltip(null)}
            >
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-civiq-blue text-[15px] font-medium">Network Throughput</p>
                    <IconAlertCircle size={16} />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <p className="font-bold text-civiq-dark text-[36px]">1,875</p>
                    <p className="text-civiq-dark text-[15px]">veh/hr</p>
                    <img alt="Arrow" src="http://localhost:3845/assets/45b728e1f2bff40b5bec0c72fae372cd901faff5.svg" className="w-3 h-3 mx-1" />
                    <p className="text-civiq-green text-[13px]">+8.32%</p>
                  </div>
                </div>
                <LineChart data={[1200, 1400, 1350, 1600, 1500, 1750, 1800, 1875]} />
              </div>
              
              {/* Tooltip */}
              {hoveredTooltip === 'throughput' && (
                <div className="absolute left-0 bottom-full mb-2 bg-civiq-dark text-white text-[12px] px-3 py-2 rounded-lg whitespace-nowrap z-10 shadow-lg">
                  Number of vehicles processed through the network per hour
                </div>
              )}
            </div>
          </div>

          {/* Right: Description */}
          <div className="bg-[#f6f6f6] rounded-[24px] shadow-md p-6">
            <p className="text-civiq-dark text-[18px] text-justify leading-relaxed">
              Civiq transforms congested urban traffic into a coordinated and efficient network by
              enabling vehicles to operate cooperatively rather than competitively. By distributing
              processing tasks between intelligent roadside sensors and a centralized optimization
              system, Civiq maintains high speed and accuracy even as traffic volume increases.
              This scalable architecture allows the AI to perform complex routing decisions in 22.35
              milliseconds, ensuring rapid response to changing traffic conditions. By keeping vehicle
              flow smooth and consistent, Civiq enables effective real-time traffic management and
              significantly increases the number of vehicles that can move through the city with minimal
              delays.
            </p>
          </div>
        </div>
      </div>

      {/* Green Edge Computing */}
      <div>
        <h2 className="font-bold text-civiq-purple text-[42px] mb-8">Green Edge Computing</h2>
        
        <div className="grid grid-cols-2 gap-8">
          {/* Left: Description */}
          <div className="bg-[#f6f6f6] rounded-[24px] shadow-md p-6 space-y-4">
            <p className="text-civiq-dark text-[18px] text-justify leading-relaxed">
              Civiq improves urban sustainability by applying Green Edge Computing to traffic management
              at the point where traffic occurs. Instead of transmitting all data to a centralized data
              center, the system uses intelligent edge devices installed at each intersection to make
              timely and energy-efficient decisions locally.
            </p>
            <p className="text-civiq-dark text-[16px] text-justify leading-relaxed">
              This decentralized approach reduces unnecessary data processing, limits energy waste, and
              ensures that traffic signals contribute to environmental efficiency across the city. As a
              result, Civiq achieves an average 15% reduction in CO₂ emissions, maintaining a low
              footprint of 142 g/km even during peak traffic conditions.
            </p>
            <p className="text-civiq-dark text-[16px] text-justify leading-relaxed">
              Through Civiq, smarter traffic control directly supports a cleaner, more sustainable urban
              environment.
            </p>
          </div>

          {/* Right: Circular Gauges */}
          <div className="space-y-6 flex flex-col justify-center">
            {/* CO2 Emissions */}
            <div className="bg-white rounded-[24px] shadow-md p-6">
              <div className="flex items-center gap-6">
                <CircleMetric value={142} max={500} size="xxlarge" />
                <div className="flex-1">
                  <p className="text-civiq-blue text-[15px] font-medium mb-2">Average CO2 Emissions</p>
                  <div className="flex items-baseline gap-1">
                    <p className="font-bold text-civiq-dark text-[36px]">142</p>
                    <p className="text-civiq-dark text-[15px]">g/km</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Fuel Consumption */}
            <div className="bg-white rounded-[24px] shadow-md p-6">
              <div className="flex items-center gap-6">
                <CircleMetric value={23} max={40} size="xxlarge" />
                <div className="flex-1">
                  <p className="text-civiq-blue text-[15px] font-medium mb-2">Average Fuel Consumption</p>
                  <div className="flex items-baseline gap-1">
                    <p className="font-bold text-civiq-dark text-[36px]">23</p>
                    <p className="text-civiq-dark text-[15px]">g/km</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

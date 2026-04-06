'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AnimatedBackground } from '@/components/AnimatedBackground'
import { SimulationControls } from '@/components/SimulationControls'

// ─── Status Bar (identical to landing page) ───────────────────────────────────

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
    <div className="flex items-center justify-between px-7 py-2.5 flex-shrink-0"
      style={{ background: 'rgba(0,0,0,0.35)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2.5">
        <img src="/icons/civiq-logo.png" alt="Civiq" className="w-5 h-5 object-contain brightness-0 invert opacity-80" />
        <span className="font-bold text-[13px] tracking-widest" style={{ color: 'rgba(255,255,255,0.75)' }}>CIVIQ</span>
        <span className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>
          ·&nbsp; A Hierarchical Multi-Agent Coordination Framework
        </span>
      </div>
      <div className="flex items-center gap-3.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/>
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>
        </svg>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <rect x="1" y="14" width="4" height="8" rx="1"/><rect x="7" y="9" width="4" height="13" rx="1"/>
          <rect x="13" y="4" width="4" height="18" rx="1"/><rect x="19" y="1" width="4" height="21" rx="1" opacity="0.3"/>
        </svg>
        <span className="text-[10px] font-bold tracking-wider">4G</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>{dateStr}</span>
        <span className="font-bold text-[17px] tabular-nums" style={{ color: 'rgba(255,255,255,0.9)' }}>{timeStr}</span>
      </div>
    </div>
  )
}

// ─── Data ─────────────────────────────────────────────────────────────────────

type AlgoKey = 'civiq' | 'qmix' | 'selfish'
type Page = 'summary' | AlgoKey

// Sparkline series type — swap in real API data once backend is connected
export interface KpiSeries {
  travelTime: number[]
  waitTime: number[]
  throughput: number[]
  speed: number[]
}
export interface KpiChanges {
  travelTime: number   // % vs first data point
  waitTime: number
  throughput: number
  speed: number
}

interface AlgoData {
  id: AlgoKey
  label: string
  sublabel: string
  rank: number
  color: string
  colorDim: string
  border: string
  travelTime: number
  waitTime: number
  throughput: number
  speed: number
  co2: number
  fuel: number
  computeTime: number
  convergence: number | null
  reward: number | null
  efficiency: number
  description: string
  strengths: string[]
  scores: number[]
  // Pluggable time-series — replace with real API data when backend is ready
  sparklines: KpiSeries
  changes: KpiChanges
}

const ALGO: Record<AlgoKey, AlgoData> = {
  civiq: {
    id: 'civiq', label: 'Hierarchical QMIX', sublabel: 'Civiq', rank: 1,
    color: '#38BDF8', colorDim: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.3)',
    travelTime: 4.2, waitTime: 18.5, throughput: 1875, speed: 45.2,
    co2: 142, fuel: 23, computeTime: 22.35, convergence: 150, reward: 1250, efficiency: 88,
    description: 'Civiq employs a hierarchical two-tier coordination mechanism where a global orchestrator assigns zone-level routing goals, while local agents optimize intersection-level decisions using QMIX. This architecture enables scalable, cooperative traffic management that generalizes across varying network topologies and traffic densities.',
    strengths: ['Lowest travel time across all scenarios', 'Best emission reduction (37% vs baseline)', 'Superior network throughput coordination', 'Scalable to larger road networks'],
    scores: [0.90, 0.90, 0.88, 0.70, 0.88, 0.88, 0.82],
    sparklines: {
      travelTime:  [8.5, 7.8, 7.1, 6.4, 5.9, 5.3, 4.9, 4.6, 4.4, 4.2],
      waitTime:    [36, 32, 29, 26, 24, 22, 21, 20, 19, 18.5],
      throughput:  [1380, 1480, 1570, 1650, 1710, 1760, 1810, 1840, 1862, 1875],
      speed:       [27, 31, 35, 38, 40, 42, 43, 44, 44.8, 45.2],
    },
    changes: { travelTime: -50.6, waitTime: -48.6, throughput: 35.9, speed: 67.4 },
  },
  qmix: {
    id: 'qmix', label: 'Monolithic QMIX', sublabel: 'Baseline RL', rank: 2,
    color: '#A78BFA', colorDim: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)',
    travelTime: 5.8, waitTime: 26.3, throughput: 1720, speed: 38.5,
    co2: 178, fuel: 31, computeTime: 18.20, convergence: 200, reward: 980, efficiency: 71,
    description: 'Monolithic QMIX applies centralized multi-agent reinforcement learning where all agents share a joint action-value function. While effective at coordination, the monolithic architecture faces scalability limitations as network size grows, requiring more training episodes and compute to converge on larger topologies.',
    strengths: ['Fastest compute time per decision step', 'Good coordination at small scale', 'Solid baseline RL performance', 'Well-established QMIX framework'],
    scores: [0.80, 0.70, 0.70, 0.90, 0.72, 0.72, 0.75],
    sparklines: {
      travelTime:  [10.2, 9.5, 8.9, 8.3, 7.8, 7.3, 6.9, 6.5, 6.1, 5.8],
      waitTime:    [42, 39, 36, 34, 32, 30, 29, 28, 27, 26.3],
      throughput:  [1280, 1360, 1430, 1500, 1560, 1610, 1650, 1685, 1705, 1720],
      speed:       [23, 26, 29, 32, 34, 36, 37, 38, 38.3, 38.5],
    },
    changes: { travelTime: -43.1, waitTime: -37.4, throughput: 34.4, speed: 67.4 },
  },
  selfish: {
    id: 'selfish', label: 'Selfish Routing', sublabel: 'Nash Equilibrium', rank: 3,
    color: '#F87171', colorDim: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)',
    travelTime: 8.1, waitTime: 35.0, throughput: 1428, speed: 28.3,
    co2: 235, fuel: 42, computeTime: 20.45, convergence: null, reward: null, efficiency: 48,
    description: 'Selfish Routing models each vehicle independently optimizing its own route via shortest-path algorithms, representing the Nash Equilibrium state of the network. Without coordination, vehicles converge on popular routes causing Braess\'s Paradox — where adding road capacity can paradoxically worsen network-wide performance.',
    strengths: ['No training or setup required', 'Simple and fully interpretable', 'Establishes the Price of Anarchy baseline', 'Handles novel edge cases naturally'],
    scores: [0.58, 0.42, 0.40, 0.80, 0.42, 0.52, 0.70],
    sparklines: {
      travelTime:  [7.9, 8.4, 7.7, 8.5, 8.0, 8.6, 7.8, 8.3, 8.0, 8.1],
      waitTime:    [34, 37, 33, 38, 35, 37, 34, 36, 35, 35],
      throughput:  [1460, 1435, 1455, 1420, 1445, 1415, 1440, 1425, 1432, 1428],
      speed:       [29.1, 27.5, 29.3, 27.8, 28.6, 27.9, 28.5, 28.0, 28.4, 28.3],
    },
    changes: { travelTime: 2.5, waitTime: 2.9, throughput: -2.2, speed: -2.7 },
  },
}

const ALGO_LIST = [ALGO.civiq, ALGO.qmix, ALGO.selfish]

// ─── Reusable UI primitives ────────────────────────────────────────────────────

const GlassCard = ({
  children, className = '', style = {},
}: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <div className={className} style={{
    background: 'linear-gradient(155deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: '16px',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.13), inset 0 -1px 0 rgba(0,0,0,0.15), 0 8px 32px rgba(0,0,0,0.32)',
    ...style,
  }}>{children}</div>
)

// ─── Sparkline ────────────────────────────────────────────────────────────────

const SparkLine = ({ data, color }: { data: number[]; color: string }) => {
  if (!data || data.length < 2) return null
  const W = 96, H = 44, PAD = 2
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => ({
    x: PAD + (i / (data.length - 1)) * (W - PAD * 2),
    y: PAD + (H - PAD * 2) - ((v - min) / range) * (H - PAD * 2),
  }))
  const linePts = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPts = [
    `${pts[0].x.toFixed(1)},${H}`,
    ...pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`),
    `${pts[pts.length - 1].x.toFixed(1)},${H}`,
  ].join(' ')
  const gid = `sp-${color.replace('#', '')}`
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', flexShrink: 0 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPts} fill={`url(#${gid})`} />
      <polyline points={linePts} fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
      {/* last-point dot */}
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="2.5"
        fill={color} />
    </svg>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const KpiCard = ({ label, abbr, value, unit, sub, color, colorDim, borderColor, change, sparkData }: {
  label: string; abbr?: string; value: string | number; unit: string
  sub?: string; color: string; colorDim?: string; borderColor?: string
  change?: number; sparkData?: number[]
}) => {
  const isPos = (change ?? 0) >= 0
  const changeColor = isPos ? '#4ADE80' : '#F87171'
  const changeArrow = isPos ? '▲' : '▼'
  return (
    <GlassCard className="p-4 flex flex-col gap-2.5 transition-all duration-200"
      style={{
        background: colorDim
          ? `linear-gradient(145deg, ${colorDim.replace('0.12', '0.10')} 0%, rgba(255,255,255,0.03) 100%)`
          : undefined,
        border: borderColor ? `1px solid ${borderColor.replace('0.3', '0.25')}` : undefined,
      }}>
      {/* Title */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider leading-none"
          style={{ color: 'rgba(255,255,255,0.5)' }}>
          {label}{abbr ? ` (${abbr})` : ''}
        </span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.22)"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>

      {/* Value row + sparkline */}
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-[26px] font-bold tabular-nums leading-none" style={{ color }}>{value}</span>
            <span className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.38)' }}>{unit}</span>
            {change !== undefined && (
              <span className="text-[11px] font-bold tabular-nums"
                style={{ color: changeColor }}>
                {changeArrow} {Math.abs(change).toFixed(1)}%
              </span>
            )}
          </div>
          {sub && <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.26)' }}>{sub}</span>}
        </div>
        {sparkData && <SparkLine data={sparkData} color={color} />}
      </div>
    </GlassCard>
  )
}

const HBar = ({ value, max, color, dim = false }: { value: number; max: number; color: string; dim?: boolean }) => (
  <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.25)' }}>
    <div className="h-full rounded-full transition-all duration-700"
      style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color, opacity: dim ? 0.45 : 1 }} />
  </div>
)

const RingChart = ({ value, max = 100, color, size = 88 }: {
  value: number; max?: number; color: string; size?: number
}) => {
  const r = (size - 14) / 2
  const circ = 2 * Math.PI * r
  const dash = (value / max) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }} />
    </svg>
  )
}

// ─── Radar Chart ───────────────────────────────────────────────────────────────

const RADAR_AXES = ['Throughput', 'Wait Time', 'Travel Time', 'Compute', 'CO₂', 'Fuel', 'RTF']
const RC = { x: 175, y: 175 }
const RR = 125

function rPt(axisIdx: number, score: number): string {
  const a = -Math.PI / 2 + (2 * Math.PI * axisIdx) / RADAR_AXES.length
  return `${(RC.x + score * RR * Math.cos(a)).toFixed(1)},${(RC.y + score * RR * Math.sin(a)).toFixed(1)}`
}
function rPts(scores: number[]) { return scores.map((s, i) => rPt(i, s)).join(' ') }
function rLabel(i: number) {
  const a = -Math.PI / 2 + (2 * Math.PI * i) / RADAR_AXES.length
  return { x: RC.x + (RR + 22) * Math.cos(a), y: RC.y + (RR + 22) * Math.sin(a) }
}

const RadarChart = () => (
  <svg viewBox="0 0 350 350" className="w-full max-w-[320px] mx-auto">
    {[0.25, 0.5, 0.75, 1].map((r) => (
      <polygon key={r} points={rPts(Array(7).fill(r))}
        fill="none" stroke="rgba(255,255,255,0.11)" strokeWidth="1" />
    ))}
    {RADAR_AXES.map((_, i) => {
      const pt = { x: RC.x + RR * Math.cos(-Math.PI / 2 + (2 * Math.PI * i) / RADAR_AXES.length), y: RC.y + RR * Math.sin(-Math.PI / 2 + (2 * Math.PI * i) / RADAR_AXES.length) }
      return <line key={i} x1={RC.x} y1={RC.y} x2={pt.x} y2={pt.y} stroke="rgba(255,255,255,0.11)" strokeWidth="1" />
    })}
    <polygon points={rPts(ALGO.selfish.scores)} fill="rgba(248,113,113,0.12)" stroke="#F87171" strokeWidth="1.5" strokeLinejoin="round" />
    <polygon points={rPts(ALGO.qmix.scores)} fill="rgba(167,139,250,0.12)" stroke="#A78BFA" strokeWidth="1.5" strokeLinejoin="round" />
    <polygon points={rPts(ALGO.civiq.scores)} fill="rgba(56,189,248,0.18)" stroke="#38BDF8" strokeWidth="2" strokeLinejoin="round" />
    {RADAR_AXES.map((label, i) => {
      const { x, y } = rLabel(i)
      return (
        <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
          fontSize="10" fill="rgba(255,255,255,0.45)" fontWeight="500">{label}</text>
      )
    })}
  </svg>
)

// ─── Summary Page ──────────────────────────────────────────────────────────────

const rankMeta = [
  { label: '1st Place', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  { label: '2nd Place', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
  { label: '3rd Place', color: '#B45309', bg: 'rgba(180,83,9,0.12)' },
]

const COMPARE_METRICS = [
  { label: 'Avg. Travel Time', unit: 'min', key: 'travelTime' as const, max: 10, lowerBetter: true },
  { label: 'Avg. Wait Time', unit: 'sec', key: 'waitTime' as const, max: 40, lowerBetter: true },
  { label: 'Throughput', unit: 'veh/hr', key: 'throughput' as const, max: 2000, lowerBetter: false },
  { label: 'Avg. Speed', unit: 'km/h', key: 'speed' as const, max: 60, lowerBetter: false },
  { label: 'CO₂ Emissions', unit: 'g/km', key: 'co2' as const, max: 280, lowerBetter: true },
  { label: 'Compute Time', unit: 'ms', key: 'computeTime' as const, max: 30, lowerBetter: true },
]

const SummaryPage = () => (
  <div className="p-6 space-y-5 overflow-y-auto" style={{ height: '100%' }}>
    {/* Header */}
    <div className="flex items-baseline justify-between">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>Algorithm Comparison</h2>
        <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
          Aggregate performance across Civiq, Monolithic QMIX, and Selfish Routing
        </p>
      </div>
      <div className="flex items-center gap-4">
        {ALGO_LIST.map((a) => (
          <div key={a.id} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: a.color }} />
            <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>{a.sublabel}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Rank cards */}
    <div className="grid grid-cols-3 gap-4">
      {ALGO_LIST.map((a, i) => (
        <GlassCard key={a.id} className="p-5 relative overflow-hidden" style={{ border: `1px solid ${a.border}` }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at 80% 0%, ${a.colorDim}, transparent 65%)` }} />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: rankMeta[i].bg, color: rankMeta[i].color }}>
                {rankMeta[i].label}
              </span>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: a.color }} />
                <span className="text-[11px] font-medium" style={{ color: a.color }}>{a.sublabel}</span>
              </div>
            </div>
            <h3 className="text-[15px] font-bold mb-3" style={{ color: 'rgba(255,255,255,0.9)' }}>{a.label}</h3>
            <div className="space-y-2 text-[12px]">
              {[
                { k: 'Travel Time', v: `${a.travelTime} min` },
                { k: 'Throughput', v: `${a.throughput.toLocaleString()} veh/hr` },
                { k: 'CO₂ Emissions', v: `${a.co2} g/km` },
              ].map(({ k, v }) => (
                <div key={k} className="flex justify-between">
                  <span style={{ color: 'rgba(255,255,255,0.42)' }}>{k}</span>
                  <span className="font-semibold" style={{ color: 'rgba(255,255,255,0.82)' }}>{v}</span>
                </div>
              ))}
              <div className="flex justify-between">
                <span style={{ color: 'rgba(255,255,255,0.42)' }}>Efficiency</span>
                <span className="font-bold" style={{ color: a.color }}>{a.efficiency}%</span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <HBar value={a.efficiency} max={100} color={a.color} />
              <span className="text-[11px] font-bold w-8 text-right tabular-nums" style={{ color: a.color }}>{a.efficiency}%</span>
            </div>
          </div>
        </GlassCard>
      ))}
    </div>

    {/* Radar + Breakdown */}
    <div className="grid grid-cols-5 gap-4">
      <GlassCard className="col-span-2 p-5">
        <h3 className="text-[13px] font-bold mb-3" style={{ color: 'rgba(255,255,255,0.78)' }}>Performance Radar</h3>
        <RadarChart />
        <div className="flex justify-center gap-5 mt-2">
          {ALGO_LIST.map((a) => (
            <div key={a.id} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: a.color }} />
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.45)' }}>{a.sublabel}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="col-span-3 p-5">
        <h3 className="text-[13px] font-bold mb-4" style={{ color: 'rgba(255,255,255,0.78)' }}>Metrics Breakdown</h3>
        <div className="space-y-4">
          {COMPARE_METRICS.map((m) => {
            const vals = ALGO_LIST.map((a) => a[m.key] as number)
            const best = m.lowerBetter ? Math.min(...vals) : Math.max(...vals)
            return (
              <div key={m.key}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.48)' }}>{m.label}</span>
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.28)' }}>{m.unit}</span>
                </div>
                <div className="space-y-1.5">
                  {ALGO_LIST.map((a) => {
                    const val = a[m.key] as number
                    const isBest = val === best
                    const barW = m.lowerBetter
                      ? ((m.max - val) / m.max) * 100
                      : (val / m.max) * 100
                    return (
                      <div key={a.id} className="flex items-center gap-2.5">
                        <span className="text-[10px] w-10 text-right tabular-nums" style={{ color: 'rgba(255,255,255,0.4)' }}>{val}</span>
                        <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.25)' }}>
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${barW}%`, background: a.color, opacity: isBest ? 1 : 0.42 }} />
                        </div>
                        <div className="w-3.5 flex items-center justify-center">
                          {isBest && <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="#22C55E" /></svg>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </GlassCard>
    </div>

    {/* Key Findings */}
    <GlassCard className="p-5">
      <h3 className="text-[13px] font-bold mb-3" style={{ color: 'rgba(255,255,255,0.78)' }}>Key Findings</h3>
      <div className="grid grid-cols-3 gap-5 text-[12px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
        {ALGO_LIST.map((a) => (
          <div key={a.id}>
            <p className="font-semibold mb-1.5" style={{ color: a.color }}>{a.label}</p>
            <p className="leading-relaxed">{a.description}</p>
          </div>
        ))}
      </div>
    </GlassCard>
  </div>
)

// ─── Map Player ───────────────────────────────────────────────────────────────
// When backend is connected, pass vehicleTrajectories: VehicleTrajectory[]
// and replace DUMMY_VEHICLES with real positional data.
export interface VehicleTrajectory {
  id: string
  positions: { x: number; y: number; t: number }[]
}

const MapPlayer = ({ algo, mapSize }: { algo: AlgoData; mapSize: string }) => {
  const [playing, setPlaying] = useState(false)
  const [step, setStep] = useState(0)
  const [speed, setSpeed] = useState(1)
  const MAX_STEPS = 300

  useEffect(() => {
    if (!playing) return
    const ms = Math.round(80 / speed)
    const id = setInterval(() => {
      setStep(s => {
        if (s >= MAX_STEPS - 1) { setPlaying(false); return MAX_STEPS - 1 }
        return s + 1
      })
    }, ms)
    return () => clearInterval(id)
  }, [playing, speed])

  // Grid geometry — 5 cols × 4 rows of intersections
  const COLS = 5, ROWS = 4
  const OX = 28, OY = 24, SX = 56, SY = 50
  const iX = (c: number) => OX + c * SX
  const iY = (r: number) => OY + r * SY
  const W = OX * 2 + (COLS - 1) * SX   // 280
  const H = OY * 2 + (ROWS - 1) * SY   // 198

  // Dummy vehicle routes — circular paths through grid nodes [col, row]
  // Replace with real VehicleTrajectory[] from API when backend is ready
  const DUMMY_VEHICLES: { route: [number, number][]; offset: number }[] = [
    { route: [[0,0],[1,0],[2,0],[3,0],[4,0],[4,1],[4,2],[4,3],[3,3],[2,3],[1,3],[0,3],[0,2],[0,1]], offset: 0 },
    { route: [[1,1],[2,1],[3,1],[3,2],[2,2],[1,2]], offset: 50 },
    { route: [[0,0],[1,0],[1,1],[1,2],[1,3],[2,3],[3,3],[3,2],[3,1],[3,0],[4,0]], offset: 100 },
    { route: [[2,0],[2,1],[2,2],[2,3],[3,3],[3,2],[3,1]], offset: 25 },
    { route: [[0,2],[1,2],[2,2],[3,2],[4,2],[4,1],[3,1]], offset: 170 },
    { route: [[4,0],[4,1],[3,1],[2,1],[1,1],[0,1],[0,2],[1,2]], offset: 220 },
    { route: [[0,3],[1,3],[2,3],[2,2],[2,1],[2,0],[3,0],[4,0],[4,1]], offset: 75 },
    { route: [[3,0],[3,1],[4,1],[4,2],[3,2],[2,2],[1,2],[0,2],[0,1],[1,1]], offset: 140 },
    { route: [[1,0],[1,1],[0,1],[0,2],[1,2],[2,2],[2,3],[3,3],[4,3]], offset: 200 },
    { route: [[4,3],[3,3],[2,3],[1,3],[0,3],[0,2],[0,1],[0,0],[1,0],[2,0]], offset: 260 },
  ]

  const getPos = (route: [number, number][], offset: number) => {
    const t = (step + offset) % MAX_STEPS
    const segCount = route.length
    const segLen = MAX_STEPS / segCount
    const rawSeg = Math.floor(t / segLen)
    const segIdx = rawSeg % segCount
    const segT = (t % segLen) / segLen
    const from = route[segIdx]
    const to = route[(segIdx + 1) % route.length]
    return {
      x: iX(from[0]) + (iX(to[0]) - iX(from[0])) * segT,
      y: iY(from[1]) + (iY(to[1]) - iY(from[1])) * segT,
    }
  }

  const simSec = Math.floor((step / MAX_STEPS) * 3600)
  const simTime = `${String(Math.floor(simSec / 60)).padStart(2, '0')}:${String(simSec % 60).padStart(2, '0')}`
  const started = playing || step > 0

  return (
    <GlassCard className="p-4 flex flex-col gap-3 col-span-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-bold" style={{ color: 'rgba(255,255,255,0.78)' }}>Map Player</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded tabular-nums"
            style={{ background: algo.colorDim, color: algo.color, border: `1px solid ${algo.border}` }}>
            {simTime}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}>
            {MAP_LABELS[mapSize] || mapSize || '—'}
          </span>
          <span className="text-[9px] italic" style={{ color: 'rgba(255,255,255,0.2)' }}>dummy data</span>
        </div>
      </div>

      {/* Map canvas */}
      <div className="rounded-xl overflow-hidden relative flex-1"
        style={{ background: 'rgba(3,7,18,0.75)', border: '1px solid rgba(255,255,255,0.07)', minHeight: '180px' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 70% 60% at 50% 50%, ${algo.colorDim}, transparent 80%)` }} />
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', position: 'relative' }}>
          {/* Road bodies */}
          {Array.from({ length: ROWS }, (_, r) =>
            Array.from({ length: COLS - 1 }, (_, c) => (
              <line key={`h${r}-${c}`} x1={iX(c)} y1={iY(r)} x2={iX(c+1)} y2={iY(r)}
                stroke="rgba(255,255,255,0.12)" strokeWidth="10" strokeLinecap="square" />
            ))
          )}
          {Array.from({ length: COLS }, (_, c) =>
            Array.from({ length: ROWS - 1 }, (_, r) => (
              <line key={`v${c}-${r}`} x1={iX(c)} y1={iY(r)} x2={iX(c)} y2={iY(r+1)}
                stroke="rgba(255,255,255,0.12)" strokeWidth="10" strokeLinecap="square" />
            ))
          )}
          {/* Centre dashes */}
          {Array.from({ length: ROWS }, (_, r) =>
            Array.from({ length: COLS - 1 }, (_, c) => (
              <line key={`hd${r}-${c}`} x1={iX(c)} y1={iY(r)} x2={iX(c+1)} y2={iY(r)}
                stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="5 4" />
            ))
          )}
          {Array.from({ length: COLS }, (_, c) =>
            Array.from({ length: ROWS - 1 }, (_, r) => (
              <line key={`vd${c}-${r}`} x1={iX(c)} y1={iY(r)} x2={iX(c)} y2={iY(r+1)}
                stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="5 4" />
            ))
          )}
          {/* Intersection boxes */}
          {Array.from({ length: ROWS }, (_, r) =>
            Array.from({ length: COLS }, (_, c) => (
              <rect key={`i${c}-${r}`} x={iX(c)-5} y={iY(r)-5} width="10" height="10" rx="2"
                fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.75" />
            ))
          )}
          {/* Vehicles */}
          {started ? DUMMY_VEHICLES.map((v, i) => {
            const pos = getPos(v.route, v.offset)
            return (
              <g key={i}>
                <circle cx={pos.x} cy={pos.y} r="7" fill={algo.color} opacity="0.12" />
                <circle cx={pos.x} cy={pos.y} r="3.5" fill={algo.color} opacity="0.92" />
                <circle cx={pos.x} cy={pos.y} r="1.5" fill="white" opacity="0.5" />
              </g>
            )
          }) : (
            <text x={W / 2} y={H / 2} textAnchor="middle" dominantBaseline="middle"
              fontSize="11" fill="rgba(255,255,255,0.22)" fontWeight="500">
              Press ▶ to start simulation
            </text>
          )}
        </svg>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2.5">
        {/* Restart */}
        <button onClick={() => { setStep(0); setPlaying(false) }}
          className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
        </button>
        {/* Play / Pause */}
        <button onClick={() => setPlaying(p => !p)}
          className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center transition-colors duration-150"
          style={{ background: algo.colorDim, border: `1px solid ${algo.border}` }}>
          {playing ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill={algo.color}>
              <rect x="1" y="1" width="3" height="8" rx="0.5"/>
              <rect x="6" y="1" width="3" height="8" rx="0.5"/>
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill={algo.color}>
              <path d="M2 1 L9 5 L2 9 Z"/>
            </svg>
          )}
        </button>
        {/* Seek bar */}
        <div className="flex-1 h-1.5 rounded-full relative cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.1)' }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            setStep(Math.round(((e.clientX - rect.left) / rect.width) * (MAX_STEPS - 1)))
          }}>
          <div className="h-full rounded-full transition-none"
            style={{ width: `${(step / (MAX_STEPS - 1)) * 100}%`, background: algo.color }} />
          <div className="absolute top-1/2 w-3 h-3 rounded-full pointer-events-none"
            style={{
              left: `${(step / (MAX_STEPS - 1)) * 100}%`,
              transform: 'translate(-50%, -50%)',
              background: 'white',
              boxShadow: `0 0 6px ${algo.color}, 0 0 0 2px ${algo.color}`,
            }} />
        </div>
        {/* Speed */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {[0.5, 1, 2, 4].map(s => (
            <button key={s} onClick={() => setSpeed(s)}
              className="text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors duration-150"
              style={{
                background: speed === s ? algo.colorDim : 'transparent',
                color: speed === s ? algo.color : 'rgba(255,255,255,0.28)',
                border: speed === s ? `1px solid ${algo.border}` : '1px solid transparent',
              }}>
              {s}×
            </button>
          ))}
        </div>
      </div>
    </GlassCard>
  )
}

// ─── Algorithm Detail Page ─────────────────────────────────────────────────────


const AlgoDetailPage = ({ algo, mapSize, trafficScale }: {
  algo: AlgoData; mapSize: string; trafficScale: string
}) => (
  <div className="p-6 space-y-5 overflow-y-auto" style={{ height: '100%' }}>
    {/* Header */}
    <div className="flex items-center justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold leading-tight" style={{ color: 'rgba(255,255,255,0.9)' }}>{algo.label}</h2>
      </div>
      <div className="flex items-center gap-2 flex-1">
        {mapSize && (
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)' }}>
            {MAP_LABELS[mapSize] || mapSize}
          </span>
        )}
        {trafficScale && (
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)' }}>
            {TRAFFIC_LABELS[trafficScale] || trafficScale}
          </span>
        )}
      </div>
      <div className="px-4 py-1.5 rounded-full text-[12px] font-bold flex-shrink-0"
        style={{ background: algo.colorDim, color: algo.color, border: `1px solid ${algo.border}` }}>
        {algo.efficiency}% Efficiency Score
      </div>
    </div>

    {/* KPI Row — directly below header */}
    <div className="grid grid-cols-4 gap-4">
      <KpiCard label="Avg. Travel Time" abbr="ATT" value={algo.travelTime} unit="min" sub="Per vehicle trip"
        color={algo.color} colorDim={algo.colorDim} borderColor={algo.border}
        change={algo.changes.travelTime} sparkData={algo.sparklines.travelTime} />
      <KpiCard label="Avg. Wait Time" abbr="AWT" value={algo.waitTime} unit="sec" sub="At intersections"
        color={algo.color} colorDim={algo.colorDim} borderColor={algo.border}
        change={algo.changes.waitTime} sparkData={algo.sparklines.waitTime} />
      <KpiCard label="Throughput" abbr="TPT" value={algo.throughput.toLocaleString()} unit="veh/hr" sub="Vehicles processed"
        color={algo.color} colorDim={algo.colorDim} borderColor={algo.border}
        change={algo.changes.throughput} sparkData={algo.sparklines.throughput} />
      <KpiCard label="Avg. Speed" abbr="SPD" value={algo.speed} unit="km/h" sub="Network-wide"
        color={algo.color} colorDim={algo.colorDim} borderColor={algo.border}
        change={algo.changes.speed} sparkData={algo.sparklines.speed} />
    </div>

    {/* Charts row: Algorithm Overview + Map Player */}
    <div className="grid grid-cols-3 gap-4">
      {/* Algorithm Overview + Key Strengths (col 1) */}
      <GlassCard className="p-5 flex flex-col gap-3">
        <h3 className="text-[13px] font-bold" style={{ color: 'rgba(255,255,255,0.78)' }}>Algorithm Overview</h3>
        <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.52)' }}>
          {algo.description}
        </p>

        {/* Key Strengths */}
        <div className="pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-2"
            style={{ color: 'rgba(255,255,255,0.32)' }}>Key Strengths</p>
          <ul className="space-y-2">
            {algo.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                <span className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[8px] font-bold mt-0.5"
                  style={{ background: algo.colorDim, color: algo.color, border: `1px solid ${algo.border}` }}>
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ul>
        </div>

        {/* Convergence / Reward (RL algorithms only) */}
        {algo.convergence !== null && (
          <div className="pt-3 grid grid-cols-2 gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <div>
              <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.28)' }}>Convergence</div>
              <div className="text-[17px] font-bold tabular-nums" style={{ color: algo.color }}>Ep. {algo.convergence}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.28)' }}>Cumulative Reward</div>
              <div className="text-[17px] font-bold tabular-nums" style={{ color: algo.color }}>{algo.reward}</div>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Map Player (col 2–3) */}
      <MapPlayer algo={algo} mapSize={mapSize} />
    </div>
  </div>
)

// ─── Sidebar ───────────────────────────────────────────────────────────────────

const NAV: { id: Page; label: string; d: string }[] = [
  {
    id: 'summary', label: 'Summary',
    d: 'M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm14 3.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z',
  },
  {
    id: 'civiq', label: 'Civiq',
    d: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  },
  {
    id: 'selfish', label: 'Selfish Routing',
    d: 'M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-1.447-.894L15 9m0 8V9m0 0L9 7',
  },
  {
    id: 'qmix', label: 'Monolithic QMIX',
    d: 'M19 11H5m14 0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2m14 0V9a2 2 0 0 0-2-2M5 11V9a2 2 0 0 1 2-2m0 0V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7 7h10',
  },
]

const PAGE_COLOR: Record<Page, string> = {
  summary: '#60A5FA',
  civiq: ALGO.civiq.color,
  selfish: ALGO.selfish.color,
  qmix: ALGO.qmix.color,
}

interface SidebarProps {
  activePage: Page
  setActivePage: (p: Page) => void
  mapSize: string
  trafficScale: string
  algorithm1: string
}

const Sidebar = ({ activePage, setActivePage, mapSize, trafficScale, algorithm1 }: SidebarProps) => (
  <div className="flex flex-col flex-shrink-0"
    style={{ width: '248px', background: 'rgba(0,0,0,0.2)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

    {/* Analytics nav */}
    <div className="px-5 pt-6 pb-3 flex-shrink-0">
      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.28)' }}>
        Analytics
      </span>
    </div>

    <nav className="px-3 space-y-1 flex-shrink-0">
      {NAV.map((item) => {
        const isActive = activePage === item.id
        const col = PAGE_COLOR[item.id]
        return (
          <button key={item.id} onClick={() => setActivePage(item.id)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200"
            style={{
              background: isActive ? `${col}18` : 'transparent',
              border: isActive ? `1px solid ${col}40` : '1px solid transparent',
              color: isActive ? col : 'rgba(255,255,255,0.45)',
            }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={item.d} />
            </svg>
            <span className="text-[13px] font-medium">{item.label}</span>
          </button>
        )
      })}
    </nav>

    {/* Divider */}
    <div className="mx-4 my-4 flex-shrink-0" style={{ height: '1px', background: 'rgba(255,255,255,0.07)' }} />

    {/* Simulation Controls section label */}
    <div className="px-5 pb-3 flex-shrink-0">
      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.28)' }}>
        Simulation Controls
      </span>
    </div>

    {/* Controls — stacked vertically, pre-populated from current URL params */}
    <div className="px-4 flex-shrink-0">
      <SimulationControls
        darkMode
        vertical
        hideHeader
        initialMapSize={mapSize}
        initialTrafficScale={trafficScale}
        initialAlgorithm={algorithm1 === 'hierarchical_qmix' ? 'hierarchical_qmix'
          : algorithm1 === 'monolithic_qmix' ? 'monolithic_qmix'
          : algorithm1 === 'selfish_routing' ? 'selfish_routing'
          : undefined}
      />
    </div>

    <div className="p-4 mt-auto flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.28)' }}>Thesis Research</div>
      <div className="text-[11px] font-semibold mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>OBU Traffic Sim v2</div>
    </div>
  </div>
)

// ─── Labels ────────────────────────────────────────────────────────────────────

const MAP_LABELS: Record<string, string> = {
  '2km': '2 km²', '0.75km': '0.75 km²', '4x4': '4×4 Grid (2.25 km²)',
}
const TRAFFIC_LABELS: Record<string, string> = {
  free_flow: 'Free Flow (LOS A)', stable_flow: 'Stable Flow (LOS C)', forced_flow: 'Forced Flow (LOS E)',
}

// ─── Main Export ───────────────────────────────────────────────────────────────

export default function SimulationDashboard() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const mapSize = searchParams.get('mapSize') || ''
  const trafficScale = searchParams.get('trafficScale') || ''
  const view = searchParams.get('view') || ''
  const algorithm1 = searchParams.get('algorithm1') || ''
  const algorithm2 = searchParams.get('algorithm2') || ''

  const algoToPage = (algo: string): Page => {
    if (algo === 'hierarchical_qmix') return 'civiq'
    if (algo === 'monolithic_qmix') return 'qmix'
    if (algo === 'selfish_routing') return 'selfish'
    return 'summary'
  }
  const [activePage, setActivePage] = useState<Page>(() => algoToPage(algorithm1))

  // Keep active tab in sync when URL params change (e.g. Run from sidebar controls)
  useEffect(() => {
    setActivePage(algoToPage(algorithm1))
  }, [algorithm1])

  useEffect(() => {
    if (!mapSize || !trafficScale || !view || !algorithm1) { router.push('/'); return }
    const validMapSizes = ['2km', '0.75km', '4x4']
    const validTrafficScales = ['free_flow', 'stable_flow', 'forced_flow']
    const validViews = ['focused', 'comparative']
    const validAlgorithms = ['selfish_routing', 'monolithic_qmix', 'hierarchical_qmix']
    if (
      !validMapSizes.includes(mapSize) ||
      !validTrafficScales.includes(trafficScale) ||
      !validViews.includes(view) ||
      !validAlgorithms.includes(algorithm1)
    ) { router.push('/'); return }
    if (view === 'comparative' && (!algorithm2 || algorithm1 === algorithm2 || !validAlgorithms.includes(algorithm2))) {
      router.push('/')
    }
  }, [mapSize, trafficScale, view, algorithm1, algorithm2, router])

  return (
    <main className="w-full h-screen overflow-hidden" style={{ position: 'relative' }}>
      {/* Base gradient */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(135deg, #060112 0%, #0b0320 40%, #040c1c 100%)', zIndex: -1 }} />
      <AnimatedBackground />

      {/* Outer wrapper */}
      <div className="flex items-stretch justify-center"
        style={{ height: '100vh', padding: 'clamp(10px, 1.2vw, 18px)', zIndex: 2, position: 'relative', overflowX: 'auto' }}>

        {/* OBU Bezel */}
        <div className="relative w-full flex flex-col" style={{
          minWidth: '1400px', maxWidth: '1640px',
          background: 'rgba(8, 14, 32, 0.48)',
          backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
          borderRadius: '24px', padding: '12px',
          border: '1px solid rgba(255,255,255,0.11)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.3)',
        }}>
          {/* Side screws */}
          {['left-2', 'right-2'].map((side) => (
            <div key={side} className={`absolute ${side} top-1/2 -translate-y-1/2 flex flex-col gap-2.5 pointer-events-none`}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-2 h-2 rounded-full"
                  style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.18),rgba(255,255,255,0.04))', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)' }} />
              ))}
            </div>
          ))}

          {/* Screen */}
          <div className="relative flex flex-col overflow-hidden"
            style={{
              flex: 1,
              background: 'rgba(6, 11, 26, 0.45)',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
            }}>
            {/* Top gloss */}
            <div className="absolute inset-x-0 top-0 h-20 pointer-events-none rounded-t-[14px]"
              style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%)' }} />

            {/* Status bar */}
            <StatusBar />

            {/* Breadcrumb / context bar */}
            <div className="flex items-center gap-2 px-6 py-2 flex-shrink-0"
              style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.28)' }}>Simulation</span>
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>›</span>
              <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.48)' }}>
                {MAP_LABELS[mapSize] || mapSize}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>›</span>
              <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.48)' }}>
                {TRAFFIC_LABELS[trafficScale] || trafficScale}
              </span>
              <div className="ml-auto">
                <button onClick={() => router.push('/')}
                  className="text-[11px] flex items-center gap-1.5 transition-colors duration-200"
                  style={{ color: 'rgba(255,255,255,0.28)' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.62)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.28)')}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  Back to Home
                </button>
              </div>
            </div>

            {/* Body: Sidebar + Content */}
            <div className="flex overflow-hidden" style={{ flex: 1, minHeight: 0 }}>
              <Sidebar
                activePage={activePage}
                setActivePage={setActivePage}
                mapSize={mapSize}
                trafficScale={trafficScale}
                algorithm1={algorithm1}
              />
              {/* Content pane: fixed blob layer + scrollable content on top */}
              <div className="flex-1 relative" style={{
                minHeight: 0,
                overflow: 'hidden',
                background: 'rgba(4, 9, 22, 0.82)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderLeft: '1px solid rgba(255,255,255,0.07)',
              }}>
                {/* Animated colour blobs — fixed behind content */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
                  <div className="absolute rounded-full" style={{
                    width: 500, height: 500, top: '-120px', left: '-80px',
                    background: 'radial-gradient(circle at 40% 40%, rgba(6,182,212,0.28) 0%, transparent 70%)',
                    filter: 'blur(60px)', animation: 'blob1 16s ease-in-out infinite', animationDelay: '-3s',
                  }} />
                  <div className="absolute rounded-full" style={{
                    width: 460, height: 460, bottom: '-100px', right: '-60px',
                    background: 'radial-gradient(circle at 60% 55%, rgba(139,92,246,0.24) 0%, transparent 70%)',
                    filter: 'blur(60px)', animation: 'blob2 20s ease-in-out infinite', animationDelay: '-8s',
                  }} />
                  <div className="absolute rounded-full" style={{
                    width: 360, height: 360, top: '35%', left: '50%',
                    background: 'radial-gradient(circle at 50% 50%, rgba(37,99,235,0.18) 0%, transparent 70%)',
                    filter: 'blur(50px)', animation: 'blob3 18s ease-in-out infinite', animationDelay: '-12s',
                  }} />
                </div>

                {/* Scrollable page content */}
                <div className="absolute inset-0 overflow-y-auto" style={{ zIndex: 1 }}>
                  {activePage === 'summary' && <SummaryPage />}
                  {activePage === 'civiq' && <AlgoDetailPage algo={ALGO.civiq} mapSize={mapSize} trafficScale={trafficScale} />}
                  {activePage === 'selfish' && <AlgoDetailPage algo={ALGO.selfish} mapSize={mapSize} trafficScale={trafficScale} />}
                  {activePage === 'qmix' && <AlgoDetailPage algo={ALGO.qmix} mapSize={mapSize} trafficScale={trafficScale} />}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

'use client'

import { useState } from 'react'
import { Play, Pause, Zap } from 'lucide-react'

interface DebugPanelProps {
  onStartSimulation: () => void
  onStopSimulation: () => void
  isSimulating: boolean
}

export default function DebugPanel({ onStartSimulation, onStopSimulation, isSimulating }: DebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-24 right-4 z-50 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-full p-3 shadow-xl border-2 border-white"
        title="Debug Panel"
      >
        <Zap className="w-5 h-5" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-24 right-4 z-50 bg-[#0C0C0C]/95 backdrop-blur-sm border border-[#DC2626] rounded-2xl p-4 shadow-xl max-w-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#DC2626]" />
          <h3 className="text-sm font-bold text-[#FAFAFA]">Debug Mode</h3>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-[#A3A3A3] hover:text-[#FAFAFA]"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-[#A3A3A3] mb-2">
          Simulates driving from Jaap ter Haarstraat to Amsterdam Zuid
        </div>

        {!isSimulating ? (
          <button
            onClick={onStartSimulation}
            className="w-full flex items-center justify-center gap-2 bg-[#22C55E] hover:bg-[#16A34A] text-[#0C0C0C] px-4 py-3 rounded-xl font-semibold transition-colors"
          >
            <Play className="w-4 h-4" />
            Start Simulation
          </button>
        ) : (
          <div className="space-y-2">
            <button
              onClick={onStopSimulation}
              className="w-full flex items-center justify-center gap-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white px-4 py-3 rounded-xl font-semibold transition-colors"
            >
              <Pause className="w-4 h-4" />
              Stop Simulation
            </button>
            
            <div className="text-xs text-[#22C55E] text-center animate-pulse">
              🚗 Simulating drive...
            </div>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-[#262626]">
          <div className="text-[10px] text-[#A3A3A3] space-y-1">
            <div>• Speed: 50-100 km/h (realistic)</div>
            <div>• Updates GPS every 30ms</div>
            <div>• Smooth like real GPS</div>
          </div>
        </div>
      </div>
    </div>
  )
}

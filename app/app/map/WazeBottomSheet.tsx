'use client';

import { useState, useRef } from 'react';
import { 
  Navigation, 
  AlertTriangle, 
  MapPin, 
  X, 
  Clock, 
  Route,
  Shield,
  Car,
  TrafficCone,
  Ban,
  Zap,
  Ruler,
  Minus,
  DollarSign,
  Search,
  Loader2
} from 'lucide-react';
import type { NavigationStep, RouteOptions, HazardType } from '@/lib/types';

interface SearchResult {
  id: string;
  name: string;
  address?: string;
  coordinates: [number, number];
}

interface WazeBottomSheetProps {
  isNavigating: boolean;
  currentStep: NavigationStep | null;
  remainingDistance: number | null;
  remainingDuration: number | null;
  currentSpeed: number;
  speedLimit?: number;
  onStopNavigation: () => void;
  onReportHazard: (hazardType: HazardType) => void;
  onChangeRoute: (options: RouteOptions) => void;
  onSearch?: (query: string) => void;
  searchResults?: SearchResult[];
  onSelectDestination?: (result: SearchResult) => void;
  searching?: boolean;
  onDismiss?: () => void;
}

export default function WazeBottomSheet({
  isNavigating,
  currentStep,
  remainingDistance,
  remainingDuration,
  currentSpeed,
  speedLimit,
  onStopNavigation,
  onReportHazard,
  onChangeRoute,
  onSearch,
  searchResults = [],
  onSelectDestination,
  searching = false,
  onDismiss,
}: WazeBottomSheetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHazardMenu, setShowHazardMenu] = useState(false);
  const [showRouteOptions, setShowRouteOptions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Handle touch/mouse drag to dismiss
  const handleDragStart = (clientY: number) => {
    setDragStartY(clientY);
  };

  const handleDragMove = (clientY: number) => {
    if (dragStartY === null) return;
    const offset = clientY - dragStartY;
    if (offset > 0) { // Only allow dragging down
      setDragOffsetY(offset);
    }
  };

  const handleDragEnd = () => {
    if (dragOffsetY > 100 && onDismiss) { // Dismiss threshold: 100px
      onDismiss();
    }
    setDragStartY(null);
    setDragOffsetY(0);
  };

  const formatDistance = (meters: number | null): string => {
    if (!meters || !Number.isFinite(meters)) return '--';
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds || !Number.isFinite(seconds)) return '--';
    const totalMinutes = Math.max(1, Math.round(seconds / 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const getManeuverIcon = (type?: string | null, modifier?: string | null): string => {
    if (!type) return '→';
    
    const maneuverMap: Record<string, string> = {
      'turn-slight-left': '↖',
      'turn-left': '←',
      'turn-sharp-left': '↙',
      'turn-slight-right': '↗',
      'turn-right': '→',
      'turn-sharp-right': '↘',
      'straight': '↑',
      'uturn': '↩',
      'roundabout': '⟳',
      'arrive': '📍',
    };

    const key = modifier ? `${type}-${modifier}` : type;
    return maneuverMap[key] || maneuverMap[type] || '→';
  };

  const isOverSpeedLimit = speedLimit && currentSpeed > speedLimit;

  return (
    <>
      {/* Speed Display - Always visible - Compact */}
      <div className="fixed top-2 left-2 z-50">
        <div
          className={`px-3 py-2 rounded-xl font-bold text-xl shadow-lg transition-colors ${
            isOverSpeedLimit
              ? 'bg-[#DC2626] text-white animate-pulse'
              : 'bg-[#171717]/90 text-[#FAFAFA] border border-[#262626]'
          }`}
        >
          {Math.round(currentSpeed)}
          <span className="text-sm ml-0.5">km/h</span>
          {speedLimit && (
            <div className={`text-[10px] font-normal ${isOverSpeedLimit ? 'text-white/80' : 'text-[#A3A3A3]'} mt-0.5`}>
              Max {speedLimit}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={`fixed left-0 right-0 z-40 bg-[#171717] border-t-2 border-[#262626] rounded-t-3xl shadow-2xl transition-all duration-300 ${
          isExpanded ? 'h-[70vh]' : 'h-auto'
        }`}
        style={{
          bottom: dragOffsetY > 0 ? `-${dragOffsetY}px` : '0',
          opacity: dragOffsetY > 0 ? Math.max(0.3, 1 - dragOffsetY / 200) : 1,
        }}
        onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
        onTouchMove={(e) => handleDragMove(e.touches[0].clientY)}
        onTouchEnd={handleDragEnd}
        onMouseDown={(e) => handleDragStart(e.clientY)}
        onMouseMove={(e) => e.buttons === 1 && handleDragMove(e.clientY)}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        {/* Drag Handle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-3 flex justify-center cursor-grab active:cursor-grabbing"
        >
          <div className="w-12 h-1 bg-[#262626] rounded-full" />
        </button>

        {/* Main Content */}
        <div className="px-4 pb-4">
          {isNavigating && currentStep ? (
            <>
              {/* Current Instruction - Compact */}
              <div className="mb-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-4xl">{getManeuverIcon(currentStep.maneuverType, currentStep.maneuverModifier)}</div>
                  <div className="flex-1">
                    <div className="text-lg font-bold text-[#FAFAFA] mb-0.5">
                      {currentStep.instruction}
                    </div>
                    <div className="text-sm text-[#A3A3A3]">
                      {formatDistance(currentStep.distance)} • {currentStep.name || 'Continue'}
                    </div>
                  </div>
                </div>

                {/* ETA and Distance - Compact */}
                <div className="flex items-center justify-between p-3 bg-[#0C0C0C] border border-[#262626] rounded-xl">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#84CC16]" />
                    <div>
                      <div className="text-xl font-bold text-[#84CC16]">
                        {formatDuration(remainingDuration)}
                      </div>
                      <div className="text-xs text-[#A3A3A3]">ETA</div>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <div className="text-lg font-bold text-[#FAFAFA]">
                        {formatDistance(remainingDistance)}
                      </div>
                      <div className="text-xs text-[#A3A3A3]">Left</div>
                    </div>
                    <Navigation className="w-4 h-4 text-[#FAFAFA]" />
                  </div>
                </div>
              </div>

              {/* Compact Action Buttons */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                {/* Report Hazard Button */}
                <button
                  onClick={() => setShowHazardMenu(!showHazardMenu)}
                  className="p-3 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl font-semibold text-sm shadow-lg transition-colors flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Report
                </button>

                {/* Route Options Button */}
                <button
                  onClick={() => setShowRouteOptions(!showRouteOptions)}
                  className="p-3 bg-[#FBBF24] hover:bg-[#F59E0B] text-[#0C0C0C] rounded-xl font-semibold text-sm shadow-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Route className="w-4 h-4" />
                  Routes
                </button>
              </div>

              {/* Stop Navigation Button - Compact */}
              <button
                onClick={onStopNavigation}
                className="w-full p-3 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl font-semibold text-sm shadow-lg transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Stop Navigation
              </button>

              {/* Hazard Menu - Compact */}
              {showHazardMenu && (
                <div className="mt-3 p-3 bg-[#0C0C0C] border border-[#262626] rounded-xl space-y-1.5">
                  <div className="text-xs font-semibold text-[#A3A3A3] mb-2">Report Hazard</div>
                  <button
                    onClick={() => {
                      onReportHazard('police');
                      setShowHazardMenu(false);
                    }}
                    className="w-full p-2.5 bg-[#171717] hover:bg-[#262626] text-[#FAFAFA] border border-[#262626] rounded-lg text-left text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <Shield className="w-4 h-4 text-[#3B82F6]" />
                    Police
                  </button>
                  <button
                    onClick={() => {
                      onReportHazard('accident');
                      setShowHazardMenu(false);
                    }}
                    className="w-full p-2.5 bg-[#171717] hover:bg-[#262626] text-[#FAFAFA] border border-[#262626] rounded-lg text-left text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <Car className="w-4 h-4 text-[#DC2626]" />
                    Accident
                  </button>
                  <button
                    onClick={() => {
                      onReportHazard('hazard');
                      setShowHazardMenu(false);
                    }}
                    className="w-full p-2.5 bg-[#171717] hover:bg-[#262626] text-[#FAFAFA] border border-[#262626] rounded-lg text-left text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 text-[#F97316]" />
                    Hazard on Road
                  </button>
                  <button
                    onClick={() => {
                      onReportHazard('traffic');
                      setShowHazardMenu(false);
                    }}
                    className="w-full p-2.5 bg-[#171717] hover:bg-[#262626] text-[#FAFAFA] border border-[#262626] rounded-lg text-left text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <TrafficCone className="w-4 h-4 text-[#FBBF24]" />
                    Heavy Traffic
                  </button>
                  <button
                    onClick={() => {
                      onReportHazard('road_closed');
                      setShowHazardMenu(false);
                    }}
                    className="w-full p-2.5 bg-[#171717] hover:bg-[#262626] text-[#FAFAFA] border border-[#262626] rounded-lg text-left text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <Ban className="w-4 h-4 text-[#DC2626]" />
                    Road Closed
                  </button>
                </div>
              )}

              {/* Route Options Menu - Compact */}
              {showRouteOptions && (
                <div className="mt-3 p-3 bg-[#0C0C0C] border border-[#262626] rounded-xl space-y-1.5">
                  <div className="text-xs font-semibold text-[#A3A3A3] mb-2">Route Preferences</div>
                  <button
                    onClick={() => {
                      onChangeRoute({ preference: 'fastest', avoid_highways: false, avoid_tolls: false });
                      setShowRouteOptions(false);
                    }}
                    className="w-full p-2.5 bg-[#171717] hover:bg-[#262626] text-[#FAFAFA] border border-[#262626] rounded-lg text-left text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <Zap className="w-4 h-4 text-[#84CC16]" />
                    Fastest Route
                  </button>
                  <button
                    onClick={() => {
                      onChangeRoute({ preference: 'shortest', avoid_highways: false, avoid_tolls: false });
                      setShowRouteOptions(false);
                    }}
                    className="w-full p-2.5 bg-[#171717] hover:bg-[#262626] text-[#FAFAFA] border border-[#262626] rounded-lg text-left text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <Ruler className="w-4 h-4 text-[#3B82F6]" />
                    Shortest Route
                  </button>
                  <button
                    onClick={() => {
                      onChangeRoute({ preference: 'fastest', avoid_highways: true, avoid_tolls: false });
                      setShowRouteOptions(false);
                    }}
                    className="w-full p-2.5 bg-[#171717] hover:bg-[#262626] text-[#FAFAFA] border border-[#262626] rounded-lg text-left text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <Minus className="w-4 h-4 text-[#F97316]" />
                    Avoid Highways
                  </button>
                  <button
                    onClick={() => {
                      onChangeRoute({ preference: 'fastest', avoid_highways: false, avoid_tolls: true });
                      setShowRouteOptions(false);
                    }}
                    className="w-full p-2.5 bg-[#171717] hover:bg-[#262626] text-[#FAFAFA] border border-[#262626] rounded-lg text-left text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <DollarSign className="w-4 h-4 text-[#22C55E]" />
                    Avoid Tolls
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              {/* Search Bar - Compact */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3A3A3]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (onSearch && e.target.value.length > 2) {
                      onSearch(e.target.value);
                    }
                  }}
                  placeholder="Search for a destination..."
                  className="w-full pl-10 pr-10 py-3 text-sm bg-[#0C0C0C] text-[#FAFAFA] placeholder-[#A3A3A3] rounded-xl border border-[#262626] focus:border-[#84CC16] focus:outline-none transition-colors"
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 text-[#84CC16] animate-spin" />
                  </div>
                )}
              </div>

              {/* Search Results - Compact */}
              {searchResults.length > 0 && (
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => {
                        if (onSelectDestination) {
                          onSelectDestination(result);
                          setSearchQuery('');
                        }
                      }}
                      className="w-full p-3 bg-[#0C0C0C] hover:bg-[#262626] border border-[#262626] rounded-lg text-left transition-colors flex items-start gap-2"
                    >
                      <MapPin className="w-4 h-4 text-[#84CC16] mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-[#FAFAFA] truncate">{result.name}</div>
                        {result.address && (
                          <div className="text-xs text-[#A3A3A3] mt-0.5 truncate">{result.address}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* No Results State */}
              {searchQuery.length > 0 && !searching && searchResults.length === 0 && (
                <div className="text-center py-6">
                  <div className="text-[#A3A3A3] text-sm">No results found</div>
                  <div className="text-[#A3A3A3] text-xs mt-1">Try a different search term</div>
                </div>
              )}

              {/* Initial State */}
              {searchQuery.length === 0 && (
                <div className="text-center py-6">
                  <MapPin className="w-12 h-12 text-[#84CC16] mx-auto mb-3" />
                  <div className="text-[#FAFAFA] text-base font-semibold mb-1">Where to?</div>
                  <div className="text-[#A3A3A3] text-xs">Search for a destination to start navigating</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

'use client';

import { useState } from 'react';
import type { NavigationStep, RouteOptions, HazardType } from '@/lib/types';

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
}: WazeBottomSheetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHazardMenu, setShowHazardMenu] = useState(false);
  const [showRouteOptions, setShowRouteOptions] = useState(false);

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
      {/* Speed Display - Always visible */}
      <div className="fixed top-4 left-4 z-50">
        <div
          className={`px-6 py-4 rounded-2xl font-bold text-3xl shadow-2xl transition-colors ${
            isOverSpeedLimit
              ? 'bg-red-600 text-white animate-pulse'
              : 'bg-white/95 backdrop-blur text-gray-900'
          }`}
        >
          {Math.round(currentSpeed)}
          <span className="text-lg ml-1">km/h</span>
          {speedLimit && (
            <div className="text-xs font-normal text-gray-600 mt-1">
              Limit: {speedLimit} km/h
            </div>
          )}
        </div>
      </div>

      {/* Bottom Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 bg-white rounded-t-3xl shadow-2xl transition-all duration-300 ${
          isExpanded ? 'h-[70vh]' : 'h-auto'
        }`}
      >
        {/* Drag Handle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-3 flex justify-center"
        >
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </button>

        {/* Main Content */}
        <div className="px-6 pb-6">
          {isNavigating && currentStep ? (
            <>
              {/* Current Instruction */}
              <div className="mb-6">
                <div className="flex items-center gap-4 mb-3">
                  <div className="text-6xl">{getManeuverIcon(currentStep.maneuverType, currentStep.maneuverModifier)}</div>
                  <div className="flex-1">
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {currentStep.instruction}
                    </div>
                    <div className="text-lg text-gray-600">
                      {formatDistance(currentStep.distance)} • {currentStep.name || 'Continue'}
                    </div>
                  </div>
                </div>

                {/* ETA and Distance */}
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl">
                  <div>
                    <div className="text-3xl font-bold text-blue-600">
                      {formatDuration(remainingDuration)}
                    </div>
                    <div className="text-sm text-gray-600">Estimated time</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatDistance(remainingDistance)}
                    </div>
                    <div className="text-sm text-gray-600">Remaining</div>
                  </div>
                </div>
              </div>

              {/* Large Action Buttons */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Report Hazard Button */}
                <button
                  onClick={() => setShowHazardMenu(!showHazardMenu)}
                  className="p-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-semibold text-lg shadow-lg transition-colors"
                >
                  ⚠️ Report
                </button>

                {/* Route Options Button */}
                <button
                  onClick={() => setShowRouteOptions(!showRouteOptions)}
                  className="p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-semibold text-lg shadow-lg transition-colors"
                >
                  🛣️ Routes
                </button>
              </div>

              {/* Stop Navigation Button */}
              <button
                onClick={onStopNavigation}
                className="w-full p-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-semibold text-lg shadow-lg transition-colors"
              >
                ⏹️ Stop Navigation
              </button>

              {/* Hazard Menu */}
              {showHazardMenu && (
                <div className="mt-4 p-4 bg-gray-50 rounded-2xl space-y-2">
                  <div className="text-sm font-semibold text-gray-600 mb-3">Report Hazard</div>
                  <button
                    onClick={() => {
                      onReportHazard('police');
                      setShowHazardMenu(false);
                    }}
                    className="w-full p-3 bg-white hover:bg-gray-100 rounded-xl text-left font-medium transition-colors"
                  >
                    🚔 Police
                  </button>
                  <button
                    onClick={() => {
                      onReportHazard('accident');
                      setShowHazardMenu(false);
                    }}
                    className="w-full p-3 bg-white hover:bg-gray-100 rounded-xl text-left font-medium transition-colors"
                  >
                    🚗💥 Accident
                  </button>
                  <button
                    onClick={() => {
                      onReportHazard('hazard');
                      setShowHazardMenu(false);
                    }}
                    className="w-full p-3 bg-white hover:bg-gray-100 rounded-xl text-left font-medium transition-colors"
                  >
                    ⚠️ Hazard on Road
                  </button>
                  <button
                    onClick={() => {
                      onReportHazard('traffic');
                      setShowHazardMenu(false);
                    }}
                    className="w-full p-3 bg-white hover:bg-gray-100 rounded-xl text-left font-medium transition-colors"
                  >
                    🚦 Heavy Traffic
                  </button>
                  <button
                    onClick={() => {
                      onReportHazard('road_closed');
                      setShowHazardMenu(false);
                    }}
                    className="w-full p-3 bg-white hover:bg-gray-100 rounded-xl text-left font-medium transition-colors"
                  >
                    🚧 Road Closed
                  </button>
                </div>
              )}

              {/* Route Options Menu */}
              {showRouteOptions && (
                <div className="mt-4 p-4 bg-gray-50 rounded-2xl space-y-3">
                  <div className="text-sm font-semibold text-gray-600 mb-2">Route Preferences</div>
                  <button
                    onClick={() => {
                      onChangeRoute({ preference: 'fastest', avoid_highways: false, avoid_tolls: false });
                      setShowRouteOptions(false);
                    }}
                    className="w-full p-3 bg-white hover:bg-gray-100 rounded-xl text-left font-medium transition-colors"
                  >
                    ⚡ Fastest Route
                  </button>
                  <button
                    onClick={() => {
                      onChangeRoute({ preference: 'shortest', avoid_highways: false, avoid_tolls: false });
                      setShowRouteOptions(false);
                    }}
                    className="w-full p-3 bg-white hover:bg-gray-100 rounded-xl text-left font-medium transition-colors"
                  >
                    📏 Shortest Route
                  </button>
                  <button
                    onClick={() => {
                      onChangeRoute({ preference: 'fastest', avoid_highways: true, avoid_tolls: false });
                      setShowRouteOptions(false);
                    }}
                    className="w-full p-3 bg-white hover:bg-gray-100 rounded-xl text-left font-medium transition-colors"
                  >
                    🛣️ Avoid Highways
                  </button>
                  <button
                    onClick={() => {
                      onChangeRoute({ preference: 'fastest', avoid_highways: false, avoid_tolls: true });
                      setShowRouteOptions(false);
                    }}
                    className="w-full p-3 bg-white hover:bg-gray-100 rounded-xl text-left font-medium transition-colors"
                  >
                    💰 Avoid Tolls
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 text-lg">No active navigation</div>
              <div className="text-gray-400 text-sm mt-2">Search for a destination to start</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

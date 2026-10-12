import React from "react";

/**
 * Premium Skeleton Loader for Search Page
 * Matches the shadcn/ui design language and preserves the split-view map/feed layout.
 */
export default function SearchLoading() {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50">
      {/* Left Column: Property Feed Skeleton */}
      <div className="w-full lg:w-1/2 p-6 lg:p-8 space-y-6 overflow-y-auto max-w-2xl mx-auto lg:mx-0">
        {/* Results Count & Filter Skeleton */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="h-5 w-44 bg-slate-200 rounded-md animate-pulse" />
          <div className="h-8 w-24 bg-slate-200 rounded-lg animate-pulse" />
        </div>

        {/* Property Card Skeletons */}
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4 animate-pulse"
            >
              {/* Image Preview Skeleton */}
              <div className="h-44 w-full bg-slate-200 rounded-xl" />

              {/* Title & Badge */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <div className="h-6 w-3/4 bg-slate-200 rounded" />
                  <div className="h-5 w-16 bg-slate-100 rounded-full" />
                </div>
                <div className="h-4 w-1/2 bg-slate-100 rounded" />
              </div>

              {/* Price & Certificate Footer */}
              <div className="pt-2 flex items-center justify-between">
                <div className="h-7 w-28 bg-slate-200 rounded-md" />
                <div className="h-6 w-32 bg-slate-100 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Geospatial Map Skeleton */}
      <div className="hidden lg:flex w-1/2 bg-slate-200/70 border-l border-slate-300 relative items-center justify-center animate-pulse">
        <div className="text-center space-y-3 p-8">
          <div className="w-12 h-12 rounded-full bg-slate-300 mx-auto flex items-center justify-center text-slate-500 font-bold">
            📍
          </div>
          <p className="text-sm font-semibold text-slate-600">
            Synchronizing PostGIS Geospatial Layer...
          </p>
          <p className="text-xs text-slate-400">
            Plotting spatial coordinates & certified plot boundaries
          </p>
        </div>
      </div>
    </div>
  );
}

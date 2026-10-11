"use client";

import { useRef, useCallback, useMemo, useState } from "react";
import Map, { Marker, ViewStateChangeEvent } from "react-map-gl/mapbox";
import useSupercluster from "use-supercluster";
import { useRouter, useSearchParams } from "next/navigation";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// 1. DYNAMIC HTML MARKER COMPONENT
const PropertyMarker = ({ property }: { property: any }) => {
  // Visuals determined by Domain Rules
  const isGoldPin = property.isPrakritiCertified;
  const isLocked = property.lockStatus !== 'AVAILABLE';
  const modeColor = property.type === 'BUY' ? 'bg-blue-600' : property.type === 'RENT' ? 'bg-green-600' : 'bg-purple-600';
  
  return (
    <div className={`
      relative group cursor-pointer flex flex-col items-center justify-center
      ${isLocked ? 'opacity-50 grayscale' : 'hover:scale-110 transition-transform'}
    `}>
      {/* Tooltip on hover */}
      <div className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg z-50">
        ₹{property.price} • {property.type}
        {isLocked && " (Locked)"}
      </div>

      {/* Main Marker Badge */}
      <div className={`
        flex items-center justify-center px-3 py-1 rounded-full text-white font-bold text-sm shadow-premium
        ${isGoldPin ? 'bg-gradient-to-r from-gold-400 to-gold-600 ring-2 ring-gold-200' : modeColor}
      `}>
        {isGoldPin && <span className="mr-1">✨</span>}
        ₹{property.price > 100000 ? (property.price / 100000).toFixed(1) + 'L' : property.price}
      </div>
      
      {/* Pin Triangle */}
      <div className={`w-3 h-3 rotate-45 -mt-1.5 ${isGoldPin ? 'bg-gold-500' : modeColor}`} />
    </div>
  );
};

// 2. MAIN MAP PROVIDER
export default function PropertyMap({ initialProperties = [] }: { initialProperties: any[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mapRef = useRef<any>(null);

  // Map state
  const [viewState, setViewState] = useState({
    longitude: 77.2090, // Default to Delhi
    latitude: 28.6139,
    zoom: 11
  });

  // Convert properties to GeoJSON for Supercluster
  const points = useMemo(() => {
    return initialProperties.map(p => ({
      type: "Feature",
      properties: { cluster: false, propertyId: p.id, ...p },
      geometry: { type: "Point", coordinates: [p.lng, p.lat] }
    }));
  }, [initialProperties]);

  // 3. CLUSTERING CONFIGURATION
  const bounds = mapRef.current 
    ? mapRef.current.getMap().getBounds().toArray().flat() 
    : null;

  const { clusters, supercluster } = useSupercluster({
    points,
    bounds,
    zoom: viewState.zoom,
    options: { radius: 75, maxZoom: 16 }
  });

  // Debounced URL Sync
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const onMoveEnd = useCallback((e: ViewStateChangeEvent) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    debounceTimer.current = setTimeout(() => {
      const mapBounds = e.target.getBounds();
      const boundsString = `${mapBounds.getWest()},${mapBounds.getSouth()},${mapBounds.getEast()},${mapBounds.getNorth()}`;
      
      const currentParams = new URLSearchParams(searchParams.toString());
      currentParams.set('bounds', boundsString);
      
      // Shallow route push triggers Server Component re-fetch without losing client state
      router.push(`?${currentParams.toString()}`, { scroll: false });
    }, 500); // 500ms debounce
  }, [router, searchParams]);

  return (
    <div className="w-full h-full relative">
      <Map
        {...viewState}
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/light-v11"
        onMove={evt => setViewState(evt.viewState)}
        onMoveEnd={onMoveEnd}
        maxZoom={20}
      >
        {clusters.map((cluster: any) => {
          const [longitude, latitude] = cluster.geometry.coordinates;
          const { cluster: isCluster, point_count: pointCount } = cluster.properties;

          if (isCluster) {
            // Render Cluster Ring
            const size = 30 + (pointCount / points.length) * 40;
            return (
              <Marker key={`cluster-${cluster.id}`} longitude={longitude} latitude={latitude}>
                <div 
                  className="bg-prakriti-900/90 text-white rounded-full flex items-center justify-center font-bold shadow-lg border-2 border-white cursor-pointer hover:bg-prakriti-700 transition"
                  style={{ width: `${size}px`, height: `${size}px` }}
                  onClick={() => {
                    const expansionZoom = Math.min(supercluster.getClusterExpansionZoom(cluster.id), 20);
                    setViewState({ ...viewState, longitude, latitude, zoom: expansionZoom });
                  }}
                >
                  {pointCount}
                </div>
              </Marker>
            );
          }

          // Render Individual Property
          return (
            <Marker key={`prop-${cluster.properties.propertyId}`} longitude={longitude} latitude={latitude}>
              <PropertyMarker property={cluster.properties} />
            </Marker>
          );
        })}
      </Map>
    </div>
  );
}

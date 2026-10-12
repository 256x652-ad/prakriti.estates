"use client";

import { useRef, useCallback, useMemo, useState, useEffect } from "react";
import Map, { Marker, ViewStateChangeEvent, NavigationControl, GeolocateControl } from "react-map-gl/mapbox";
import useSupercluster from "use-supercluster";
import { useRouter, useSearchParams } from "next/navigation";
import "mapbox-gl/dist/mapbox-gl.css";
import { SearchResultItem } from "@/modules/properties/services/PropertySearchService";
import { formatIndianPrice } from "@/components/Cards/PropertyCard";
import { Lock, Award } from "lucide-react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// 1. DYNAMIC PROPERTY MARKER WITH COMPREHENSIVE STATES
const PropertyMarker = ({
  property,
  onClick,
}: {
  property: SearchResultItem;
  onClick?: () => void;
}) => {
  const isGoldPin = property.isPrakritiCertified;
  const isLocked = property.lockStatus !== "AVAILABLE";

  // Property-type color coding
  const modeBadgeColor =
    property.type === "BUY"
      ? "bg-blue-600 border-blue-400"
      : property.type === "RENT"
      ? "bg-emerald-600 border-emerald-400"
      : "bg-purple-600 border-purple-400";

  return (
    <div
      onClick={onClick}
      className={`relative group cursor-pointer flex flex-col items-center justify-center transition-all duration-200 ${
        isLocked
          ? "opacity-60 grayscale hover:grayscale-0 hover:opacity-100"
          : "hover:scale-110 active:scale-95"
      }`}
    >
      {/* Tooltip on Hover */}
      <div className="absolute bottom-full mb-2.5 hidden group-hover:flex flex-col w-max max-w-[200px] bg-slate-950/95 backdrop-blur-md text-white text-xs px-3 py-2 rounded-xl shadow-2xl z-50 pointer-events-none border border-slate-800">
        <p className="font-extrabold truncate text-white">{property.title}</p>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-300 mt-0.5">
          <span className="font-bold text-emerald-400">{formatIndianPrice(property.price)}</span>
          <span>•</span>
          <span className="uppercase text-[10px] font-semibold">{property.type}</span>
          {isLocked && <span className="text-red-400 font-bold">(Locked)</span>}
        </div>
        {property.distanceMeters !== undefined && (
          <p className="text-[10px] text-slate-400 mt-0.5">
            📍 {(property.distanceMeters / 1000).toFixed(1)} km away
          </p>
        )}
      </div>

      {/* Main Marker Badge State */}
      {isGoldPin ? (
        // STATE 1: PRAKRITI CERTIFIED GOLD PIN (Gleaming Gold Badge with Crown Accent)
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 px-3 py-1 rounded-full text-slate-950 font-black text-xs shadow-xl bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 ring-2 ring-amber-300/80 border border-yellow-100 animate-pulse">
            <Award className="w-3.5 h-3.5 fill-slate-950 flex-shrink-0" />
            <span>{formatIndianPrice(property.price)}</span>
            {isLocked && <Lock className="w-3 h-3 text-red-900 ml-0.5" />}
          </div>
          <div className="w-3 h-3 rotate-45 -mt-1.5 bg-gradient-to-br from-amber-400 to-amber-600 border-r border-b border-amber-300 shadow-xs" />
        </div>
      ) : isLocked ? (
        // STATE 2: ESCROW LOCKED (Red Accent State)
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-white font-bold text-xs shadow-md bg-slate-800 border border-red-500/80">
            <Lock className="w-3 h-3 text-red-400" />
            <span>{formatIndianPrice(property.price)}</span>
          </div>
          <div className="w-2.5 h-2.5 rotate-45 -mt-1 bg-slate-800 border-r border-b border-red-500/80" />
        </div>
      ) : (
        // STATE 3: AVAILABLE (Categorized Color by Property Type: BUY/RENT/STAY)
        <div className="flex flex-col items-center">
          <div
            className={`flex items-center justify-center px-2.5 py-1 rounded-full text-white font-bold text-xs shadow-md border ${modeBadgeColor}`}
          >
            {formatIndianPrice(property.price)}
          </div>
          <div className={`w-2.5 h-2.5 rotate-45 -mt-1 ${modeBadgeColor.split(" ")[0]}`} />
        </div>
      )}
    </div>
  );
};

// 2. MAIN MAP COMPONENT WITH SUPERCLUSTER & POSTGIS VIEWPORT SYNC
export default function PropertyMap({
  initialProperties = [],
}: {
  initialProperties: SearchResultItem[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mapRef = useRef<any>(null);

  // Compute center from properties or fallback to Delhi NCR [77.2090, 28.6139]
  const defaultLng = initialProperties.length > 0 ? initialProperties[0].lng : 77.209;
  const defaultLat = initialProperties.length > 0 ? initialProperties[0].lat : 28.6139;

  // Viewport State
  const [viewState, setViewState] = useState({
    longitude: defaultLng,
    latitude: defaultLat,
    zoom: 11,
  });

  // Re-center smoothly via Mapbox flyTo when search results change (never calls setViewState directly in useEffect)
  const firstProp = initialProperties[0];
  const targetKey = firstProp ? `${firstProp.lng.toFixed(4)},${firstProp.lat.toFixed(4)}` : "";
  const lastCenteredKey = useRef<string>(targetKey);

  useEffect(() => {
    if (!targetKey || !firstProp) return;
    if (searchParams.get("bounds")) return;

    if (lastCenteredKey.current !== targetKey) {
      lastCenteredKey.current = targetKey;
      const map = mapRef.current?.getMap ? mapRef.current.getMap() : mapRef.current;
      if (map?.flyTo) {
        map.flyTo({
          center: [firstProp.lng, firstProp.lat],
          zoom: 11,
          duration: 800,
        });
      }
    }
  }, [targetKey, searchParams, firstProp]);

  // Convert properties to GeoJSON FeatureCollection for Supercluster
  const points = useMemo(() => {
    return initialProperties
      .filter((p) => typeof p.lng === "number" && typeof p.lat === "number")
      .map((p) => ({
        type: "Feature" as const,
        properties: { cluster: false, propertyId: p.id, ...p },
        geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
      }));
  }, [initialProperties]);

  // Read current map bounds for clustering calculation
  const bounds = mapRef.current
    ? mapRef.current.getMap().getBounds().toArray().flat()
    : null;

  // 3. SUPERCLUSTER CONFIGURATION
  const { clusters, supercluster } = useSupercluster({
    points,
    bounds,
    zoom: viewState.zoom,
    options: { radius: 75, maxZoom: 16 },
  });

  // 4. DEBOUNCED VIEWPORT-TO-POSTGIS URL SYNC (User gesture only)
  const isUserInteracting = useRef(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const onMoveEnd = useCallback(
    (e: ViewStateChangeEvent) => {
      // Guard: Only update URL bounds if move was initiated by user gesture
      const isInteractive = Boolean((e as any)?.originalEvent || isUserInteracting.current);
      if (!isInteractive) return;
      isUserInteracting.current = false;

      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      debounceTimer.current = setTimeout(() => {
        const mapBounds = e.target.getBounds();
        const boundsString = `${mapBounds.getWest().toFixed(5)},${mapBounds.getSouth().toFixed(5)},${mapBounds.getEast().toFixed(5)},${mapBounds.getNorth().toFixed(5)}`;

        const currentParams = new URLSearchParams(searchParams.toString());
        currentParams.set("bounds", boundsString);

        // Shallow route push triggers PostGIS Server Component re-fetch without losing client zoom
        router.push(`?${currentParams.toString()}`, { scroll: false });
      }, 500); // 500ms debounce
    },
    [router, searchParams]
  );

  return (
    <div className="w-full h-full relative">
      <Map
        {...viewState}
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/light-v11"
        onMove={(evt) => setViewState(evt.viewState)}
        onDragStart={() => {
          isUserInteracting.current = true;
        }}
        onZoomStart={() => {
          isUserInteracting.current = true;
        }}
        onMoveEnd={onMoveEnd}
        maxZoom={20}
        reuseMaps
      >
        {/* Navigation & Geolocation Controls for Responsive Mobile UX */}
        <NavigationControl position="bottom-right" />
        <GeolocateControl
          position="bottom-right"
          trackUserLocation
          showAccuracyCircle
          onGeolocate={(e) => {
            const map = mapRef.current?.getMap ? mapRef.current.getMap() : mapRef.current;
            if (map?.flyTo) {
              map.flyTo({
                center: [e.coords.longitude, e.coords.latitude],
                zoom: 14,
              });
            }
          }}
        />

        {/* Render Clusters & Individual Property Markers */}
        {clusters.map((cluster: any) => {
          const [longitude, latitude] = cluster.geometry.coordinates;
          const { cluster: isCluster, point_count: pointCount } = cluster.properties;

          if (isCluster) {
            // Render Cluster Bubble
            const size = 34 + (pointCount / Math.max(points.length, 1)) * 36;
            return (
              <Marker
                key={`cluster-${cluster.id}`}
                longitude={longitude}
                latitude={latitude}
              >
                <div
                  className="bg-emerald-900/95 text-white rounded-full flex items-center justify-center font-black shadow-xl border-2 border-white cursor-pointer hover:bg-emerald-700 hover:scale-105 transition-all text-xs"
                  style={{ width: `${size}px`, height: `${size}px` }}
                  onClick={() => {
                    const expansionZoom = Math.min(
                      supercluster.getClusterExpansionZoom(cluster.id),
                      20
                    );
                    const map = mapRef.current?.getMap ? mapRef.current.getMap() : mapRef.current;
                    if (map?.flyTo) {
                      map.flyTo({
                        center: [longitude, latitude],
                        zoom: expansionZoom,
                      });
                    }
                  }}
                >
                  {pointCount}
                </div>
              </Marker>
            );
          }

          // Render Individual Property Pin
          const prop = cluster.properties as SearchResultItem;
          return (
            <Marker
              key={`prop-${prop.id}`}
              longitude={longitude}
              latitude={latitude}
            >
              <PropertyMarker
                property={prop}
                onClick={() => {
                  router.push(`/property/${prop.slug || prop.id}`);
                }}
              />
            </Marker>
          );
        })}
      </Map>
    </div>
  );
}

"use client";

import { useRef, useCallback, useMemo, useState } from "react";
import Map, { Marker, ViewStateChangeEvent } from "react-map-gl/mapbox";
import useSupercluster from "use-supercluster";
import { useRouter, useSearchParams } from "next/navigation";
import "mapbox-gl/dist/mapbox-gl.css";
import { SearchResultItem } from "@/modules/properties/services/PropertySearchService";
import { formatIndianPrice } from "@/components/Cards/PropertyCard";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// 1. DYNAMIC HTML MARKER COMPONENT
const PropertyMarker = ({
  property,
  onClick,
}: {
  property: SearchResultItem;
  onClick?: () => void;
}) => {
  const isGoldPin = property.isPrakritiCertified;
  const isLocked = property.lockStatus !== "AVAILABLE";
  const modeColor =
    property.type === "BUY"
      ? "bg-blue-600"
      : property.type === "RENT"
      ? "bg-emerald-600"
      : "bg-purple-600";

  return (
    <div
      onClick={onClick}
      className={`
      relative group cursor-pointer flex flex-col items-center justify-center
      ${isLocked ? "opacity-50 grayscale" : "hover:scale-110 transition-transform"}
    `}
    >
      {/* Tooltip on hover */}
      <div className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-gray-900/95 backdrop-blur-sm text-white text-xs px-2.5 py-1.5 rounded-lg shadow-xl z-50 pointer-events-none">
        <p className="font-semibold">{property.title}</p>
        <p className="text-[11px] text-gray-300">
          {formatIndianPrice(property.price)} • {property.type}
          {isLocked && " (Locked)"}
        </p>
      </div>

      {/* Main Marker Badge with Premium Gold Pin Overrides */}
      {isGoldPin ? (
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 px-3 py-1 rounded-full text-amber-950 font-extrabold text-xs shadow-lg bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 ring-2 ring-amber-200/90 border border-amber-100 animate-pulse">
            {/* Premium Gold Pin Crown / Star SVG */}
            <svg className="w-3.5 h-3.5 fill-amber-950" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span>{formatIndianPrice(property.price)}</span>
          </div>
          <div className="w-3 h-3 rotate-45 -mt-1.5 bg-gradient-to-br from-amber-400 to-amber-600 border-r border-b border-amber-300 shadow-sm" />
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div
            className={`flex items-center justify-center px-2.5 py-1 rounded-full text-white font-bold text-xs shadow-md border border-white/20 ${modeColor}`}
          >
            {formatIndianPrice(property.price)}
          </div>
          <div className={`w-2.5 h-2.5 rotate-45 -mt-1 ${modeColor}`} />
        </div>
      )}
    </div>
  );
};

// 2. MAIN MAP PROVIDER
export default function PropertyMap({
  initialProperties = [],
}: {
  initialProperties: SearchResultItem[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mapRef = useRef<any>(null);

  // Compute center from properties or fallback to Delhi [77.2090, 28.6139]
  const defaultLng = initialProperties.length > 0 ? initialProperties[0].lng : 77.209;
  const defaultLat = initialProperties.length > 0 ? initialProperties[0].lat : 28.6139;

  // Map state
  const [viewState, setViewState] = useState({
    longitude: defaultLng,
    latitude: defaultLat,
    zoom: 11,
  });

  // Convert properties to GeoJSON for Supercluster
  const points = useMemo(() => {
    return initialProperties
      .filter((p) => typeof p.lng === "number" && typeof p.lat === "number")
      .map((p) => ({
        type: "Feature" as const,
        properties: { cluster: false, propertyId: p.id, ...p },
        geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
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
    options: { radius: 75, maxZoom: 16 },
  });

  // Debounced URL Sync
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const onMoveEnd = useCallback(
    (e: ViewStateChangeEvent) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      debounceTimer.current = setTimeout(() => {
        const mapBounds = e.target.getBounds();
        const boundsString = `${mapBounds.getWest().toFixed(5)},${mapBounds.getSouth().toFixed(5)},${mapBounds.getEast().toFixed(5)},${mapBounds.getNorth().toFixed(5)}`;

        const currentParams = new URLSearchParams(searchParams.toString());
        currentParams.set("bounds", boundsString);

        // Shallow route push triggers Server Component re-fetch without losing client state
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
        onMoveEnd={onMoveEnd}
        maxZoom={20}
      >
        {clusters.map((cluster: any) => {
          const [longitude, latitude] = cluster.geometry.coordinates;
          const { cluster: isCluster, point_count: pointCount } = cluster.properties;

          if (isCluster) {
            // Render Cluster Ring
            const size = 32 + (pointCount / Math.max(points.length, 1)) * 36;
            return (
              <Marker
                key={`cluster-${cluster.id}`}
                longitude={longitude}
                latitude={latitude}
              >
                <div
                  className="bg-emerald-900/90 text-white rounded-full flex items-center justify-center font-bold shadow-lg border-2 border-white cursor-pointer hover:bg-emerald-700 transition"
                  style={{ width: `${size}px`, height: `${size}px` }}
                  onClick={() => {
                    const expansionZoom = Math.min(
                      supercluster.getClusterExpansionZoom(cluster.id),
                      20
                    );
                    setViewState({ ...viewState, longitude, latitude, zoom: expansionZoom });
                  }}
                >
                  {pointCount}
                </div>
              </Marker>
            );
          }

          // Render Individual Property
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

"use client";

import dynamic from "next/dynamic";
import React from "react";
import { PropertyCardData } from "./HomepagePropertyCard";

export const LazyInventoryCarousels = dynamic(
  () => import("./InventorySection"),
  {
    loading: () => (
      <div className="py-16 text-center text-slate-400 animate-pulse text-sm">
        Loading verified property streams...
      </div>
    ),
    ssr: true,
  }
);

export const LazyConsultantTrustBlock = dynamic(
  () => import("./ConsultantTrustBlock"),
  {
    loading: () => (
      <div className="py-20 bg-slate-900 text-center text-slate-500 animate-pulse text-sm">
        Loading engineering authority wing...
      </div>
    ),
    ssr: true,
  }
);

export const LazyMarketplaceFooter = dynamic(
  () => import("./MarketplaceFooter"),
  {
    loading: () => (
      <div className="py-12 bg-white text-center text-slate-400 text-xs">
        Loading platform legal anchors...
      </div>
    ),
    ssr: true,
  }
);

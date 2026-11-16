"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { LocationSelection } from "@/types";

interface HomeSearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedLocation: LocationSelection | null;
  setSelectedLocation: (location: LocationSelection | null) => void;
}

const HomeSearchContext = createContext<HomeSearchContextType | null>(null);

export function HomeSearchProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<LocationSelection | null>(null);

  return (
    <HomeSearchContext.Provider value={{ searchQuery, setSearchQuery, selectedLocation, setSelectedLocation }}>
      {children}
    </HomeSearchContext.Provider>
  );
}

export function useHomeSearch() {
  const ctx = useContext(HomeSearchContext);
  if (!ctx) throw new Error("useHomeSearch must be used within HomeSearchProvider");
  return ctx;
}

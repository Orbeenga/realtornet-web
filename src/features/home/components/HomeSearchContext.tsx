"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface HomeSearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedLocationId: number | undefined;
  setSelectedLocationId: (id: number | undefined) => void;
}

const HomeSearchContext = createContext<HomeSearchContextType | null>(null);

export function HomeSearchProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState<number | undefined>();

  return (
    <HomeSearchContext.Provider value={{ searchQuery, setSearchQuery, selectedLocationId, setSelectedLocationId }}>
      {children}
    </HomeSearchContext.Provider>
  );
}

export function useHomeSearch() {
  const ctx = useContext(HomeSearchContext);
  if (!ctx) throw new Error("useHomeSearch must be used within HomeSearchProvider");
  return ctx;
}

import { create } from 'zustand'

export interface WorkbenchState {
  isSidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void

  splitPaneRatio: number
  setSplitPaneRatio: (ratio: number) => void

  activeSqlInspectorTab: 'sql' | 'table' | 'chart'
  setActiveSqlInspectorTab: (tab: 'sql' | 'table' | 'chart') => void

  isCommandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void
  toggleCommandPalette: () => void

  selectedDeviceId: number | null
  setSelectedDeviceId: (id: number | null) => void

  activeAnomalyFilter: 'all' | 'critical' | 'high' | 'medium' | 'low'
  setActiveAnomalyFilter: (filter: 'all' | 'critical' | 'high' | 'medium' | 'low') => void
}

export const useWorkbenchStore = create<WorkbenchState>((set) => ({
  isSidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),

  splitPaneRatio: 45, // 45% left (prompt stream), 55% right (inspector)
  setSplitPaneRatio: (ratio) => set({ splitPaneRatio: Math.max(25, Math.min(75, ratio)) }),

  activeSqlInspectorTab: 'sql',
  setActiveSqlInspectorTab: (tab) => set({ activeSqlInspectorTab: tab }),

  isCommandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  toggleCommandPalette: () => set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),

  selectedDeviceId: null,
  setSelectedDeviceId: (id) => set({ selectedDeviceId: id }),

  activeAnomalyFilter: 'all',
  setActiveAnomalyFilter: (filter) => set({ activeAnomalyFilter: filter }),
}))

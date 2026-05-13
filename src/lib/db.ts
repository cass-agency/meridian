/**
 * LocalStorage persistence layer with SQLite-compatible interface.
 * In production Tauri mode, this would be replaced with tauri-plugin-sql calls.
 */

import type { Dashboard, Entry, TrackedToken } from '../store'

const KEYS = {
  DASHBOARDS: 'meridian_dashboards',
  TOKENS: 'meridian_tokens',
  ENTRIES_PREFIX: 'meridian_entries_',
} as const

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error('[db] write error', e)
  }
}

export const db = {
  // Dashboards
  getDashboards(): Dashboard[] {
    return readJson<Dashboard[]>(KEYS.DASHBOARDS, [])
  },

  saveDashboard(dashboard: Dashboard): void {
    const existing = this.getDashboards()
    const idx = existing.findIndex((d) => d.id === dashboard.id)
    if (idx >= 0) {
      existing[idx] = { ...dashboard, entries: [] } // entries stored separately
    } else {
      existing.push({ ...dashboard, entries: [] })
    }
    writeJson(KEYS.DASHBOARDS, existing)
  },

  deleteDashboard(id: string): void {
    const existing = this.getDashboards().filter((d) => d.id !== id)
    writeJson(KEYS.DASHBOARDS, existing)
    localStorage.removeItem(KEYS.ENTRIES_PREFIX + id)
  },

  // Entries
  getEntries(dashboardId: string): Entry[] {
    return readJson<Entry[]>(KEYS.ENTRIES_PREFIX + dashboardId, [])
  },

  saveEntry(dashboardId: string, entry: Entry): void {
    const existing = this.getEntries(dashboardId)
    existing.push(entry)
    writeJson(KEYS.ENTRIES_PREFIX + dashboardId, existing)
  },

  // Tokens
  getTokens(): TrackedToken[] {
    return readJson<TrackedToken[]>(KEYS.TOKENS, [])
  },

  saveToken(token: TrackedToken): void {
    const existing = this.getTokens()
    const idx = existing.findIndex((t) => t.id === token.id)
    if (idx >= 0) {
      existing[idx] = token
    } else {
      existing.push(token)
    }
    writeJson(KEYS.TOKENS, existing)
  },

  deleteToken(id: string): void {
    const existing = this.getTokens().filter((t) => t.id !== id)
    writeJson(KEYS.TOKENS, existing)
  },

  // Utility: export all data (for debugging / migration)
  exportAll() {
    return {
      dashboards: this.getDashboards(),
      tokens: this.getTokens(),
    }
  },
}

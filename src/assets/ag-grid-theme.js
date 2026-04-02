import { themeQuartz } from 'ag-grid-community'

export const agGridTheme = themeQuartz.withParams({
  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  fontSize: 13,
  backgroundColor: 'var(--p-surface-card)',
  foregroundColor: 'var(--p-text-color)',
  borderColor: 'var(--p-surface-border)',
  headerBackgroundColor: 'var(--p-surface-ground)',
  headerTextColor: 'var(--p-text-color)',
  oddRowBackgroundColor: 'transparent',
  accentColor: 'var(--p-primary-500)',
  rowHoverColor: 'var(--p-surface-hover)',
}, 'light')
.withParams({
  backgroundColor: 'var(--p-surface-card)',
  foregroundColor: 'var(--p-text-color)',
  borderColor: 'var(--p-surface-border)',
  headerBackgroundColor: 'var(--p-surface-ground)',
  oddRowBackgroundColor: 'transparent',
  accentColor: 'var(--p-primary-400)',
  rowHoverColor: 'var(--p-surface-hover)',
}, 'dark')

export function applyTheme(theme) {
  if (!theme) return;
  const root = document.documentElement;
  root.style.setProperty('--color-primary', theme.primary);
  root.style.setProperty('--color-secondary', theme.secondary);
  root.style.setProperty('--color-accent', theme.accent);
  root.style.setProperty('--color-background', theme.background);
  root.style.setProperty('--color-surface', theme.surface);
  root.style.setProperty('--color-text', theme.text);
  root.style.setProperty('--color-border', theme.border);
  root.style.setProperty('--font-family', theme.font);
  root.style.setProperty('--spacing-base', theme.spacing);
  root.style.setProperty('--border-radius', theme.borderRadius);
}

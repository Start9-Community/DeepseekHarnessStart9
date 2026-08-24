import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.0.5:0',
  releaseNotes: {
    en_US:
      'Fixed "Failed to load history" for older sessions: the web UI now migrates sessions stored under previous workspace roots into the current one at startup.',
    es_ES:
      'Corregido «Failed to load history» en sesiones antiguas: la interfaz migra al arranque las sesiones guardadas bajo raíces de workspace anteriores.',
    de_DE:
      '„Failed to load history" für ältere Sitzungen behoben: Die Weboberfläche migriert beim Start Sitzungen aus früheren Workspace-Roots.',
    pl_PL:
      'Naprawiono „Failed to load history" dla starszych sesji: interfejs przy starcie migruje sesje z poprzednich katalogów roboczych.',
    fr_FR:
      'Correction de « Failed to load history » pour les anciennes sessions : l’interface migre au démarrage les sessions issues d’espaces de travail antérieurs.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})

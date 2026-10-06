import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.0.5.2:1',
  releaseNotes: {
    en_US: `StartOS package improvements; no change to DeepSeek Harness.`,
    es_ES: `Mejoras en el paquete de StartOS; sin cambios en DeepSeek Harness.`,
    de_DE: `Verbesserungen am StartOS-Paket; keine Änderungen an DeepSeek Harness.`,
    pl_PL: `Ulepszenia pakietu StartOS; bez zmian w DeepSeek Harness.`,
    fr_FR: `Améliorations du paquet StartOS ; aucun changement pour DeepSeek Harness.`,
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})

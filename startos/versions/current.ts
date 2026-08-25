import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.0.5.1:0',
  releaseNotes: {
    en_US:
      'Fixed web UI crash loop: session artifacts left flat by the 0.0.5 migration are now healed into the proper per-session layout at startup.',
    es_ES:
      'Corregido el bucle de fallos de la interfaz web: los artefactos de sesión planos de la migración 0.0.5 ahora se reparan al arrancar con la estructura correcta por sesión.',
    de_DE:
      'Absturzschleife der Weboberfläche behoben: Flache Sitzungsartefakte aus der 0.0.5-Migration werden beim Start in das richtige Sitzungslayout überführt.',
    pl_PL:
      'Naprawiono pętlę awarii interfejsu WWW: płaskie artefakty sesji z migracji 0.0.5 są teraz naprawiane przy starcie do właściwego układu.',
    fr_FR:
      'Boucle de crash de l’interface web corrigée : les artefacts de session plats issus de la migration 0.0.5 sont réparés au démarrage dans le bon layout.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})

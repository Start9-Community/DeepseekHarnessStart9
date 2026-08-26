import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.0.5.2:0',
  releaseNotes: {
    en_US:
      'Web UI crash loop fixed for good: sessions are now realigned to the group and id their own header declares (undoing the previous migrations that caused "corrupt session log" boot failures).',
    es_ES:
      'Bucle de fallos de la interfaz web corregido definitivamente: las sesiones se realinean al grupo e id que declara su propia cabecera (deshaciendo las migraciones previas que causaban errores de arranque "corrupt session log").',
    de_DE:
      'Absturzschleife der Weboberfläche endgültig behoben: Sitzungen werden jetzt anhand ihrer eigenen Kopfzeile der richtigen Gruppe und ID zugeordnet (macht die früheren Migrationen rückgängig, die „corrupt session log"-Bootfehler verursachten).',
    pl_PL:
      'Pętla awarii interfejsu WWW naprawiona na dobre: sesje są teraz wyrównywane do grupy i identyfikatora zadeklarowanych w ich własnym nagłówku (cofa wcześniejsze migracje powodujące błędy „corrupt session log").',
    fr_FR:
      'Boucle de crash de l’interface web corrigée pour de bon : les sessions sont désormais réalignées sur le groupe et l’id déclarés dans leur propre en-tête (annulant les migrations précédentes qui causaient les erreurs de démarrage « corrupt session log »).',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})

import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.2.2-rc.1:0',
  releaseNotes: {
    en_US:
      'Updates DeepSeek Harness to 0.2.2-rc.1. Phones and tablets are much better supported, chat text can be quoted into the input box, conversations can be copied as Markdown, and file previews gain a folder tree. The interface also adds Japanese, Spanish, French, German, Russian and Brazilian Portuguese. Requires StartOS 0.4.1 or later. Session logs are no longer uploaded to DeepSeek unless you turn this on in Settings.',
    es_ES:
      'Actualiza DeepSeek Harness a 0.2.2-rc.1. Mejora mucho el soporte para móviles y tabletas, el texto del chat se puede citar en el cuadro de entrada, las conversaciones se pueden copiar como Markdown y la vista previa de archivos incorpora un árbol de carpetas. La interfaz añade además japonés, español, francés, alemán, ruso y portugués de Brasil. Requiere StartOS 0.4.1 o posterior. Los registros de sesión ya no se envían a DeepSeek a menos que lo actives en Ajustes.',
    de_DE:
      'Aktualisiert DeepSeek Harness auf 0.2.2-rc.1. Smartphones und Tablets werden deutlich besser unterstützt, Chat-Text lässt sich als Zitat ins Eingabefeld übernehmen, Unterhaltungen lassen sich als Markdown kopieren, und die Dateivorschau erhält einen Ordnerbaum. Die Oberfläche ist außerdem auf Japanisch, Spanisch, Französisch, Deutsch, Russisch und brasilianischem Portugiesisch verfügbar. Erfordert StartOS 0.4.1 oder neuer. Sitzungsprotokolle werden nicht mehr an DeepSeek hochgeladen, es sei denn, du aktivierst dies in den Einstellungen.',
    pl_PL:
      'Aktualizuje DeepSeek Harness do wersji 0.2.2-rc.1. Znacznie lepsza obsługa telefonów i tabletów, tekst z czatu można cytować w polu wprowadzania, rozmowy można kopiować jako Markdown, a podgląd plików zyskuje drzewo folderów. Interfejs jest teraz dostępny także po japońsku, hiszpańsku, francusku, niemiecku, rosyjsku i w brazylijskiej odmianie portugalskiego. Wymaga StartOS 0.4.1 lub nowszego. Logi sesji nie są już przesyłane do DeepSeek, chyba że włączysz to w Ustawieniach.',
    fr_FR:
      "Met à jour DeepSeek Harness vers 0.2.2-rc.1. Les téléphones et tablettes sont bien mieux pris en charge, le texte du chat peut être cité dans la zone de saisie, les conversations peuvent être copiées en Markdown et l'aperçu des fichiers gagne une arborescence de dossiers. L'interface ajoute aussi le japonais, l'espagnol, le français, l'allemand, le russe et le portugais du Brésil. Nécessite StartOS 0.4.1 ou ultérieur. Les journaux de session ne sont plus envoyés à DeepSeek, sauf si vous activez cette option dans les Paramètres.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})

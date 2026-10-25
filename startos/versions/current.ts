import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.2.1-rc.3:0',
  releaseNotes: {
    en_US:
      "Updates DeepSeek Harness to 0.2.1-rc.3. Plugins can now be browsed, created and installed from the web interface, a model's reasoning level is set per model in Settings → Models, keys and tokens in messages are masked, and long conversations can be compacted with /compact. The agent can read and switch its working directory and reads AGENTS.md from a shared agents directory, and DeepSeek V4.1-Flash with the DeepSeek Search and Fetch APIs is supported.",
    es_ES:
      'Actualiza DeepSeek Harness a 0.2.1-rc.3. Ahora se pueden explorar, crear e instalar plugins desde la interfaz web, el nivel de razonamiento se configura por modelo en Settings → Models, las claves y los tokens de los mensajes se ocultan y las conversaciones largas se pueden compactar con /compact. El agente puede leer y cambiar su directorio de trabajo y lee AGENTS.md desde un directorio compartido de agentes, y se admite DeepSeek V4.1-Flash con las API de búsqueda y descarga de DeepSeek.',
    de_DE:
      'Aktualisiert DeepSeek Harness auf 0.2.1-rc.3. Plugins lassen sich jetzt in der Weboberfläche durchsuchen, erstellen und installieren, die Denkstufe wird pro Modell unter Settings → Models festgelegt, Schlüssel und Tokens in Nachrichten werden maskiert, und lange Unterhaltungen lassen sich mit /compact verdichten. Der Agent kann sein Arbeitsverzeichnis lesen und wechseln und liest AGENTS.md aus einem gemeinsamen Agenten-Verzeichnis; DeepSeek V4.1-Flash mit den Such- und Abruf-APIs von DeepSeek wird unterstützt.',
    pl_PL:
      'Aktualizuje DeepSeek Harness do wersji 0.2.1-rc.3. Wtyczki można teraz przeglądać, tworzyć i instalować z interfejsu WWW, poziom rozumowania ustawia się dla każdego modelu w Settings → Models, klucze i tokeny w wiadomościach są maskowane, a długie rozmowy można kompaktować poleceniem /compact. Agent może odczytać i zmienić swój katalog roboczy oraz czyta AGENTS.md ze wspólnego katalogu agentów; obsługiwany jest DeepSeek V4.1-Flash wraz z API wyszukiwania i pobierania DeepSeek.',
    fr_FR:
      'Met à jour DeepSeek Harness vers 0.2.1-rc.3. Les plugins peuvent désormais être parcourus, créés et installés depuis l’interface web, le niveau de raisonnement se règle par modèle dans Settings → Models, les clés et jetons des messages sont masqués, et les longues conversations peuvent être compactées avec /compact. L’agent peut lire et changer son répertoire de travail et lit AGENTS.md depuis un répertoire d’agents partagé ; DeepSeek V4.1-Flash et les API de recherche et de récupération de DeepSeek sont pris en charge.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})

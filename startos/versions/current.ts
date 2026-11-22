import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.2.2-rc.5:0',
  releaseNotes: {
    en_US:
      'Updates DeepSeek Harness to 0.2.2-rc.5. Better handling of unexpected model responses. Web search on DeepSeek models now uses DeepSeek server-side search with no per-search charge; other models keep using the DeepSeek Search API. Full release notes: https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.2-rc.5',
    es_ES:
      'Actualiza DeepSeek Harness a 0.2.2-rc.5. Mejor manejo de respuestas inesperadas del modelo. La búsqueda web en modelos de DeepSeek ahora usa la búsqueda del lado del servidor de DeepSeek, sin cargo por búsqueda; los demás modelos siguen usando la API de búsqueda de DeepSeek. Notas de versión completas: https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.2-rc.5',
    de_DE:
      'Aktualisiert DeepSeek Harness auf 0.2.2-rc.5. Besserer Umgang mit unerwarteten Modellantworten. Die Websuche bei DeepSeek-Modellen nutzt jetzt die serverseitige Suche von DeepSeek ohne Gebühr pro Suche; andere Modelle verwenden weiterhin die DeepSeek-Such-API. Vollständige Versionshinweise: https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.2-rc.5',
    pl_PL:
      'Aktualizuje DeepSeek Harness do wersji 0.2.2-rc.5. Lepsza obsługa nieoczekiwanych odpowiedzi modelu. Wyszukiwanie w sieci w modelach DeepSeek korzysta teraz z wyszukiwania po stronie serwera DeepSeek, bez opłaty za pojedyncze wyszukiwanie; inne modele nadal korzystają z API wyszukiwania DeepSeek. Pełne informacje o wydaniu: https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.2-rc.5',
    fr_FR:
      'Met à jour DeepSeek Harness vers 0.2.2-rc.5. Meilleure gestion des réponses inattendues du modèle. La recherche web sur les modèles DeepSeek utilise désormais la recherche côté serveur de DeepSeek, sans frais par recherche ; les autres modèles continuent d’utiliser l’API de recherche DeepSeek. Notes de version complètes: https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.2-rc.5',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})

# Optional local knowledge

A fresh install includes the bundled encounter catalog and curated guidance. Optional imported game-data catalogs and map images are not included in source or installer. Imported data can have incomplete coverage; record counts and save flags are not proof of every obtainable item or dialogue state.

## Import format

Use **Import game-data index** with a compatible, lawfully obtained JSON catalog:

```json
{
  "schemaVersion": 1,
  "source": "generator name and revision",
  "gameVersion": "input game version",
  "generatedAt": "2026-09-30T00:00:00Z",
  "records": [{"id":"example-id", "title":"Example item", "type":"pickup", "region":"Example region", "location":"Example place", "description":"Example clue", "tags":[], "rewards":[]}]
}
```

Catalogs are validated before import. Optional event IDs can provide save evidence; unknown flags remain unconfirmed. Show All reveals otherwise hidden imported records. Imported content is not automatically authoritative.

## Generation and updates

**Generate from installed game** needs separately installed extraction tools and machine-specific configuration. Neither is distributed here. Without configuration, the app reports that local extraction tools are not configured and suggests importing a generated catalog. Existing imported data and the bundled catalog remain usable.

Do not redistribute game assets or external extractor code without appropriate permission. No extracted maps, videos or external extraction tools are release assets.

**Update Knowledge** is separate: it checks the configured trusted encounter source, validates the response, retains a previous valid cache and falls back to bundled data offline. It does not upload player saves.

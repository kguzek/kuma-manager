# Kuma Manager

Kuma Manager is a Vite + React control plane for managing multiple Uptime Kuma instances from one dashboard.

It is designed for setups where each Kuma instance keeps its own uptime history, but monitor configuration should stay synchronized across instances.

## How It Works

- You add one or more Uptime Kuma instance URLs.
- Kuma Manager logs in to every configured instance through Uptime Kuma's internal Socket.io API.
- A monitor opts into synchronization only when it has a tag starting with `monitor:`.
- The tag suffix is the stable cross-instance identity. For example, `/monitors/example.com` maps to `monitor:example.com`.
- Runtime data is intentionally ignored: heartbeat history, current status, ping, certificate runtime data, and instance-local monitor IDs are not synced.
- The diff dashboard compares tagged monitors across all connected instances and shows which settings differ.
- Monitor detail pages let you edit shared settings and apply them to every instance that has the same sync tag.

## Why Tags

Uptime Kuma monitor IDs are instance-local. They can diverge as soon as monitors are created, deleted, or restored independently. Tags provide a stable identity that survives differing numeric IDs.

Only `monitor:` tags are treated as sync metadata. All other Kuma tags remain normal user tags.

## Tech Stack

- Vite
- React
- TypeScript
- Tailwind CSS v4
- Shadcn UI primitives
- React Hook Form
- Socket.io client
- Lucide icons

## Architecture

- `src/api/kuma/client.ts` wraps all Uptime Kuma API calls.
- `src/types/` contains exported TypeScript types.
- `src/features/` contains product features such as auth, dashboard, and monitor editing.
- `src/components/` contains shared layout and UI components.
- `src/utils/` contains browser storage helpers.

## Development

Install dependencies:

```sh
pnpm install
```

Run locally:

```sh
pnpm dev
```

Build:

```sh
pnpm build
```

## Limitations

Uptime Kuma's admin API is internal and may change between Kuma releases. Kuma Manager isolates those calls behind `src/api/kuma/client.ts` so future API changes can be handled in one place.

Because the current app connects from the browser directly to each Kuma instance, CORS and reverse proxy Socket.io settings must allow those connections. A backend proxy would avoid browser CORS entirely.

## License

MIT

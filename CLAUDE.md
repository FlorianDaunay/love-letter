# Love Letter

Web version of Love Letter (2019 edition: 21 cards, values 0-9, 2-6 players). Static site (GitHub Pages), P2P multiplayer via PeerJS, solo vs bots offline. FR/EN.

## Skills
- `.claude/skills/SKILL-p2p-static-game.md`: architecture, network model, host migration, persistence. Follow it.
- `.claude/skills/SKILL-theme-system.md`: themes live in `src/themes/` (moved from root). UI colours only via tokens.

## Commands
`npm run dev` · `npm test` (vitest, engine) · `npm run build` (tsc + vite) · `npm run typecheck`

## Layout
- `src/core/game/`: pure engine. `applyAction(state, actorId, action, now)` is the only entry point; seeded RNG in state; `events[]` (with `seq`) drive animations/sounds; `knowledge` = what Priest/Baron/King revealed; `bot.ts` = AI (uses only seat-visible info).
- `src/net/`: `session.ts` (host/client, heartbeat, epoch migration, bots and autopilot run on host), `protocol.ts` (bump `PROTOCOL_VERSION` on incompatible change).
- `src/store/`: profile (playerId in sessionStorage = one player per tab), saves (autosave per game), session.
- `src/features/`: home, room (lobby + join), game (table, event stage, modals), rules, saves, settings.
- `src/ui/CardArt.tsx`: all card art is hand-written SVG; fixed illustration palette in `src/ui/palette.ts`.
- `src/audio/sound.ts`: all sounds synthesized with WebAudio (no assets).
- `src/i18n/`: `fr.ts` is the key source; `en.ts` must match (typed).

## Rules of thumb
- No emoji anywhere: icons are lucide-react or custom SVG.
- Full snapshots are broadcast (hands included): fine for friends, not cheat-proof.
- Versioning: semver in `package.json`, `CHANGELOG.md`, git tag `vX.Y.Z`.
- Do not install dependencies or run browsers for testing without asking the user.

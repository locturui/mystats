# mystats

Self-hosted Spotify stats dashboard. Upload your extended streaming history and get top artists, tracks, albums, and listening charts — filtered by any time period.

## what it does

- upload your Spotify data export (the extended streaming history JSON files)
- see your top artists, tracks, and albums with period filtering (7d, 30d, 3m, etc. or a custom date range)
- charts for listening habits by hour, day of week, platform, and a full-year heatmap
- images pulled from Deezer, cached in the database
- works with Cyrillic, Korean, and other non-Latin scripts

## stack

Next.js · Prisma · PostgreSQL · Tailwind

## setup

You need a PostgreSQL database. [Neon](https://neon.tech) has a free tier that works well.

```bash
cp .env.example .env
# fill in DATABASE_URL, DATABASE_URL_UNPOOLED, JWT_SECRET
pnpm install
pnpm prisma db push
pnpm dev
```

## getting your Spotify data

In Spotify: Settings → Privacy → Download your data → request "Extended streaming history". Takes a few days to arrive. You'll get a zip with files named `Streaming_History_Audio_*.json` — upload those on the `/upload` page.

# elgato-solana-campaign

Static campaign landing page prototype for the Superteam Brasil push into the Colosseum Global Hackathon 2026.

## Files

- `assets/`: local SVG assets used by the prototype
- `api/register.js`: serverless endpoint that stores submissions in Neon Postgres
- `index.html`: full landing page markup with the Portuguese campaign copy
- `styles.css`: Superteam Brasil-inspired visual system and responsive layout
- `script.js`: three-step modal flow and local submission storage
- `supabase/schema.sql`: Postgres schema for the submissions table

## Run locally

Because this is a static build, you can open `index.html` directly or serve the folder with a simple local server.

Example:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

If you want to test the serverless endpoint locally too, install dependencies first:

```bash
npm install
```

## Current behavior

- Step 1 captures lead information for the campaign
- Step 2 opens Colosseum, waits 10 seconds, then asks for the user's Colosseum handle
- Step 3 sends the user to Discord, confirms they joined, and submits the final data to the backend
- The modal draft and current step are persisted in `localStorage` under `elgato-solana-campaign-draft`
- Final submissions are stored in `localStorage` under `elgato-solana-campaign-submissions`

## Database setup

1. Create a Neon Postgres project.
2. Run the SQL in `supabase/schema.sql` against your Neon database.
3. Copy `.env.example` to `.env` or your hosting environment and fill:

```bash
DATABASE_URL=...
```

4. Deploy with support for the `api/` route.

The frontend posts to `/api/register`, and that endpoint inserts directly into `public.hackathon_signups` over the Neon serverless Postgres driver.

## Next improvements

- Replace placeholder social and Discord links with the final campaign destinations

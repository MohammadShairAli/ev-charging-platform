# EV Charging Pakistan

A Next.js app for finding charging stations and planning EV trips across Pakistan.

## Getting started

Copy `.env.example` to `.env`, add the required values, then run:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Google Maps setup

Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env`. In the Google Cloud project for that key:

1. Enable billing.
2. Enable **Maps JavaScript API**, **Routes API**, and **Places API (New)**.
3. Set the key's application restriction to **Websites**.
4. Add `http://localhost:3000/*` for local development and your deployed origin, such as `https://example.com/*`.
5. Limit the key's API restrictions to the three APIs above.

Restart `npm run dev` after changing `.env`. `NEXT_PUBLIC_` values are embedded in the browser bundle when Next.js builds the app.

## Demo route fallback

If Google routing is unavailable, the trip planner can still demonstrate **Lahore to Islamabad** and **Islamabad to Lahore** with a 300 km vehicle range and sample M-2 charging stops. The user's starting charge determines the first reachable stop, and each leg targets at least 15% battery on arrival. Demo distances and chargers are clearly labelled and must be verified before real travel.

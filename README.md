# Dancescapes — Portal (Local Web Setup)

Quick instructions to run this static portal locally.

Prerequisites
- Node.js and npm (optional for `npx` commands)
- Or Python 3 (for simple HTTP server)

Local serve options

- Using `npx http-server` (works without installing global deps):

```bash
npm run start
# then open http://localhost:8080/portal.html
```

- Using `live-server` via `npx` (auto-opens the page):

```bash
npm run dev
```

- Using Python (if you don't want Node):

```bash
npm run serve-python
# then open http://localhost:8000/portal.html
```

Notes
- The main file is portal.html — edit it and refresh the browser.
- Data is stored in your browser's localStorage; no backend required.
# Dancescapes Performing Arts Client Portal

**Client:** Dancescapes Performing Arts
**Status:** Active (Test Client)
**Entry Point:** `portal.html`

## Client Information
- **Business Name:** Dancescapes Performing Arts
- **Metricool Blog ID:** 6035446
- **Metricool User ID:** 4660143
- **Platform Integration:** Instagram, TikTok, Facebook

## Structure
```
02-dancescapes/
├── portal.html (client-specific portal)
├── metrics.json (historical metrics data)
├── config.md (client configuration)
└── assets/ (client-specific branding, if any)
```

## Files
- **portal.html:** Dancescapes branded portal interface
- **metrics.json:** Sample metrics data for testing/reference
- **config.md:** Client-specific API references and configurations

## Purpose
This folder contains the dedicated client portal for Dancescapes Performing Arts. It includes:
- Custom branding (if applicable)
- Client-specific metrics
- Historical data for testing

## Integration
- Connected to: Zite database (linked client record)
- Metrics from: Metricool API
- Notifications via: Resend email service

---

**Last Updated:** March 31, 2026

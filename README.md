# Perdisco Admin

Internal editorial and content-operations web platform for Perdisco,
built from `Elabora_Admin_Web_Platform_PRD_v1` (Elabora was the PRD's working
name; the product is now Perdisco). A standalone TypeScript web app
(per PRD §17.1) that shares the consumer app's design language and content model:
the composer's phone preview reuses the exact summary/elaboration layouts, colors,
and type ramp from the React Native app in the repo root.

## Run

```bash
npm install
npm run dev
```

Opens on http://localhost:5175. All data is seeded in-memory (`src/data.ts`) — no
backend yet; mutations (statement editing, gate approvals, releases, moderation,
market resolution) update client state so every workflow is walkable end to end.

## Map to the PRD

| Destination | PRD sections |
| --- | --- |
| Home — work queue, alerts, activity | 6.1 |
| Projects — lifecycle/format filters, risk pills | 5, 6.2 |
| Project → Composer + phone preview | 8, 9, 11.1 |
| Project → Intake & rights / Processing | 7, 14 |
| Project → Review gates / Activities | 10, 11.2–11.3 |
| Review — gate queues, findings | 11 |
| Publishing — releases, retry, rollback, corrections | 11.4, 12 |
| Community — moderation cases | 13.1–13.2 |
| Markets — protected resolution flow | 10.4–10.5, 13.3 |
| Assets — media, transcripts, rights evidence | 7.3 |
| Administration — people, orgs, taxonomies, flags, audit | 15, 16 |

# youngwoong-cho.github.io

Personal research portfolio of Youngwoong Cho (robot learning, dexterous manipulation).

- Next.js 15 (pages router) with static export, deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`.
- Content lives in `lib/site.ts` (profile, experience) and `lib/projects.ts` (project pages).
- The interactive 7-hand viewer is `components/hands/HandsInterface.tsx`; hand models and their licenses are in `public/hands/` (see `public/hands/CREDITS.json`). `scripts/hands/prepare.py` regenerates them.
- Videos and figures are in `public/media/`; the scripts that produced them are in `scripts/media/` and `scripts/figures/` (the figure source data and notes are kept local, not in this repo).

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static site in ./out
```

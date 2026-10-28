# Integrated Angular Upgrade Plan — Official Docs + Existing Plan

Source docs: https://angular.dev/update-guide (live, v22.2 confirmed)
Existing plan: UPGRADE_PLAN.md (branch feature/angular-upgrade-18-to-22)

## Status today
- Branch: feature/angular-upgrade-18-to-22
- Dependencies already bumped to Angular ^22.2.3, TypeScript ^6.0.3, CLI ^22.2.3
- tsconfig updated: moduleResolution=bundler, strictTemplates=false
- src/app/app.module.ts updated with standalone/imports fixes + schemas (uncommitted)
- Uncommitted: package.json, package-lock.json, tsconfig.json, app.module.ts
- Build errors remain at component level: toolbar/volume/slider/toggle (Material/jqwidgets imports)

## Official doc recommended process (angular.dev/update-guide)
1. ng update @angular/cli@22 @angular/core@22  (or use update guide wizard)
2. Update TypeScript to compatible version (^6.0 for v22)
3. Update moduleResolution to bundler (done)
4. Migrate to standalone where needed / fix NG6008
5. Fix component-level template/import errors
6. Build, test, verify backend/proxy

## Integrated step-by-step plan
Step 1. Commit/stage current changes (or restore if testing needed)
Step 2. Verify cli: npx @angular/cli@22 version
Step 3. Resolve remaining component imports (toolbar, volume, slider, toggle) — add Material modules / jqwidgets-ng to @Component.imports
Step 4. Build: npm run build (fix any new 22 compiler errors)
Step 5. Start backend (PORT=4000) and frontend (npm start)
Step 6. Verify proxy (src/proxy.conf.json -> localhost:4000/4001)
Step 7. Final commit / merge to main

Note: Latest stable = Angular 22.2. Do NOT jump to v23/next until docs confirm stable.

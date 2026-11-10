# GitHub Pages Deployment Fix for Monthly Expense Tracker

A targeted resolution to fix the blank white screen and `Failed to load module script / Unexpected token or tsx error` when deploying to GitHub Pages.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Root Cause Identified**: You are deploying by pushing raw source code directly to `main` with GitHub Pages pointing to the `main` branch root. GitHub Pages is serving raw uncompiled TypeScript (`/src/main.tsx`), which web browsers cannot execute natively.
>
> **Confirmed Choices from Phase 1**:
> - **Deployment Method**: Pushing source code to repository and enabling GitHub Pages on `main` branch.
> - **Console Error**: `Failed to load module script / Unexpected token or tsx error` in `main.tsx`.
>
> **Recommended Solution**: Add an automated GitHub Actions workflow (`.github/workflows/deploy.yml`) to build the project automatically on push and deploy the compiled `dist/` bundle to GitHub Pages.

---

### 1. Overview & Core Concept

- **The Problem**: GitHub Pages acts as a static web server. It cannot compile TypeScript JSX (`.tsx`) files on the fly. When set to deploy from the `main` branch root, it serves unbuilt source files, causing browser syntax errors and a blank screen.
- **The Solution**: Automate the build pipeline using the official GitHub Pages deployment action. When you push to `main`, GitHub will automatically run `npm ci` and `npm run build`, and deploy the production-ready static assets from `dist/` with relative asset linking.

---

### 2. User Experience & Deployment Flow

```
┌─────────────────┐        ┌──────────────────┐        ┌─────────────────────┐
│  git push main  │ ────>  │  GitHub Actions  │ ────>  │    GitHub Pages     │
│  (Source Code)  │        │ npm run build    │        │ Serves built dist/  │
└─────────────────┘        └──────────────────┘        └─────────────────────┘
                                                              │
                                                              ▼
                                                   ┌─────────────────────┐
                                                   │ Clean React App     │
                                                   │ No TypeScript error │
                                                   └─────────────────────┘
```

1. **Workflow Automation**:
   - Push your code to GitHub as normal.
   - GitHub Actions automatically picks up the push, builds the Vite production bundle, and publishes the site.
2. **Settings Change in GitHub**:
   - In your GitHub Repository: Go to **Settings** → **Pages** → **Build and deployment**.
   - Under **Source**, switch from `"Deploy from a branch"` to **`"GitHub Actions"`**.
   - Your site will deploy live at `https://<username>.github.io/<repository-name>/` without any blank pages.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Automated GitHub Actions vs. Manual `gh-pages` Branch**
  - *Chosen Approach*: Official GitHub Actions workflow (`actions/deploy-pages` and `actions/upload-pages-artifact`).
  - *Why*: Zero manual builds needed on your local computer; you simply push your changes to GitHub, and the site updates automatically.
  - *Alternative Considered*: Local `npm run deploy` via `gh-pages` package. We will also include this script in `package.json` as a backup option if you prefer manual local deployment.

- **Decision 2: Base URL Configuration (`vite.config.ts`)**
  - *Chosen Approach*: `base: './'` (already configured).
  - *Why*: Generates relative asset paths (`./assets/...`), allowing the bundle to work seamlessly regardless of whether the repository is at a subpath (`/<repo-name>/`) or root domain.

- **Decision 3: Firebase Auth Authorized Domains**
  - *Requirement*: For Google Sign-In to function on GitHub Pages, `<username>.github.io` must be whitelisted in the Firebase Console. We will provide simple instructions for this step.

---

### 4. Technical Architecture & Data Strategy

```
┌───────────────────────────────────────────────────────────────┐
│                     GitHub Repository                         │
│                                                               │
│   .github/workflows/deploy.yml                                │
│   ├── 1. actions/checkout@v4                                  │
│   ├── 2. actions/setup-node@v4 (Node 20)                      │
│   ├── 3. npm ci                                               │
│   ├── 4. npm run build  ──> produces dist/ (relative paths)   │
│   ├── 5. actions/upload-pages-artifact@v3 (path: ./dist)      │
│   └── 6. actions/deploy-pages@v4                              │
│                                                               │
│   package.json                                                │
│   └── "predeploy": "npm run build"                            │
│   └── "deploy": "gh-pages -d dist" (optional local fallback)  │
└───────────────────────────────────────────────────────────────┘
```

#### Proposed Changes:
1. **Create `.github/workflows/deploy.yml`**:
   - Configures the standard, secure GitHub Pages deployment workflow with appropriate `pages: write` and `id-token: write` permissions.
2. **Update `package.json`**:
   - Add `"predeploy": "npm run build"` and `"deploy": "gh-pages -d dist"` scripts so both CI/CD and manual options work out of the box.
3. **Verify Build**:
   - Ensure `npm run build` succeeds cleanly with all dependencies and relative paths.

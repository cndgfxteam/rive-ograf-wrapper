# rive-ograf-wrapper

Web app written in [Svelte](https://svelte.dev/) that parses a [Rive](https://rive.app/) (`.riv`) file and creates an [OGraf Graphic](https://ograf.ebu.io/) based on its properties and user-submitted info.

## Usage

Either grab the latest build from the releases page or install locally and run `pnpm build`. Deploy the bundled web app as a static web app (with GitHub Pages, Heroku, etc.).

## Developing

1. Clone the repo.
2. `pnpm install`
3. `pnpm dev`

The `src/lib` folder contains most components and utilities used by the app. The `public` folder contains the template manifest and HTML custom element transformed by the app.

This project uses [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). If you're unsure which type to use for a given commit, try using [this flowchart](https://gist.github.com/JohnnyWalkerDigital/7207004e8efd79751dbf55ece0420ef2). If you're still not sure, you probably need to break your changes into smaller commits.

### Deploying

Every push to main is deployed to GitHub Pages via GitHub Actions (WIP).

## Roadmap

Check the GitHub issues for the primary roadmap (WIP), but here are a few key known issues:

1. The app is not yet fully compliant with v1 of the OGraf Graphics specification. Multi-step and non-real-time graphics are currently unsupported.
2. The Rive web runtime is not bundled with the final graphic, it is imported dynamically at runtime from a CDN. This means the graphic requires an internet connection and is less performant at load time than it could be.
3. The graphic template is not generated from a TS file during a build step, nor minified.

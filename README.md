# Tanbunism web client
 [tanbunismのウェブクライアント](https://tanbunism.com/)



## Getting Started for developers
### Setup
```bash
npm install #Install the dependencies:
npx lefthook install # setup git pre-commit
```

### Development
Start the development server with HMR:
```bash
mkcert -i # development certificate for https
npm run dev # Your application will be available at `http://localhost:5173`.
```

## UI implementation

UI components and Tailwind conventions: [UI component guide](docs/ui-components.md).

## Building for Production

```bash
npm run build # Create a production build
```

## TypeScript and build tools

`npm run typecheck` uses the native TypeScript 7 compiler (`tsc`). The
`@typescript/native` dependency is an npm alias for TypeScript 7, while the
`typescript` dependency aliases `@typescript/typescript6` for tools that still
need the JavaScript compiler API. Keep both aliases: `npx tsc --version` should
report 7.x; `npx tsc6 --version` reports the compatibility compiler.
This follows the [official side-by-side setup](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-60).

Vite 8 uses Rolldown/Oxc for app builds. Use `npm ci` to reproduce the checked
versions of the compiler, Vite plugins, Vitest, and Storybook in CI.

## Generating Backend API Client
```bash
npm run generate:api

ローカルbackendからAPIクライアントを生成し、そのbackendへ接続する場合は
`.env.example` を `.env` にコピーしてから、backendを
`127.0.0.1:8000` で起動する。
```

## Deployment

### Netlify (GitHub Actions)

CI runs the tests and builds the app once. On a successful `main` push, it saves
`build/` and the adapter-generated `.netlify/v1/` functions as the `netlify-build`
artifact. The Netlify Deploy workflow downloads that exact CI run's artifact and
uploads it with `netlify deploy --no-build`. It installs dependencies to package
the SSR function, but does not rebuild the app.

Set the GitHub Actions secrets `NETLIFY_SITE_ID` and `NETLIFY_AUTH_TOKEN` for the
existing Netlify project. Build-time environment variables must be available in
the CI Build step; Netlify-only build variables are not used by `npm run build`.

To stop Netlify's separate Git-triggered builds, set **Project configuration >
Developer settings > Continuous deployment > Build settings > Build status** to
**Stopped builds**. This still allows prebuilt CLI deploys. See
[Netlify's build status documentation](https://docs.netlify.com/build/configure-builds/stop-or-activate-builds/).

### Docker Deployment

To build and run using Docker:

```bash
docker build -t my-app .

# Run the container
docker run -p 3000:3000 my-app
```

The containerized application can be deployed to any platform that supports Docker, including:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `npm run build`

```
├── package.json
├── package-lock.json (or pnpm-lock.yaml, or bun.lockb)
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

---

Built with ❤️ using React Router.

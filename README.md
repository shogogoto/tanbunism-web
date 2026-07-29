# web client for Knowde
 [knowdeのウェブクライアント](https://knowde.netlify.app/)



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

## Building for Production
```bash
npm run build # Create a production build
```

## Generating Backend API Client
```bash
npm run generate:api

ローカルbackendからAPIクライアントを生成し、そのbackendへ接続する場合は
`.env.example` を `.env` にコピーしてから、backendを
`127.0.0.1:8000` で起動する。
```

## Deployment

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

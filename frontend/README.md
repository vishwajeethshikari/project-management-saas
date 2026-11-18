# React frontend

The React/Vite application uses `src/api.js` for JSON requests to the Express
API. It includes credentials so the browser sends the HttpOnly JWT session
cookie.

The API base defaults to `/api`; the Vite development server proxies it to
`http://localhost:5000`. For a separately hosted frontend, create `.env` from
`.env.example` and set `VITE_API_URL` to the backend origin followed by `/api`
(for example, `https://api.example.test/api`).

## Commands

```powershell
npm install
npm run dev
npm test
npm run lint
npm run build
```

Authentication and workspace/project/task data are loaded from the backend;
the browser does not use demo records as a substitute for PostgreSQL.

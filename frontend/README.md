# React frontend

The React/Vite application uses `src/api.js` for JSON requests to the Express
API. It includes credentials so the browser sends the HttpOnly JWT session
cookie.

The API defaults to `http://localhost:5000/api`. Override it by creating
`.env` from `.env.example` and setting `VITE_API_URL`.

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

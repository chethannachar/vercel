# Separate React and FastAPI deployments

This repository contains two independent Vercel projects:

- `frontend/`: React + Vite application.
- `backend/`: FastAPI application deployed as a Python serverless function.

The frontend calls the separately deployed backend over HTTP. The backend connects directly to Supabase PostgreSQL with a private `DATABASE_URL`. The backend does not run a separate Uvicorn process in production.

## Deployment

Follow these steps in order:

1. **Create a Supabase project.** Create a project in the Supabase dashboard. In **Connect → Connection String**, choose the session pooler connection string and copy its URI. This project uses `psycopg` to connect directly to PostgreSQL; it does not use the Supabase service-role API key.
2. **Execute `supabase_schema.sql`.** Open the Supabase **SQL Editor**, paste the contents of [`supabase_schema.sql`](./supabase_schema.sql), and run it. This creates `public.users` with a unique username and enables Row Level Security.
3. **Deploy the backend folder as a separate Vercel project.** Import this repository into Vercel to create a new project for the API.
4. **Set the backend root directory to `backend`.** In the backend Vercel project setup/settings, choose `backend` as the **Root Directory**. Vercel uses `backend/vercel.json`, `backend/requirements.txt`, and `backend/main.py` for the Python serverless deployment.
5. **Configure backend environment variables.** In the backend project's **Settings → Environment Variables**, set:

   ```text
   DATABASE_URL=postgresql://postgres.lroeliuznrpttipfcsur:YOUR_DATABASE_PASSWORD@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres
   FRONTEND_URL=
   ```

   Replace `URL_ENCODED_DATABASE_PASSWORD` with your Supabase database password, URL-encoding reserved characters (`@` as `%40`, `:` as `%3A`, `/` as `%2F`, `#` as `%23`, and `%` as `%25`). Keep this connection string private and never add it to frontend variables. Set `FRONTEND_URL` after deploying the frontend.
6. **Deploy the frontend folder as another Vercel project.** Create a second Vercel project from this same repository.
7. **Set the frontend root directory to `frontend`.** In the frontend project setup/settings, choose `frontend` as the **Root Directory**.
8. **Configure `VITE_API_BASE_URL`.** In the frontend project's **Settings → Environment Variables**, set it to the deployed backend origin, without a path:

   ```text
   VITE_API_BASE_URL=https://your-backend-project.vercel.app
   ```

   Redeploy the frontend after setting this value because Vite embeds it at build time.
9. **Set `FRONTEND_URL` in the backend Vercel project** to the exact frontend origin, for example `https://your-frontend-project.vercel.app`, with no path or trailing slash.
10. **Redeploy the backend** so its CORS middleware loads the updated frontend origin.
11. **Test registration and login.** Open the deployed frontend, register with any username text and a password (8–72 characters), and then log in with the same username text. Duplicate usernames are rejected and failed login credentials receive a generic error.

## Run locally

Use Python 3.10+ and Node.js 20.19+.

### Backend

From the repository root, in PowerShell:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Set `DATABASE_URL` to your Supabase PostgreSQL pooler URI and `FRONTEND_URL=http://localhost:5173` in `backend/.env`, then start the local API:

```powershell
python -m uvicorn main:app --reload --port 8000
```

The local health endpoint is `http://localhost:8000/health`.

### Frontend

In a second PowerShell terminal, from the repository root:

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
```

Set `VITE_API_BASE_URL=http://localhost:8000` in `frontend/.env.local`, then start Vite:

```powershell
npm run dev
```

Open the Vite URL, normally `http://localhost:5173`. Both applications run separately during local development as they do after deployment.

## API endpoints

- `GET /health` → `{ "status": "ok" }`
- `POST /register`
- `POST /login`

Registration and login accept JSON in the form `{ "username": "alex_123", "password": "example-password" }`. Usernames accept arbitrary text and are stored exactly as provided; the database uses `TEXT` with a unique constraint. Passwords are bcrypt-hashed before storage; password hashes and database credentials are never returned by the API. Each serverless request opens a TLS-protected PostgreSQL connection to the supplied Supabase session-pooler URL and closes it after the query.

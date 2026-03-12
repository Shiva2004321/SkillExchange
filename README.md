# Boka Skill Exchange

This repository contains a simple Express backend API and a static frontend for the Skill Exchange application.

## Getting started

1. **Install dependencies**
   ```bash
   cd \path\to\boka
   npm install      # installs dependencies from root package.json
   # (or `cd backend && npm install` if you prefer working only on the backend)
   ```

2. **Development**
   - Start backend with hot reload:
     ```bash
     cd backend
     npm run dev
     ```
   - Open `frontend/index.html` in a browser or configure the backend to serve the static files (already done).

3. **Environment variables**
   Create a `.env` file in `backend/` (see `.env.example`) with MongoDB URI, email credentials, and PORT if you want to override the default.

## Deploying to Render

Render looks for a `package.json` at the root of the repository. The root `package.json` in this project is already configured with the necessary dependencies and a start script that runs `node backend/server.js`.

1. Push your code to a GitHub/GitLab repository.
2. On Render, create a new **Web Service** and connect it to the repository.
3. Set the **Build Command** to `npm install` (Render runs this automatically by default).
4. Set the **Start Command** to `npm start`.
5. Make sure you specify any required environment variables in Render's UI (`MONGODB_URI`, `EMAIL_SERVICE`, etc.). Render will provide a `PORT` environment variable automatically, which the server uses.
6. Optionally, you can add a static service for the frontend or let the backend serve the files (the current setup serves static content from the `frontend` folder).

---

Happy coding! :rocket:

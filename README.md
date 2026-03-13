# Boka Skill Exchange

This repository contains a full-featured Skill Exchange application with backend API and static frontend. It demonstrates advanced web development concepts suitable for a final year project.

## Features

### Core Functionality
- **User Authentication**: Secure registration and login with JWT tokens
- **Skill Management**: Users can list skills they want to teach
- **Skill Requests**: Students can request to learn from teachers
- **Real-time Notifications**: Instant updates using Socket.io when requests are accepted/declined
- **Skill Ratings**: Users can rate and review skills they've learned
- **Email Notifications**: Automated email alerts for request updates

### Technical Features
- **JWT Authentication**: Secure token-based authentication
- **Real-time Communication**: WebSocket integration with Socket.io
- **Responsive Design**: Mobile-friendly UI with glassmorphism design
- **RESTful API**: Well-structured backend with Express.js
- **MongoDB Integration**: NoSQL database for user and skill data
- **Modern Frontend**: Vanilla JavaScript with modern ES6+ features

## Tech Stack

- **Backend**: Node.js, Express.js, MongoDB, Socket.io, JWT
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Database**: MongoDB Atlas
- **Real-time**: Socket.io
- **Authentication**: JWT (JSON Web Tokens)
- **Email**: Nodemailer with Gmail SMTP

## Getting started

1. **Install dependencies**
   ```bash
   cd \path\to\boka
   npm install      # installs dependencies from root package.json
   # (or `cd backend && npm install` if you prefer working only on the backend)
   ```

2. **Environment Setup**
   Create `.env` file in `backend/` with:
   ```
   MONGODB_URI=your-mongodb-atlas-uri
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   JWT_SECRET=your-secret-key
   ```

3. **Development**
   - Start backend with hot reload:
     ```bash
     cd backend
     npm run dev
     ```
   - Open `frontend/index.html` in a browser or configure the backend to serve the static files (already done).

## Deploying to Render

Render looks for a `package.json` at the root of the repository. The root `package.json` in this project is already configured with the necessary dependencies and a start script that runs `node backend/server.js`.

1. Push your code to a GitHub/GitLab repository.
2. On Render, create a new **Web Service** and connect it to the repository.
3. Set the **Build Command** to `npm install` (Render runs this automatically by default).
4. Set the **Start Command** to `npm start`.
5. Make sure you specify any required environment variables in Render's UI (`MONGODB_URI`, `EMAIL_SERVICE`, etc.). Render will provide a `PORT` environment variable automatically, which the server uses.
6. Optionally, you can add a static service for the frontend or let the backend serve the files (the current setup serves static content from the `frontend` folder).

## API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login (returns JWT)

### Skills
- `GET /api/skills` - Get all skills
- `POST /api/skills` - Add new skill

### Requests
- `POST /api/requests` - Create skill request
- `GET /api/requests/:email` - Get requests for user
- `PATCH /api/requests/:id` - Update request status

### Ratings
- `POST /api/rate` - Submit skill rating (requires JWT)
- `GET /api/ratings/:skillId` - Get ratings for skill

### Other
- `GET /api/health` - Health check
- `PUT /api/update-profile` - Update user profile

## Real-time Features

The app uses Socket.io for real-time notifications:
- Users receive instant alerts when their skill requests are accepted or declined
- Notifications appear as browser alerts

## Security Features

- JWT-based authentication
- Password hashing (recommended to add bcrypt)
- Input validation
- CORS enabled
- Environment variable configuration

## Future Enhancements

- Add password hashing with bcrypt
- Implement user profile pictures
- Add chat functionality between teachers and students
- Create admin dashboard for managing users
- Add skill categories and advanced search
- Implement push notifications

---

Happy coding! :rocket:

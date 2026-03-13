# SkillExchange - Final Year Project

A comprehensive skill exchange platform with real-time chat, notifications, ratings, and admin management. Perfect for final year project presentation with full deployment capabilities.

## 🚀 Features

### Core Functionality
- **User Authentication**: Secure registration and login with JWT tokens and bcrypt hashing
- **Skill Management**: Users can list skills they want to teach
- **Skill Requests**: Students can request to learn from teachers
- **Real-time Chat**: Instant messaging between users with chat history
- **Notifications Panel**: Real-time updates and notification history
- **Skill Ratings**: Users can rate and review skills they've learned
- **Admin Dashboard**: Complete admin panel for managing users, skills, and requests
- **File Uploads**: Avatar upload functionality with Multer
- **Email Notifications**: Automated email alerts for all interactions

### Technical Features
- **JWT Authentication**: Secure token-based authentication with role-based access
- **Real-time Communication**: WebSocket integration with Socket.io for chat and notifications
- **Responsive Design**: Mobile-friendly UI with glassmorphism design
- **RESTful API**: Well-structured backend with Express.js
- **MongoDB Integration**: NoSQL database with multiple collections
- **Modern Frontend**: Vanilla JavaScript with modern ES6+ features
- **Cloud Deployment**: Ready for Render deployment with environment variables

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js, Socket.io, JWT, bcryptjs
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Database**: MongoDB Atlas
- **Real-time**: Socket.io
- **Authentication**: JWT tokens with bcrypt password hashing
- **File Handling**: Multer for uploads
- **Email**: Nodemailer with Gmail SMTP
- **Deployment**: Render (full-stack)

## 📁 Project Structure

```
SkillExchange/
├── backend/
│   ├── server.js          # Main Express server with all routes
│   ├── package.json       # Backend dependencies
│   ├── .env              # Environment variables
│   └── uploads/          # File uploads directory
├── frontend/
│   ├── index.html        # Main UI with all modals
│   ├── app.js           # Frontend logic and API calls
│   └── style.css        # Glassmorphism styling
└── README.md
```

## 🚀 Deployment to Render

### Prerequisites
- GitHub account
- MongoDB Atlas account (already configured)
- Gmail account for email notifications

### Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Create Render Web Service**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Web Service"
   - Connect your GitHub repository

3. **Configure Build Settings**
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

4. **Add Environment Variables**
   ```
   MONGODB_URI=mongodb+srv://shivarajmalleshyadagiri_db_user:zIEWJwQODOH1eXMK@skills.m0ijmdf.mongodb.net/SkillExchange?retryWrites=true&w=majority&appName=skills
   EMAIL_SERVICE=gmail
   EMAIL_USER=shivarajmalleshyadagiri@gmail.com
   EMAIL_PASSWORD=bhenuibdvnulwtjk
   JWT_SECRET=skill-exchange-jwt-secret-key-2026-final-project
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Your app will be live at: `https://your-app-name.onrender.com`

## 🔧 Local Development Setup

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Environment Setup**
   Create `.env` file in `backend/` with:
   ```env
   MONGODB_URI=your-mongodb-atlas-connection-string
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   JWT_SECRET=skill-exchange-jwt-secret-key-2026-final-project
   PORT=5000
   ```

3. **Start the server**
   ```bash
   cd backend
   npm start
   ```

4. **Open in browser**
   ```
   http://localhost:5000
   ```

## 🔍 API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `PUT /api/update-profile` - Update user profile

### Skills & Requests
- `GET /api/skills` - Get all skills
- `POST /api/skills` - Add new skill
- `POST /api/requests` - Send skill request
- `GET /api/requests/:email` - Get user requests
- `PATCH /api/requests/:id` - Update request status

### Chat & Notifications
- `GET /api/chats` - Get user chats
- `POST /api/chats` - Create new chat
- `GET /api/chats/:chatId/messages` - Get chat messages
- `POST /api/chats/:chatId/messages` - Send message
- `GET /api/notifications` - Get user notifications
- `PATCH /api/notifications/:id/read` - Mark notification as read

### Admin (Admin only)
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/users` - All users
- `GET /api/admin/skills` - All skills
- `GET /api/admin/requests` - All requests

### Utilities
- `GET /api/health` - Server health check
- `POST /api/upload-avatar` - Upload user avatar
- `POST /api/rate` - Submit skill rating

## 🔐 Admin Access

Login with email: `admin@skillx.com` to access admin features.

## 📧 Email Configuration

The app uses Gmail for notifications. The credentials are already configured in the environment variables.

## 🎯 Perfect for Final Year Project

This project demonstrates:

- ✅ **Full-stack development** (Node.js + Express + MongoDB + Vanilla JS)
- ✅ **Real-time features** (Socket.io for chat and notifications)
- ✅ **Authentication & Security** (JWT, bcrypt, role-based access)
- ✅ **Database design** (Multiple MongoDB collections with relationships)
- ✅ **File handling** (Avatar uploads with Multer)
- ✅ **Email integration** (Automated notifications)
- ✅ **Admin dashboard** (Complete user/skill management)
- ✅ **Responsive design** (Mobile-friendly with modern UI)
- ✅ **Cloud deployment** (Render with environment variables)
- ✅ **API design** (RESTful endpoints with proper error handling)

## 🤝 Usage

1. **Register** a new account or **login** with existing credentials
2. **Add skills** you want to teach in your profile
3. **Browse** skills posted by other users
4. **Send requests** to learn skills you're interested in
5. **Chat** with other users in real-time
6. **Rate and review** skills you've learned
7. **Check notifications** for updates on your requests
8. **Admin users** can manage the entire platform

---

**Built with ❤️ for learning and skill sharing - Ready for deployment! 🚀**

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

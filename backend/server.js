require('dotenv').config();
console.log('🚀 Server script starting...');

const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createServer } = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend static files (index.html, skill.html, profile.html, etc.)
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// --- MONGODB ATLAS CONNECTION ---
const dbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/SkillExchange';

console.log("🔗 Connecting to MongoDB...");
mongoose.connect(dbURI)
    .then(() => console.log('✅ Connected to MongoDB Atlas!'))
    .catch((err) => {
        console.error('❌ MongoDB Connection Error:', err.message);
        console.error('Full Error:', err);
    });

// Monitor connection events
mongoose.connection.on('error', (err) => {
    console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ Mongoose disconnected from MongoDB');
});

// --- MONGODB SCHEMAS & MODELS ---
// 1. New User Schema (To save logins!)
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    mobile: { type: String, required: true },
    password: { type: String, required: true },
    avatar: { type: String, default: '' },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isActive: { type: Boolean, default: true },
    skills: { type: [String], required: true },
    github: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    telegram: { type: String, default: '' },
    profileMarkdown: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Handle duplicate key error
userSchema.post('save', function(error, doc, next) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
        next(new Error('Email already exists in database'));
    } else {
        next(error);
    }
});

const User = mongoose.model('User', userSchema);

// 2. Skill Schema
const skillSchema = new mongoose.Schema({
    user: String,
    email: String,
    skill: String,
    desc: String,
    createdAt: { type: Date, default: Date.now }
});
const Skill = mongoose.model('Skill', skillSchema);

// 3. Request Schema
const requestSchema = new mongoose.Schema({
    requesterName: String, requesterEmail: String, skillName: String, teacherName: String, teacherEmail: String,
    status: { type: String, default: 'pending' },
    date: { type: String, default: () => new Date().toLocaleDateString() }
});
const Request = mongoose.model('Request', requestSchema);

// 4. Rating Schema
const ratingSchema = new mongoose.Schema({
    skillId: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill', required: true },
    raterEmail: { type: String, required: true },
    ratedEmail: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String },
    createdAt: { type: Date, default: Date.now }
});
const Rating = mongoose.model('Rating', ratingSchema);

// 5. Chat Schema
const chatSchema = new mongoose.Schema({
    participants: [{ type: String, required: true }],
    messages: [{
        sender: { type: String, required: true },
        message: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
    }],
    lastMessage: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});
const Chat = mongoose.model('Chat', chatSchema);

// 6. Notification Schema
const notificationSchema = new mongoose.Schema({
    userEmail: { type: String, required: true },
    type: { type: String, required: true }, // 'request_update', 'new_message', 'rating_received'
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});
const Notification = mongoose.model('Notification', notificationSchema);

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });


// --- SMTP EMAIL SETUP ---
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com', 
        pass: process.env.EMAIL_PASSWORD || 'your-app-password'      
    }
});

// --- AUTHENTICATION ROUTES (NEW) ---

// Health Check Endpoint
app.get('/api/health', (req, res) => {
    const dbConnected = mongoose.connection.readyState === 1;
    res.status(dbConnected ? 200 : 503).json({
        status: dbConnected ? "✅ Database Connected" : "❌ Database Not Connected",
        mongooseState: mongoose.connection.readyState,
        message: dbConnected ? "Server is running and connected to MongoDB" : "Server is running but MongoDB is not connected"
    });
});

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Socket.io for real-time notifications and chat
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join', (email) => {
        socket.join(email);
        console.log(`User ${email} joined room`);
    });

    socket.on('join_chat', (chatId) => {
        socket.join(chatId);
        console.log(`User joined chat: ${chatId}`);
    });

    socket.on('send_message', async (data) => {
        try {
            const { chatId, message, sender } = data;
            const chat = await Chat.findById(chatId);
            
            if (chat) {
                const newMessage = {
                    sender: sender,
                    message: message,
                    timestamp: new Date()
                };
                
                chat.messages.push(newMessage);
                chat.lastMessage = new Date();
                await chat.save();
                
                // Send to all participants in the chat room
                io.to(chatId).emit('receive_message', newMessage);
                
                // Also send notification to other participants
                const otherParticipants = chat.participants.filter(p => p !== sender);
                otherParticipants.forEach(participant => {
                    io.to(participant).emit('notification', {
                        type: 'new_message',
                        title: 'New Message',
                        message: `You have a new message from ${sender}`
                    });
                });
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Debug: Check all users in database
app.get('/api/debug/users', async (req, res) => {
    try {
        const users = await User.find({}).select('name email mobile -password');
        res.json({
            count: users.length,
            users: users
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Debug: Delete a user by email
app.delete('/api/debug/user/:email', async (req, res) => {
    try {
        const result = await User.deleteOne({ email: req.params.email.toLowerCase() });
        res.json({ message: "User deleted", deletedCount: result.deletedCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Debug: Create test user
app.post('/api/debug/create-user', async (req, res) => {
    try {
        const testUser = {
            name: "Samad Shaikh",
            email: "samadsk77905@gmail.com",
            mobile: "9999999999",
            password: "Samad@123",
            skills: ["JavaScript", "Python", "Web Development"]
        };

        // Check if user already exists
        const existingUser = await User.findOne({ email: testUser.email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Create user
        const newUser = new User(testUser);
        const savedUser = await newUser.save();

        // Add skills to feed
        for (let skill of testUser.skills) {
            const newSkill = new Skill({ 
                user: testUser.name, 
                email: testUser.email, 
                skill: skill, 
                desc: "Ready to teach this skill." 
            });
            await newSkill.save();
        }

        res.json({ 
            message: "Test user created successfully",
            user: { name: savedUser.name, email: savedUser.email, skills: savedUser.skills }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Register User
app.post('/api/register', async (req, res) => {
    try {
        console.log("📝 Registration request received:", { name: req.body.name, email: req.body.email, mobile: req.body.mobile, skillsCount: req.body.skills?.length });
        
        const { name, email, mobile, password, skills, github, linkedin, telegram } = req.body;

        // Validate required fields
        if (!name || !email || !mobile || !password) {
            console.log("⚠️ Missing required fields");
            return res.status(400).json({ message: "All fields are required." });
        }

        if (!Array.isArray(skills) || skills.length === 0) {
            console.log("⚠️ No skills provided");
            return res.status(400).json({ message: "At least one skill is required." });
        }

        const lowerEmail = email.toLowerCase();
        console.log("🔍 Checking if email exists in database...");

        // Check if email already exists
        const existingUser = await User.findOne({ email: lowerEmail });
        if (existingUser) {
            console.log("⚠️ Email already registered:", lowerEmail);
            return res.status(400).json({ message: "Email already registered. Please use a different email or login instead." });
        }
        console.log("✅ Email is unique, proceeding...");

        // Save new user to MongoDB Atlas
        console.log("💾 Creating new user document...");
        const newUser = new User({ 
            name, 
            email: lowerEmail, 
            mobile, 
            password, 
            skills,
            github: github || '',
            linkedin: linkedin || '',
            telegram: telegram || ''
        });

        const savedUser = await newUser.save();
        console.log("✅ User saved successfully! User ID:", savedUser._id);

        // Automatically add their skills to the main dashboard feed
        console.log("💾 Saving skills to feed...");
        for (let skill of skills) {
            const newSkill = new Skill({ 
                user: name, 
                email: lowerEmail, 
                skill: skill.trim(), 
                desc: "Ready to teach this skill." 
            });
            await newSkill.save();
        }
        console.log("✅ Skills saved! Total skills added:", skills.length);

        res.status(201).json({ 
            message: "✅ Registration successful! You can now log in with your email and password.",
            user: { name: savedUser.name, email: savedUser.email }
        });

    } catch (error) {
        console.error("❌ REGISTRATION ERROR:");
        console.error("Error Name:", error.name);
        console.error("Error Code:", error.code);
        console.error("Error Message:", error.message);
        
        // Handle specific MongoDB errors
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            console.error("Duplicate key error on field:", field);
            return res.status(400).json({ message: `This ${field} is already registered.` });
        }
        
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            console.error("Validation errors:", messages);
            return res.status(400).json({ message: "Validation error: " + messages.join(", ") });
        }

        res.status(500).json({ message: "Server error during registration: " + error.message });
    }
});

// Login User
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validate inputs
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required." });
        }

        const lowerEmail = email.toLowerCase();

        // Search database for a user with this exact email
        const user = await User.findOne({ email: lowerEmail, isActive: true });

        if (!user) {
            return res.status(401).json({ message: "Invalid email or password. Access Denied." });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid email or password. Access Denied." });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        // If found, send the user data and token back to the frontend
        res.status(200).json({
            message: "Login successful!",
            token: token,
            user: { 
                name: user.name, 
                email: user.email, 
                mobile: user.mobile, 
                skills: user.skills, 
                avatar: user.avatar,
                github: user.github || '',
                linkedin: user.linkedin || '',
                telegram: user.telegram || '',
                profileMarkdown: user.profileMarkdown || '',
                role: user.role
            }
        });

    } catch (error) {
        console.error("❌ Login Error:", error.message);
        res.status(500).json({ message: "Server error during login: " + error.message });
    }
});

// --- SKILL & REQUEST ROUTES ---

// Get user profile by email
app.get('/api/user/:email', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email.toLowerCase() }).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user profile' });
    }
});

app.get('/api/skills', async (req, res) => {
    try {
        const skills = await Skill.find().sort({ createdAt: -1 });
        res.json(skills);
    } catch (error) { res.status(500).json({ message: "Error fetching skills" }); }
});

// Get a single skill by ID
app.get('/api/skills/:id', async (req, res) => {
    try {
        const skill = await Skill.findById(req.params.id);
        if (!skill) return res.status(404).json({ message: "Skill not found" });
        res.json(skill);
    } catch (error) { res.status(500).json({ message: "Error fetching skill" }); }
});

app.post('/api/skills', async (req, res) => {
    try {
        const newSkill = new Skill({ user: req.body.user, email: req.body.email, skill: req.body.skill, desc: req.body.desc });
        await newSkill.save();
        res.json({ message: "Skill added successfully!", data: newSkill });
    } catch (error) { res.status(500).json({ message: "Error saving skill" }); }
});

app.post('/api/requests', async (req, res) => {
    try {
        const { requesterName, requesterEmail, skillName, teacherName, teacherEmail } = req.body;
        const newRequest = new Request({ requesterName, requesterEmail, skillName, teacherName, teacherEmail });
        await newRequest.save();

        const mailOptions = {
            from: 'SkillExchange Platform', to: teacherEmail, subject: 'New Skill Learning Request 🚀',
            text: `Hello ${teacherName},\n\n${requesterName} wants to learn ${skillName} from you. Please login to the SkillExchange grid to accept or decline the request.\n\nRequester Email: ${requesterEmail}`
        };
        transporter.sendMail(mailOptions, (error, info) => { if (error) console.error("Email Error:", error); });

        res.json({ message: "Request sent successfully!", data: newRequest });
    } catch (error) { res.status(500).json({ message: "Error sending request" }); }
});

app.get('/api/requests/:email', async (req, res) => {
    try {
        const userRequests = await Request.find({ teacherEmail: req.params.email }).sort({ _id: -1 });
        res.json(userRequests);
    } catch (error) { res.status(500).json({ message: "Error fetching requests" }); }
});

app.patch('/api/requests/:id', async (req, res) => {
    try {
        const request = await Request.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
        if (!request) return res.status(404).json({ message: "Request not found." });

        const message = req.body.status === 'accepted' 
            ? `Great news! Your request to learn ${request.skillName} has been ACCEPTED by ${request.teacherName}.`
            : `Update: Your request to learn ${request.skillName} was declined by ${request.teacherName}.`;

        const mailOptions = {
            from: 'SkillExchange Platform', to: request.requesterEmail, subject: `Skill Request ${req.body.status.toUpperCase()}`,
            text: `Hello ${request.requesterName},\n\n${message}`
        };
        transporter.sendMail(mailOptions, (error, info) => { if (error) console.error("Email Error:", error); });

        // Send real-time notification
        io.to(request.requesterEmail).emit('notification', {
            type: 'request_update',
            message: message,
            skill: request.skillName,
            status: req.body.status
        });

        // Save notification to database
        const notification = new Notification({
            userEmail: request.requesterEmail,
            type: 'request_update',
            title: 'Request Update',
            message: message
        });
        await notification.save();

        res.json({ message: `Request ${req.body.status}!`, data: request });
    } catch (error) { res.status(500).json({ message: "Error updating request" }); }
});

// --- UPDATE PROFILE ---
app.put('/api/update-profile', async (req, res) => {
    try {
        const { email, name, mobile, github, linkedin, telegram, profileMarkdown } = req.body;
        
        console.log("Update request received for email:", email);
        
        const updatedUser = await User.findOneAndUpdate(
            { email: email.toLowerCase() },
            { $set: { name: name, mobile: mobile, github: github || '', linkedin: linkedin || '', telegram: telegram || '', profileMarkdown: profileMarkdown || '' } },
            { new: true }
        );

        console.log("Updated user:", updatedUser);

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found in database." });
        }

        res.status(200).json({
            message: "Profile updated successfully!",
            user: { 
                name: updatedUser.name, 
                email: updatedUser.email, 
                mobile: updatedUser.mobile, 
                skills: updatedUser.skills,
                github: updatedUser.github || '',
                linkedin: updatedUser.linkedin || '',
                telegram: updatedUser.telegram || '',
                profileMarkdown: updatedUser.profileMarkdown || ''
            }
        });
    } catch (error) {
        console.error("Profile update error:", error);
        res.status(500).json({ message: "Error updating profile: " + error.message });
    }
});

// --- RATING SYSTEM ---
// Submit a rating
app.post('/api/rate', authenticateToken, async (req, res) => {
    try {
        const { skillId, rating, comment } = req.body;
        const skill = await Skill.findById(skillId);
        if (!skill) return res.status(404).json({ message: 'Skill not found' });

        const newRating = new Rating({
            skillId: skillId,
            raterEmail: req.user.email,
            ratedEmail: skill.email,
            rating: rating,
            comment: comment
        });

        await newRating.save();
        res.json({ message: 'Rating submitted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error submitting rating' });
    }
});

// Get ratings for a skill
app.get('/api/ratings/:skillId', async (req, res) => {
    try {
        const ratings = await Rating.find({ skillId: req.params.skillId });
        const averageRating = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : 0;
        res.json({ ratings, averageRating });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching ratings' });
    }
});

// --- ADMIN ROUTES ---
// Get admin dashboard stats
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    
    try {
        const totalUsers = await User.countDocuments();
        const totalSkills = await Skill.countDocuments();
        const totalRequests = await Request.countDocuments();
        const pendingRequests = await Request.countDocuments({ status: 'pending' });
        const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5).select('name email createdAt');
        
        res.json({
            totalUsers,
            totalSkills,
            totalRequests,
            pendingRequests,
            recentUsers
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching stats' });
    }
});

// Get all users (admin)
app.get('/api/admin/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users' });
    }
});

// Update user status (admin)
app.patch('/api/admin/users/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    
    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error updating user' });
    }
});

// Get all skills (admin)
app.get('/api/admin/skills', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    
    try {
        const skills = await Skill.find();
        res.json(skills);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching skills' });
    }
});

// Get all requests (admin)
app.get('/api/admin/requests', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    
    try {
        const requests = await Request.find().populate('skillId');
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching requests' });
    }
});

// --- CHAT ROUTES ---
// Get user's chats
app.get('/api/chats', authenticateToken, async (req, res) => {
    try {
        const chats = await Chat.find({ participants: req.user.email })
            .sort({ lastMessage: -1 });
        res.json(chats);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching chats' });
    }
});

// Get or create chat between two users
app.post('/api/chats', authenticateToken, async (req, res) => {
    try {
        const { otherUserEmail } = req.body;
        let chat = await Chat.findOne({ 
            participants: { $all: [req.user.email, otherUserEmail] }
        });
        
        if (!chat) {
            chat = new Chat({ participants: [req.user.email, otherUserEmail] });
            await chat.save();
        }
        
        res.json(chat);
    } catch (error) {
        res.status(500).json({ message: 'Error creating chat' });
    }
});

// Send message
app.post('/api/chats/:chatId/messages', authenticateToken, async (req, res) => {
    try {
        const { message } = req.body;
        const chat = await Chat.findById(req.params.chatId);
        
        if (!chat) return res.status(404).json({ message: 'Chat not found' });
        
        const newMessage = {
            sender: req.user.email,
            message: message,
            timestamp: new Date()
        };
        
        chat.messages.push(newMessage);
        chat.lastMessage = new Date();
        await chat.save();
        
        // Send real-time notification
        const otherUser = chat.participants.find(p => p !== req.user.email);
        io.to(otherUser).emit('new_message', {
            chatId: chat._id,
            message: newMessage,
            from: req.user.email
        });
        
        res.json(newMessage);
    } catch (error) {
        res.status(500).json({ message: 'Error sending message' });
    }
});

// Get chat messages
app.get('/api/chats/:chatId/messages', authenticateToken, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.chatId);
        if (!chat) return res.status(404).json({ message: 'Chat not found' });
        
        res.json(chat.messages);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching messages' });
    }
});

// --- NOTIFICATIONS ---
// Get user notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const notifications = await Notification.find({ userEmail: req.user.email })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching notifications' });
    }
});

// Mark notification as read
app.patch('/api/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
        const notification = await Notification.findByIdAndUpdate(
            req.params.id, 
            { isRead: true }, 
            { new: true }
        );
        res.json(notification);
    } catch (error) {
        res.status(500).json({ message: 'Error updating notification' });
    }
});

// --- FILE UPLOAD ---
// Upload avatar
app.post('/api/upload-avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
        
        const avatarUrl = `/uploads/${req.file.filename}`;
        await User.findByIdAndUpdate(req.user.userId, { avatar: avatarUrl });
        
        res.json({ avatarUrl });
    } catch (error) {
        res.status(500).json({ message: 'Error uploading avatar' });
    }
});

// use environment port (Render sets PORT) or fallback to 5050
const PORT = process.env.PORT || 5050;
console.log('📡 About to listen on port:', PORT);

// serve the frontend when deployed
app.use(express.static(path.join(__dirname, '../frontend')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));
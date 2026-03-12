require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

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
    skills: { type: [String], required: true },
    createdAt: { type: Date, default: Date.now }
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
        
        const { name, email, mobile, password, skills } = req.body;

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
            skills 
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

        // Search database for a user with this exact email AND password
        const user = await User.findOne({ email: lowerEmail, password: password });

        if (!user) {
            return res.status(401).json({ message: "Invalid email or password. Access Denied." });
        }

        // If found, send the user data back to the frontend
        res.status(200).json({
            message: "Login successful!",
            user: { name: user.name, email: user.email, mobile: user.mobile, skills: user.skills }
        });

    } catch (error) {
        console.error("❌ Login Error:", error.message);
        res.status(500).json({ message: "Server error during login: " + error.message });
    }
});

// --- SKILL & REQUEST ROUTES ---
app.get('/api/skills', async (req, res) => {
    try {
        const skills = await Skill.find().sort({ createdAt: -1 });
        res.json(skills);
    } catch (error) { res.status(500).json({ message: "Error fetching skills" }); }
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

        res.json({ message: `Request ${req.body.status}!`, data: request });
    } catch (error) { res.status(500).json({ message: "Error updating request" }); }
});

// --- UPDATE PROFILE ---
app.put('/api/update-profile', async (req, res) => {
    try {
        const { email, name, mobile } = req.body;
        
        console.log("Update request received for email:", email);
        
        const updatedUser = await User.findOneAndUpdate(
            { email: email.toLowerCase() },
            { $set: { name: name, mobile: mobile } },
            { new: true }
        );

        console.log("Updated user:", updatedUser);

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found in database." });
        }

        res.status(200).json({
            message: "Profile updated successfully!",
            user: { name: updatedUser.name, email: updatedUser.email, mobile: updatedUser.mobile, skills: updatedUser.skills }
        });
    } catch (error) {
        console.error("Profile update error:", error);
        res.status(500).json({ message: "Error updating profile: " + error.message });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
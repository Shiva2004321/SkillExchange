document.addEventListener("DOMContentLoaded", () => {
    // Initialize Socket.io
    const socket = io();

    const authSection = document.getElementById("auth-section");
    const mainApp = document.getElementById("main-app");
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const authSubtitle = document.getElementById("auth-subtitle");
    const goToRegister = document.getElementById("go-to-register");
    const goToLogin = document.getElementById("go-to-login");
    const logoutBtn = document.getElementById("logout-btn");
    
    const profileAvatarBtn = document.getElementById("profile-avatar-btn");
    const profileDropdown = document.getElementById("profile-dropdown");
    const searchInput = document.getElementById("search-input");
    const skillsContainer = document.getElementById("skills-container");
    const loadingState = document.getElementById("loading-state");
    const emptyState = document.getElementById("empty-state");
    
    const viewRequestsBtn = document.getElementById("view-requests-btn");
    const requestsModal = document.getElementById("requests-modal");
    const closeRequestsBtn = document.getElementById("close-requests-btn");
    const incomingRequestsContainer = document.getElementById("incoming-requests-container");
    
    const editProfileBtn = document.getElementById("edit-profile-btn");
    const editProfileModal = document.getElementById("edit-profile-modal");
    const editProfileForm = document.getElementById("edit-profile-form");
    const closeEditProfileBtn = document.getElementById("close-edit-profile-btn");

    const skillDetailModal = document.getElementById("skill-detail-modal");
    const closeSkillDetailBtn = document.getElementById("close-skill-detail-btn");
    const detailSkillTitle = document.getElementById("detail-skill-title");
    const detailSkillUser = document.getElementById("detail-skill-user");
    const detailSkillDesc = document.getElementById("detail-skill-desc");
    const detailSkillRating = document.getElementById("detail-skill-rating");
    const detailSkillMessage = document.getElementById("detail-skill-message");
    const detailRequestBtn = document.getElementById("detail-request-btn");
    let currentSkillDetail = null;

    let currentUserProfile = { name: "", email: "", mobile: "", skills: [], github: '', linkedin: '', telegram: '' };
    let globalSkillsFeed = [];
    let token = localStorage.getItem('token');

    // Restore stored user profile (for navigation across pages)
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
        try { currentUserProfile = JSON.parse(storedUser); } catch (e) { console.warn('Failed to parse stored user', e); }
    }

    // If already logged in, show dashboard immediately
    if (token && currentUserProfile.email) {
        updateProfileUI();
        authSection.classList.add("hidden");
        mainApp.classList.remove("hidden");
        socket.emit('join', currentUserProfile.email);
        loadDashboardFeed();
    }

    goToRegister.addEventListener("click", () => {
        loginForm.classList.add("hidden"); registerForm.classList.remove("hidden");
        authSubtitle.textContent = "Join the knowledge grid.";
        document.getElementById("login-error").style.display = "none";
    });
    goToLogin.addEventListener("click", () => {
        registerForm.classList.add("hidden"); loginForm.classList.remove("hidden");
        authSubtitle.textContent = "Access the knowledge grid.";
    });

    const skillInput = document.getElementById("reg-skill-input");
    const addSkillBtn = document.getElementById("add-skill-btn");
    const chipsContainer = document.getElementById("skills-chip-container");
    let regSkills = [];

    function addSkill() {
        const skill = skillInput.value.trim();
        if (!skill) return;
        if (regSkills.length >= 10) { alert("Max 10 skills!"); return; }
        if (regSkills.includes(skill.toLowerCase())) { alert("Skill exists!"); return; }
        regSkills.push(skill.toLowerCase());
        renderRegChips();
        skillInput.value = "";
    }
    addSkillBtn.addEventListener("click", addSkill);
    skillInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } });

    function renderRegChips() {
        chipsContainer.innerHTML = "";
        regSkills.forEach((skill, index) => {
            const chip = document.createElement("div"); chip.className = "chip";
            chip.innerHTML = `${skill} <span class="remove-chip" onclick="removeSkill(${index})">&times;</span>`;
            chipsContainer.appendChild(chip);
        });
    }
    window.removeSkill = (index) => { regSkills.splice(index, 1); renderRegChips(); };

    // --- SECURE REGISTRATION API CALL ---
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("reg-name").value;
        const email = document.getElementById("reg-email").value;
        const mobile = document.getElementById("reg-mobile").value;
        const github = document.getElementById("reg-github").value;
        const linkedin = document.getElementById("reg-linkedin").value;
        const telegram = document.getElementById("reg-telegram").value;
        const password = document.getElementById("reg-password").value;
        const confirmPassword = document.getElementById("reg-confirm-password").value;

        document.querySelectorAll(".error-msg").forEach(msg => msg.style.display = "none");
        let isValid = true;
        if (!/^[0-9]{10}$/.test(mobile)) { document.getElementById("mobile-error").style.display = "block"; isValid = false; }
        if (password !== confirmPassword) { document.getElementById("password-error").style.display = "block"; isValid = false; }

        if (isValid && regSkills.length > 0) {
            try {
                console.log("📝 Sending registration data:", { name, email, mobile, skills: regSkills });
                
                // Send data to backend to save in MongoDB
                const response = await fetch(`/api/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, email, mobile, github, linkedin, telegram, password, skills: regSkills })
                });

                const data = await response.json();
                console.log("📊 Backend response:", data);

                if (response.ok) {
                    alert("✅ Account created successfully! Please log in.");
                    registerForm.reset(); regSkills = []; renderRegChips(); goToLogin.click(); 
                } else {
                    alert("❌ Registration Failed:\n" + data.message);
                }
            } catch (error) {
                console.error("🚨 Registration Error:", error);
                alert("🔴 Error connecting to server:\n" + error.message + "\n\nMake sure backend is running on localhost:5000");
            }
        } else if (regSkills.length === 0) {
            alert("⚠️ Please add at least one skill!");
        }
    });

    // --- SECURE LOGIN API CALL ---
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("login-username").value;
        const password = document.getElementById("login-password").value;
        const loginError = document.getElementById("login-error");
        
        loginError.style.display = "none"; // Hide error initially

        try {
            // Check credentials against MongoDB
            const response = await fetch(`/api/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Login Success! Load user profile from Database
                token = data.token;
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(data.user));
                currentUserProfile = data.user;
                updateProfileUI();
                
                // Join Socket.io room for notifications
                socket.emit('join', currentUserProfile.email);
                
                authSection.classList.add("hidden");
                mainApp.classList.remove("hidden");
                loadDashboardFeed(); 
            } else {
                // Login Failed! Show error and block entry
                loginError.textContent = data.message;
                loginError.style.display = "block";
            }
        } catch (error) {
            loginError.textContent = "Server offline. Cannot connect to database.";
            loginError.style.display = "block";
        }
    });

    logoutBtn.addEventListener("click", () => {
        mainApp.classList.add("hidden"); profileDropdown.classList.add("hidden");
        authSection.classList.remove("hidden"); loginForm.reset(); searchInput.value = "";
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        token = null;
        currentUserProfile = { name: "", email: "", mobile: "", skills: [] };
    });

    profileAvatarBtn.addEventListener("click", () => profileDropdown.classList.toggle("hidden"));

    // Socket.io notification listener
    socket.on('notification', (data) => {
        alert(`🔔 ${data.message}`);
    });

    function updateProfileUI() {
        const initial = currentUserProfile.name.charAt(0).toUpperCase();
        document.getElementById("nav-avatar-initial").textContent = initial;
        document.getElementById("panel-avatar-initial").textContent = initial;
        document.getElementById("panel-name").textContent = currentUserProfile.name;
        document.getElementById("panel-email").textContent = currentUserProfile.email;
        document.getElementById("panel-mobile").textContent = currentUserProfile.mobile || "+91 0000000000";

        const skillsHTML = currentUserProfile.skills.length > 0 
            ? currentUserProfile.skills.map(s => `<div class="chip">${s}</div>`).join('')
            : `<p class="text-muted">No skills added.</p>`;
        document.getElementById("panel-skills-container").innerHTML = skillsHTML;
        document.getElementById("sidebar-your-skills").innerHTML = skillsHTML;
    }

    async function loadDashboardFeed() {
        loadingState.classList.remove("hidden"); skillsContainer.classList.add("hidden"); emptyState.classList.add("hidden");
        try {
            const response = await fetch(`/api/skills`);
            globalSkillsFeed = await response.json();
        } catch (error) { console.error("Backend offline."); }
        
        setTimeout(() => { renderFeed(globalSkillsFeed); loadingState.classList.add("hidden"); skillsContainer.classList.remove("hidden"); }, 800);
    }

    async function renderFeed(skillsArray) {
        // Filter out user's own skills - only show other people's skills
        const otherSkills = skillsArray.filter(item => item.email !== currentUserProfile.email);
        
        skillsContainer.innerHTML = "";
        if(otherSkills.length === 0) { skillsContainer.classList.add("hidden"); emptyState.classList.remove("hidden"); return; }
        emptyState.classList.add("hidden"); skillsContainer.classList.remove("hidden");

        for (const item of otherSkills) {
            const card = document.createElement("div"); card.className = "skill-card";
            
            // Fetch ratings for this skill
            let ratingInfo = { averageRating: 0, ratings: [] };
            try {
                const response = await fetch(`/api/ratings/${item._id}`);
                ratingInfo = await response.json();
            } catch (error) {
                console.error('Error fetching ratings:', error);
            }
            
            const stars = '★'.repeat(Math.round(ratingInfo.averageRating)) + '☆'.repeat(5 - Math.round(ratingInfo.averageRating));
            
            card.innerHTML = `
                <div>
                    <h3>${item.skill}</h3>
                    <p class="instructor"><a href="profile.html?email=${encodeURIComponent(item.email)}" class="profile-link">@${item.user}</a></p>
                    <p class="desc">${item.desc || "Ready to teach this skill."}</p>
                    <div class="rating-display">
                        <span class="stars">${stars}</span>
                        <span class="rating-text">(${ratingInfo.averageRating.toFixed(1)}) - ${ratingInfo.ratings.length} reviews</span>
                    </div>
                </div>
            `;
            
            const buttonContainer = document.createElement("div");
            buttonContainer.className = "button-container";
            
            const reqBtn = document.createElement("button");
            reqBtn.textContent = "Request to Learn";
            reqBtn.onclick = () => window.location.href = `skill.html?skillId=${item._id}`;
            buttonContainer.appendChild(reqBtn);
            
            const rateBtn = document.createElement("button");
            rateBtn.textContent = "Rate Skill";
            rateBtn.className = "outline-btn";
            rateBtn.onclick = () => showRatingModal(item);
            buttonContainer.appendChild(rateBtn);
            
            card.appendChild(buttonContainer);
            skillsContainer.appendChild(card);
        }
    }

    async function sendSkillRequest(teacherData) {
        if (teacherData.email === currentUserProfile.email) {
            detailSkillMessage.textContent = "⚠️ You cannot request your own skill.";
            return false;
        }

        const payload = {
            requesterName: currentUserProfile.name,
            requesterEmail: currentUserProfile.email,
            skillName: teacherData.skill,
            teacherName: teacherData.user,
            teacherEmail: teacherData.email
        };

        try {
            await fetch(`/api/requests`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
            });

            detailSkillMessage.textContent = `✅ Request sent to ${teacherData.user}. They'll receive an email shortly.`;
            detailRequestBtn.disabled = true;
            detailRequestBtn.textContent = "Requested";
            return true;
        } catch (error) {
            console.error("Request error:", error);
            detailSkillMessage.textContent = "❌ Failed to send request. Please try again later.";
            return false;
        }
    }

    async function openSkillDetail(skill) {
        currentSkillDetail = skill;
        detailSkillTitle.textContent = skill.skill;
        detailSkillUser.innerHTML = `By: <span>@${skill.user}</span>`;
        detailSkillDesc.textContent = skill.desc || "No description provided yet.";

        // Load latest rating info for this skill
        let ratingInfo = { averageRating: 0, ratings: [] };
        try {
            const response = await fetch(`/api/ratings/${skill._id}`);
            ratingInfo = await response.json();
        } catch (error) {
            console.error('Error fetching rating for skill detail:', error);
        }

        const stars = '★'.repeat(Math.round(ratingInfo.averageRating)) + '☆'.repeat(5 - Math.round(ratingInfo.averageRating));
        detailSkillRating.innerHTML = `
            <span class="stars">${stars}</span>
            <span class="rating-text">(${ratingInfo.averageRating.toFixed(1)}) - ${ratingInfo.ratings.length} reviews</span>
        `;

        detailSkillMessage.textContent = "";
        detailRequestBtn.disabled = false;
        detailRequestBtn.textContent = "Request to Learn";
        detailRequestBtn.onclick = () => sendSkillRequest(skill);

        skillDetailModal.classList.remove("hidden");
    }

    viewRequestsBtn.addEventListener("click", async () => {
        profileDropdown.classList.add("hidden");
        requestsModal.classList.remove("hidden");
        incomingRequestsContainer.innerHTML = "<p class='text-muted'>Scanning for signals...</p>";

        try {
            const response = await fetch(`/api/requests/${currentUserProfile.email}`);
            const requests = await response.json();
            renderIncomingRequests(requests);
        } catch (error) { incomingRequestsContainer.innerHTML = "<p class='error-msg'>Server offline.</p>"; }
    });

    closeRequestsBtn.addEventListener("click", () => requestsModal.classList.add("hidden"));
    closeSkillDetailBtn.addEventListener("click", () => skillDetailModal.classList.add("hidden"));

    // --- EDIT PROFILE ---
    editProfileBtn.addEventListener("click", () => {
        profileDropdown.classList.add("hidden");
        editProfileModal.classList.remove("hidden");
        document.getElementById("edit-name").value = currentUserProfile.name;
        document.getElementById("edit-email").value = currentUserProfile.email;
        document.getElementById("edit-mobile").value = currentUserProfile.mobile || "";
        document.getElementById("edit-github").value = currentUserProfile.github || "";
        document.getElementById("edit-linkedin").value = currentUserProfile.linkedin || "";
        document.getElementById("edit-telegram").value = currentUserProfile.telegram || "";
    });

    closeEditProfileBtn.addEventListener("click", () => editProfileModal.classList.add("hidden"));

    editProfileForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const updatedProfile = {
            email: currentUserProfile.email.toLowerCase(),
            name: document.getElementById("edit-name").value,
            mobile: document.getElementById("edit-mobile").value,
            github: document.getElementById("edit-github").value,
            linkedin: document.getElementById("edit-linkedin").value,
            telegram: document.getElementById("edit-telegram").value
        };

        try {
            const response = await fetch(`/api/update-profile`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedProfile)
            });

            if (response.ok) {
                const data = await response.json();
                currentUserProfile = data.user;
                localStorage.setItem('user', JSON.stringify(currentUserProfile));
                updateProfileUI();
                editProfileModal.classList.add("hidden");
                alert("Profile updated successfully!");
            } else {
                alert("Failed to update profile.");
            }
        } catch (error) {
            alert("Error updating profile. Check server.");
        }
    });

    function renderIncomingRequests(requests) {
        incomingRequestsContainer.innerHTML = "";
        if (requests.length === 0) return incomingRequestsContainer.innerHTML = "<p class='text-muted'>No incoming requests yet.</p>";

        requests.forEach(req => {
            const card = document.createElement("div");
            card.className = "request-card";
            card.innerHTML = `
                <h4>${req.skillName}</h4>
                <p class="text-muted">From: <strong>${req.requesterName}</strong> (${req.requesterEmail})</p>
                <p class="text-muted">Date: ${req.date}</p>
                <span class="badge ${req.status}">${req.status}</span>
            `;
            
            if (req.status === 'pending') {
                const actionDiv = document.createElement("div"); actionDiv.className = "request-actions";
                
                const acceptBtn = document.createElement("button");
                acceptBtn.className = "outline-btn outline-sm"; acceptBtn.textContent = "Accept";
                acceptBtn.style.borderColor = "#2ecc71"; acceptBtn.style.color = "#2ecc71";
                acceptBtn.onclick = () => processRequest(req._id, 'accepted');

                const declineBtn = document.createElement("button");
                declineBtn.className = "outline-btn outline-sm"; declineBtn.textContent = "Decline";
                declineBtn.style.borderColor = "#e74c3c"; declineBtn.style.color = "#e74c3c";
                declineBtn.onclick = () => processRequest(req._id, 'declined');

                actionDiv.append(acceptBtn, declineBtn);
                card.appendChild(actionDiv);
            }
            incomingRequestsContainer.appendChild(card);
        });
    }

    async function processRequest(requestId, status) {
        try {
            await fetch(`/api/requests/${requestId}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status })
            });
            alert(`Request ${status}! Email sent to requester.`);
            viewRequestsBtn.click(); // Reload Modal
        } catch (error) { alert("Failed to process request."); }
    }

    searchInput.addEventListener("input", (e) => {
        const term = e.target.value.toLowerCase();
        renderFeed(globalSkillsFeed.filter(item => item.skill.toLowerCase().includes(term) || item.user.toLowerCase().includes(term)));
    });

    // --- RATING SYSTEM ---
    const ratingModal = document.getElementById("rating-modal");
    const ratingForm = document.getElementById("rating-form");
    const closeRatingBtn = document.getElementById("close-rating-btn");
    const ratingStars = document.querySelectorAll(".star");
    let currentRatingSkill = null;
    let selectedRating = 0;

    function showRatingModal(skill) {
        currentRatingSkill = skill;
        selectedRating = 0;
        ratingStars.forEach(star => star.textContent = '☆');
        document.getElementById("rating-comment").value = "";
        ratingModal.classList.remove("hidden");
    }

    ratingStars.forEach(star => {
        star.addEventListener("click", () => {
            selectedRating = parseInt(star.dataset.rating);
            ratingStars.forEach((s, index) => {
                s.textContent = index < selectedRating ? '★' : '☆';
            });
        });
    });

    closeRatingBtn.addEventListener("click", () => ratingModal.classList.add("hidden"));

    ratingForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!token) return alert("Please login first");
        if (selectedRating === 0) return alert("Please select a rating");

        const comment = document.getElementById("rating-comment").value;

        try {
            const response = await fetch('/api/rate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    skillId: currentRatingSkill._id,
                    rating: selectedRating,
                    comment: comment
                })
            });

            if (response.ok) {
                alert("Rating submitted successfully!");
                ratingModal.classList.add("hidden");
                loadDashboardFeed(); // Refresh to show updated ratings
            } else {
                alert("Failed to submit rating");
            }
        } catch (error) {
            alert("Error submitting rating");
        }
    });

    // --- CHAT SYSTEM ---
    const chatBtn = document.getElementById("chat-btn");
    const chatModal = document.getElementById("chat-modal");
    const closeChatBtn = document.getElementById("close-chat-btn");
    const chatList = document.getElementById("chat-list");
    const chatMessages = document.getElementById("chat-messages");
    const backToChatsBtn = document.getElementById("back-to-chats-btn");
    const chatWithUser = document.getElementById("chat-with-user");
    const messagesContainer = document.getElementById("messages-container");
    const messageInput = document.getElementById("message-input");
    const sendMessageBtn = document.getElementById("send-message-btn");

    let currentChatUser = null;
    let chatUsers = [];

    chatBtn.addEventListener("click", () => {
        const handle = currentUserProfile.telegram ? currentUserProfile.telegram.replace(/^@/, '') : 'SkillExchangeApp';
        window.open(`https://t.me/${handle}`, '_blank');
    });

    closeChatBtn.addEventListener("click", () => {
        chatModal.classList.add("hidden");
        chatMessages.style.display = "none";
        chatList.style.display = "block";
        currentChatUser = null;
    });

    backToChatsBtn.addEventListener("click", () => {
        chatMessages.style.display = "none";
        chatList.style.display = "block";
        currentChatUser = null;
    });

    async function loadChatUsers() {
        try {
            const response = await fetch('/api/chat/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            chatUsers = await response.json();
            renderChatList();
        } catch (error) {
            console.error('Error loading chat users:', error);
        }
    }

    function renderChatList() {
        chatList.innerHTML = "";
        if (chatUsers.length === 0) {
            chatList.innerHTML = "<p class='text-muted' style='text-align: center; padding: 20px;'>No conversations yet. Start by requesting a skill!</p>";
            return;
        }

        chatUsers.forEach(user => {
            const chatItem = document.createElement("div");
            chatItem.className = "chat-item";
            chatItem.onclick = () => openChat(user);
            
            const avatarInitial = user.name.charAt(0).toUpperCase();
            const lastMessage = user.lastMessage || "No messages yet";
            
            chatItem.innerHTML = `
                <div class="avatar-circle">${avatarInitial}</div>
                <div class="chat-info">
                    <div class="chat-name">${user.name}</div>
                    <div class="chat-last-msg">${lastMessage}</div>
                </div>
            `;
            chatList.appendChild(chatItem);
        });
    }

    function openChat(user) {
        currentChatUser = user;
        chatWithUser.textContent = user.name;
        chatList.style.display = "none";
        chatMessages.style.display = "flex";
        loadMessages();
    }

    async function loadMessages() {
        try {
            const response = await fetch(`/api/chat/messages/${currentChatUser.email}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const messages = await response.json();
            renderMessages(messages);
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    function renderMessages(messages) {
        messagesContainer.innerHTML = "";
        messages.forEach(message => {
            const messageDiv = document.createElement("div");
            messageDiv.className = `message ${message.sender === currentUserProfile.email ? 'sent' : 'received'}`;
            messageDiv.textContent = message.content;
            messagesContainer.appendChild(messageDiv);
        });
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    sendMessageBtn.addEventListener("click", sendMessage);
    messageInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
    });

    async function sendMessage() {
        const content = messageInput.value.trim();
        if (!content || !currentChatUser) return;

        try {
            const response = await fetch('/api/chat/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    receiver: currentChatUser.email,
                    content: content
                })
            });

            if (response.ok) {
                messageInput.value = "";
                loadMessages(); // Refresh messages
                socket.emit('chat message', {
                    sender: currentUserProfile.email,
                    receiver: currentChatUser.email,
                    content: content
                });
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    // Socket.io chat message listener
    socket.on('chat message', (data) => {
        if (currentChatUser && 
            ((data.sender === currentChatUser.email && data.receiver === currentUserProfile.email) ||
             (data.sender === currentUserProfile.email && data.receiver === currentChatUser.email))) {
            loadMessages(); // Refresh current chat
        }
        loadChatUsers(); // Refresh chat list for last messages
    });

    // --- NOTIFICATIONS SYSTEM ---
    const notificationsBtn = document.getElementById("notifications-btn");
    const notificationsPanel = document.getElementById("notifications-panel");
    const closeNotificationsBtn = document.getElementById("close-notifications-btn");
    const notificationsList = document.getElementById("notifications-list");

    let notifications = [];

    notificationsBtn.addEventListener("click", () => {
        notificationsPanel.classList.toggle("hidden");
        if (!notificationsPanel.classList.contains("hidden")) {
            loadNotifications();
        }
    });

    closeNotificationsBtn.addEventListener("click", () => {
        notificationsPanel.classList.add("hidden");
    });

    async function loadNotifications() {
        try {
            const response = await fetch('/api/notifications', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            notifications = await response.json();
            renderNotifications();
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }

    function renderNotifications() {
        notificationsList.innerHTML = "";
        if (notifications.length === 0) {
            notificationsList.innerHTML = "<p class='text-muted' style='text-align: center; padding: 20px;'>No notifications yet.</p>";
            return;
        }

        notifications.forEach(notification => {
            const notificationItem = document.createElement("div");
            notificationItem.className = `notification-item ${notification.read ? '' : 'unread'}`;
            
            const timeAgo = new Date(notification.createdAt).toLocaleDateString();
            
            notificationItem.innerHTML = `
                <div class="notification-text">${notification.message}</div>
                <div class="notification-time">${timeAgo}</div>
            `;
            
            notificationItem.onclick = () => markAsRead(notification._id);
            notificationsList.appendChild(notificationItem);
        });
    }

    async function markAsRead(notificationId) {
        try {
            await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            loadNotifications(); // Refresh notifications
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    // Enhanced Socket.io notification listener
    socket.on('notification', (data) => {
        // Show browser notification if permission granted
        if (Notification.permission === 'granted') {
            new Notification('Skill Exchange', { body: data.message });
        }
        
        // Reload notifications if panel is open
        if (!notificationsPanel.classList.contains("hidden")) {
            loadNotifications();
        }
        
        // Update notification button to show indicator
        notificationsBtn.innerHTML = '🔔 <span style="color: #ff4757; font-size: 0.8em;">●</span>';
    });

    // Request notification permission on login
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }

    // --- ADMIN ACCESS ---
    // Check if user is admin (you can modify this logic based on your admin system)
    const isAdmin = currentUserProfile.email === 'admin@skillx.com'; // Example admin check

    if (isAdmin) {
        // Add admin button to navbar if user is admin
        const adminBtn = document.createElement("button");
        adminBtn.id = "admin-btn";
        adminBtn.className = "outline-btn outline-sm";
        adminBtn.textContent = "Admin";
        adminBtn.onclick = () => window.location.href = 'admin.html';
        document.querySelector(".nav-right").insertBefore(adminBtn, logoutBtn);
    }
});
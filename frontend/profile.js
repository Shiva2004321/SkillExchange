function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

const email = getQueryParam('email');
const profileName = document.getElementById('profile-name');
const profileEmail = document.getElementById('profile-email');
const profileMobile = document.getElementById('profile-mobile');
const profileInitial = document.getElementById('profile-initial');
const profileSkills = document.getElementById('profile-skills');
const profileLinks = document.getElementById('profile-links');
const profileMessage = document.getElementById('profile-message');
const profileBioContent = document.getElementById('profile-bio-content');
const telegramBtn = document.getElementById('telegram-btn');

const storedUser = localStorage.getItem('user');
const currentUser = storedUser ? JSON.parse(storedUser) : null;

function createLinkButton(label, url) {
    const btn = document.createElement('a');
    btn.href = url;
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.className = 'outline-btn outline-sm';
    btn.style.marginRight = '10px';
    btn.textContent = label;
    return btn;
}

function simpleMarkdownToHtml(markdown) {
    if (!markdown) return '<em>No bio yet.</em>';
    
    // Basic markdown parsing
    let html = markdown
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*)\*/gim, '<em>$1</em>')
        .replace(/!\[([^\]]*)\]\(([^)]*)\)/gim, '<img alt="$1" src="$2" />')
        .replace(/\[([^\]]*)\]\(([^)]*)\)/gim, '<a href="$2" target="_blank">$1</a>')
        .replace(/\n\n/gim, '</p><p>')
        .replace(/\n/gim, '<br>');
    
    return '<p>' + html + '</p>';
}

async function loadProfile() {
    if (!email) {
        profileName.textContent = 'Missing user';
        profileEmail.textContent = '';
        profileMessage.textContent = 'Open this page from a skill card or a profile link.';
        return;
    }

    try {
        const res = await fetch(`/api/user/${encodeURIComponent(email)}`);
        if (!res.ok) {
            profileName.textContent = 'User not found';
            profileEmail.textContent = '';
            profileMessage.textContent = 'The user may have been removed.';
            return;
        }

        const user = await res.json();

        profileName.textContent = user.name;
        profileEmail.textContent = user.email;
        profileMobile.textContent = user.mobile || '';
        profileInitial.textContent = user.name.charAt(0).toUpperCase();

        profileSkills.innerHTML = '';
        if (Array.isArray(user.skills) && user.skills.length > 0) {
            user.skills.forEach(skill => {
                const chip = document.createElement('div');
                chip.className = 'chip';
                chip.textContent = skill;
                profileSkills.appendChild(chip);
            });
        } else {
            profileSkills.innerHTML = '<p class="text-muted">No skills added.</p>';
        }

        profileLinks.innerHTML = '';
        if (user.github) profileLinks.appendChild(createLinkButton('GitHub', user.github));
        if (user.linkedin) profileLinks.appendChild(createLinkButton('LinkedIn', user.linkedin));
        if (user.telegram) {
            const t = user.telegram.replace(/^@/, '');
            profileLinks.appendChild(createLinkButton('Telegram', `https://t.me/${t}`));
        }

        profileBioContent.innerHTML = simpleMarkdownToHtml(user.profileMarkdown);

        if (currentUser && currentUser.email === user.email) {
            profileMessage.textContent = 'This is your public profile. Update details from the main dashboard.';
            document.getElementById('edit-profile-section').style.display = 'block';
            document.getElementById('manage-skills-btn').style.display = 'block';
            document.getElementById('edit-profile-link').onclick = () => {
                window.location.href = 'index.html';
            };

            // Add skill management functionality
            setupSkillManagement(user);
        } else {
            profileMessage.textContent = 'You can connect with this user using the links above.';
        }
    } catch (error) {
        profileName.textContent = 'Error loading profile';
        profileMessage.textContent = 'Please try again later.';
        console.error(error);
    }
}

function setupSkillManagement(user) {
    const manageSkillsBtn = document.getElementById('manage-skills-btn');
    const skillManagementSection = document.getElementById('skill-management-section');
    const addNewSkillBtn = document.getElementById('add-new-skill-btn');
    const editExistingSkillsBtn = document.getElementById('edit-existing-skills-btn');
    const skillListContainer = document.getElementById('skill-list-container');

    manageSkillsBtn.addEventListener('click', () => {
        skillManagementSection.style.display = skillManagementSection.style.display === 'none' ? 'block' : 'none';
    });

    addNewSkillBtn.addEventListener('click', () => {
        window.location.href = 'index.html'; // Redirect to main page to add skills
    });

    editExistingSkillsBtn.addEventListener('click', () => {
        // Load user's skills for editing
        loadUserSkillsForEditing(user);
    });

    function loadUserSkillsForEditing(user) {
        skillListContainer.innerHTML = '<p class="text-muted">Loading your skills...</p>';

        // Fetch user's skills from the database
        fetch('/api/skills')
            .then(response => response.json())
            .then(allSkills => {
                const userSkills = allSkills.filter(skill => skill.email === user.email);
                
                if (userSkills.length === 0) {
                    skillListContainer.innerHTML = '<p class="text-muted">You haven\'t added any skills yet. <button id="redirect-add-skill" class="neon-btn">Add Your First Skill</button></p>';
                    document.getElementById('redirect-add-skill').addEventListener('click', () => {
                        window.location.href = 'index.html';
                    });
                    return;
                }

                skillListContainer.innerHTML = '<h5>Your Skills</h5>';
                userSkills.forEach(skill => {
                    const skillItem = document.createElement('div');
                    skillItem.className = 'skill-edit-item';
                    skillItem.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; margin-bottom: 10px; background: rgba(255,255,255,0.02);';
                    
                    skillItem.innerHTML = `
                        <div>
                            <strong>${skill.skill}</strong>
                            <p class="text-muted" style="margin: 5px 0; font-size: 0.9em;">${skill.desc || 'No description'}</p>
                        </div>
                        <div>
                            <button class="edit-skill-btn outline-btn outline-sm" data-skill-id="${skill._id}" style="margin-right: 5px;">Edit</button>
                            <button class="delete-skill-btn outline-btn outline-sm" data-skill-id="${skill._id}" style="border-color: #e74c3c; color: #e74c3c;">Delete</button>
                        </div>
                    `;
                    
                    skillListContainer.appendChild(skillItem);
                });

                // Add event listeners for edit and delete buttons
                document.querySelectorAll('.edit-skill-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const skillId = e.target.dataset.skillId;
                        editSkill(skillId);
                    });
                });

                document.querySelectorAll('.delete-skill-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const skillId = e.target.dataset.skillId;
                        deleteSkill(skillId);
                    });
                });
            })
            .catch(error => {
                console.error('Error loading skills:', error);
                skillListContainer.innerHTML = '<p class="text-muted">Error loading skills. Please try again.</p>';
            });
    }

    function editSkill(skillId) {
        // Redirect to a detailed skill edit page or open a modal
        window.location.href = `my-skill.html?skillId=${skillId}&action=edit`;
    }

    function deleteSkill(skillId) {
        if (confirm('Are you sure you want to delete this skill? This action cannot be undone.')) {
            fetch(`/api/skills/${skillId}`, {
                method: 'DELETE'
            })
            .then(response => {
                if (response.ok) {
                    alert('Skill deleted successfully!');
                    // Reload the profile to reflect changes
                    loadProfile();
                } else {
                    alert('Failed to delete skill. Please try again.');
                }
            })
            .catch(error => {
                console.error('Error deleting skill:', error);
                alert('Error deleting skill. Please try again.');
            });
        }
    }
}

telegramBtn.addEventListener('click', () => {
    const handle = currentUser?.telegram ? currentUser.telegram.replace(/^@/, '') : 'SkillExchangeApp';
    window.open(`https://t.me/${handle}`, '_blank');
});

loadProfile();

function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

const skillId = getQueryParam('skillId');
const action = getQueryParam('action') || 'create';
const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

const skillForm = document.getElementById('skill-form');
const skillTitle = document.getElementById('skill-title');
const saveSkillBtn = document.getElementById('save-skill-btn');
const deleteSkillBtn = document.getElementById('delete-skill-btn');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const skillDetail = document.getElementById('skill-detail');
const skillStats = document.getElementById('skill-stats');

// Form elements
const skillNameInput = document.getElementById('skill-name-input');
const skillDescriptionInput = document.getElementById('skill-description-input');
const skillCategorySelect = document.getElementById('skill-category-select');
const skillTagsInput = document.getElementById('skill-tags-input');
const skillExperience = document.getElementById('skill-experience');
const skillPrice = document.getElementById('skill-price');
const skillAvailability = document.getElementById('skill-availability');

document.addEventListener("DOMContentLoaded", () => {
    // Check if user is logged in
    if (!currentUser.email) {
        window.location.href = 'index.html';
        return;
    }

    if (action === 'edit' && skillId) {
        loadSkillForEditing();
    } else if (action === 'create') {
        setupCreateMode();
    } else {
        showError();
    }

    setupEventListeners();
});

function setupCreateMode() {
    skillTitle.textContent = 'Add New Skill';
    deleteSkillBtn.style.display = 'none';
    skillStats.style.display = 'none';
    loadingState.style.display = 'none';
    skillDetail.style.display = 'block';

    // Load any saved draft
    loadDraft();
}

function setupEventListeners() {
    saveSkillBtn.addEventListener('click', saveSkill);
    deleteSkillBtn.addEventListener('click', deleteSkill);

    // Auto-save draft functionality (optional)
    let autoSaveTimeout;
    [skillNameInput, skillDescriptionInput, skillCategorySelect, skillTagsInput, skillExperience, skillPrice, skillAvailability].forEach(element => {
        element.addEventListener('input', () => {
            clearTimeout(autoSaveTimeout);
            autoSaveTimeout = setTimeout(() => {
                saveDraft();
            }, 2000);
        });
    });
}

async function loadSkillForEditing() {
    loadingState.style.display = 'block';
    skillDetail.style.display = 'none';
    errorState.style.display = 'none';

    try {
        const response = await fetch(`/api/skills/${skillId}`);
        if (!response.ok) {
            throw new Error('Skill not found');
        }

        const skill = await response.json();

        // Check if user owns this skill
        if (skill.email !== currentUser.email) {
            showError();
            return;
        }

        // Populate form
        skillNameInput.value = skill.skill || '';
        skillDescriptionInput.value = skill.desc || '';
        skillCategorySelect.value = skill.category || '';
        skillTagsInput.value = skill.tags ? skill.tags.join(', ') : '';
        skillExperience.value = skill.experience || 'beginner';
        skillPrice.value = skill.price || '';
        skillAvailability.value = skill.availability || '';

        skillTitle.textContent = `Edit: ${skill.skill}`;
        deleteSkillBtn.style.display = 'inline-block';

        // Load skill statistics
        await loadSkillStats();

        loadingState.style.display = 'none';
        skillDetail.style.display = 'block';
        skillStats.style.display = 'block';

    } catch (error) {
        console.error('Error loading skill:', error);
        showError();
    }
}

async function loadSkillStats() {
    try {
        // Load ratings
        const ratingsResponse = await fetch(`/api/ratings/${skillId}`);
        if (ratingsResponse.ok) {
            const ratingData = await ratingsResponse.json();
            document.getElementById('rating-count').textContent = ratingData.ratings.length;
            document.getElementById('average-rating').textContent = ratingData.averageRating.toFixed(1);
        }

        // Load requests (this would need a new API endpoint)
        // For now, we'll show 0
        document.getElementById('request-count').textContent = '0';

    } catch (error) {
        console.error('Error loading skill stats:', error);
    }
}

async function saveSkill() {
    const skillData = {
        user: currentUser.name,
        email: currentUser.email,
        skill: skillNameInput.value.trim(),
        desc: skillDescriptionInput.value.trim(),
        category: skillCategorySelect.value,
        tags: skillTagsInput.value ? skillTagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        experience: skillExperience.value,
        price: skillPrice.value.trim(),
        availability: skillAvailability.value.trim()
    };

    // Validation
    if (!skillData.skill || !skillData.desc || !skillData.category) {
        alert('Please fill in all required fields (Skill Name, Description, and Category).');
        return;
    }

    // Additional validation
    if (skillData.skill.length < 3) {
        alert('Skill name must be at least 3 characters long.');
        return;
    }

    if (skillData.desc.length < 10) {
        alert('Description must be at least 10 characters long.');
        return;
    }

    saveSkillBtn.disabled = true;
    saveSkillBtn.textContent = 'Saving...';

    try {
        let response;
        let oldSkillName = '';

        if (action === 'edit' && skillId) {
            // Get the old skill data to track name changes
            const oldSkillResponse = await fetch(`/api/skills/${skillId}`);
            if (oldSkillResponse.ok) {
                const oldSkill = await oldSkillResponse.json();
                oldSkillName = oldSkill.skill;
            }

            // Update existing skill
            response = await fetch(`/api/skills/${skillId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(skillData)
            });
        } else {
            // Create new skill
            response = await fetch('/api/skills', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(skillData)
            });
        }

        if (response.ok) {
            const result = await response.json();
            alert(action === 'edit' ? 'Skill updated successfully!' : 'Skill created successfully!');

            // Update user's skills in local storage
            if (action === 'edit') {
                // If editing, replace the old skill name with the new one
                const skillIndex = currentUser.skills.indexOf(oldSkillName);
                if (skillIndex > -1) {
                    currentUser.skills[skillIndex] = skillData.skill;
                } else if (!currentUser.skills.includes(skillData.skill)) {
                    currentUser.skills.push(skillData.skill);
                }
            } else {
                // If creating, add the new skill
                if (!currentUser.skills.includes(skillData.skill)) {
                    currentUser.skills.push(skillData.skill);
                }
            }
            localStorage.setItem('user', JSON.stringify(currentUser));

            // Clear any saved draft
            localStorage.removeItem(`skill-draft-${skillId || 'new'}`);

            // Redirect to profile
            window.location.href = `profile.html?email=${encodeURIComponent(currentUser.email)}`;
        } else {
            const error = await response.json();
            alert(`Failed to save skill: ${error.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error saving skill:', error);
        alert('Error saving skill. Please check your connection and try again.');
    } finally {
        saveSkillBtn.disabled = false;
        saveSkillBtn.textContent = 'Save Changes';
    }
}

async function deleteSkill() {
    if (!confirm('Are you sure you want to delete this skill? This action cannot be undone and will remove all associated ratings and requests.')) {
        return;
    }

    deleteSkillBtn.disabled = true;
    deleteSkillBtn.textContent = 'Deleting...';

    try {
        const response = await fetch(`/api/skills/${skillId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('Skill deleted successfully!');

            // Update user's skills in local storage
            const skillIndex = currentUser.skills.indexOf(skillNameInput.value);
            if (skillIndex > -1) {
                currentUser.skills.splice(skillIndex, 1);
                localStorage.setItem('user', JSON.stringify(currentUser));
            }

            // Redirect to profile
            window.location.href = `profile.html?email=${encodeURIComponent(currentUser.email)}`;
        } else {
            alert('Failed to delete skill. Please try again.');
        }
    } catch (error) {
        console.error('Error deleting skill:', error);
        alert('Error deleting skill. Please try again.');
    } finally {
        deleteSkillBtn.disabled = false;
        deleteSkillBtn.textContent = 'Delete Skill';
    }
}

function saveDraft() {
    // Optional: Save draft to localStorage
    const draft = {
        skill: skillNameInput.value,
        desc: skillDescriptionInput.value,
        category: skillCategorySelect.value,
        tags: skillTagsInput.value,
        experience: skillExperience.value,
        price: skillPrice.value,
        availability: skillAvailability.value,
        timestamp: new Date().toISOString()
    };

    localStorage.setItem(`skill-draft-${skillId || 'new'}`, JSON.stringify(draft));
}

function loadDraft() {
    // Optional: Load draft from localStorage
    const draft = localStorage.getItem(`skill-draft-${skillId || 'new'}`);
    if (draft) {
        try {
            const data = JSON.parse(draft);
            skillNameInput.value = data.skill || '';
            skillDescriptionInput.value = data.desc || '';
            skillCategorySelect.value = data.category || '';
            skillTagsInput.value = data.tags || '';
            skillExperience.value = data.experience || 'beginner';
            skillPrice.value = data.price || '';
            skillAvailability.value = data.availability || '';
        } catch (error) {
            console.error('Error loading draft:', error);
        }
    }
}

function showError() {
    loadingState.style.display = 'none';
    skillDetail.style.display = 'none';
    errorState.style.display = 'block';
}
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
            document.getElementById('edit-profile-link').onclick = () => {
                window.location.href = 'index.html';
            };
        } else {
            profileMessage.textContent = 'You can connect with this user using the links above.';
        }
    } catch (error) {
        profileName.textContent = 'Error loading profile';
        profileMessage.textContent = 'Please try again later.';
        console.error(error);
    }
}

telegramBtn.addEventListener('click', () => {
    const handle = currentUser?.telegram ? currentUser.telegram.replace(/^@/, '') : 'SkillExchangeApp';
    window.open(`https://t.me/${handle}`, '_blank');
});

loadProfile();

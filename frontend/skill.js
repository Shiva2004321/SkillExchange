function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

const skillId = getQueryParam('skillId');
const requestBtn = document.getElementById('request-skill-btn');
const titleEl = document.getElementById('skill-title');
const metaEl = document.getElementById('skill-meta');
const descEl = document.getElementById('skill-desc');
const ratingEl = document.getElementById('skill-rating');
const messageEl = document.getElementById('skill-message');
const linksEl = document.getElementById('skill-links');
const telegramBtn = document.getElementById('telegram-btn');

const token = localStorage.getItem('token');
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

function setMessage(text, isError = false) {
    messageEl.textContent = text;
    messageEl.style.color = isError ? 'var(--neon-purple)' : 'var(--text-muted)';
}

async function loadSkill() {
    if (!skillId) {
        titleEl.textContent = 'Missing skill ID';
        descEl.textContent = 'Please open this page via a skill card.';
        requestBtn.disabled = true;
        return;
    }

    titleEl.textContent = 'Loading skill...';
    setMessage('');

    try {
        const skillRes = await fetch(`/api/skills/${skillId}`);
        if (!skillRes.ok) {
            titleEl.textContent = 'Skill not found';
            descEl.textContent = 'This skill might have been removed.';
            requestBtn.disabled = true;
            return;
        }
        const skill = await skillRes.json();

        titleEl.textContent = skill.skill;
        descEl.textContent = skill.desc || 'No description provided yet.';
        metaEl.textContent = `Offered by @${skill.user}`;
        metaEl.innerHTML = `Offered by <a class="profile-link" href="profile.html?email=${encodeURIComponent(skill.email)}">@${skill.user}</a>`;

        // Fetch teacher profile so we can show social links
        let teacher = null;
        try {
            const userRes = await fetch(`/api/user/${encodeURIComponent(skill.email)}`);
            teacher = userRes.ok ? await userRes.json() : null;
        } catch (err) {
            console.warn('Failed to fetch teacher profile:', err);
        }

        linksEl.innerHTML = '';
        if (teacher) {
            if (teacher.github) {
                linksEl.appendChild(createLinkButton('GitHub', teacher.github));
            }
            if (teacher.linkedin) {
                linksEl.appendChild(createLinkButton('LinkedIn', teacher.linkedin));
            }
            if (teacher.telegram) {
                const t = teacher.telegram.replace(/^@/, '');
                linksEl.appendChild(createLinkButton('Telegram', `https://t.me/${t}`));
            }
        }

        // Rating
        let ratingInfo = { averageRating: 0, ratings: [] };
        try {
            const r = await fetch(`/api/ratings/${skill._id}`);
            ratingInfo = await r.json();
        } catch (err) {
            console.warn('Rating fetch failed', err);
        }

        const stars = '★'.repeat(Math.round(ratingInfo.averageRating)) + '☆'.repeat(5 - Math.round(ratingInfo.averageRating));
        ratingEl.innerHTML = `
            <span class="stars">${stars}</span>
            <span class="rating-text">(${ratingInfo.averageRating.toFixed(1)}) - ${ratingInfo.ratings.length} reviews</span>
        `;

        // Setup request button
        requestBtn.disabled = false;
        requestBtn.textContent = 'Request to Learn';

        if (!token || !currentUser) {
            setMessage('Login to send a request.', true);
            requestBtn.disabled = true;
            return;
        }

        if (currentUser.email === skill.email) {
            setMessage('This is your own skill. You cannot request it.', true);
            requestBtn.disabled = true;
            return;
        }

        requestBtn.onclick = async () => {
            requestBtn.disabled = true;
            setMessage('Sending request...', false);

            try {
                const payload = {
                    requesterName: currentUser.name,
                    requesterEmail: currentUser.email,
                    skillName: skill.skill,
                    teacherName: skill.user,
                    teacherEmail: skill.email
                };

                const res = await fetch('/api/requests', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    setMessage('✅ Request sent! The teacher will be notified.');
                    requestBtn.textContent = 'Requested';
                } else {
                    const err = await res.json();
                    setMessage(err.message || 'Failed to send request.', true);
                    requestBtn.disabled = false;
                }
            } catch (err) {
                setMessage('Network error, please try again.', true);
                requestBtn.disabled = false;
            }
        };

    } catch (error) {
        titleEl.textContent = 'Error loading skill';
        descEl.textContent = 'Please try again later.';
        console.error(error);
        requestBtn.disabled = true;
    }
}

telegramBtn.addEventListener('click', () => {
    const handle = currentUser?.telegram ? currentUser.telegram.replace(/^@/, '') : 'SkillExchangeApp';
    window.open(`https://t.me/${handle}`, '_blank');
});

loadSkill();

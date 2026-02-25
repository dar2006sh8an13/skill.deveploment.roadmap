document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roadmapId = urlParams.get('id');

    if (roadmapId) {
        fetchRoadmapDetails(roadmapId);
    } else {
        document.getElementById('roadmap-content').innerHTML = '<p>No roadmap specified.</p>';
    }
});

async function fetchRoadmapDetails(id) {
    console.log('🔍 Fetching roadmap with ID:', id);
    console.log('📍 API URL:', `${API_BASE_URL}/api/roadmaps/${id}`);

    try {
        const response = await fetch(`${API_BASE_URL}/api/roadmaps/${id}`);
        console.log('📡 Response status:', response.status, response.statusText);

        if (!response.ok) {
            throw new Error('Roadmap not found');
        }
        const data = await response.json();
        console.log('✅ Roadmap data loaded:', data.title);

        // Normalize data structure: API returns "roadmap" object with levels, frontend expects "levels" array
        if (data.roadmap && !data.levels) {
            data.levels = [
                { name: 'Beginner', items: data.roadmap.beginner || [] },
                { name: 'Intermediate', items: data.roadmap.intermediate || [] },
                { name: 'Advanced', items: data.roadmap.advanced || [] }
            ];
        }

        renderRoadmap(data);
    } catch (error) {
        console.error('❌ Error loading roadmap:', error);
        console.error('💡 Tip: Ensure the role ID matches the file name exactly (e.g., "frontend-developer")');
        document.getElementById('roadmap-header').innerHTML = '<h1>Roadmap not found</h1>';
    }
}

function renderRoadmap(data) {
    document.getElementById('roadmap-title').textContent = data.title;
    document.getElementById('roadmap-desc').textContent = data.description;

    // Display estimated time if available
    const metaContainer = document.getElementById('roadmap-meta');
    metaContainer.innerHTML = '';

    if (data.estimatedTime) {
        metaContainer.innerHTML += `
            <div style="background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 0.9rem;">
                ⏱ ${data.estimatedTime}
            </div>
        `;
    }

    // Sidebar Data
    document.getElementById('role-scope').textContent = data.careerScope || 'High demand in the current market with diverse opportunities.';
    document.getElementById('role-salary').textContent = data.salaryRange || '$80k - $150k+';

    const container = document.getElementById('roadmap-content');
    container.innerHTML = ''; // Clear loading state

    // Progress Calculation
    updateProgress(data);

    data.levels.forEach(level => {
        const levelDiv = document.createElement('div');
        levelDiv.className = 'level';

        const levelTitle = document.createElement('h3');
        levelTitle.textContent = level.name;
        levelTitle.style.cursor = 'pointer';
        levelTitle.innerHTML += ' <span style="font-size: 0.8em; color: #666;">▼</span>';

        const list = document.createElement('ul');
        list.className = 'topic-list';

        levelTitle.addEventListener('click', () => {
            const isHidden = list.style.display === 'none';
            list.style.display = isHidden ? 'block' : 'none';
            levelTitle.querySelector('span').textContent = isHidden ? '▼' : '▶';
        });

        level.items.forEach(item => {
            const li = document.createElement('div');
            li.className = `topic-item card ${item.status || 'required'}`;
            li.style.marginBottom = '15px';
            li.style.borderLeft = `4px solid ${item.status === 'optional' ? 'var(--text-muted)' : 'var(--primary-color)'}`;

            const uniqueId = `${data.id}-${level.name.replace(/\s+/g, '-')}-${item.topic.replace(/\s+/g, '-')}`;
            const isCompleted = localStorage.getItem(uniqueId) === 'true';

            const statusText = isCompleted ? 'Completed' : (item.status || 'required');
            const statusClass = isCompleted ? 'completed' : (item.status || 'required');

            li.innerHTML = `
                <div class="topic-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="topic-title" style="font-weight: 700; color: var(--text-main);">${item.topic}</span>
                    <span class="topic-status ${statusClass}" data-id="${uniqueId}" data-original-status="${item.status || 'required'}" 
                          style="cursor: pointer; font-size: 0.75rem; padding: 4px 10px; border-radius: 10px; font-weight: 700; text-transform: uppercase;">
                        ${statusText}
                    </span>
                </div>
                ${item.description ? `<div class="topic-desc" style="margin-top: 8px; font-size: 0.9rem; color: var(--text-muted);">${item.description}</div>` : ''}
            `;

            const statusBadge = li.querySelector('.topic-status');
            if (isCompleted) {
                statusBadge.style.background = '#2ecc71';
                statusBadge.style.color = 'white';
            } else {
                statusBadge.style.background = '#f1f3f6';
                statusBadge.style.color = 'var(--text-muted)';
            }

            statusBadge.addEventListener('click', (e) => {
                e.stopPropagation();
                const currentStatus = localStorage.getItem(uniqueId) === 'true';
                const newStatus = !currentStatus;
                localStorage.setItem(uniqueId, newStatus);

                if (newStatus) {
                    statusBadge.textContent = 'Completed';
                    statusBadge.style.background = '#2ecc71';
                    statusBadge.style.color = 'white';
                } else {
                    statusBadge.textContent = statusBadge.dataset.originalStatus;
                    statusBadge.style.background = '#f1f3f6';
                    statusBadge.style.color = 'var(--text-muted)';
                }
                updateProgress(data);
            });

            list.appendChild(li);
        });

        levelDiv.appendChild(levelTitle);
        levelDiv.appendChild(list);
        container.appendChild(levelDiv);
    });
}

function updateProgress(data) {
    let total = 0;
    let completed = 0;

    data.levels.forEach(level => {
        level.items.forEach(item => {
            total++;
            const uniqueId = `${data.id}-${level.name.replace(/\s+/g, '-')}-${item.topic.replace(/\s+/g, '-')}`;
            if (localStorage.getItem(uniqueId) === 'true') {
                completed++;
            }
        });
    });

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const progressBar = document.getElementById('roadmap-progress-bar');
    const progressText = document.getElementById('progress-text');

    if (progressBar) progressBar.style.width = `${percentage}%`;
    if (progressText) progressText.textContent = `${percentage}% Completed (${completed}/${total})`;
}

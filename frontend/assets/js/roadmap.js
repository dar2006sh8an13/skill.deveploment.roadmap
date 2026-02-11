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
    const header = document.getElementById('roadmap-header');
    const existingTime = document.getElementById('roadmap-time');
    if (existingTime) existingTime.remove();

    if (data.estimatedTime) {
        const timeP = document.createElement('p');
        timeP.id = 'roadmap-time';
        timeP.style.marginTop = '10px';
        timeP.style.fontWeight = 'bold';
        timeP.innerHTML = `⏱ Estimated Time: <span style="color: #ffd700;">${data.estimatedTime}</span>`;
        header.appendChild(timeP);
    }

    const container = document.getElementById('roadmap-content');
    container.innerHTML = ''; // Clear loading state

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
            const li = document.createElement('li');
            li.className = `topic-item ${item.status || 'required'}`;

            // Generate a unique ID for the item to save status
            const uniqueId = `${data.id}-${level.name.replace(/\s+/g, '-')}-${item.topic.replace(/\s+/g, '-')}`;
            const isCompleted = localStorage.getItem(uniqueId) === 'true';

            const statusText = isCompleted ? 'Completed' : (item.status || 'required');
            const statusClass = isCompleted ? 'completed' : (item.status || 'required');

            li.innerHTML = `
                <div class="topic-header">
                    <span class="topic-title">${item.topic}</span>
                    <span class="topic-status ${statusClass}" data-id="${uniqueId}" data-original-status="${item.status || 'required'}">${statusText}</span>
                </div>
                ${item.description ? `<div class="topic-desc">${item.description}</div>` : ''}
            `;

            // Add click event listener to the status badge
            const statusBadge = li.querySelector('.topic-status');
            statusBadge.style.cursor = 'pointer';
            statusBadge.title = "Click to toggle completion";

            statusBadge.addEventListener('click', (e) => {
                e.stopPropagation();

                const currentStatus = localStorage.getItem(uniqueId) === 'true';
                const newStatus = !currentStatus;

                localStorage.setItem(uniqueId, newStatus);

                if (newStatus) {
                    statusBadge.textContent = 'Completed';
                    statusBadge.className = 'topic-status completed';
                } else {
                    statusBadge.textContent = statusBadge.dataset.originalStatus;
                    statusBadge.className = `topic-status ${statusBadge.dataset.originalStatus}`;
                }
            });

            list.appendChild(li);
        });

        levelDiv.appendChild(levelTitle);
        levelDiv.appendChild(list);
        container.appendChild(levelDiv);
    });
}

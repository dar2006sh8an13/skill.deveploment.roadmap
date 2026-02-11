document.addEventListener('DOMContentLoaded', () => {
    // Check URL params for initial load
    const urlParams = new URL(window.location.href);
    const path = urlParams.pathname;

    // Simple router
    if (path.startsWith('/roadmaps/')) {
        const roleId = path.split('/')[2];
        if (roleId) {
            showRoadmapView(roleId);
        } else {
            initHome();
        }
    } else {
        initHome();
        // Check hash after a short delay to ensure rendering
        if (window.location.hash) {
            setTimeout(() => {
                const el = document.querySelector(window.location.hash);
                if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 500);
        }
    }

    // Back to home listener
    const backBtn = document.getElementById('back-to-home');
    if (backBtn) {
        backBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showHomeView();
            renderView('home');
        });
    }

    // Projects link listener
    const projectsLink = document.getElementById('nav-projects');
    if (projectsLink) {
        projectsLink.addEventListener('click', (e) => {
            e.preventDefault();
            renderView('projects');
        });
    }

    // Mobile Menu Logic
    const hamburger = document.getElementById('hamburger-menu');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });

        // Close menu when a link is clicked
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }

    // Mobile Dropdown Toggle
    const dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
        const dropbtn = dropdown.querySelector('.dropbtn');
        if (dropbtn) {
            dropbtn.addEventListener('click', (e) => {
                if (window.innerWidth <= 768) {
                    e.preventDefault();
                    dropdown.classList.toggle('active');
                }
            });
        }
    });
});

function renderView(view, initialFilter = 'all') {
    const homeView = document.getElementById('home-view');
    const roadmapView = document.getElementById('roadmap-view');
    const projectsView = document.getElementById('projects-view'); // New

    // Reset views
    homeView.style.display = 'none';
    roadmapView.style.display = 'none';
    if (projectsView) projectsView.style.display = 'none'; // Check existence

    if (view === 'home') {
        homeView.style.display = 'block';
        try { history.pushState({ view: 'home' }, '', '/'); } catch (e) { /* Ignore file:// protocol errors */ }
        if (!document.getElementById('roles-grid').hasChildNodes()) {
            fetchRoles(); // Only fetch roles if grid is empty
        }
    } else if (view === 'projects') {
        // New Projects View
        projectsView.style.display = 'block';
        try { history.pushState({ view: 'projects' }, '', '/projects'); } catch (e) { /* Ignore file:// protocol errors */ }
        initProjectsView(initialFilter);
    }
}

// Global helper for navigation
window.scrollToSection = function (id) {
    const el = document.getElementById(id);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
    }
};

// Global Projects Logic
async function initProjectsView(initialFilter = 'all') {
    const grid = document.getElementById('global-projects-grid');
    if (!grid) {
        console.error('Projects grid element not found!');
        return;
    }

    // Only show loader if we don't have data yet
    if (!window.allGlobalProjects || window.allGlobalProjects.length === 0) {
        grid.innerHTML = '<div class="loader">Loading projects...</div>';
    }

    try {
        // Only fetch if not already loaded to avoid redundant calls
        if (!window.allGlobalProjects || window.allGlobalProjects.length === 0) {
            const response = await fetch(`${API_BASE_URL}/api/projects`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            window.allGlobalProjects = await response.json();
            console.log('Projects loaded:', window.allGlobalProjects.length);
        }

        const allProjects = window.allGlobalProjects;
        setupProjectSearchAndFilter();

        // Ensure UI stays consistent - remove active class from all
        document.querySelectorAll('.global-filters .filter-btn').forEach(b => b.classList.remove('active'));

        // Apply initial filter
        const activeBtn = document.querySelector(`.global-filters .filter-btn[data-filter="${initialFilter}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
            // Trigger the click logic manually to ensure filtering happens
            // We can't just click() because we might be in a loop or race condition if not careful
            // ensuring setupProjectSearchAndFilter is idempotent or safe
            activeBtn.click();
        } else {
            console.warn(`Filter button not found for: ${initialFilter}, falling back to All`);
            // Fallback to 'all'
            const allBtn = document.querySelector(`.global-filters .filter-btn[data-filter="all"]`);
            if (allBtn) {
                allBtn.classList.add('active');
                allBtn.click();
            } else {
                // Direct render if buttons fail
                renderGlobalProjects(allProjects);
            }
        }

    } catch (err) {
        console.error('Error loading projects:', err);
        grid.innerHTML = `<p class="error">Failed to load projects: ${err.message}. Please check connection.</p>`;
    }
}

function renderGlobalProjects(projects) {
    const grid = document.getElementById('global-projects-grid');
    if (projects.length === 0) {
        grid.innerHTML = '<p>No projects found matching your criteria.</p>';
        return;
    }

    grid.innerHTML = projects.map(p => `
        <div class="project-card-enhanced ${p.level}" data-level="${p.level}">
            <div class="project-header">
                <span class="badge ${p.level ? p.level.toLowerCase() : 'beginner'}">${p.level || 'Beginner'}</span>
            <span class="badge" style="background:#eee; color:#333; font-size:0.7em;">
                ${p.sourceType && p.sourceName ? `${p.sourceType}: ${p.sourceName}` : 'Curated Project'}
            </span>
                <h4>${p.title}</h4>
            </div>
            <p class="project-problem"><strong>Problem:</strong> ${p.problemStatement || 'Build this to learn.'}</p>
            <p class="project-desc">${p.description}</p>
            
            ${(p.keyConcepts || p.learningOutcomes) ? `
            <div class="project-concepts">
                <strong>Key Concepts:</strong> ${(p.keyConcepts || p.learningOutcomes).join(', ')}
            </div>
            ` : ''}

            <div class="project-tech">
                ${(p.techStack || []).map(t => `<span class="tech-tag">${t}</span>`).join('')}
            </div>
            
            <button class="view-project-btn" onclick="toggleProjectDetails(this)">View Details</button>
            
            <div class="project-details" style="display: none;">
                ${p.implementationPlan ? `
                <h5>Implementation Plan:</h5>
                <ul class="impl-steps">
                    ${p.implementationPlan.map(s => `<li>${s}</li>`).join('')}
                </ul>
                ` : ''}

                    <div class="project-meta-grid">
                    ${p.deploymentStrategy ? `<div><strong>Deployment:</strong> ${p.deploymentStrategy}</div>` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

function setupProjectSearchAndFilter() {
    const searchInput = document.getElementById('project-search');
    const filterBtns = document.querySelectorAll('.global-filters .filter-btn');

    // Filter Logic
    function filterProjects() {
        const query = searchInput.value.toLowerCase();
        const activeBtn = document.querySelector('.global-filters .filter-btn.active');
        const activeFilter = activeBtn ? activeBtn.getAttribute('data-filter') : 'all';

        const filtered = window.allGlobalProjects.filter(p => {
            // 1. Search Query
            const matchesSearch = p.title.toLowerCase().includes(query) ||
                p.description.toLowerCase().includes(query) ||
                (p.techStack && p.techStack.some(t => t.toLowerCase().includes(query)));

            // 2. Category/Level Filter
            let matchesFilter = false;

            if (activeFilter === 'all') {
                matchesFilter = true;
            } else if (['Beginner', 'Intermediate', 'Advanced', 'Capstone'].includes(activeFilter)) {
                matchesFilter = p.level === activeFilter;
            } else if (activeFilter === 'AI & ML') {
                matchesFilter = (p.sourceName && (p.sourceName.includes('AI') || p.sourceName.includes('Machine Learning'))) ||
                    (p.category && (p.category.includes('AI') || p.category.includes('Machine Learning'))) ||
                    (p.techStack && p.techStack.some(t => t.includes('AI') || t.includes('ML') || t.includes('Python')));
            } else if (activeFilter === 'DevOps & Cloud') {
                matchesFilter = (p.sourceName && (p.sourceName.includes('DevOps') || p.sourceName.includes('Cloud') || p.sourceName.includes('AWS'))) ||
                    (p.category && (p.category === 'DevOps' || p.category === 'Cloud')) ||
                    (p.techStack && p.techStack.some(t => ['Docker', 'Kubernetes', 'AWS', 'Terraform'].some(k => t.includes(k))));
            } else if (activeFilter === 'Open Source') {
                matchesFilter = p.category === 'Open Source' || (p.techStack && p.techStack.includes('Git'));
            } else {
                // Fallback for direct match
                matchesFilter = p.level === activeFilter || p.category === activeFilter || p.sourceName === activeFilter;
            }

            return matchesSearch && matchesFilter;
        });

        renderGlobalProjects(filtered);
    }

    searchInput.addEventListener('input', filterProjects);

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.global-filters .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterProjects();
        });
    });
}

function initHome() {
    fetchRoles();
}

function showHomeView() {
    document.getElementById('home-view').style.display = 'block';
    document.getElementById('roadmap-view').style.display = 'none';
    history.pushState(null, '', '/');
}

async function showRoadmapView(roleId) {
    console.log('🔍 Loading roadmap view for role:', roleId);

    document.getElementById('home-view').style.display = 'none';
    const roadmapView = document.getElementById('roadmap-view');
    roadmapView.style.display = 'block';

    // Clear previous content or show loading
    document.getElementById('roadmap-title').textContent = 'Loading...';
    document.getElementById('roadmap-content').innerHTML = '';

    try {
        console.log('📍 Fetching from:', `${API_BASE_URL}/api/roadmaps/${roleId}`);
        const response = await fetch(`${API_BASE_URL}/api/roadmaps/${roleId}`);
        console.log('📡 Response status:', response.status, response.statusText);

        if (!response.ok) throw new Error('Role not found');

        const data = await response.json();
        console.log('✅ Role data loaded:', data.title);

        renderRoadmap(data);
        history.pushState(null, '', `/roadmaps/${roleId}`);
    } catch (error) {
        console.error('❌ Error loading role:', error);
        console.error('💡 Tip: Role ID should match file name (e.g., "frontend-developer")');
        document.getElementById('roadmap-title').textContent = 'Role not found';
    }
}

async function fetchRoles() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/roadmaps`);
        const roles = await response.json();
        const grid = document.getElementById('roles-grid');
        grid.innerHTML = '';

        const skillsGrid = document.getElementById('skills-grid');
        if (skillsGrid) skillsGrid.innerHTML = '';

        roles.forEach(role => {
            if (role.type === 'role') {
                const card = document.createElement('div');
                card.className = 'card role-card';
                card.innerHTML = `
                    <h3>${role.icon ? role.icon + ' ' : ''}${role.title}</h3>
                    <p>${role.description}</p>
                `;
                card.addEventListener('click', () => showRoadmapView(role.id));
                grid.appendChild(card);
            } else if (role.type === 'skill') {
                const card = document.createElement('div');
                card.className = 'card skill-card'; // Add specific class for styling if needed
                card.innerHTML = `
                    <h3>${role.icon ? role.icon + ' ' : ''}${role.title}</h3>
                    <p>${role.description}</p>
                `;
                // For skills, we open the modal directly
                card.addEventListener('click', () => loadSkill(role.id));
                if (skillsGrid) skillsGrid.appendChild(card);
            }
        });

        // Search functionality
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                document.querySelectorAll('.role-card, .skill-card').forEach(card => {
                    const text = card.textContent.toLowerCase();
                    card.style.display = text.includes(term) ? 'block' : 'none';
                });
            });
        }

    } catch (error) {
        console.error('Error fetching roles:', error);
    }
}

function renderRoadmap(data) {
    document.getElementById('roadmap-title').textContent = data.title;
    document.getElementById('roadmap-desc').textContent = data.description;

    // Sidebar Data
    document.getElementById('role-scope').textContent = data.careerScope || 'High demand.';

    const companiesContainer = document.getElementById('role-companies');
    companiesContainer.innerHTML = '';
    if (data.companiesHiring) {
        data.companiesHiring.forEach(co => {
            const span = document.createElement('span');
            span.className = 'tag';
            span.textContent = co;
            companiesContainer.appendChild(span);
        });
    }

    document.getElementById('role-salary').textContent = "Approx $80k - $150k+"; // Placeholder if not in JSON

    // Roadmap Steps
    const content = document.getElementById('roadmap-content');
    content.innerHTML = '';

    ['beginner', 'intermediate', 'advanced'].forEach(level => {
        if (data.roadmap && data.roadmap[level]) {
            const section = document.createElement('div');
            section.className = 'roadmap-level';

            section.innerHTML = `
                <div class="level-marker"></div>
                <h3 class="level-title">${capitalize(level)}</h3>
                <div class="skill-group">
                    ${data.roadmap[level].map(item => `
                        <div class="skill-item ${item.status || 'required'}" onclick="loadSkill('${item.skillId || ''}')">
                            <h4>${item.name}</h4>
                            <p>${item.desc}</p>
                        </div>
                    `).join('')}
                </div>
            `;

            // Projects for this level - logic moved to renderProjects below
            content.appendChild(section);
        }
    });

    // Render Enhanced Projects Section
    if (data.projects && data.projects.length > 0) {
        renderProjects(data.projects);
    }

    // Render Tools
    if (data.tools) {
        const toolsSection = document.createElement('div');
        toolsSection.className = 'roadmap-level';
        toolsSection.innerHTML = `
            <div class="level-marker" style="background: #6c757d; border-color: #6c757d;"></div>
            <h3 class="level-title">Tools & Technologies</h3>
            <div class="tags">
                ${data.tools.map(t => `<span class="tag" style="background: #e2e6ea;">${t}</span>`).join('')}
            </div>
        `;
        content.appendChild(toolsSection);
    }
}

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// Modal Logic
const modal = document.getElementById('skill-modal');
const closeModal = document.querySelector('.close-modal');
const modalBody = document.getElementById('modal-body');

if (closeModal) {
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });
}

window.addEventListener('click', (event) => {
    if (event.target == modal) {
        modal.style.display = 'none';
    }
});

async function loadSkill(skillId) {
    if (!skillId) return;

    modal.style.display = 'block';
    modalBody.innerHTML = '<div class="loading">Loading skill details...</div>';

    try {
        const response = await fetch(`${API_BASE_URL}/api/skills/${skillId}`);
        if (!response.ok) throw new Error('Skill details not found');

        const skill = await response.json();
        renderSkillDetails(skill);
    } catch (error) {
        modalBody.innerHTML = `
            <div class="error">
                <h3>Skill Guide Coming Soon</h3>
                <p>We are working on the detailed guide for this skill.</p>
            </div>
        `;
    }
}

function renderSkillDetails(skill) {
    let html = `
        <div class="modal-header-section">
            <h2 class="modal-title">${skill.name}</h2>
            <p class="modal-subtitle">${skill.overview}</p>
        </div>
    `;

    // Prerequisites
    if (skill.prerequisites && skill.prerequisites.length > 0) {
        html += `
            <div class="detail-section">
                <h3>Prerequisites</h3>
                <ul class="detail-list">
                    ${skill.prerequisites.map(p => `<li>${p}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    // Core Concepts 
    if (skill.concepts && skill.concepts.length > 0) {
        html += `
            <div class="detail-section">
                <h3>Core Concepts</h3>
                <ul class="detail-list">
                    ${skill.concepts.map(c => `<li>${c}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    // Best Practices
    if (skill.bestPractices && skill.bestPractices.length > 0) {
        html += `
            <div class="detail-section">
                <h3>Best Practices</h3>
                 <ul class="detail-list" style="list-style: none; padding-left: 0;">
                    ${skill.bestPractices.map(bp => `<li style="margin-bottom: 5px;"><span style="color: #2ecc71; margin-right: 8px;">✓</span>${bp}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    // Common Mistakes
    if (skill.commonMistakes && skill.commonMistakes.length > 0) {
        html += `
            <div class="detail-section">
                <h3>Common Mistakes</h3>
                 <ul class="detail-list" style="list-style: none; padding-left: 0;">
                    ${skill.commonMistakes.map(cm => `<li style="margin-bottom: 5px;"><span style="color: #e74c3c; margin-right: 8px;">✗</span>${cm}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    // Projects
    if (skill.projects && skill.projects.length > 0) {
        html += `
            <div class="detail-section">
                <h3>Real-World Projects</h3>
                <div class="projects-grid">
                    ${skill.projects.map(p => `
                        <div class="project-card-enhanced ${p.level}" data-level="${p.level}" style="border: 1px solid #eee;">
                            <div class="project-header">
                                <span class="badge ${p.level.toLowerCase()}">${p.level}</span>
                                <h4>${p.title}</h4>
                            </div>
                            <p class="project-problem"><strong>Problem:</strong> ${p.problemStatement || 'Build this to learn.'}</p>
                            <p class="project-desc">${p.description}</p>
                            
                            ${p.keyConcepts ? `
                            <div class="project-concepts">
                                <strong>Key Concepts:</strong> ${p.keyConcepts.join(', ')}
                            </div>
                            ` : ''}

                            <div class="project-tech">
                                ${(p.techStack || []).map(t => `<span class="tech-tag">${t}</span>`).join('')}
                            </div>
                            
                            <button class="view-project-btn" onclick="toggleProjectDetails(this)">View Details</button>
                            
                            <div class="project-details" style="display: none;">
                                ${p.implementationPlan ? `
                                <h5>Implementation Plan:</h5>
                                <ul class="impl-steps">
                                    ${p.implementationPlan.map(s => `<li>${s}</li>`).join('')}
                                </ul>
                                ` : ''}

                                 <div class="project-meta-grid">
                                    ${p.deploymentStrategy ? `<div><strong>Deployment:</strong> ${p.deploymentStrategy}</div>` : ''}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Roadmap / Learning Order
    if (skill.roadmap) {
        html += `
            <div class="detail-section">
                <h3>Learning Path</h3>
                <div class="roadmap-grid">
                    <div class="roadmap-col">
                        <h4>Beginner</h4>
                        <ul class="detail-list">${(skill.roadmap.beginner || []).map(i => `<li>${i}</li>`).join('')}</ul>
                    </div>
                     <div class="roadmap-col">
                        <h4>Intermediate</h4>
                        <ul class="detail-list">${(skill.roadmap.intermediate || []).map(i => `<li>${i}</li>`).join('')}</ul>
                    </div>
                     <div class="roadmap-col">
                        <h4>Advanced</h4>
                        <ul class="detail-list">${(skill.roadmap.advanced || []).map(i => `<li>${i}</li>`).join('')}</ul>
                    </div>
                </div>
            </div>
        `;
    }

    // Resources
    if (skill.resources && skill.resources.length > 0) {
        html += `
            <div class="detail-section">
                <h3>Recommended Resources</h3>
                <ul class="detail-list">
                    ${skill.resources.map(r => `<li><a href="${r.url}" target="_blank" style="color: #007bff; text-decoration: none;">${r.name} ↗</a></li>`).join('')}
                </ul>
            </div>
        `;
    }

    modalBody.innerHTML = html;
}

function renderProjects(projects) {
    const content = document.getElementById('roadmap-content');

    // Check if projects section already exists to avoid duplicates
    let projectsSection = content.querySelector('.projects-section');
    if (!projectsSection) {
        projectsSection = document.createElement('div');
        projectsSection.className = 'projects-section';
        content.appendChild(projectsSection);
    }

    projectsSection.innerHTML = `

        <h3 class="level-title">Real-World Projects</h3>
        <div class="project-filters">
            <button class="filter-btn active" data-filter="all">All</button>
            <button class="filter-btn" data-filter="Beginner">Beginner</button>
            <button class="filter-btn" data-filter="Intermediate">Intermediate</button>
            <button class="filter-btn" data-filter="Advanced">Advanced</button>
            <button class="filter-btn" data-filter="Capstone">Capstone</button>
        </div>
        <div class="projects-grid">
            ${projects.map(p => `
                <div class="project-card-enhanced ${p.level}" data-level="${p.level}">
                    <div class="project-header">
                        <span class="badge ${p.level.toLowerCase()}">${p.level}</span>
                        <h4>${p.title}</h4>
                    </div>
                    <p class="project-problem"><strong>Problem:</strong> ${p.problemStatement || 'Build this to learn.'}</p>
                    <p class="project-desc">${p.description}</p>
                    
                    ${p.keyConcepts ? `
                    <div class="project-concepts">
                        <strong>Key Concepts:</strong> ${p.keyConcepts.join(', ')}
                    </div>
                    ` : ''}

                    <div class="project-tech">
                        ${(p.techStack || []).map(t => `<span class="tech-tag">${t}</span>`).join('')}
                    </div>
                    
                    <button class="view-project-btn" onclick="toggleProjectDetails(this)">View Details</button>
                    
                    <div class="project-details" style="display: none;">
                        ${p.learningOutcomes ? `
                        <h5>Learning Outcomes:</h5>
                        <ul class="impl-steps">
                            ${p.learningOutcomes.map(s => `<li>${s}</li>`).join('')}
                        </ul>
                        ` : ''}

                        ${p.implementationPlan ? `
                        <h5>Implementation Plan:</h5>
                        <ul class="impl-steps">
                            ${p.implementationPlan.map(s => `<li>${s}</li>`).join('')}
                        </ul>
                        ` : ''}
                        
                        ${p.guide ? `
                        <h5>Implementation Guide:</h5>
                        <ul>
                            ${p.guide.map(s => `<li>${s}</li>`).join('')}
                        </ul>
                        ` : ''}

                        ${p.commonPitfalls ? `
                        <h5>Common Pitfalls:</h5>
                        <ul>
                            ${p.commonPitfalls.map(s => `<li>${s}</li>`).join('')}
                        </ul>
                        ` : ''}

                         <div class="project-meta-grid">
                            ${p.deploymentStrategy ? `<div><strong>Deployment:</strong> ${p.deploymentStrategy}</div>` : ''}
                            ${p.securityConsiderations ? `<div><strong>Security:</strong> ${p.securityConsiderations}</div>` : ''}
                        </div>
                    </div>
                </div>
            `).join('')
        }
        </div >
    `;

    // Filter Logic
    const filters = projectsSection.querySelectorAll('.filter-btn');
    filters.forEach(btn => {
        btn.addEventListener('click', () => {
            filters.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.getAttribute('data-filter');

            const cards = projectsSection.querySelectorAll('.project-card-enhanced');
            cards.forEach(card => {
                if (filter === 'all' || card.getAttribute('data-level') === filter) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
}

function toggleProjectDetails(btn) {
    console.log('Toggle clicked', btn);
    const details = btn.nextElementSibling;
    if (details.style.display === 'none') {
        details.style.display = 'block';
        btn.textContent = 'Hide Details';
    } else {
        details.style.display = 'none';
        btn.textContent = 'View Details';
    }
}
window.toggleProjectDetails = toggleProjectDetails;

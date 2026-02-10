// Fetch and organize magazines
async function loadMagazines() {
    try {
        const response = await fetch('/api/magazines');
        const magazines = await response.json();
        if (!magazines || magazines.length === 0) {
            document.getElementById('magazineSections').innerHTML =
                '<div class="alert alert-info">No magazines available in the archive.</div>';
            return;
        }
        // Group magazines by year
        const magazinesByYear = magazines.reduce((acc, magazine) => {
            // Extract year from date field or use year field
            let year;
            if (magazine.year) {
                year = magazine.year;
            } else if (magazine.date) {
                year = new Date(magazine.date).getFullYear();
            } else {
                year = 'Unknown';
            }
            if (!acc[year]) {
                acc[year] = [];
            }
            acc[year].push({ ...magazine, displayYear: year });
            return acc;
        }, {});
        // Sort years in descending order
        const sortedYears = Object.keys(magazinesByYear).sort((a, b) => {
            if (a === 'Unknown') return 1;
            if (b === 'Unknown') return -1;
            return b - a;
        });
        // Generate year navigation (excluding "Unknown")
        const yearList = document.getElementById('yearList');
        const validYears = sortedYears.filter(year => year !== 'Unknown');
        yearList.innerHTML = validYears.map(year => `
            <div class="year-nav-item" data-year="${year}">
                ${year}
            </div>
        `).join('');

        // Generate magazine sections for each year
        const magazineSections = document.getElementById('magazineSections');
        magazineSections.innerHTML = sortedYears.map(year => {
            // Sort magazines by title within each year
            const yearMagazines = magazinesByYear[year].sort((a, b) =>
                a.title.localeCompare(b.title)
            );

            return `
                <section id="year-${year}" class="year-section">
                    <h2 class="mb-4">${year === 'Unknown' ? 'Unknown Publication Date' : year}</h2>
                    <div class="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-3 magazine-grid">
                        ${yearMagazines.map(magazine => `
                            <div class="col">
                                <a href="${magazine.link || `/flipbook/${magazine.id}`}" class="text-decoration-none">
                                    <div class="magazine-card">
                                        <div class="image-container">
                                            <img src="${magazine.cover || 'https://via.placeholder.com/300x400?text=Magazine+Cover'}" alt="${magazine.title} Cover" class="magazine-image" onerror="this.src='https://via.placeholder.com/300x400?text=Magazine+Cover'">
                                        </div>
                                        <div class="magazine-content">
                                            <h5 class="card-title">${magazine.title}</h5>
                                            <div class="card-meta">
                                                ${magazine.issue ? `Issue ${magazine.issue}` : ''}
                                                ${magazine.volume ? ` • Volume ${magazine.volume}` : ''}
                                                ${magazine.date ? ` • ${new Date(magazine.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : ''}
                                            </div>
                                            ${magazine.description ? `<p class="card-description">${magazine.description}</p>` : ''}
                                        </div>
                                    </div>
                                </a>
                            </div>
                        `).join('')}
                    </div>
                </section>
            `;
        }).join('');

        // Add click handlers for year navigation
        document.querySelectorAll('.year-nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const year = item.getAttribute('data-year');

                // Remove active class from all items
                document.querySelectorAll('.year-nav-item').forEach(el => {
                    el.classList.remove('active');
                });

                // Add active class to clicked item
                item.classList.add('active');

                // Scroll to the section
                const targetSection = document.getElementById(`year-${year}`);
                if (targetSection) {
                    targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });

        // Highlight current section on scroll (only for valid years)
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const year = entry.target.id.replace('year-', '');
                    if (year !== 'Unknown') {
                        document.querySelectorAll('.year-nav-item').forEach(item => {
                            item.classList.remove('active');
                            if (item.getAttribute('data-year') === year) {
                                item.classList.add('active');
                            }
                        });
                    }
                }
            });
        }, observerOptions);

        // Observe each year section
        sortedYears.forEach(year => {
            const section = document.getElementById(`year-${year}`);
            if (section) {
                observer.observe(section);
            }
        });

        // Set first valid year as active initially
        if (validYears.length > 0) {
            const firstYearItem = document.querySelector(`[data-year="${validYears[0]}"]`);
            if (firstYearItem) {
                firstYearItem.classList.add('active');
            }
        }
    } catch (error) {
        console.error('Error loading magazines:', error);
        document.getElementById('magazineSections').innerHTML = '<div class="alert alert-danger">Failed to load magazines. Please try again later.</div>';
    }
}

// Load magazines when page loads
document.addEventListener('DOMContentLoaded', loadMagazines);
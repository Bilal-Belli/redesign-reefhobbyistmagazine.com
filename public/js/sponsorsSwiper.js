
// Pure JavaScript solution (add this script instead of Swiper version)
class PureJSSponsorsBanner {
    constructor() {
        this.container = document.getElementById('sponsorSlides');
        this.animationId = null;
        this.speed = 0.3; // Pixels per frame - adjust for speed
        this.init();
    }

    async init() {
        try {
            const sponsors = await this.fetchSponsors();
            this.renderSponsors(sponsors);
            this.startAnimation();
            this.handleResponsive();
        } catch (error) {
            console.error('Error:', error);
            this.showFallback();
        }
    }

    async fetchSponsors() {
        const response = await fetch('/api/sponsors');
        return await response.json();
    }

    formatWebsiteLink(url) {
        if (!url) return '#';
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        return `https://${url}`;
    }

    renderSponsors(sponsors) {
        if (!sponsors || sponsors.length === 0) {
            this.container.innerHTML = '<div>No sponsors</div>';
            return;
        }
        // Create duplicated content for seamless loop
        const slides = [...sponsors, ...sponsors, ...sponsors];
        this.container.innerHTML = slides.map(sponsor => `
            <div class="sponsor-item" style="flex: 0 0 auto; display: flex; align-items: center; justify-content: center; padding: 0 20px;">
                ${sponsor.website ?
                `<a href="${this.formatWebsiteLink(sponsor.website)}" target="_blank">
                <img src="${sponsor.image}" alt="${sponsor.title}" style=" width: 80px; height: 40px; object-fit: contain; filter: grayscale(100%); opacity: 0.7; transition: all 0.3s;">
            </a>` :
                `<img src="${sponsor.image}" alt="${sponsor.title}" style="width: 80px; height: 40px; object-fit: contain; filter: grayscale(100%); opacity: 0.7; transition: all 0.3s;">`
            }
            </div>
        `).join('');

        // Add hover effects
        this.container.querySelectorAll('img').forEach(img => {
            img.addEventListener('mouseenter', () => {
                img.style.filter = 'grayscale(0%)';
                img.style.opacity = '1';
            });
            img.addEventListener('mouseleave', () => {
                img.style.filter = 'grayscale(100%)';
                img.style.opacity = '0.7';
            });
        });
        // Set container styles
        this.container.style.display = 'flex';
        this.container.style.width = 'max-content';
    }

    startAnimation() {
        let position = 0;
        const containerWidth = this.container.scrollWidth / 3; // Since we tripled the items
        const animate = () => {
            position -= this.speed;
            // Reset position when scrolled through one set
            if (Math.abs(position) >= containerWidth) {
                position = 0;
            }
            this.container.style.transform = `translateX(${position}px)`;
            this.animationId = requestAnimationFrame(animate);
        };
        animate();
    }

    handleResponsive() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (this.animationId) {
                    cancelAnimationFrame(this.animationId);
                }
                this.startAnimation();
            }, 250);
        });
    }

    showFallback() {
        this.container.innerHTML = `
            <div style="text-align: center; padding: 20px; width: 100%;">
                Sponsors will be displayed here
            </div>
        `;
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.sponsorsBanner = new PureJSSponsorsBanner();
});
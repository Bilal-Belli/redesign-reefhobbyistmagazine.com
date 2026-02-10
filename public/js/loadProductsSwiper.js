
fetch("/api/products")
    .then(r => {
        if (!r.ok) throw new Error("API failed");
        return r.json();
    })
    .then(products => {
        console.log("PRODUCTS:", products);
        const active = products.filter(p => p.status === "active");

        if (!active.length) {
            console.warn("NO ACTIVE PRODUCTS");
            return;
        }

        const wrap = document.getElementById("newProducts");

        // Create slides with cursor control
        wrap.innerHTML = active.map(p => `
            <div class="swiper-slide">
                <div class="image-container" style="position: relative; display: inline-block;">
                    <a href="${p.website}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: block;">
                        <img src="${p.image}" alt="${p.title}" style="width: 100%; height: auto; display: block;">
                    </a>
                </div>
            </div>
        `).join('');

        // Initialize Swiper with auto-slide
        const swiper = new Swiper('#newProductsSwiper', {
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
            autoplay: {
                delay: 5000, // 5 seconds
                disableOnInteraction: false, // Continue autoplay after user interaction
            },
            loop: true, // Enable infinite looping
            speed: 500, // Transition speed in ms
        });

        // Add cursor control to all image links
        const imageLinks = wrap.querySelectorAll('a[href]');

        imageLinks.forEach(link => {
            // Create wrapper div for the image
            const img = link.querySelector('img');
            if (img) {
                const wrapper = document.createElement('div');
                wrapper.style.position = 'relative';
                wrapper.style.display = 'inline-block';
                wrapper.style.cursor = 'pointer'; // Set pointer cursor

                // Replace the link with wrapper
                link.parentNode.insertBefore(wrapper, link);
                wrapper.appendChild(link);

                // Add mouse events to change cursor
                wrapper.addEventListener('mouseenter', () => {
                    wrapper.style.cursor = 'pointer';
                });

                wrapper.addEventListener('mouseleave', () => {
                    wrapper.style.cursor = 'pointer';
                });

                // Prevent default pointer on the image itself
                img.style.cursor = 'pointer';
            }
        });

        // Alternative: Add cursor style directly to all image containers
        const containers = wrap.querySelectorAll('.image-container');
        containers.forEach(container => {
            container.style.cursor = 'pointer';
        });

    })
    .catch(e => console.error("PRODUCT CAROUSEL ERROR:", e));
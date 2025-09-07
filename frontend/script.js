// Enhanced Galeria zdjęć - dynamic carousel functionality
    let galleryImages = [];
    let currentIndex = 1; // Start from center image
    let isAnimating = false; // Prevent animation overlap

    // Initialize gallery from DOM
    function initializeGallery() {
        const slideImages = document.querySelectorAll(".image-slide img");
        galleryImages = [];

        slideImages.forEach((img, index) => {
                // Get src from data-src if available (lazy loading) or src
                const imageSrc = img.dataset.src || img.src;
                if (imageSrc) {
                        galleryImages.push({
                                src: imageSrc,
                                alt: img.alt || `Gallery image ${index + 1}`,
                        });
                }
        });

        // If we have fewer than 3 images, duplicate them to ensure smooth carousel
        const originalLength = galleryImages.length;
        while (galleryImages.length < 3 && originalLength > 0) {
                galleryImages = [
                        ...galleryImages,
                        ...galleryImages.slice(
                                0,
                                Math.min(originalLength, 3 - galleryImages.length)
                        ),
                ];
        }

        // Set initial index to center position
        if (galleryImages.length > 0) {
                currentIndex = galleryImages.length > 1 ? 1 : 0;
        }

        // Preload images for better performance
        preloadGalleryImages();
    }

    // Preload gallery images for better performance
    function preloadGalleryImages() {
        if (typeof window.requestIdleCallback === "function") {
                // Use requestIdleCallback if available for better performance
                window.requestIdleCallback(() => {
                        galleryImages.forEach((img) => {
                                const link = document.createElement("link");
                                link.rel = "preload";
                                link.as = "image";
                                link.href = img.src;
                                document.head.appendChild(link);
                        });
                });
        } else {
                // Fallback for browsers without requestIdleCallback
                setTimeout(() => {
                        galleryImages.forEach((img) => {
                                const preloader = new Image();
                                preloader.src = img.src;
                        });
                }, 100);
        }
    }

    function updateCarousel() {
        if (isAnimating || galleryImages.length === 0) return; // Prevent animation overlap

        isAnimating = true;

        const leftSlide = document.querySelector(".image-slide-left img");
        const centerSlide = document.querySelector(".image-slide-center img");
        const rightSlide = document.querySelector(".image-slide-right img");

        if (!leftSlide || !centerSlide || !rightSlide) {
                isAnimating = false;
                return;
        }

        const leftIndex =
                (currentIndex - 1 + galleryImages.length) % galleryImages.length;
        const rightIndex = (currentIndex + 1) % galleryImages.length;

        // Enhanced animation timeline
        const tl = gsap.timeline({
                onComplete: () => {
                        isAnimating = false;
                },
        });

        // Fade out all images with enhanced effects
        tl.to([leftSlide, centerSlide, rightSlide], {
                opacity: 0,
                scale: 0.9,
                rotateY: 15,
                duration: 0.3,
                ease: "power2.inOut",
        })
                // Change image sources with error handling
                .call(() => {
                        // Helper function to load image with fallback
                        const loadImageSafely = (imgElement, src, alt) => {
                                if (!imgElement) return;

                                imgElement.onload = () => {
                                        imgElement.classList.add("loaded");
                                };

                                imgElement.onerror = () => {
                                        // Fallback to a default image if loading fails
                                        console.warn("Failed to load image:", src);
                                        imgElement.src =
                                                "data:image/svg+xml;base64," +
                                                btoa(
                                                        '<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f0f0f0"/><text x="50%" y="50%" font-family="Arial" font-size="14" fill="#999" text-anchor="middle" dy=".3em">Image not found</text></svg>'
                                                );
                                        imgElement.classList.add("loaded");
                                };

                                imgElement.src = src;
                                imgElement.alt = alt;
                        };

                        loadImageSafely(
                                leftSlide,
                                galleryImages[leftIndex].src,
                                galleryImages[leftIndex].alt
                        );
                        loadImageSafely(
                                centerSlide,
                                galleryImages[currentIndex].src,
                                galleryImages[currentIndex].alt
                        );
                        loadImageSafely(
                                rightSlide,
                                galleryImages[rightIndex].src,
                                galleryImages[rightIndex].alt
                        );
                })
                // Fade in with enhanced 3D effects
                .to(
                        [leftSlide, rightSlide],
                        {
                                opacity: 0.6,
                                scale: 1,
                                rotateY: 0,
                                duration: 0.4,
                                ease: "power2.out",
                        },
                        "+=0.1"
                )
                .to(
                        centerSlide,
                        {
                                opacity: 1,
                                scale: 1,
                                rotateY: 0,
                                duration: 0.4,
                                ease: "power2.out",
                        },
                        "-=0.3"
                )
                // Add subtle pulse effect for center image
                .to(
                        centerSlide,
                        {
                                scale: 1.02,
                                duration: 0.2,
                                ease: "power2.inOut",
                                yoyo: true,
                                repeat: 1,
                        },
                        "-=0.2"
                );
    }

    // Make these functions global so they can be called from HTML onclick attributes
    window.nextImage = function () {
        if (isAnimating || galleryImages.length === 0) return; // Prevent rapid clicking

        currentIndex = (currentIndex + 1) % galleryImages.length;

        // Enhanced button animation
        const rightButton = document.querySelector(".carousel-arrow-right");
        if (rightButton) {
                gsap.to(rightButton, {
                        scale: 0.9,
                        rotation: 5,
                        duration: 0.1,
                        ease: "power2.inOut",
                        yoyo: true,
                        repeat: 1,
                });
        }

        updateCarousel();
    };

    window.prevImage = function () {
        if (isAnimating || galleryImages.length === 0) return; // Prevent rapid clicking

        currentIndex =
                (currentIndex - 1 + galleryImages.length) % galleryImages.length;

        // Enhanced button animation
        const leftButton = document.querySelector(".carousel-arrow-left");
        if (leftButton) {
                gsap.to(leftButton, {
                        scale: 0.9,
                        rotation: -5,
                        duration: 0.1,
                        ease: "power2.inOut",
                        yoyo: true,
                        repeat: 1,
                });
        }

        updateCarousel();
    };

    // Auto-play functionality
    let autoPlayInterval;
    let isAutoPlayActive = false;

    function startAutoPlay(interval = 5000) {
        if (galleryImages.length <= 1) return;

        stopAutoPlay(); // Clear any existing interval
        isAutoPlayActive = true;

        autoPlayInterval = setInterval(() => {
                if (!isAnimating && isAutoPlayActive) {
                        window.nextImage();
                }
        }, interval);
    }

    function stopAutoPlay() {
        if (autoPlayInterval) {
                clearInterval(autoPlayInterval);
                autoPlayInterval = null;
        }
        isAutoPlayActive = false;
    }

    function pauseAutoPlay() {
        isAutoPlayActive = false;
    }

    function resumeAutoPlay() {
        isAutoPlayActive = true;
    }

    // Touch gestures for mobile
    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartY = 0;
    let touchEndY = 0;

    function handleTouchStart(e) {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
        pauseAutoPlay();
    }

    function handleTouchEnd(e) {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleGesture();

        // Resume auto-play after 3 seconds of inactivity
        setTimeout(() => {
                if (isAutoPlayActive) resumeAutoPlay();
        }, 3000);
    }

    function handleGesture() {
        const threshold = 50;
        const restraint = 100;

        const diffX = touchStartX - touchEndX;
        const diffY = Math.abs(touchStartY - touchEndY);

        // Check if it's a horizontal swipe (not vertical scroll)
        if (Math.abs(diffX) > threshold && diffY < restraint) {
                if (diffX > 0) {
                        // Swipe left - next image
                        window.nextImage();
                } else {
                        // Swipe right - previous image
                        window.prevImage();
                }
        }
    }

    // Add scroll handling
    document.addEventListener("DOMContentLoaded", function () {
        const header = document.querySelector(".header");
        const navLinks = document.querySelectorAll(".nav-menu a");
        const mainContent = document.querySelector("main");
        const allSections = [mainContent, ...document.querySelectorAll("section")];
        const footer = document.querySelector("footer");
        if (footer) allSections.push(footer);

        function highlightNavOnScroll() {
                const currentScroll = window.scrollY;
                const windowHeight = window.innerHeight;
                const documentHeight = document.documentElement.scrollHeight;

                // Header shrink effect with GSAP
                if (currentScroll > 0) {
                        if (!header.classList.contains("scrolled")) {
                                header.classList.add("scrolled");
                                gsap.to(header, {
                                        backdropFilter: "blur(10px)",
                                        background: "rgba(238, 201, 210, 0.95)",
                                        duration: 0.3,
                                        ease: "power2.out",
                                });
                        }
                } else {
                        if (header.classList.contains("scrolled")) {
                                header.classList.remove("scrolled");
                                gsap.to(header, {
                                        backdropFilter: "none",
                                        background: "#eec9d2",
                                        duration: 0.3,
                                        ease: "power2.out",
                                });
                        }
                        // Gdy jesteśmy na górze strony, aktywuj link "Strona główna"
                        navLinks.forEach((link) => {
                                link.classList.remove("active");
                                if (link.getAttribute("href") === "#") {
                                        link.classList.add("active");
                                }
                        });
                        return;
                }

                // Highlight nav items based on section
                let currentSection = null;

                // Check if we're at the very bottom of the page
                if (window.innerHeight + window.scrollY >= documentHeight - 100) {
                        currentSection = footer;
                } else {
                        // Otherwise check each section
                        allSections.forEach((section) => {
                                const sectionTop = section.offsetTop - 100;
                                const sectionBottom = sectionTop + section.offsetHeight;

                                if (
                                        currentScroll >= sectionTop &&
                                        currentScroll < sectionBottom
                                ) {
                                        currentSection = section;
                                }
                        });
                }

                // Update active state with smooth transitions
                if (currentSection) {
                        navLinks.forEach((link) => {
                                const wasActive = link.classList.contains("active");
                                link.classList.remove("active");
                                if (link.getAttribute("href") === "#" + currentSection.id) {
                                        link.classList.add("active");
                                        if (!wasActive) {
                                                gsap.fromTo(
                                                        link,
                                                        { scale: 1 },
                                                        {
                                                                scale: 1.05,
                                                                duration: 0.2,
                                                                yoyo: true,
                                                                repeat: 1,
                                                                ease: "power2.inOut",
                                                        }
                                                );
                                        }
                                }
                        });
                }
        }

        window.addEventListener("scroll", highlightNavOnScroll);
        highlightNavOnScroll();
    });

    // Add smooth scrolling functionality
    document.addEventListener("DOMContentLoaded", function () {
        const navLinks = document.querySelectorAll(".nav-menu a");

        navLinks.forEach((link) => {
                link.addEventListener("click", function (e) {
                        e.preventDefault();

                        const targetId = this.getAttribute("href");

                        if (targetId === "#") {
                                // Scroll to top if it's home link
                                gsap.to(window, {
                                        duration: 1.2,
                                        scrollTo: 0,
                                        ease: "power2.inOut",
                                });
                        } else {
                                const targetElement = document.querySelector(targetId);
                                if (targetElement) {
                                        gsap.to(window, {
                                                duration: 1.2,
                                                scrollTo: {
                                                        y: targetElement,
                                                        offsetY: 80,
                                                },
                                                ease: "power2.inOut",
                                        });
                                }
                        }
                });
        });
    });

    // Add video start time functionality
    document.addEventListener("DOMContentLoaded", function () {
        // Set different start times for videos
        const videos = document.querySelectorAll(
                ".photo-frame video[data-start-time]"
        );

        videos.forEach((video) => {
                const startTime = parseFloat(video.getAttribute("data-start-time"));

                video.addEventListener("loadedmetadata", function () {
                        // Set the start time
                        this.currentTime = startTime;
                });

                // Handle loop restart at different time
                video.addEventListener("ended", function () {
                        this.currentTime = startTime;
                        this.play();
                });

                // Ensure video starts at correct time even after seeking
                video.addEventListener("seeked", function () {
                        if (!this.seeking && this.currentTime < startTime) {
                                this.currentTime = startTime;
                        }
                });
        });

        // Register ScrollTrigger plugin
        gsap.registerPlugin(ScrollTrigger);

        // Initial setup - hide elements
        gsap.set(".nav-menu li", { opacity: 0, y: -20 });
        gsap.set(".social-icons a", { opacity: 0, y: -20, rotation: -180 });
        gsap.set(".photo-frame", { opacity: 0, scale: 0.8, rotation: 0 });
        gsap.set(".contact-item", { opacity: 0, x: -50 });
        gsap.set(".offer-card", { opacity: 0, y: 100, rotateX: -30 });
        gsap.set(".stat-card", { opacity: 0, y: -30 });
        gsap.set(".welcome-header h2", { opacity: 0, y: 50 });
        gsap.set(".welcome-header p", { opacity: 0, y: 30 });

        // Set initial stat numbers to "0" to prevent jump effect during animation
        document.querySelectorAll(".stat-number").forEach((element) => {
                const finalText = element.textContent;
                // Store the original final value in a data attribute
                element.setAttribute("data-final-value", finalText);

                // Set initial display value to 0 only for numeric values
                if (finalText.includes("+")) {
                        element.textContent = "0+";
                } else if (finalText.includes("lat")) {
                        element.textContent = "0 lat";
                } else {
                        // For non-numeric values (like ∞), don't change them
                        const hasNumbers = /\d/.test(finalText);
                        if (hasNumbers) {
                                element.textContent = "0";
                        }
                        // If no numbers found, leave the original value (like ∞)
                }
        });

        // Header entrance animation
        const headerTimeline = gsap.timeline();
        headerTimeline
                .to(".nav-menu li", {
                        opacity: 1,
                        y: 0,
                        duration: 0.6,
                        stagger: 0.1,
                        ease: "back.out(1.7)",
                })
                .to(
                        ".social-icons a",
                        {
                                opacity: 1,
                                y: 0,
                                rotation: 0,
                                duration: 0.6,
                                stagger: 0.15,
                                ease: "back.out(1.7)",
                        },
                        "-=0.4"
                );

        // Photo frames animation with enhanced effects
        const framesTimeline = gsap.timeline({
                scrollTrigger: {
                        trigger: ".photo-gallery",
                        start: "top center+=100",
                        toggleActions: "play none none reverse",
                },
        });

        // Sprawdź czy jesteśmy w trybie mobilnym
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
                // Na mobilnym - animacja od 0° do docelowych kątów
                framesTimeline
                        .to(".photo-frame:nth-child(1)", {
                                opacity: 1,
                                scale: 1,
                                rotation: -5,
                                duration: 0.8,
                                ease: "power2.out",
                        })
                        .to(
                                ".photo-frame:nth-child(2)",
                                {
                                        opacity: 1,
                                        scale: 1,
                                        rotation: 4,
                                        duration: 0.8,
                                        ease: "power2.out",
                                },
                                "-=0.65"
                        )
                        .to(
                                ".photo-frame:nth-child(3)",
                                {
                                        opacity: 1,
                                        scale: 1,
                                        rotation: -6,
                                        duration: 0.8,
                                        ease: "power2.out",
                                },
                                "-=0.65"
                        )
                        .to(
                                ".photo-frame:nth-child(4)",
                                {
                                        opacity: 1,
                                        scale: 1,
                                        rotation: 5,
                                        duration: 0.8,
                                        ease: "power2.out",
                                },
                                "-=0.65"
                        );
        } else {
                // Na desktop - normalna animacja bez przechylenia
                framesTimeline.to(".photo-frame", {
                        opacity: 1,
                        scale: 1,
                        duration: 0.8,
                        stagger: 0.15,
                        ease: "power2.out",
                });
        }

        // Welcome section animation
        gsap.timeline({
                scrollTrigger: {
                        trigger: ".welcome-section",
                        start: "top center+=200",
                        toggleActions: "play none none reverse",
                },
        })
                .to(".welcome-header h2", {
                        opacity: 1,
                        y: 0,
                        duration: 0.8,
                        ease: "power3.out",
                })
                .to(
                        ".welcome-header p",
                        {
                                opacity: 1,
                                y: 0,
                                duration: 0.6,
                                ease: "power2.out",
                        },
                        "-=0.4"
                );

        // Offer cards animation with staggered 3D effects
        ScrollTrigger.batch(".offer-card", {
                onEnter: (elements) => {
                        gsap.to(elements, {
                                opacity: 1,
                                y: 0,
                                rotateX: 0,
                                duration: 1,
                                stagger: 0.2,
                                ease: "back.out(1.4)",
                                transformOrigin: "center bottom",
                        });
                },
                onLeave: (elements) => {
                        gsap.to(elements, {
                                opacity: 0.3,
                                y: 50,
                                duration: 0.5,
                                stagger: 0.1,
                                ease: "power2.inOut",
                        });
                },
                onEnterBack: (elements) => {
                        gsap.to(elements, {
                                opacity: 1,
                                y: 0,
                                duration: 0.8,
                                stagger: 0.1,
                                ease: "power2.out",
                        });
                },
                start: "top bottom-=100",
                end: "bottom top+=100",
        });

        // Stats section with counter animation
        const statCards = document.querySelectorAll(".stat-card");

        gsap.timeline({
                scrollTrigger: {
                        trigger: ".stats-section",
                        start: "top center+=100",
                        toggleActions: "play none none reverse",
                },
        }).to(".stat-card", {
                opacity: 1,
                scale: 1,
                rotation: 0,
                duration: 1.2,
                stagger: 0.1,
                ease: "power2.out",
                onComplete: () => {
                        // Animate numbers counting up
                        statCards.forEach((card) => {
                                const numberElement = card.querySelector(".stat-number");
                                const finalText =
                                        numberElement.getAttribute("data-final-value") ||
                                        numberElement.textContent;

                                if (finalText.includes("+")) {
                                        const number = parseInt(finalText.replace("+", ""));
                                        gsap.to(
                                                { value: 0 },
                                                {
                                                        value: number,
                                                        duration: 2,
                                                        ease: "power2.out",
                                                        onUpdate: function () {
                                                                numberElement.textContent =
                                                                        Math.round(this.targets()[0].value) + "+";
                                                        },
                                                }
                                        );
                                } else if (finalText.includes("lat")) {
                                        const number = parseInt(finalText.replace(" lat", ""));
                                        gsap.to(
                                                { value: 0 },
                                                {
                                                        value: number,
                                                        duration: 2,
                                                        ease: "power2.out",
                                                        onUpdate: function () {
                                                                numberElement.textContent =
                                                                        Math.round(this.targets()[0].value) +
                                                                        " lat";
                                                        },
                                                }
                                        );
                                } else {
                                        // For non-numeric values (like ∞), restore the original value
                                        const hasNumbers = /\d/.test(finalText);
                                        if (!hasNumbers) {
                                                numberElement.textContent = finalText;
                                        }
                                }
                        });
                },
        });

        // Footer contact items animation
        gsap.timeline({
                scrollTrigger: {
                        trigger: "#contact",
                        start: "top center+=200",
                        toggleActions: "play none none reverse",
                },
        })
                .to(".contact-item", {
                        opacity: 1,
                        x: 0,
                        duration: 0.8,
                        stagger: 0.2,
                        ease: "back.out(1.4)",
                })
                .from(
                        ".contact-item img",
                        {
                                rotation: 360,
                                scale: 0,
                                duration: 0.6,
                                stagger: 0.15,
                                ease: "back.out(1.7)",
                        },
                        "-=0.6"
                );

        // Hover animations for interactive elements
        document.querySelectorAll(".offer-card").forEach((card) => {
                card.addEventListener("mouseenter", () => {
                        gsap.to(card, {
                                scale: 1.03,
                                y: -10,
                                duration: 0.4,
                                ease: "power2.out",
                        });
                });

                card.addEventListener("mouseleave", () => {
                        gsap.to(card, {
                                scale: 1,
                                y: 0,
                                duration: 0.4,
                                ease: "power2.out",
                        });
                });
        });

        // Initialize dynamic gallery and carousel
        initializeGallery();
        updateCarousel();

        // Setup touch gestures for mobile gallery
        const carousel = document.querySelector(".image-carousel");
        if (carousel) {
                carousel.addEventListener("touchstart", handleTouchStart, {
                        passive: true,
                });
                carousel.addEventListener("touchend", handleTouchEnd, {
                        passive: true,
                });

                // Pause auto-play on hover for desktop
                carousel.addEventListener("mouseenter", pauseAutoPlay);
                carousel.addEventListener("mouseleave", resumeAutoPlay);

                // Start auto-play after a delay
                setTimeout(() => {
                        startAutoPlay(6000); // 6 seconds interval
                }, 2000);
        }

        // Enhanced keyboard navigation
        document.addEventListener("keydown", function (e) {
                if (e.key === "ArrowLeft") {
                        e.preventDefault();
                        window.prevImage();
                } else if (e.key === "ArrowRight") {
                        e.preventDefault();
                        window.nextImage();
                } else if (e.key === " ") {
                        // Spacebar to pause/resume
                        e.preventDefault();
                        if (isAutoPlayActive) {
                                stopAutoPlay();
                        } else {
                                startAutoPlay();
                        }
                } else if (e.key === "Escape") {
                        // Close locations overlay if open
                        hideLocationsOverlay();
                }
        });

        // Locations overlay functionality
        window.showLocationsOverlay = function () {
                const overlay = document.getElementById("locationsOverlay");
                if (overlay) {
                        // Stop auto-play when overlay is shown
                        pauseAutoPlay();

                        // Show overlay with smooth animation
                        overlay.classList.add("active");

                        // Disable body scroll
                        document.body.style.overflow = "hidden";

                        // Reset animations for content
                        const title = overlay.querySelector(".overlay-title");
                        const columns = overlay.querySelectorAll(".cities-column");

                        if (title) {
                                title.style.animation = "none";
                                title.offsetHeight; // Trigger reflow
                                title.style.animation = "fadeInUp 0.6s ease 0.2s forwards";
                        }

                        columns.forEach((column, index) => {
                                column.style.animation = "none";
                                column.offsetHeight; // Trigger reflow
                                column.style.animation = `fadeInUp 0.6s ease ${
                                        0.4 + index * 0.2
                                }s forwards`;
                        });
                }
        };

        window.hideLocationsOverlay = function () {
                const overlay = document.getElementById("locationsOverlay");
                if (overlay && overlay.classList.contains("active")) {
                        // Hide overlay
                        overlay.classList.remove("active");

                        // Re-enable body scroll
                        document.body.style.overflow = "";

                        // Resume auto-play after a delay
                        setTimeout(() => {
                                resumeAutoPlay();
                        }, 500);
                }
        };

        // Close overlay when clicking outside the content
        const overlay = document.getElementById("locationsOverlay");
        if (overlay) {
                overlay.addEventListener("click", function (e) {
                        if (e.target === overlay) {
                                hideLocationsOverlay();
                        }
                });
        }

        // Mouse parallax effect for main gallery - tylko na desktop
        const photoGallery = document.querySelector(".photo-gallery");
        if (photoGallery && !isMobile) {
                photoGallery.addEventListener("mousemove", (e) => {
                        const rect = photoGallery.getBoundingClientRect();
                        const x = (e.clientX - rect.left) / rect.width - 0.5;
                        const y = (e.clientY - rect.top) / rect.height - 0.5;

                        gsap.to(".photo-frame", {
                                x: x * 20,
                                y: y * 20,
                                duration: 0.3,
                                ease: "power2.out",
                                stagger: 0.05,
                        });
                });

                photoGallery.addEventListener("mouseleave", () => {
                        gsap.to(".photo-frame", {
                                x: 0,
                                y: 0,
                                duration: 0.5,
                                ease: "power2.out",
                                stagger: 0.05,
                        });
                });
        }

        // Text reveal animation for section headings
        ScrollTrigger.batch("h3", {
                onEnter: (elements) => {
                        elements.forEach((el) => {
                                const text = el.textContent;
                                el.innerHTML = text
                                        .split("")
                                        .map((char) =>
                                                char === " "
                                                        ? " "
                                                        : `<span style="display:inline-block;">${char}</span>`
                                        )
                                        .join("");

                                gsap.from(el.querySelectorAll("span"), {
                                        y: 50,
                                        opacity: 0,
                                        duration: 0.8,
                                        stagger: 0.02,
                                        ease: "back.out(1.7)",
                                });
                        });
                },
        });
    });
// This script loads dynamic content for a page from the backend API and
// updates the DOM accordingly. Each static page includes a global
// PAGE_ID variable set in the HTML. When the page loads, dataLoader.js
// fetches the content via `/api/home?pageId=PAGE_ID` and populates the
// appropriate sections (navigation links, welcome header, stats,
// gallery, locations and footer). This allows the site to reflect
// changes made in the admin panel without rebuilding HTML.

// Define backend base URL once. All API calls and asset paths use this
// constant so the frontend can run on a different port (e.g. 3000) while
// talking to the backend on port 4000.
const BACKEND_BASE = 'http://localhost:4000';

document.addEventListener('DOMContentLoaded', () => {
  const pageId = window.PAGE_ID || 1;
  fetch(`${BACKEND_BASE}/api/home?pageId=${pageId}`)
    .then(res => res.json())
    .then(data => {
      try {
        updateNav(data.nav);
        updateWelcome(data.welcome_header);
        updateVideoFrames(data.video_frames);
        updateStats(data.stats);
        updateGallery(data.gallery);
        updateLocations(data.locations);
        updateFooter(data.footer);
      } catch (err) {
        console.error('Error updating page content', err);
      }
    })
    .catch(err => console.error('Failed to load page data', err));
});

// Update social icons in header and footer
function updateNav(nav) {
  if (!nav) return;
  // Header social icons (desktop and mobile)
  document.querySelectorAll('.social-icon.facebook').forEach(el => {
    if (nav.facebook_url) el.href = nav.facebook_url;
  });
  document.querySelectorAll('.social-icon.instagram').forEach(el => {
    if (nav.instagram_url) el.href = nav.instagram_url;
  });
}

// Update welcome header section
function updateWelcome(welcome) {
  if (!welcome) return;
  // Update the title. Only the span inside the h2 should change so
  // the "Witamy w" prefix remains constant. The h2 structure is:
  // <h2>Witamy w <span style="...">Fotobudka OG Event Spot!</span></h2>
  const titleSpan = document.querySelector('.welcome-header h2 span');
  if (titleSpan && typeof welcome.title === 'string') {
    titleSpan.textContent = welcome.title;
  }
  // Update subtitle (paragraph)
  const subtitleEl = document.querySelector('.welcome-header p');
  if (subtitleEl && typeof welcome.subtitle === 'string') {
    subtitleEl.textContent = welcome.subtitle;
  }
}

// Replace video frames at the top of the page. Assumes a container
// `.photo-gallery` containing divs with class `.photo-frame` each
// holding a <video>. We will update existing videos or create new
// frames as needed.
function updateVideoFrames(frames) {
  // Instead of removing and recreating frames, update the existing video
  // elements inside the photo-gallery. This preserves the positioning
  // defined in the original HTML and CSS (nth-child transforms). If
  // there are fewer uploaded frames than available video elements, the
  // remaining videos retain their original sources.
  const videos = document.querySelectorAll('.photo-gallery .photo-frame video');
  const container = document.querySelector('.photo-gallery');
  if (!frames || frames.length === 0) {
    // No uploaded frames; nothing to update
    return;
  }
  if (!videos || videos.length === 0) {
    // If there are no existing video elements (e.g. on generated subpages
    // where the static HTML didn't include photo frames), create new
    // frames from scratch. We mirror the original layout by creating
    // a .photo-frame for each uploaded video (up to 4). Additional
    // uploaded videos will wrap around.
    if (!container) return;
    container.innerHTML = '';
    frames.forEach((frame, index) => {
      // Limit to a maximum of 4 frames to match the original design
      if (index >= 4) return;
      const frameDiv = document.createElement('div');
      frameDiv.className = 'photo-frame';
      const vid = document.createElement('video');
      vid.src = BACKEND_BASE + frame.file_path;
      vid.autoplay = true;
      vid.muted = true;
      vid.loop = true;
      vid.playsInline = true;
      vid.setAttribute('playsinline', '');
      frameDiv.appendChild(vid);
      container.appendChild(frameDiv);
      // Try to start playback
      vid.addEventListener('canplay', () => {
        const pp = vid.play();
        if (pp !== undefined) pp.catch(() => {});
      });
    });
    // Reset gsap initial state and refresh ScrollTrigger
    if (typeof gsap !== 'undefined') {
      gsap.set('.photo-frame', { opacity: 0, scale: 0.8 });
    }
    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.refresh();
    }
    return;
  }
  // Otherwise, update existing video elements by cycling through the
  // uploaded frames. This preserves the CSS positioning and
  // transformations defined via nth-child selectors.
  videos.forEach((videoEl, index) => {
    const frame = frames[index % frames.length];
    if (!frame) return;
    const newSrc = BACKEND_BASE + frame.file_path;
    if (videoEl.src !== newSrc) {
      videoEl.src = newSrc;
      videoEl.autoplay = true;
      videoEl.muted = true;
      videoEl.loop = true;
      videoEl.playsInline = true;
      videoEl.setAttribute('playsinline', '');
      // Reload the video element so that the new source is actually
      // displayed. Without calling load(), some browsers keep the
      // previous source buffered and the frame may stay blank.
      if (typeof videoEl.load === 'function') {
        videoEl.load();
      }
      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    }
  });

  // Reset GSAP initial states for photo frames and refresh scroll triggers.
  // When new video sources are loaded, we want the frames to animate like
  // the originals. Without resetting the opacity/scale and refreshing
  // ScrollTrigger, the new frames may remain invisible. This mirrors
  // the initial state defined in script.js.
  if (typeof gsap !== 'undefined') {
    gsap.set('.photo-frame', { opacity: 0, scale: 0.8 });
  }
  if (typeof ScrollTrigger !== 'undefined') {
    ScrollTrigger.refresh();
  }
}

// Update stats section. It assumes each statistic is displayed in a
// `.stat-card` element with child `.stat-number` and `.stat-label`.
function updateStats(stats) {
  const cardsContainer = document.querySelector('.stats-section .row');
  if (!cardsContainer || !stats) return;
  // Remove existing cards
  cardsContainer.innerHTML = '';
  stats.forEach(stat => {
    const col = document.createElement('div');
    col.className = 'col-lg-3 col-md-4 col-sm-6';
    const card = document.createElement('div');
    card.className = 'stat-card text-center p-4';
    card.style.background = '#801039';
    card.style.color = 'white';
    card.style.borderRadius = '15px';
    card.style.boxShadow = '0 8px 25px rgba(139, 75, 122, 0.3)';
    card.style.transition = 'transform 0.3s ease';
    const numberDiv = document.createElement('div');
    numberDiv.className = 'stat-number';
    numberDiv.style.fontSize = '48px';
    numberDiv.style.fontWeight = 'bold';
    numberDiv.style.marginBottom = '10px';
    // Set both data-final-value and an initial text value of 0. The animations
    // defined in script.js rely on data-final-value to animate the counter.
    // By setting the visible text to 0 we avoid showing the final value
    // immediately; gsap will animate from 0 to the final value stored in the
    // data-final-value attribute.
    numberDiv.setAttribute('data-final-value', stat.value);
    // Determine if the value contains a suffix like '+' or 'lat'
    let suffix = '';
    if (typeof stat.value === 'string') {
      if (stat.value.includes('+')) {
        suffix = '+';
      } else if (stat.value.includes('lat')) {
        suffix = ' lat';
      }
    }
    // Start from 0 with the appropriate suffix
    numberDiv.textContent = '0' + suffix;
    const labelDiv = document.createElement('div');
    labelDiv.className = 'stat-label';
    labelDiv.style.fontSize = '16px';
    labelDiv.style.fontWeight = '500';
    labelDiv.textContent = stat.label;
    card.appendChild(numberDiv);
    card.appendChild(labelDiv);
    col.appendChild(card);
    cardsContainer.appendChild(col);
  });

  // After inserting the new stat cards, trigger a count-up animation
  // for each statistic. Without this, the numbers will remain at the
  // initial value ('0' or '0+' etc.) because the original GSAP timeline
  // only binds to elements that existed when script.js ran. Here we
  // detect the presence of gsap and manually animate the numbers from
  // 0 to their final value stored in the data-final-value attribute.
  if (typeof gsap !== 'undefined') {
    document.querySelectorAll('.stat-card .stat-number').forEach(numberElement => {
      const finalText = numberElement.getAttribute('data-final-value') || numberElement.textContent;
      if (finalText.includes('+')) {
        const number = parseInt(finalText.replace(/\+/g, '')) || 0;
        gsap.fromTo(
          { value: 0 },
          {
            value: number,
            duration: 2,
            ease: 'power2.out',
            onUpdate: function() {
              numberElement.textContent = Math.round(this.targets()[0].value) + '+';
            }
          }
        );
      } else if (finalText.includes(' lat')) {
        const number = parseInt(finalText.replace(/ lat/, '')) || 0;
        gsap.fromTo(
          { value: 0 },
          {
            value: number,
            duration: 2,
            ease: 'power2.out',
            onUpdate: function() {
              numberElement.textContent = Math.round(this.targets()[0].value) + ' lat';
            }
          }
        );
      } else {
        // For pure numeric values without suffixes, animate to the number
        const numeric = parseInt(finalText);
        if (!isNaN(numeric)) {
          gsap.fromTo(
            { value: 0 },
            {
              value: numeric,
              duration: 2,
              ease: 'power2.out',
              onUpdate: function() {
                numberElement.textContent = Math.round(this.targets()[0].value);
              }
            }
          );
        } else {
          // For non-numeric strings like '∞', just set the text
          numberElement.textContent = finalText;
        }
      }
    });
    // After animating stats, refresh ScrollTrigger so that the
    // scroll-based animations account for the new stat cards.
    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.refresh();
    }
  }
}

// Update gallery carousel images. This function updates the
// `.image-carousel` slides by replacing the `data-src` attributes on
// existing image elements. The gallery uses three slides; if more
// images are available, only the first three are used.
function updateGallery(gallery) {
  if (!gallery || gallery.length === 0) return;
  const slides = document.querySelectorAll('.image-carousel .image-slide img');
  if (slides.length === 0) return;
  for (let i = 0; i < slides.length; i++) {
    const img = slides[i];
    const item = gallery[i % gallery.length];
    img.dataset.src = BACKEND_BASE + item.file_path;
    img.alt = item.alt_text || 'Gallery image';
    // If the image is already loaded, update src directly
    if (img.classList.contains('loaded')) {
      img.src = BACKEND_BASE + item.file_path;
    }
  }
  // After updating data-src attributes we re-run initializeGallery
  if (typeof initializeGallery === 'function') {
    initializeGallery();
  }
}

// Update locations overlay list. Distributes locations into two columns.
function updateLocations(locations) {
  if (!locations || locations.length === 0) return;
  const columns = document.querySelectorAll('.locations-overlay .cities-column');
  if (columns.length < 2) return;
  // Split locations into two roughly equal arrays
  const half = Math.ceil(locations.length / 2);
  const first = locations.slice(0, half);
  const second = locations.slice(half);
  [first, second].forEach((list, idx) => {
    const ul = columns[idx].querySelector('ul.cities-list');
    if (!ul) return;
    ul.innerHTML = '';
    list.forEach(loc => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#';
      a.textContent = loc.name;
      li.appendChild(a);
      ul.appendChild(li);
    });
  });
}

// Update footer contact links and phone
function updateFooter(footer) {
  if (!footer) return;
  const contactItems = document.querySelectorAll('.contact-info .contact-item');
  if (contactItems.length >= 1 && footer.facebook_url) {
    const link = contactItems[0].querySelector('a');
    if (link) link.href = footer.facebook_url;
  }
  if (contactItems.length >= 2 && footer.instagram_url) {
    const link = contactItems[1].querySelector('a');
    if (link) link.href = footer.instagram_url;
  }
  if (contactItems.length >= 3 && footer.phone) {
    const link = contactItems[2].querySelector('a');
    if (link) {
      link.href = `tel:${footer.phone}`;
      link.textContent = footer.phone;
    }
  }
}
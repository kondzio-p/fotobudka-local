// Helper: fetch with authorization header
// Current page tracking
let currentPageId = 1;
let currentPageName = '';

async function apiFetch(url, options = {}) {
  // Prefix all API calls with backend base URL. This allows the
  // frontend to run on a different port than the backend (e.g. 3000 vs 4000).
  const backendBase = 'http://localhost:4000';
  // If the url is relative (starts with '/') then prepend backend
  const fullUrl = url.startsWith('http') ? url : backendBase + url;
  const token = localStorage.getItem('token');
  options.headers = options.headers || {};
  if (token) {
    options.headers['Authorization'] = 'Bearer ' + token;
  }
  return fetch(fullUrl, options);
}

function initAdmin() {
  // If no token, redirect to login
  if (!localStorage.getItem('token')) {
    window.location.href = '/adminLoginPanel/adminLoginPanel.html';
    return;
  }

  // Load pages and then current page data
  loadPages();

  // Bind events
  // Navigation
  document.querySelectorAll('#nav-facebook, #nav-instagram').forEach(input => {
    input.addEventListener('change', saveNav);
  });
  // Welcome header
  document.querySelector('#welcome-title').addEventListener('change', saveWelcome);
  document.querySelector('#welcome-subtitle').addEventListener('change', saveWelcome);
  // Stats
  document.querySelectorAll('.stat-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const id = e.target.dataset.id;
      const value = e.target.value;
      updateStat(id, value);
    });
  });
  document.querySelector('#add-stat-btn').addEventListener('click', addStat);

  // Video frames upload
  const videoInput = document.querySelector('#video-upload');
  videoInput.addEventListener('change', uploadVideoFrames);
  // Clicking the visible button triggers the hidden file input
  const videoBtn = document.querySelector('#video-upload-btn');
  if (videoBtn) {
    videoBtn.addEventListener('click', () => videoInput.click());
  }
  // Gallery upload
  const galleryInput = document.querySelector('#gallery-upload');
  galleryInput.addEventListener('change', uploadGallery);
  const galleryBtn = document.querySelector('#gallery-upload-btn');
  if (galleryBtn) {
    galleryBtn.addEventListener('click', () => galleryInput.click());
  }

  // Locations
  document.querySelector('#add-location-btn').addEventListener('click', addLocation);

  // Footer
  document.querySelectorAll('#footer-facebook, #footer-instagram, #footer-phone').forEach(input => {
    input.addEventListener('change', saveFooter);
  });

  // Save changes button
  const saveBtn = document.querySelector('#save-changes-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveAll);
  }
}

// Load list of pages and populate sidebar
async function loadPages() {
  try {
    const res = await apiFetch('/api/pages');
    const pages = await res.json();
    const list = document.getElementById('pages-list');
    list.innerHTML = '';
    pages.forEach((p, idx) => {
      const li = document.createElement('li');
      li.className = 'nav-item';
      const a = document.createElement('a');
      a.href = '#';
      a.className = 'nav-link';
      a.textContent = p.name;
      if (idx === 0 && !currentPageId) {
        currentPageId = p.id;
        currentPageName = p.name;
      }
      if (p.id === currentPageId) {
        a.classList.add('active');
        currentPageName = p.name;
      }
      a.addEventListener('click', (e) => {
        e.preventDefault();
        selectPage(p.id, p.name);
      });
      li.appendChild(a);
      list.appendChild(li);
    });
    // Add "add page" entry
    const liAdd = document.createElement('li');
    liAdd.className = 'nav-item';
    const aAdd = document.createElement('a');
    aAdd.href = '#';
    aAdd.className = 'nav-link add-page';
    aAdd.textContent = '+ Dodaj podstronę';
    aAdd.addEventListener('click', (e) => {
      e.preventDefault();
      addPage();
    });
    liAdd.appendChild(aAdd);
    list.appendChild(liAdd);

    // After populating list, load data for current page
    if (currentPageId) {
      document.querySelector('.edit-notice').textContent = `Aktualnie edytujesz: ${currentPageName}`;
      fetchHomeData(currentPageId);
    }
  } catch (err) {
    console.error(err);
    alert('Błąd pobierania stron');
  }
}

// Select a page from sidebar
function selectPage(pageId, pageName) {
  currentPageId = pageId;
  currentPageName = pageName;
  // Update active classes
  document.querySelectorAll('#pages-list .nav-link').forEach(a => {
    a.classList.remove('active');
  });
  const links = Array.from(document.querySelectorAll('#pages-list .nav-link'));
  const match = links.find(l => l.textContent === pageName);
  if (match) match.classList.add('active');
  // Update notice
  document.querySelector('.edit-notice').textContent = `Aktualnie edytujesz: ${pageName}`;
  // Load data
  fetchHomeData(currentPageId);
}

// Add a new page
async function addPage() {
  const name = prompt('Podaj nazwę nowej strony');
  if (!name) return;
  try {
    const res = await apiFetch('/api/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const page = await res.json();
    // Reload pages list and select new page
    currentPageId = page.id;
    currentPageName = page.name;
    loadPages();
  } catch (err) {
    console.error(err);
    alert('Błąd tworzenia strony');
  }
}

async function fetchHomeData(pageId = currentPageId) {
  try {
    const res = await apiFetch(`/api/home?pageId=${pageId}`);
    const data = await res.json();
    // Fill nav
    document.querySelector('#nav-facebook').value = data.nav.facebook_url || '';
    document.querySelector('#nav-instagram').value = data.nav.instagram_url || '';
    // Fill welcome
    document.querySelector('#welcome-title').value = data.welcome_header.title || '';
    document.querySelector('#welcome-subtitle').value = data.welcome_header.subtitle || '';
    // Fill stats
    const statsContainer = document.querySelector('#stats-container');
    statsContainer.innerHTML = '';
    data.stats.forEach(stat => {
      const div = document.createElement('div');
      div.className = 'form-group';
      div.innerHTML = `<label>${stat.label}:</label> <input type="text" class="form-control stat-input" data-id="${stat.id}" value="${stat.value}"> <button class="btn btn-sm btn-danger delete-stat" data-id="${stat.id}">Usuń</button>`;
      statsContainer.appendChild(div);
    });
    // Add new stat fields
    document.querySelector('#new-stat-label').value = '';
    document.querySelector('#new-stat-value').value = '';

    // Attach delete handlers after rendering
    document.querySelectorAll('.delete-stat').forEach(btn => {
      btn.addEventListener('click', () => deleteStat(btn.dataset.id));
    });
    document.querySelectorAll('.stat-input').forEach(input => {
      input.addEventListener('change', (e) => {
        updateStat(e.target.dataset.id, e.target.value);
      });
    });

    // Fill video frames preview
    const videoContainer = document.querySelector('#video-container');
    videoContainer.innerHTML = '';
    data.video_frames.forEach(frame => {
      const div = document.createElement('div');
      div.className = 'video-frame-preview';
      div.innerHTML = `<video src="${frame.file_path}" muted loop playsinline style="width:100%; height:120px; object-fit:cover;"></video> <button class="btn btn-sm btn-outline-danger delete-video" data-id="${frame.id}">Usuń</button>`;
      videoContainer.appendChild(div);
    });
    document.querySelectorAll('.delete-video').forEach(btn => {
      btn.addEventListener('click', () => deleteVideoFrame(btn.dataset.id));
    });

    // Fill gallery preview
    const galleryContainer = document.querySelector('#gallery-container');
    galleryContainer.innerHTML = '';
    data.gallery.forEach(item => {
      const div = document.createElement('div');
      div.className = 'gallery-item-preview';
      div.innerHTML = `<img src="${item.file_path}" alt="" style="width:100%; height:120px; object-fit:cover;"/> <button class="btn btn-sm btn-outline-danger delete-gallery" data-id="${item.id}">Usuń</button>`;
      galleryContainer.appendChild(div);
    });
    document.querySelectorAll('.delete-gallery').forEach(btn => {
      btn.addEventListener('click', () => deleteGalleryItem(btn.dataset.id));
    });

    // Fill locations
    const locContainer = document.querySelector('#locations-container');
    locContainer.innerHTML = '';
    data.locations.forEach(loc => {
      const div = document.createElement('div');
      div.className = 'form-group d-flex align-items-center';
      div.innerHTML = `<span class="badge bg-secondary me-2">${loc.name}</span> <button class="btn btn-sm btn-outline-danger delete-location" data-id="${loc.id}">Usuń</button>`;
      locContainer.appendChild(div);
    });
    document.querySelectorAll('.delete-location').forEach(btn => {
      btn.addEventListener('click', () => deleteLocation(btn.dataset.id));
    });

    // Fill footer
    document.querySelector('#footer-facebook').value = data.footer.facebook_url || '';
    document.querySelector('#footer-instagram').value = data.footer.instagram_url || '';
    document.querySelector('#footer-phone').value = data.footer.phone || '';
  } catch (e) {
    console.error(e);
    alert('Błąd pobierania danych');
  }
}

async function saveNav() {
  const facebook_url = document.querySelector('#nav-facebook').value;
  const instagram_url = document.querySelector('#nav-instagram').value;
  await apiFetch(`/api/nav?pageId=${currentPageId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ facebook_url, instagram_url })
  });
}
async function saveWelcome() {
  const title = document.querySelector('#welcome-title').value;
  const subtitle = document.querySelector('#welcome-subtitle').value;
  await apiFetch(`/api/welcome-header?pageId=${currentPageId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, subtitle })
  });
}
async function addStat() {
  const label = document.querySelector('#new-stat-label').value;
  const value = document.querySelector('#new-stat-value').value;
  if (!label || !value) return;
  await apiFetch(`/api/stats?pageId=${currentPageId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label, value })
  });
  fetchHomeData(currentPageId);
}
async function updateStat(id, value) {
  await apiFetch(`/api/stats/${id}?pageId=${currentPageId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value })
  });
}
async function deleteStat(id) {
  await apiFetch(`/api/stats/${id}?pageId=${currentPageId}`, { method: 'DELETE' });
  fetchHomeData(currentPageId);
}
async function uploadVideoFrames(e) {
  const files = e.target.files;
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('files', files[i]);
  }
  await apiFetch(`/api/video-frames?pageId=${currentPageId}`, { method: 'POST', body: formData });
  fetchHomeData(currentPageId);
}
async function deleteVideoFrame(id) {
  await apiFetch(`/api/video-frames/${id}?pageId=${currentPageId}`, { method: 'DELETE' });
  fetchHomeData(currentPageId);
}
async function uploadGallery(e) {
  const files = e.target.files;
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('images', files[i]);
  }
  await apiFetch(`/api/gallery?pageId=${currentPageId}`, { method: 'POST', body: formData });
  fetchHomeData(currentPageId);
}
async function deleteGalleryItem(id) {
  await apiFetch(`/api/gallery/${id}?pageId=${currentPageId}`, { method: 'DELETE' });
  fetchHomeData(currentPageId);
}
async function addLocation() {
  const name = document.querySelector('#new-location-name').value;
  if (!name) return;
  await apiFetch(`/api/locations?pageId=${currentPageId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  document.querySelector('#new-location-name').value = '';
  fetchHomeData(currentPageId);
}
async function deleteLocation(id) {
  await apiFetch(`/api/locations/${id}?pageId=${currentPageId}`, { method: 'DELETE' });
  fetchHomeData(currentPageId);
}
async function saveFooter() {
  const facebook_url = document.querySelector('#footer-facebook').value;
  const instagram_url = document.querySelector('#footer-instagram').value;
  const phone = document.querySelector('#footer-phone').value;
  await apiFetch(`/api/footer?pageId=${currentPageId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ facebook_url, instagram_url, phone })
  });
}

// Save all sections at once
async function saveAll() {
  try {
    await saveNav();
    await saveWelcome();
    await saveFooter();
    alert('Zmiany zostały zapisane');
  } catch (err) {
    console.error(err);
    alert('Wystąpił błąd podczas zapisywania zmian');
  }
}

document.addEventListener('DOMContentLoaded', initAdmin);

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

app.use(cors());
app.use(express.json());

// Serve uploaded files for the frontend (e.g. video frames and gallery images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Setup SQLite database
const db = new sqlite3.Database(path.join(__dirname, 'db.sqlite'));

/*
 * Database schema
 *
 * The application supports managing multiple pages. Each page has its own
 * navigation links, welcome header, video frames, statistics, gallery
 * images, locations and footer data. This is achieved by storing a
 * `page_id` on each table that references the `pages` table. On
 * initialisation the server creates a default "Strona główna" page
 * with some default data so the admin panel has something to edit.
 */
db.serialize(() => {
  // Authentication
  db.run(`CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  )`);

  // Pages
  db.run(`CREATE TABLE IF NOT EXISTS pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL
  )`);

  // Nav links per page
  db.run(`CREATE TABLE IF NOT EXISTS nav (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id INTEGER NOT NULL,
    facebook_url TEXT,
    instagram_url TEXT,
    FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE
  )`);

  // Video frames per page
  db.run(`CREATE TABLE IF NOT EXISTS video_frames (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id INTEGER NOT NULL,
    file_path TEXT,
    alt_text TEXT,
    FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE
  )`);

  // Welcome header per page
  db.run(`CREATE TABLE IF NOT EXISTS welcome_header (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id INTEGER NOT NULL,
    title TEXT,
    subtitle TEXT,
    FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE
  )`);

  // Statistics per page
  db.run(`CREATE TABLE IF NOT EXISTS stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id INTEGER NOT NULL,
    label TEXT,
    value TEXT,
    FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE
  )`);

  // Gallery images per page
  db.run(`CREATE TABLE IF NOT EXISTS gallery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id INTEGER NOT NULL,
    file_path TEXT,
    alt_text TEXT,
    FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE
  )`);

  // Locations per page
  db.run(`CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id INTEGER NOT NULL,
    name TEXT,
    FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE
  )`);

  // Footer per page
  db.run(`CREATE TABLE IF NOT EXISTS footer (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id INTEGER NOT NULL,
    facebook_url TEXT,
    instagram_url TEXT,
    phone TEXT,
    FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE
  )`);

  // Seed a default admin account if none exists
  db.get('SELECT COUNT(*) AS count FROM admin_users', [], (err, row) => {
    if (row && row.count === 0) {
      const defaultPassword = 'admin1234';
      bcrypt.hash(defaultPassword, 10, (hashErr, hash) => {
        db.run('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)', ['admin', hash]);
        console.log('Default admin account created: admin / admin1234');
      });
    }
  });

  // Seed a default page and its content if no pages exist
  db.get('SELECT COUNT(*) AS count FROM pages', [], (err, row) => {
    if (row && row.count === 0) {
      db.run('INSERT INTO pages (name, slug) VALUES (?, ?)', ['Strona główna', 'home'], function(err2) {
        const pageId = this.lastID;
        // Insert empty nav
        db.run('INSERT INTO nav (page_id, facebook_url, instagram_url) VALUES (?, ?, ?)', [pageId, '', '']);
        // Insert welcome header
        db.run('INSERT INTO welcome_header (page_id, title, subtitle) VALUES (?, ?, ?)', [pageId, 'Witamy w Fotobudka OG Event Spot!', 'Dopełniamy, by na Twoim wydarzeniu nie zabrakło atrakcji!']);
        // Insert footer
        db.run('INSERT INTO footer (page_id, facebook_url, instagram_url, phone) VALUES (?, ?, ?, ?)', [pageId, '', '', '']);
        // Insert default stats
        const stmt = db.prepare('INSERT INTO stats (page_id, label, value) VALUES (?, ?, ?)');
        stmt.run(pageId, 'Zadowolonych klientów', '0');
        stmt.run(pageId, 'Lat na rynku', '0');
        stmt.finalize();
      });
    }
  });
});

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// JWT authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Brak tokenu' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Nieprawidłowy token' });
    req.user = user;
    next();
  });
}

// Login endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Brak danych logowania' });
  db.get('SELECT * FROM admin_users WHERE username = ?', [username], (err, user) => {
    if (!user) return res.status(401).json({ message: 'Nieprawidłowy login' });
    bcrypt.compare(password, user.password_hash, (err2, match) => {
      if (!match) return res.status(401).json({ message: 'Nieprawidłowe hasło' });
      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '6h' });
      res.json({ token });
    });
  });
});

// Fetch content for a specific page (defaults to pageId=1)
app.get('/api/home', (req, res) => {
  const pageId = parseInt(req.query.pageId) || 1;
  const data = {};
  db.get('SELECT facebook_url, instagram_url FROM nav WHERE page_id=?', [pageId], (err1, row1) => {
    data.nav = row1 || {};
    db.all('SELECT id, file_path, alt_text FROM video_frames WHERE page_id=?', [pageId], (err2, rows2) => {
      data.video_frames = rows2 || [];
      db.get('SELECT title, subtitle FROM welcome_header WHERE page_id=?', [pageId], (err3, row3) => {
        data.welcome_header = row3 || {};
        db.all('SELECT id, label, value FROM stats WHERE page_id=?', [pageId], (err4, rows4) => {
          data.stats = rows4 || [];
          db.all('SELECT id, file_path, alt_text FROM gallery WHERE page_id=?', [pageId], (err5, rows5) => {
            data.gallery = rows5 || [];
            db.all('SELECT id, name FROM locations WHERE page_id=?', [pageId], (err6, rows6) => {
              data.locations = rows6 || [];
              db.get('SELECT facebook_url, instagram_url, phone FROM footer WHERE page_id=?', [pageId], (err7, row7) => {
                data.footer = row7 || {};
                res.json(data);
              });
            });
          });
        });
      });
    });
  });
});

// Update navigation for a page
app.put('/api/nav', authenticateToken, (req, res) => {
  const pageId = parseInt(req.query.pageId) || 1;
  const { facebook_url, instagram_url } = req.body;
  db.run('INSERT OR IGNORE INTO nav (page_id, facebook_url, instagram_url) VALUES (?, ?, ?)', [pageId, '', ''], () => {
    db.run('UPDATE nav SET facebook_url=?, instagram_url=? WHERE page_id=?', [facebook_url, instagram_url, pageId], function(err) {
      if (err) return res.status(500).json({ message: 'Błąd zapisu' });
      res.json({ message: 'Nawigacja zaktualizowana' });
    });
  });
});

// Video frames CRUD
app.post('/api/video-frames', authenticateToken, upload.array('files', 4), (req, res) => {
  const pageId = parseInt(req.query.pageId) || 1;
  const files = req.files;
  if (!files || files.length === 0) return res.status(400).json({ message: 'Brak plików' });
  const stmt = db.prepare('INSERT INTO video_frames (page_id, file_path, alt_text) VALUES (?, ?, ?)');
  files.forEach(file => {
    stmt.run(pageId, '/uploads/' + file.filename, file.originalname);
  });
  stmt.finalize();
  res.json({ message: 'Ramki dodane' });
});
app.delete('/api/video-frames/:id', authenticateToken, (req, res) => {
  const id = req.params.id;
  db.get('SELECT file_path FROM video_frames WHERE id=?', [id], (err, row) => {
    if (!row) return res.status(404).json({ message: 'Nie znaleziono' });
    const filePath = path.join(__dirname, row.file_path);
    fs.unlink(filePath, () => {
      db.run('DELETE FROM video_frames WHERE id=?', [id], () => {
        res.json({ message: 'Usunięto' });
      });
    });
  });
});

// Welcome header
app.put('/api/welcome-header', authenticateToken, (req, res) => {
  const pageId = parseInt(req.query.pageId) || 1;
  const { title, subtitle } = req.body;
  db.run('INSERT OR IGNORE INTO welcome_header (page_id, title, subtitle) VALUES (?, ?, ?)', [pageId, '', ''], () => {
    db.run('UPDATE welcome_header SET title=?, subtitle=? WHERE page_id=?', [title, subtitle, pageId], function(err) {
      if (err) return res.status(500).json({ message: 'Błąd zapisu' });
      res.json({ message: 'Nagłówek zaktualizowany' });
    });
  });
});

// Statistics
app.get('/api/stats', (req, res) => {
  const pageId = parseInt(req.query.pageId) || 1;
  db.all('SELECT id, label, value FROM stats WHERE page_id=?', [pageId], (err, rows) => {
    res.json(rows || []);
  });
});
app.post('/api/stats', authenticateToken, (req, res) => {
  const pageId = parseInt(req.query.pageId) || 1;
  const { label, value } = req.body;
  db.run('INSERT INTO stats (page_id, label, value) VALUES (?, ?, ?)', [pageId, label, value], function(err) {
    if (err) return res.status(500).json({ message: 'Błąd dodawania' });
    res.json({ id: this.lastID, label, value });
  });
});
app.put('/api/stats/:id', authenticateToken, (req, res) => {
  const id = req.params.id;
  const { value } = req.body;
  db.run('UPDATE stats SET value=? WHERE id=?', [value, id], function(err) {
    if (err) return res.status(500).json({ message: 'Błąd zapisu' });
    res.json({ message: 'Zaktualizowano' });
  });
});
app.delete('/api/stats/:id', authenticateToken, (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM stats WHERE id=?', [id], function(err) {
    if (err) return res.status(500).json({ message: 'Błąd usuwania' });
    res.json({ message: 'Usunięto' });
  });
});

// Gallery
app.get('/api/gallery', (req, res) => {
  const pageId = parseInt(req.query.pageId) || 1;
  db.all('SELECT id, file_path, alt_text FROM gallery WHERE page_id=?', [pageId], (err, rows) => {
    res.json(rows || []);
  });
});
app.post('/api/gallery', authenticateToken, upload.array('images', 20), (req, res) => {
  const pageId = parseInt(req.query.pageId) || 1;
  const files = req.files;
  if (!files || files.length === 0) return res.status(400).json({ message: 'Brak plików' });
  const stmt = db.prepare('INSERT INTO gallery (page_id, file_path, alt_text) VALUES (?, ?, ?)');
  files.forEach(file => {
    stmt.run(pageId, '/uploads/' + file.filename, file.originalname);
  });
  stmt.finalize();
  res.json({ message: 'Zdjęcia dodane' });
});
app.delete('/api/gallery/:id', authenticateToken, (req, res) => {
  const id = req.params.id;
  db.get('SELECT file_path FROM gallery WHERE id=?', [id], (err, row) => {
    if (!row) return res.status(404).json({ message: 'Nie znaleziono' });
    const filePath = path.join(__dirname, row.file_path);
    fs.unlink(filePath, () => {
      db.run('DELETE FROM gallery WHERE id=?', [id], () => {
        res.json({ message: 'Usunięto' });
      });
    });
  });
});

// Locations
app.get('/api/locations', (req, res) => {
  const pageId = parseInt(req.query.pageId) || 1;
  db.all('SELECT id, name FROM locations WHERE page_id=?', [pageId], (err, rows) => {
    res.json(rows || []);
  });
});
app.post('/api/locations', authenticateToken, (req, res) => {
  const pageId = parseInt(req.query.pageId) || 1;
  const { name } = req.body;
  db.run('INSERT INTO locations (page_id, name) VALUES (?, ?)', [pageId, name], function(err) {
    if (err) return res.status(500).json({ message: 'Błąd dodawania' });
    res.json({ id: this.lastID, name });
  });
});
app.delete('/api/locations/:id', authenticateToken, (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM locations WHERE id=?', [id], function(err) {
    if (err) return res.status(500).json({ message: 'Błąd usuwania' });
    res.json({ message: 'Usunięto' });
  });
});

// Footer
app.put('/api/footer', authenticateToken, (req, res) => {
  const pageId = parseInt(req.query.pageId) || 1;
  const { facebook_url, instagram_url, phone } = req.body;
  db.run('INSERT OR IGNORE INTO footer (page_id, facebook_url, instagram_url, phone) VALUES (?, ?, ?, ?)', [pageId, '', '', ''], () => {
    db.run('UPDATE footer SET facebook_url=?, instagram_url=?, phone=? WHERE page_id=?', [facebook_url, instagram_url, phone, pageId], function(err) {
      if (err) return res.status(500).json({ message: 'Błąd zapisu' });
      res.json({ message: 'Stopka zaktualizowana' });
    });
  });
});

// Pages listing and creation
app.get('/api/pages', authenticateToken, (req, res) => {
  db.all('SELECT id, name, slug FROM pages ORDER BY id', [], (err, rows) => {
    res.json(rows || []);
  });
});

app.post('/api/pages', authenticateToken, (req, res) => {
  let { name, slug } = req.body;
  if (!name) return res.status(400).json({ message: 'Brak nazwy strony' });
  if (!slug) {
    slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
  }
  // Ensure slug uniqueness
  db.get('SELECT id FROM pages WHERE slug=?', [slug], (err, row) => {
    if (row) return res.status(400).json({ message: 'Slug zajęty' });
    db.run('INSERT INTO pages (name, slug) VALUES (?, ?)', [name, slug], function(err2) {
      if (err2) return res.status(500).json({ message: 'Błąd tworzenia strony' });
      const newPageId = this.lastID;
      // Insert blank nav, header, footer for new page
      db.run('INSERT INTO nav (page_id, facebook_url, instagram_url) VALUES (?, ?, ?)', [newPageId, '', '']);
      db.run('INSERT INTO welcome_header (page_id, title, subtitle) VALUES (?, ?, ?)', [newPageId, '', '']);
      db.run('INSERT INTO footer (page_id, facebook_url, instagram_url, phone) VALUES (?, ?, ?, ?)', [newPageId, '', '', '']);
      // Copy default stats from page 1
      db.all('SELECT label, value FROM stats WHERE page_id=?', [1], (err3, statsRows) => {
        if (statsRows && statsRows.length) {
          const stmt = db.prepare('INSERT INTO stats (page_id, label, value) VALUES (?, ?, ?)');
          statsRows.forEach(r => {
            stmt.run(newPageId, r.label, r.value);
          });
          stmt.finalize(() => {
            generateStaticPage(newPageId, slug, name);
            res.json({ id: newPageId, name, slug });
          });
        } else {
          generateStaticPage(newPageId, slug, name);
          res.json({ id: newPageId, name, slug });
        }
      });
    });
  });
});

/**
 * Generate a static HTML page for a new slug.
 * This function creates a folder under ../frontend/<slug>/ and writes
 * <slug>.html inside it. The page is based on the main index.html
 * but includes a script that sets window.PAGE_ID to the given pageId.
 * When loaded, the page will fetch its own content via dataLoader.js.
 */
function generateStaticPage(pageId, slug, name) {
  try {
    // Determine template and output locations
    const frontendRoot = path.join(__dirname, '..', 'frontend');
    const templatePath = path.join(frontendRoot, 'index.html');
    const slugDir = path.join(frontendRoot, slug);
    const slugFile = path.join(slugDir, `${slug}.html`);
    fs.mkdirSync(slugDir, { recursive: true });
    // Read template
    let template = fs.readFileSync(templatePath, 'utf-8');
    // Remove any existing PAGE_ID definition from the template
    template = template.replace(/<script>\s*window\.PAGE_ID\s*=\s*[^<]*<\/script>\s*/g, '');
    // Build injection script defining PAGE_ID for this page
    const injection = `<script>window.PAGE_ID = ${pageId};</script>`;
    // Inject PAGE_ID before closing head
    template = template.replace(/<\/head>/i, `${injection}\n</head>`);
    // Ensure dataLoader.js is referenced if not already. Use a relative
    // path so the script loads correctly on nested routes. When generating
    // slug pages we must convert root-relative asset paths (e.g.
    // "/style/style.css") to relative paths (e.g. "../style/style.css") so
    // they resolve when the HTML is served from a subfolder. We only
    // perform this replacement for the slug pages; the original index
    // remains unchanged.
    // Convert root-relative CSS, JS, images and other assets to
    // relative paths one level up.
    template = template
      .replace(/href="\/style\//g, 'href="../style/')
      .replace(/src="\/script\.js/g, 'src="../script.js')
      .replace(/src="\/js\/dataLoader\.js/g, 'src="../js/dataLoader.js')
      .replace(/href="\/images\//g, 'href="../images/')
      .replace(/src="\/images\//g, 'src="../images/')
      .replace(/href="\/videos\//g, 'href="../videos/')
      .replace(/src="\/videos\//g, 'src="../videos/')
      .replace(/href="\/fonts\//g, 'href="../fonts/')
      .replace(/src="\/fonts\//g, 'src="../fonts/');

    // Ensure dataLoader.js is referenced if not already.
    if (!template.includes('dataLoader.js')) {
      template = template.replace(/<\/body>/i, `<script src="../js/dataLoader.js"></script>\n</body>`);
    }
    // Write slug page
    fs.writeFileSync(slugFile, template, 'utf-8');
    console.log(`Created static page for slug ${slug} at ${slugFile}`);
  } catch (err) {
    console.error('Error generating static page:', err);
  }
}

app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
});
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const nodemailer = require('nodemailer');

const app = express();

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const HEYZINE_API_KEY = process.env.HEYZINE_API_KEY;
const HEYZINE_CLIENT_ID = process.env.HEYZINE_CLIENT_ID;
const PROTECTION_TOKEN = process.env.PROTECTION_TOKEN;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_LIST_ID = process.env.BREVO_LIST_ID ? Number(process.env.BREVO_LIST_ID) : undefined;

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/* ================= SESSION MIDDLEWARE ================= */
app.use(session({
    secret: process.env.SESSION_SECRET || "reef_magazine_secret_2024",
    resave: false,
    saveUninitialized: false,
    cookie: { 
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ================= DIRECTORIES =================
const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const COVER_DIR = path.join(__dirname, 'uploads/covers');
const SPLITTED_DIR = path.join(__dirname, 'uploads/splitted');
const SPONSORS_DIR = path.join(__dirname, 'uploads/sponsors');
const DB_FILE = path.join(DATA_DIR, 'flipbooks.json');
const ADV_FILE = path.join(DATA_DIR, "advertisers.json");
const SPONSOR_FILE = path.join(DATA_DIR, "sponsors.json");
const REEF_FILE = path.join(DATA_DIR, "reefclubs.json");
const EVENT_FILE = path.join(DATA_DIR, "events.json");
const NEWS_FILE = path.join(DATA_DIR, "news.json");
const PRODUCT_FILE = path.join(DATA_DIR, "products.json");
const MEMBERS_FILE = path.join(DATA_DIR, "members.json");
const USERS_FILE = path.join(DATA_DIR,"users.json");

[UPLOAD_DIR, DATA_DIR, COVER_DIR, SPONSORS_DIR, SPLITTED_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }) });
[DB_FILE, ADV_FILE, SPONSOR_FILE, REEF_FILE, EVENT_FILE, NEWS_FILE, PRODUCT_FILE, MEMBERS_FILE, USERS_FILE].forEach(d => { if (!fs.existsSync(d)) fs.writeFileSync(d, "[]") });

// ================= HELPERS =================
function readDB() { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) }
function writeDB(data) { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)) }
function readAdvDB() { return JSON.parse(fs.readFileSync(ADV_FILE)) }
function writeAdvDB(data) { fs.writeFileSync(ADV_FILE, JSON.stringify(data, null, 2)) }
function readSponsorDB() { return JSON.parse(fs.readFileSync(SPONSOR_FILE)) }
function writeSponsorDB(data) { fs.writeFileSync(SPONSOR_FILE, JSON.stringify(data, null, 2)) }
function readReefDB() { return JSON.parse(fs.readFileSync(REEF_FILE)) }
function writeReefDB(data) { fs.writeFileSync(REEF_FILE, JSON.stringify(data, null, 2)) }
function readEventDB() { return JSON.parse(fs.readFileSync(EVENT_FILE));}
function writeEventDB(data) { fs.writeFileSync(EVENT_FILE, JSON.stringify(data, null, 2)); }
function readNewsDB() { return JSON.parse(fs.readFileSync(NEWS_FILE)) }
function writeNewsDB(data) { fs.writeFileSync(NEWS_FILE, JSON.stringify(data, null, 2)) }
function readProductDB() { return JSON.parse(fs.readFileSync(PRODUCT_FILE)) }
function writeProductDB(data) { fs.writeFileSync(PRODUCT_FILE, JSON.stringify(data, null, 2)) }
function readMembersDB() { return JSON.parse(fs.readFileSync(MEMBERS_FILE)) }
function readUsersDB(){ return JSON.parse(fs.readFileSync(USERS_FILE)) }
function writeUsersDB(data) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error('Failed to write users DB:', err);
    throw err; // Re-throw to be caught in route
  }
}

// Middleware to check if user is logged in
function isLoggedIn(req, res, next){
  if(!req.session.userId) {
    return res.sendFile(path.join(__dirname, 'public/login.html'));
  }
  next();
}

// =================  PROTECTED STATIC HTML =================
// Protect admin API endpoints: require admin session
app.use('/api/admin', (req, res, next) => {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: 'Admin auth required' });
});
app.get('/admin.html', (req, res) => {
  if(req.session && req.session.isAdmin) return res.sendFile(path.join(__dirname, 'public/admin.html'));
  return res.redirect('/login');
});
app.get('/admin/advertisers.html', (req, res) => {
  if(req.session && req.session.isAdmin) return res.sendFile(path.join(__dirname, 'public/admin/advertisers.html'));
  return res.redirect('/login');
});
app.get('/admin/events.html', (req, res) => {
  if(req.session && req.session.isAdmin) return res.sendFile(path.join(__dirname, 'public/admin/events.html'));
  return res.redirect('/login');
});
app.get('/admin/magazines.html', (req, res) => {
  if(req.session && req.session.isAdmin) return res.sendFile(path.join(__dirname, 'public/admin/magazines.html'));
  return res.redirect('/login');
});
app.get('/admin/products.html', (req, res) => {
  if(req.session && req.session.isAdmin) return res.sendFile(path.join(__dirname, 'public/admin/products.html'));
  return res.redirect('/login');
});
app.get('/admin/reefclubs.html', (req, res) => {
  if(req.session && req.session.isAdmin) return res.sendFile(path.join(__dirname, 'public/admin/reefclubs.html'));
  return res.redirect('/login');
});
app.get('/admin/news.html', (req, res) => {
  if(req.session && req.session.isAdmin) return res.sendFile(path.join(__dirname, 'public/admin/news.html'));
  return res.redirect('/login');
});
app.get('/admin/sponsors.html', (req, res) => {
  if(req.session && req.session.isAdmin) return res.sendFile(path.join(__dirname, 'public/admin/sponsors.html'));
  return res.redirect('/login');
});
app.get('/admin/members.html', (req, res) => {
  if(req.session && req.session.isAdmin) return res.sendFile(path.join(__dirname, 'public/admin/members.html'));
  return res.redirect('/login');
});

app.get('/uploads/:filename', (req, res) => {
  if (req.query.token !== PROTECTION_TOKEN) return res.status(403).send("Unauthorized");
  const filePath = path.join(UPLOAD_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).send("Not found");
  res.sendFile(filePath);
});

// ================ MULTER =================
// Create storage for PDF + Cover + Sponsor images
const dirMap = {
  'pdf': UPLOAD_DIR,
  'cover': COVER_DIR,
  'image': SPONSORS_DIR,
  'product_image': path.join(__dirname, "uploads/products"),
  'splitted_pdf': SPLITTED_DIR
};
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // If it's the product route using the 'image' field, we target the products folder
    if (req.path.includes('/products') && file.fieldname === 'image') {
      cb(null, path.join(__dirname, "uploads/products"));
    } else {
      cb(null, dirMap[file.fieldname] || UPLOAD_DIR);
    }
  },
  filename: function (req, file, cb) {
    const id = crypto.randomUUID();
    cb(null, id + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// ================= ADMIN API =================
// ================= Manage magazines
// upload a magazine
app.post('/api/admin/magazines', upload.fields([
  { name: 'pdf', maxCount: 1 },
  { name: 'splitted_pdf', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, publishedDate, year, featured, status } = req.body;
    const pdfFile = req.files['pdf']?.[0];
    const coverFile = req.files['cover']?.[0];
    const splittedPdfFile = req.files['splitted_pdf']?.[0];

    if (!pdfFile || !coverFile) return res.status(400).json({ error: 'PDF & cover required' });

    const pdfUrl = `${BASE_URL}/uploads/${pdfFile.filename}?token=${PROTECTION_TOKEN}`;

    const hzResp = await axios.post('https://heyzine.com/api1/rest', {
      pdf: pdfUrl,
      client_id: HEYZINE_CLIENT_ID
    }, {
      headers: { Authorization: `Bearer ${HEYZINE_API_KEY}`, 'Content-Type': 'application/json' }
    });

    const hz = hzResp.data;
    const embedUrl = hz?.links?.embed || hz?.embed || hz?.url || null;
    if (!embedUrl) return res.status(500).json({ error: 'Heyzine embed missing' });

    let splittedPath = null;

    if (splittedPdfFile) {
      splittedPath = `/uploads/splitted/${splittedPdfFile.filename}`;
    }

    const record = {
      id: crypto.randomUUID(),
      title,
      publishedDate,
      year: Number(year),
      featured: featured === 'true',
      status: status || 'active',
      pdf: `/uploads/${pdfFile.filename}`,
      cover: `/uploads/covers/${coverFile.filename}`,
      heyzineId: hz.id,
      embedUrl,
      createdAt: new Date().toISOString(),
      splittedPdf: splittedPath
    };

    const db = readDB();

    // If setting featured to true, unfeature all others
    if (featured === 'true') {
      db.forEach(m => {
        m.featured = false;
      });
    }

    db.push(record);
    writeDB(db);

    res.json({ success: true, record });

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Creation failed' });
  }
});

// return embed URL for all magazines (with allowed options by Heyzine config / client_id configs)
app.get('/api/magazines', (req, res) => {
  const db = readDB();
  const active = db.filter(m => m.status === 'active').sort((a, b) => {
    // Sort by year descending (newest first)
    if (a.year !== b.year) return b.year - a.year;
    // Then by title descending (Z-A)
    return b.title.localeCompare(a.title);
  });
  res.json(active);
});

// return the json from flipbook database
app.get('/api/flipbook/:id', (req, res) => {
  const db = readDB();
  const fb = db.find(r => r.id === req.params.id);
  if (!fb) return res.status(404).json({ error: 'Not found' });
  res.json(fb);
});

// return embed html code to fetch in iframe without download option (for all website visitors)
app.get('/api/featuredIssue', (req, res) => {
  const db = readDB();
  const featured = db.find(m => m.featured);
  if (!featured) return res.status(404).json({ error: 'Not found' });
  const clientId = process.env.HEYZINE_CLIENT_ID; // Load from .env
  if (!clientId) return res.status(500).json({ error: 'Config error' });

  const embedUrl = `https://heyzine.com/api1?pdf=https://cdnc.heyzine.com/flip-book/pdf/${featured.heyzineId}&k=${clientId}&d=0`;
  res.json({ embedUrl });
});

// without download option (for website visitors)
app.get('/api/flipbook/:id/visitor', (req, res) => {
  const db = readDB();
  const fb = db.find(r => r.id === req.params.id);
  if (!fb) return res.status(404).json({ error: 'Not found' });
  
  const clientId = process.env.HEYZINE_CLIENT_ID; // Load from .env
  if (!clientId) return res.status(500).json({ error: 'Config error' });
  
  const embedUrl = `https://heyzine.com/api1?pdf=https://cdnc.heyzine.com/flip-book/pdf/${fb.heyzineId}&k=${clientId}&d=0`;
  res.json({ embedUrl });
});

// PATCH: Update magazine metadata (title, year, status, featured)
app.patch('/api/admin/magazines/:id', (req, res) => {
  const { id } = req.params;
  const { title, year, status, featured } = req.body;

  try {
    const db = readDB();
    const mag = db.find(m => m.id === id);
    if (!mag) return res.status(404).json({ error: 'Magazine not found' });

    // If setting featured to true, unfeature all others
    if (featured === true) {
      db.forEach(m => {
        if (m.id !== id) {
          m.featured = false;
        }
      });
    }

    // Update fields
    mag.title = title ?? mag.title;
    mag.year = year ? Number(year) : mag.year;
    mag.status = status ?? mag.status;
    mag.featured = featured ?? mag.featured;
    mag.updatedAt = new Date().toISOString();

    writeDB(db);

    res.json({ success: true, mag });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// DELETE magazine
app.delete('/api/admin/magazines/:id', (req, res) => {
  const { id } = req.params;

  try {
    let db = readDB();
    const index = db.findIndex(m => m.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Magazine not found' });
    }

    const magazine = db[index];

    // Delete cover
    if (magazine.cover) {
      const coverPath = path.join(__dirname, magazine.cover);
      if (fs.existsSync(coverPath)) {
        fs.unlinkSync(coverPath);
      }
    }

    // Delete main PDF
    if (magazine.heyzineId) {
      axios.post('https://heyzine.com/api1/flipbook-delete', {
          id: magazine.heyzineId
        }, {
          headers: { 
            Authorization: `Bearer ${HEYZINE_API_KEY}`, 
            'Content-Type': 'application/json' 
          }
        });
    }

    // Delete splitted PDF
    if (magazine.splittedPdf) {
      const splittedPath = path.join(__dirname, magazine.splittedPdf);
      if (fs.existsSync(splittedPath)) {
        fs.unlinkSync(splittedPath);
      }
    }

    // Also delete original uploaded PDF if stored
    const uploadPdfPath = path.join(__dirname, 'uploads', `${magazine.heyzineId}.pdf`);
    if (fs.existsSync(uploadPdfPath)) {
      fs.unlinkSync(uploadPdfPath);
    }

    if (magazine.pdf) {
      const pdfPath = path.join(__dirname, magazine.pdf);
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
    }

    // Remove from DB
    db.splice(index, 1);
    writeDB(db);

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// ================= Manage Advertisers
// GET all
app.get("/api/admin/advertisers", (req, res) => {
  try { res.json(readAdvDB()) }
  catch (e) { res.status(500).json({ error: "Failed" }) }
});

// GET Public endpoint - filter active elements
app.get("/api/advertisers", (req, res) => {
  try { 
    const db = readAdvDB();
    const active = db.filter(s => s.status === 'active');
    res.json(active);
  }
  catch (e) { res.status(500).json({ error: "Failed" }) }
});

// POST create
app.post("/api/admin/advertisers", (req, res) => {
  try {
    const { title, website, status } = req.body;
    const db = readAdvDB();
    const record = {
      id: crypto.randomUUID(),
      title, status, website,
      createdAt: new Date().toISOString()
    };
    db.push(record);
    writeAdvDB(db);
    res.json({ success: true, record });
  } catch (e) { res.status(500).json({ error: "Create failed" }) }
});

// PATCH update
app.patch("/api/admin/advertisers/:id", (req, res) => {
  try {
    const { id } = req.params;
    const db = readAdvDB();
    const adv = db.find(a => a.id === id);
    if (!adv) return res.status(404).json({ error: "Not found" });
    const { title, website, status } = req.body;
    adv.title = title ?? adv.title;
    adv.website = website ?? adv.website;
    adv.status = status ?? adv.status;
    adv.updatedAt = new Date().toISOString();
    writeAdvDB(db);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Update failed" }) }
});

// DELETE
app.delete("/api/admin/advertisers/:id", (req, res) => {
  try {
    const { id } = req.params;
    let db = readAdvDB();
    const idx = db.findIndex(a => a.id === id);
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    db.splice(idx, 1);
    writeAdvDB(db);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Delete failed" }) }
});

// ================= Manage Sponsors
// GET all
app.get("/api/admin/sponsors", (req, res) => {
  try { res.json(readSponsorDB()) }
  catch (e) { res.status(500).json({ error: "Failed" }) }
});

// GET Public endpoint - return active sponsors for frontend
app.get('/api/sponsors', (req, res) => {
  try {
    const db = readSponsorDB();
    const active = db.filter(s => s.status === 'active');
    res.json(active);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load sponsors' });
  }
});

// POST
app.post("/api/admin/sponsors", upload.single('image'), (req, res) => {
  try {
    const { title, website, status } = req.body;
    const db = readSponsorDB();
    // Get image URL if uploaded
    let imageUrl = '';
    if (req.file) {
      imageUrl = `/uploads/sponsors/${req.file.filename}`;
    }
    const record = {
      id: crypto.randomUUID(),
      title,
      website: website || '',
      status: status || 'active',
      image: imageUrl,
      createdAt: new Date().toISOString()
    };
    db.push(record);
    writeSponsorDB(db);
    res.json({ success: true, record });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Create failed: " + e.message });
  }
});

// PATCH update sponsor with optional image update
app.patch("/api/admin/sponsors/:id", upload.single('image'), (req, res) => {
  try {
    const { id } = req.params;
    const db = readSponsorDB();
    const sponsor = db.find(a => a.id === id);
    if (!sponsor) return res.status(404).json({ error: "Not found" });
    const { title, website, status } = req.body;
    sponsor.title = title || sponsor.title;
    sponsor.website = website || sponsor.website;
    sponsor.status = status || sponsor.status;
    // Update image if a new one was uploaded
    if (req.file) {
      // Delete old image if exists
      if (sponsor.image) {
        const oldImagePath = path.join(__dirname, sponsor.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      sponsor.image = `/uploads/sponsors/${req.file.filename}`;
    }
    sponsor.updatedAt = new Date().toISOString();
    writeSponsorDB(db);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Update failed: " + e.message });
  }
});

// DELETE
app.delete("/api/admin/sponsors/:id", (req, res) => {
  try {
    const { id } = req.params;
    let db = readSponsorDB();
    const idx = db.findIndex(a => a.id === id);
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    // Delete associated image file
    const sponsor = db[idx];
    if (sponsor.image) {
      const imagePath = path.join(__dirname, sponsor.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    db.splice(idx, 1);
    writeSponsorDB(db);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Delete failed: " + e.message });
  }
});

// ================= Manage Reefclubs
// GET all
app.get("/api/admin/reefclubs", (req, res) => {
  try { res.json(readReefDB()) }
  catch (e) { res.status(500).json({ error: "Failed" }) }
});

// GET Public endpoint - apply filter for active elements
app.get(["/api/reefclubs","/api/admin/reefclubs"], (req, res) => {
  try { 
    const db = readReefDB();
    const active = db.filter(s => s.status === 'active');
    res.json(active);
  }
  catch (e) { res.status(500).json({ error: "Failed" }) }
});

// POST create (check unique sort)
app.post("/api/admin/reefclubs", (req, res) => {
  try {
    const { title, city, status, sort, state, website } = req.body;
    const db = readReefDB();
    if (db.find(c => c.sort === sort))
      return res.status(400).json({ error: "Sort value must be unique" });
    const record = {
      id: crypto.randomUUID(),
      title, city, status, sort, state, website,
      createdAt: new Date().toISOString()
    };
    db.push(record);
    writeReefDB(db);
    res.json({ success: true, record });
  } catch (e) { res.status(500).json({ error: "Create failed" }) }
});

// PATCH update (check unique sort)
app.patch("/api/admin/reefclubs/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { title, city, status, sort, state, website } = req.body;
    const db = readReefDB();
    const c = db.find(x => x.id === id);
    if (!c) return res.status(404).json({ error: "Not found" });
    if (db.find(x => x.sort === sort && x.id !== id))
      return res.status(400).json({ error: "Sort value must be unique" });
    c.title = title ?? c.title;
    c.city = city ?? c.city;
    c.state = req.body.state ?? c.state;
    c.website = req.body.website ?? c.website;
    c.status = status ?? c.status;
    c.sort = sort ?? c.sort;
    c.updatedAt = new Date().toISOString();
    writeReefDB(db);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Update failed" }) }
});

// DELETE
app.delete("/api/admin/reefclubs/:id", (req, res) => {
  try {
    const { id } = req.params;
    let db = readReefDB();
    const idx = db.findIndex(c => c.id === id);
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    db.splice(idx, 1);
    writeReefDB(db);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Delete failed" }) }
});

// ================= Manage Events
// GET all
app.get("/api/admin/events", (req, res) => {
  try {
    res.json(readEventDB());
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

// GET Public endpoint - filter active elements
app.get("/api/events", (req, res) => {
  try {
    const db = readEventDB();
    const active = db.filter(s => s.status === 'active');
    res.json(active);
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

// POST create (unique sort)
app.post("/api/admin/events", (req, res) => {
  try {
    const { title, status, sort, featured, description, eventDate } = req.body;
    const db = readEventDB();
    if (db.find(ev => ev.sort === Number(sort))) {
      return res.status(400).json({ error: "Sort value must be unique" });
    }
    const record = {
      id: crypto.randomUUID(),
      title,
      description: description || "",
      eventDate: eventDate || "",
      status,
      featured: !!featured,
      sort: Number(sort),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.push(record);
    writeEventDB(db);
    res.json({ success: true, record });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Create failed" });
  }
});

// PATCH update (unique sort)
app.patch("/api/admin/events/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { title, status, sort, featured, description, eventDate } = req.body;
    const db = readEventDB();
    const ev = db.find(x => x.id === id);
    if (!ev) return res.status(404).json({ error: "Not found" });
    if (db.find(x => x.sort === Number(sort) && x.id !== id)) {
      return res.status(400).json({ error: "Sort value must be unique" });
    }
    ev.title = title ?? ev.title;
    ev.description = description ?? ev.description;
    ev.eventDate = eventDate ?? ev.eventDate;
    ev.status = status ?? ev.status;
    ev.sort = sort !== undefined ? Number(sort) : ev.sort;
    ev.featured = featured !== undefined ? !!featured : ev.featured;
    ev.updatedAt = new Date().toISOString();
    writeEventDB(db);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Update failed" });
  }
});

// DELETE
app.delete("/api/admin/events/:id", (req, res) => {
  try {
    const { id } = req.params;
    let db = readEventDB();
    const idx = db.findIndex(x => x.id === id);
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    db.splice(idx, 1);
    writeEventDB(db);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Delete failed" });
  }
});

// ================= Manage News
// GET all
app.get("/api/admin/news", (req, res) => {
  try { res.json(readNewsDB()) }
  catch (e) { res.status(500).json({ error: "Failed" }) }
});

// GET Public endpoint - filter active elements - not used yet on the web app
app.get("/api/news", (req, res) => {
  try { 
    const db = readNewsDB();
    const active = db.filter(s => s.status === 'active');
    res.json(active);
  }
  catch (e) { res.status(500).json({ error: "Failed" }) }
});

// POST create
app.post("/api/admin/news", (req, res) => {
  try {
    const { title, status, featured, description } = req.body;

    const record = {
      id: crypto.randomUUID(),
      title,
      status,
      featured: !!featured,
      description: description || "",
      createdAt: new Date().toISOString()
    };

    const db = readNewsDB();
    db.push(record);
    writeNewsDB(db);
    res.json({ success: true, record });
  } catch (e) { res.status(500).json({ error: "Create failed" }) }
});

// PATCH update
app.patch("/api/admin/news/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { title, status, featured, description } = req.body;
    const db = readNewsDB();
    const n = db.find(x => x.id === id);
    if (!n) return res.status(404).json({ error: "Not found" });

    n.title = title ?? n.title;
    n.status = status ?? n.status;
    n.featured = !!featured;
    n.description = description ?? n.description;
    n.updatedAt = new Date().toISOString();

    writeNewsDB(db);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Update failed" }) }
});

// DELETE
app.delete("/api/admin/news/:id", (req, res) => {
  try {
    const { id } = req.params;
    let db = readNewsDB();
    const idx = db.findIndex(x => x.id === id);
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    db.splice(idx, 1);
    writeNewsDB(db);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Delete failed" }) }
});

// ================= Manage Products
// GET all products
app.get("/api/admin/products", (req, res) => {
  try { 
    res.json(readProductDB());
  } catch (e) { 
    res.status(500).json({ error: "Failed" });
  }
});

// GET Public endpoint - filter active elements
app.get("/api/products", (req, res) => {
  try { 
    const db = readProductDB();
    const active = db.filter(s => s.status === 'active');
    res.json(active);
  } catch (e) { 
    res.status(500).json({ error: "Failed" });
  }
});

// POST create product
app.post("/api/admin/products", uploadProduct.single("image"), (req, res) => {
  try {
    const { title, website, status } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: "Image required" });

    const record = {
      id: crypto.randomUUID(),
      title,
      website,
      status,
      image: "/uploads/products/" + file.filename,
      createdAt: new Date().toISOString()
    };

    const db = readProductDB();
    db.push(record);
    writeProductDB(db);
    res.json({ success: true, record });
  } catch (e) { res.status(500).json({ error: "Create failed" }) }
});

// PATCH update product
app.patch("/api/admin/products/:id", uploadProduct.single("image"), (req, res) => {
  try {
    const { id } = req.params;
    const { title, website, status } = req.body;
    const db = readProductDB();
    const p = db.find(x => x.id === id);
    if (!p) return res.status(404).json({ error: "Not found" });

    p.title = title ?? p.title;
    p.website = website ?? p.website;
    p.status = status ?? p.status;
    if (req.file) p.image = "/uploads/products/" + req.file.filename;
    p.updatedAt = new Date().toISOString();

    writeProductDB(db);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Update failed" }) }
});

// DELETE product
app.delete("/api/admin/products/:id", (req, res) => {
  try {
    const { id } = req.params;
    let db = readProductDB();
    const idx = db.findIndex(x => x.id === id);
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    db.splice(idx, 1);
    writeProductDB(db);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Delete failed" }) }
});

// ================= Manage Members
// GET all members (for now, only read members data)
app.get("/api/admin/members", (req, res) => {
  try { res.json(readMembersDB()) }
  catch (e) { res.status(500).json({ error: "Failed" }) }
});

// ================= USER REGISTRATION & AUTH =================
// POST register - public endpoint
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    // Validate inputs
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
    // Check if email already has a user account
    const users = readUsersDB();
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: "Email already registered" });
    }
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    // Create user record
    const user = {
      id: crypto.randomUUID(),
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };
    
    users.push(user);
    
    // Try to add contact to Brevo (non-blocking)
    if (BREVO_API_KEY) {
      (async () => {
        try {
          // Prepare contact data
          const contactData = {
            email: email,
            attributes: {
              FIRSTNAME: name || ''
            },
            updateEnabled: true
          };

          // Add listIds if provided
          if (BREVO_LIST_ID) {
            contactData.listIds = [parseInt(BREVO_LIST_ID)]; // Brevo expects numbers, not strings
          }

          // Add emailBlacklisted and smsBlacklisted if needed
          // contactData.emailBlacklisted = false;
          // contactData.smsBlacklisted = true;

          await axios.post('https://api.brevo.com/v3/contacts', contactData, {
            headers: {
              'api-key': BREVO_API_KEY,
              'accept': 'application/json',
              'Content-Type': 'application/json'
            },
            timeout: 5000
          });
        } catch (err) {
          // Handle specific Brevo errors
          const errorData = err.response?.data;
          console.error('Brevo API Error:', {
            message: err.message,
            status: err.response?.status,
            data: errorData
          });
          // Handle specific error cases
          if (errorData?.code === 'duplicate_parameter') {
            console.log('Contact already exists in Brevo');
          }
        }
      })();
    }
    // critical : must do write operation after processing await operations
    writeUsersDB(users);
    res.json({ success: true, message: "Registration successful" });
  } catch (e) {
    console.error("Registration error:", e);
    res.status(500).json({ error: "Registration failed" });
  }
});

// POST login - public endpoint
app.post("/api/login", async (req,res)=>{
  try{
    const {email, password} = req.body;
    // Validate inputs
    if(!email || !password) return res.status(400).json({error:"Email and password required"});
    // Check if user exists
    const users = readUsersDB();
    const user = users.find(u => u.email === email);
    if(!user) return res.status(401).json({error:"Invalid email or password"});
    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if(!passwordMatch) return res.status(401).json({error:"Invalid email or password"});
    // Create session
    req.session.userId = user.id;
    req.session.userEmail = user.email;
    // mark admin session when email matches ADMIN_EMAIL
    req.session.isAdmin = (user.email === ADMIN_EMAIL);
    res.json({success:true, message:"Login successful", admin: !!req.session.isAdmin});
  }catch(e){
    console.error(e);
    res.status(500).json({error:"Login failed"});
  }
});

// POST logout
app.post("/api/logout", (req,res)=>{
  const wasAdmin = req.session && req.session.isAdmin;
  req.session.destroy((err)=>{
    if(err) return res.status(500).json({error:"Logout failed"});
    res.clearCookie('connect.sid'); // clear session cookie explicitly
    res.json({success:true, message:"Logged out", wasAdmin});
  });
});

// recover an account by changing password and sending in plaint text to the user email
app.post('/api/recoverAccount', async (req, res) => {
  try {
    const { email } = req.body;
    const users = readUsersDB();
    const userIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (userIndex === -1) {
      return res.status(404).json({ success: false, error: 'No account found with this email' });
    }
    const newPlainPassword = 'RHM-' + crypto.randomBytes(6).toString('hex');
    const newHashedPassword = await bcrypt.hash(newPlainPassword, 10);
    users[userIndex].password = newHashedPassword;
    users[userIndex].resetAt = new Date().toISOString();
    await transporter.verify();
    await transporter.sendMail({
      from: `"REEF Magazine" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your REEF Clubs password',
      html: `<p>Your new password is : ${newPlainPassword}</p>`
    });
    writeUsersDB(users);
    res.json({ success: true, message: 'Email sent!' });
  } catch (err) {
    res.json({ success: false, error: err.message, code: err.code });
  }
});

// GET current user info (protected)
app.get("/api/user", (req,res)=>{
  if(!req.session.userId) return res.status(401).json({error:"Not logged in"});
  res.json({
    success:true, 
    user:{
      id: req.session.userId,
      email: req.session.userEmail,
      isAdmin: !!req.session.isAdmin
    }
  });
});

// ================= PAGES =================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));
app.get('/admin', (req, res) => {
  if(req.session && req.session.isAdmin) return res.sendFile(path.join(__dirname, 'public/admin.html'));
  return res.redirect('/login');
});
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/subscribe', (req, res) => res.sendFile(path.join(__dirname, 'public/subscribe.html')));
app.get('/recover-account', (req, res) => res.sendFile(path.join(__dirname, 'public/recover.html')));
app.get('/advertisers', (req, res) => res.sendFile(path.join(__dirname, 'public/advertisers.html')));
app.get('/clubs', (req, res) => res.sendFile(path.join(__dirname, 'public/clubs.html')));
app.get('/archive', isLoggedIn, (req, res) => res.sendFile(path.join(__dirname, 'public/archive.html')));
app.get('/subscribe', (req, res) => res.sendFile(path.join(__dirname, 'public/subscribe.html')));
app.get('/flipbook/:id', (req, res) => {
  if (!req.session || !req.session.userId) {
    res.sendFile(path.join(__dirname, 'public/visitor.html'));
  } else {
    res.sendFile(path.join(__dirname, 'public/flipbook.html'));
  }
});

// ================= START SERVER =================
app.listen(PORT, () => console.log(`Server running at ${BASE_URL}`));
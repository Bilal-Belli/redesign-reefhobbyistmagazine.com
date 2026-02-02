require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const crypto = require('crypto');

const app = express();

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const HEYZINE_API_KEY = process.env.HEYZINE_API_KEY;
const HEYZINE_CLIENT_ID = process.env.HEYZINE_CLIENT_ID;
const PROTECTION_TOKEN = process.env.PROTECTION_TOKEN || "secret_pdf_access_token_123";

/* ================= DIRECTORIES ================= */
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'flipbooks.json');
const COVER_DIR = path.join(__dirname, 'public/covers');

[UPLOAD_DIR, DATA_DIR, COVER_DIR].forEach(d => { if(!fs.existsSync(d)) fs.mkdirSync(d,{recursive:true}) });
if(!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE,'[]');

/* ================= HELPERS ================= */
function readDB(){ return JSON.parse(fs.readFileSync(DB_FILE,'utf8')) }
function writeDB(data){ fs.writeFileSync(DB_FILE,JSON.stringify(data,null,2)) }

/* ================= STATIC / PROTECTED PDF ================= */
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,'public')));

app.get('/uploads/:filename',(req,res)=>{
    if(req.query.token !== PROTECTION_TOKEN) return res.status(403).send("Unauthorized");
    const filePath = path.join(UPLOAD_DIR, req.params.filename);
    if(!fs.existsSync(filePath)) return res.status(404).send("Not found");
    res.sendFile(filePath);
});

/* ================= MULTER ================= */
// Create storage for PDF + Cover in one fields() instance
const storage = multer.diskStorage({
    destination: function(req, file, cb){
        if(file.fieldname==='pdf') cb(null, UPLOAD_DIR);
        else if(file.fieldname==='cover') cb(null, COVER_DIR);
    },
    filename: function(req, file, cb){
        const id = crypto.randomUUID();
        cb(null, id + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

/* ================= ADMIN UPLOAD ================= */
app.post('/api/admin/magazines', upload.fields([
    { name: 'pdf', maxCount:1 },
    { name: 'cover', maxCount:1 }
]), async (req,res)=>{
    try{
        const { title, publishedDate, year, featured, status } = req.body;
        const pdfFile = req.files['pdf']?.[0];
        const coverFile = req.files['cover']?.[0];

        if(!pdfFile || !coverFile) return res.status(400).json({error:'PDF & cover required'});

        const pdfUrl = `${BASE_URL}/uploads/${pdfFile.filename}?token=${PROTECTION_TOKEN}`;

        const hzResp = await axios.post('https://heyzine.com/api1/rest',{
            pdf: pdfUrl,
            client_id: HEYZINE_CLIENT_ID,
            download:0,
            print:0,
            share:0
        },{
            headers:{ Authorization:`Bearer ${HEYZINE_API_KEY}`, 'Content-Type':'application/json'}
        });

        const hz = hzResp.data;
        const embedUrl = hz?.links?.embed || hz?.embed || hz?.url || null;
        if(!embedUrl) return res.status(500).json({error:'Heyzine embed missing'});

        const record = {
            id: crypto.randomUUID(),
            title,
            publishedDate,
            year:Number(year),
            featured: featured === 'true',
            status: status || 'active',
            cover:`/covers/${coverFile.filename}`,
            heyzineId: hz.id,
            embedUrl,
            createdAt: new Date().toISOString()
        };

        const db = readDB();
        db.push(record);
        writeDB(db);

        res.json({ success:true, record });

    }catch(err){
        console.error(err.response?.data || err.message);
        res.status(500).json({error:'Creation failed'});
    }
});

/* ================= PUBLIC API ================= */
app.get('/api/magazines',(req,res)=>{
    const db = readDB();
    const active = db.filter(m=>m.status==='active').sort((a,b)=>b.featured - a.featured);
    res.json(active);
});

app.get('/api/flipbook/:id',(req,res)=>{
    const db = readDB();
    const fb = db.find(r=>r.id===req.params.id);
    if(!fb) return res.status(404).json({error:'Not found'});
    res.json(fb);
});

/* ================= PAGES ================= */
app.get('/',(req,res)=>res.sendFile(path.join(__dirname,'public/index.html')));
app.get('/admin',(req,res)=>res.sendFile(path.join(__dirname,'public/admin.html')));
app.get('/flipbook/:id',(req,res)=>res.sendFile(path.join(__dirname,'public/flipbook.html')));

/* ================= START SERVER ================= */
app.listen(PORT,()=>console.log(`Server running at ${BASE_URL}`));

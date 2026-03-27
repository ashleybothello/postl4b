const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve front-end at root for local and Vercel
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Optional: SPA fallback for client side routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Request logger with colors
app.use((req, res, next) => {
    const start = Date.now();
    const methodColors = {
        GET: '\x1b[32m',    // green
        POST: '\x1b[34m',   // blue
        PATCH: '\x1b[33m',  // yellow
        DELETE: '\x1b[31m', // red
    };
    const color = methodColors[req.method] || '\x1b[37m';
    const reset = '\x1b[0m';

    res.on('finish', () => {
        const elapsed = Date.now() - start;
        const statusColor = res.statusCode < 400 ? '\x1b[32m' : '\x1b[31m';
        console.log(`  ${color}${req.method}${reset} ${req.originalUrl} ${statusColor}${res.statusCode}${reset} ${elapsed}ms`);

        if (req.body && Object.keys(req.body).length > 0) {
            console.log(`  Body: ${JSON.stringify(req.body)}`);
        }
    });
    next();
});

// In-memory Database
let students = [
    { id: 1, name: 'Arjun Mehta', branch: 'Computer Engineering', year: 'SE' },
    { id: 2, name: 'Priya Sharma', branch: 'Electronics', year: 'TE' },
    { id: 3, name: 'Rohan Desai', branch: 'Computer Engineering', year: 'BE' },
    { id: 4, name: 'Sneha Patil', branch: 'Information Technology', year: 'FE' },
    { id: 5, name: 'Vikram Singh', branch: 'Mechanical', year: 'TE' },
];

let nextId = 6;

// GET /api/students -> Get all students (with optional filters)
app.get('/api/students', (req, res) => {
    let result = [...students];

    // Filter by branch
    if (req.query.branch) {
        result = result.filter(s =>
            s.branch.toLowerCase().includes(req.query.branch.toLowerCase())
        );
    }

    // Filter by year
    if (req.query.year) {
        result = result.filter(s =>
            s.year.toLowerCase() === req.query.year.toLowerCase()
        );
    }

    // Search by name
    if (req.query.search) {
        const q = req.query.search.toLowerCase();
        result = result.filter(s =>
            s.name.toLowerCase().includes(q) ||
            s.branch.toLowerCase().includes(q)
        );
    }

    res.json(result);
});

// GET /api/students/:id -> Get a specific student
app.get('/api/students/:id', (req, res) => {
    const student = students.find(s => s.id === parseInt(req.params.id));
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
});

// POST /api/students -> Add a new student
app.post('/api/students', (req, res) => {
    const { name, branch, year } = req.body;
    if (!name || !branch || !year) {
        return res.status(400).json({ error: 'Name, branch, and year are required' });
    }
    const newStudent = { id: nextId++, name, branch, year };
    students.push(newStudent);
    console.log(`\n  --- New Request: POST /students ---`);
    console.log(`  Body: ${JSON.stringify(req.body)}\n`);
    res.status(201).json(newStudent);
});

// PATCH /api/students/:id -> Update student details
app.patch('/api/students/:id', (req, res) => {
    const student = students.find(s => s.id === parseInt(req.params.id));
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const { name, branch, year } = req.body;
    if (name) student.name = name;
    if (branch) student.branch = branch;
    if (year) student.year = year;

    console.log(`\n  --- New Request: PATCH /students/${req.params.id} ---`);
    console.log(`  Body: ${JSON.stringify(req.body)}\n`);
    res.json(student);
});

// DELETE /api/students/:id -> Delete a student
app.delete('/api/students/:id', (req, res) => {
    const idx = students.findIndex(s => s.id === parseInt(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Student not found' });

    const deleted = students.splice(idx, 1)[0];
    console.log(`\n  --- New Request: DELETE /students/${req.params.id} ---\n`);
    res.json({ message: 'Student deleted successfully', deleted });
});

// Start server
// Start server locally, export for Vercel
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log('');
        console.log('  ╔═══════════════════════════════════════════╗');
        console.log('  ║   StudentRecords API — Command Center     ║');
        console.log('  ║   CRCE • Dept. of Computer Engineering    ║');
        console.log(`  ║   Server running: http://localhost:${PORT}     ║`);
        console.log('  ╚═══════════════════════════════════════════╝');
        console.log('');
        console.log(`  ${students.length} students loaded into memory`);
        console.log('  Endpoints: GET, POST, PATCH, DELETE /api/students');
        console.log('  Filters: ?branch, ?year, ?search');
        console.log('');
    });
}

module.exports = app;

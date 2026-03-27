let students = [
  { id: 1, name: 'Arjun Mehta', branch: 'Computer Engineering', year: 'SE' },
  { id: 2, name: 'Priya Sharma', branch: 'Electronics', year: 'TE' },
  { id: 3, name: 'Rohan Desai', branch: 'Computer Engineering', year: 'BE' },
  { id: 4, name: 'Sneha Patil', branch: 'Information Technology', year: 'FE' },
  { id: 5, name: 'Vikram Singh', branch: 'Mechanical', year: 'TE' },
];
let nextId = 6;

const jsonResponse = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify(body));
};

const parseBody = async (req) => {
  if (!req.body) {
    const buff = [];
    for await (const chunk of req) buff.push(chunk);
    const raw = Buffer.concat(buff).toString('utf8');
    if (!raw) return undefined;
    try { return JSON.parse(raw); } catch (err) { return undefined; }
  }
  return req.body;
};

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const trailing = url.pathname.replace(/^\/api/, '');
    const parts = trailing.split('/').filter(Boolean); // ['students', 'id']

    if (parts[0] !== 'students') {
      return jsonResponse(res, 404, { error: 'Not found' });
    }

    const id = parts[1] ? parseInt(parts[1], 10) : null;

    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      return jsonResponse(res, 204, {});
    }

    if (req.method === 'GET') {
      if (id) {
        const student = students.find((s) => s.id === id);
        if (!student) return jsonResponse(res, 404, { error: 'Student not found' });
        return jsonResponse(res, 200, student);
      }

      let result = [...students];
      if (url.searchParams.has('branch')) {
        const q = url.searchParams.get('branch').toLowerCase();
        result = result.filter((s) => s.branch.toLowerCase().includes(q));
      }
      if (url.searchParams.has('year')) {
        const q = url.searchParams.get('year').toLowerCase();
        result = result.filter((s) => s.year.toLowerCase() === q);
      }
      if (url.searchParams.has('search')) {
        const q = url.searchParams.get('search').toLowerCase();
        result = result.filter((s) =>
          s.name.toLowerCase().includes(q) || s.branch.toLowerCase().includes(q)
        );
      }
      return jsonResponse(res, 200, result);
    }

    if (req.method === 'POST' && !id) {
      const body = await parseBody(req);
      if (!body || !body.name || !body.branch || !body.year) {
        return jsonResponse(res, 400, { error: 'Name, branch, and year are required' });
      }
      const newStudent = { id: nextId++, name: body.name, branch: body.branch, year: body.year };
      students.push(newStudent);
      return jsonResponse(res, 201, newStudent);
    }

    if ((req.method === 'PATCH' || req.method === 'DELETE') && id) {
      const index = students.findIndex((s) => s.id === id);
      if (index === -1) return jsonResponse(res, 404, { error: 'Student not found' });

      if (req.method === 'DELETE') {
        const removed = students.splice(index, 1)[0];
        return jsonResponse(res, 200, { message: 'Deleted', deleted: removed });
      }

      const body = await parseBody(req);
      if (!body) return jsonResponse(res, 400, { error: 'Invalid JSON body' });

      if (body.name) students[index].name = body.name;
      if (body.branch) students[index].branch = body.branch;
      if (body.year) students[index].year = body.year;
      return jsonResponse(res, 200, students[index]);
    }

    return jsonResponse(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    return jsonResponse(res, 500, { error: 'Internal Server Error', details: error.message });
  }
}

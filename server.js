/**
 * TrackPulse Express Backend & Multi-User Server
 * Provides REST API for authentication, user data sync, and Admin Management (RIADH)
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'db.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

// Database Helpers
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: [
        {
          id: 'usr_admin_1',
          username: 'RIADH',
          password: 'admin123', // Admin credentials
          role: 'admin',
          createdAt: new Date().toISOString()
        }
      ],
      userData: {
        'usr_admin_1': {
          habits: [
            { id: 'h_admin_1', name: 'Gym & Fitness', category: 'Sport', icon: 'fa-dumbbell', metricType: 'duration', goalValue: 180, goalUnit: 'mins/week', color: '#10b981' },
            { id: 'h_admin_2', name: 'FX & Stock Trading', category: 'Trading', icon: 'fa-chart-line', metricType: 'currency', goalValue: 500, goalUnit: '$/week', color: '#f59e0b' },
            { id: 'h_admin_3', name: 'Reading Books', category: 'Reading', icon: 'fa-book', metricType: 'count', goalValue: 150, goalUnit: 'pages/week', color: '#3b82f6' }
          ],
          logs: {},
          reflections: {}
        }
      }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading db.json:', e);
    return { users: [], userData: {} };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// REST API Endpoints

// 1. Register User
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const db = readDB();
  const existing = db.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const userId = `usr_${Date.now()}`;
  const isFirstAdmin = username.trim().toUpperCase() === 'RIADH';
  const newUser = {
    id: userId,
    username: username.trim(),
    password: password.trim(),
    role: isFirstAdmin ? 'admin' : 'user',
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  db.userData[userId] = {
    habits: [
      { id: `h_${Date.now()}_1`, name: 'Workout Session', category: 'Sport', icon: 'fa-running', metricType: 'duration', goalValue: 120, color: '#10b981' },
      { id: `h_${Date.now()}_2`, name: 'Trading Journal', category: 'Trading', icon: 'fa-chart-line', metricType: 'currency', goalValue: 200, color: '#f59e0b' }
    ],
    logs: {},
    reflections: {}
  };

  writeDB(db);

  res.json({
    success: true,
    user: { id: newUser.id, username: newUser.username, role: newUser.role }
  });
});

// 2. Login User
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const db = readDB();

  const user = db.users.find(u => 
    u.username.toLowerCase() === (username || '').trim().toLowerCase() && u.password === (password || '').trim()
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  res.json({
    success: true,
    user: { id: user.id, username: user.username, role: user.role }
  });
});

// 3. Get Logged-in User Data
app.get('/api/user/data/:userId', (req, res) => {
  const { userId } = req.params;
  const db = readDB();
  const userData = db.userData[userId] || { habits: [], logs: {}, reflections: {} };
  res.json(userData);
});

// 4. Save/Sync User Data
app.post('/api/user/data/:userId', (req, res) => {
  const { userId } = req.params;
  const { habits, logs, reflections } = req.body;

  const db = readDB();
  db.userData[userId] = {
    habits: habits || [],
    logs: logs || {},
    reflections: reflections || {}
  };

  writeDB(db);
  res.json({ success: true });
});

// 5. Admin Endpoint (Only for RIADH or admin role)
app.get('/api/admin/overview', (req, res) => {
  const adminId = req.headers['x-user-id'];
  const db = readDB();
  
  const requestingUser = db.users.find(u => u.id === adminId);
  if (!requestingUser || requestingUser.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }

  const usersOverview = db.users.map(u => {
    const uData = db.userData[u.id] || { habits: [], logs: {}, reflections: {} };
    const logsCount = Object.keys(uData.logs || {}).length;
    return {
      id: u.id,
      username: u.username,
      role: u.role,
      createdAt: u.createdAt,
      habitsCount: uData.habits ? uData.habits.length : 0,
      logsCount: logsCount
    };
  });

  res.json({
    totalUsers: db.users.length,
    users: usersOverview
  });
});

// Start Express Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 TrackPulse Multi-User Server running on port ${PORT}`);
  console.log(`👉 Local:   http://localhost:${PORT}`);
  console.log(`👑 Admin Account: Username: RIADH | Password: admin123`);
  console.log(`====================================================`);
});

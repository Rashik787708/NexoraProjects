require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const connectDB = require('./config/db');
const User = require('./models/User');

const app = express();

const seedAdmin = async () => {
  try {
    const exists = await User.findOne({ email: 'admin@nexora' });
    if (!exists) {
      await User.create({ name: 'Admin', email: 'admin@nexora', password: 'admin123', role: 'admin' });
      console.log('Default admin created: admin@nexora / admin123');
    }
  } catch (e) {
    console.error('Admin seed error:', e.message);
  }
};

connectDB().then(seedAdmin);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const viewRoutes = require('./routes/viewRoutes');
app.use('/', viewRoutes);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/contact', require('./routes/contact'));

const { protect } = require('./middleware/auth');
const { getDashboard } = require('./controllers/projectController');
const { getContacts, toggleResponded } = require('./controllers/contactController');
app.get('/api/dashboard', protect, getDashboard);
app.get('/api/contacts', protect, getContacts);
app.put('/api/contacts/:id/toggle', protect, toggleResponded);

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API endpoint not found' });
  }
  res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;

let shutdownMode = false;
let shutdownMessage = 'We are temporarily shut down due to out of stock. We will be back soon!';

app.get('/api/status', (req, res) => {
  res.json({ shutdown: shutdownMode, message: shutdownMessage });
});
app.put('/api/status/shutdown', protect, (req, res) => {
  shutdownMode = req.body.shutdown !== undefined ? req.body.shutdown : shutdownMode;
  shutdownMessage = req.body.message || shutdownMessage;
  res.json({ success: true, shutdown: shutdownMode, message: shutdownMessage });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

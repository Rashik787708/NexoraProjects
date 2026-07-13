require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const connectDB = require('./config/db');
const User = require('./models/User');

const app = express();

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

app.use(passport.initialize());

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });
      if (!user) {
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        user = await User.findOne({ email });
        if (user) {
          user.googleId = profile.id;
          user.authProvider = 'google';
          if (profile.photos && profile.photos[0]) user.avatar = profile.photos[0].value;
          await user.save();
        } else {
          user = await User.create({
            name: profile.displayName,
            email,
            googleId: profile.id,
            authProvider: 'google',
            avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : '',
            role: 'user',
          });
        }
      }
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  }));
}

const viewRoutes = require('./routes/viewRoutes');
app.use('/', viewRoutes);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/contact', require('./routes/contact'));

const { protect, requireAdmin } = require('./middleware/auth');
const { getDashboard } = require('./controllers/projectController');
const { getContacts, toggleResponded } = require('./controllers/contactController');
app.get('/api/dashboard', protect, requireAdmin, getDashboard);
app.get('/api/contacts', protect, requireAdmin, getContacts);
app.put('/api/contacts/:id/toggle', protect, requireAdmin, toggleResponded);

let shutdownMode = false;
let shutdownMessage = 'We are temporarily shut down due to out of stock. We will be back soon!';

app.get('/api/status', (req, res) => {
  res.json({ shutdown: shutdownMode, message: shutdownMessage });
});
app.put('/api/status/shutdown', protect, requireAdmin, (req, res) => {
  shutdownMode = req.body.shutdown !== undefined ? req.body.shutdown : shutdownMode;
  shutdownMessage = req.body.message || shutdownMessage;
  res.json({ success: true, shutdown: shutdownMode, message: shutdownMessage });
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API endpoint not found' });
  }
  res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File too large. Max size is 2MB.' });
  }
  if (err.message && err.message.includes('Only image files')) {
    return res.status(400).json({ success: false, message: err.message });
  }
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectDB();

    const adminExists = await User.findOne({ email: 'admin@nexora' }).select('+password');
    if (!adminExists) {
      await User.create({ name: 'Admin', email: 'admin@nexora', password: 'admin123', role: 'admin', authProvider: 'local' });
      console.log('Admin user created: admin@nexora / admin123');
    } else {
      console.log('Admin user ready: admin@nexora');
    }
  } catch (e) {
    console.error('Startup error:', e.message);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();

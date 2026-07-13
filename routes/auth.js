const express = require('express');
const router = express.Router();
const passport = require('passport');
const {
  register, login, getMe, updateProfile, changePassword,
  googleCallback, toggleFavorite, getFavorites,
} = require('../controllers/authController');
const { protect, requireUser } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, requireUser, updateProfile);
router.put('/change-password', protect, changePassword);

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login?error=Google+auth+failed' }),
    googleCallback
  );
}

router.post('/favorites/:projectId', protect, requireUser, toggleFavorite);
router.get('/favorites', protect, requireUser, getFavorites);

module.exports = router;

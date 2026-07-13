const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
};

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    const user = await User.create({ name, email, password, role: 'user', authProvider: 'local' });
    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);
    res.status(200).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMe = async (req, res) => {
  const user = await User.findById(req.user._id).populate('favorites');
  res.status(200).json({
    success: true,
    user: {
      id: user._id, name: user.name, email: user.email, role: user.role,
      avatar: user.avatar, authProvider: user.authProvider, favorites: user.favorites,
    },
  });
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const user = await User.findById(req.user._id);
    if (name) user.name = name;
    if (avatar !== undefined) user.avatar = avatar;
    await user.save();
    res.status(200).json({
      success: true,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both passwords are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }
    const user = await User.findById(req.user.id).select('+password');
    if (!user.password) {
      return res.status(400).json({ success: false, message: 'Your account uses social login. Cannot change password.' });
    }
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }
    user.password = newPassword;
    await user.save();
    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.googleCallback = async (req, res) => {
  try {
    const token = generateToken(req.user._id);
    res.redirect(`/?google_token=${token}`);
  } catch (error) {
    res.redirect('/login?error=Google+auth+failed');
  }
};

exports.toggleFavorite = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const projectId = req.params.projectId;
    const idx = user.favorites.indexOf(projectId);
    if (idx > -1) {
      user.favorites.splice(idx, 1);
    } else {
      if (user.favorites.length >= 100) {
        return res.status(400).json({ success: false, message: 'Maximum 100 favorites allowed' });
      }
      user.favorites.push(projectId);
    }
    await user.save();
    res.status(200).json({ success: true, favorites: user.favorites });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('favorites');
    res.status(200).json({ success: true, data: user.favorites });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

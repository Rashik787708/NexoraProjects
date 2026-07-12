const express = require('express');
const router = express.Router();
const path = require('path');

const view = (file) => (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', file));
};

router.get('/', view('index.html'));
router.get('/projects', view('projects.html'));
router.get('/hardware', view('hardware.html'));
router.get('/software', view('software.html'));
router.get('/project/:slug', view('project-detail.html'));
router.get('/about', view('about.html'));
router.get('/contact', view('contact.html'));
router.get('/admin/login', view('admin-login.html'));
router.get('/admin/dashboard', view('admin-dashboard.html'));

module.exports = router;

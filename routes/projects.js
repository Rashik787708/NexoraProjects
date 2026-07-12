const express = require('express');
const router = express.Router();
const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getDashboard,
  getAllProjectsAdmin,
} = require('../controllers/projectController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/dashboard', protect, getDashboard);
router.get('/admin/all', protect, getAllProjectsAdmin);
router.get('/', getProjects);
router.get('/:id', getProject);
router.post('/', protect, upload.single('thumbnail'), createProject);
router.put('/:id', protect, upload.single('thumbnail'), updateProject);
router.delete('/:id', protect, deleteProject);

module.exports = router;

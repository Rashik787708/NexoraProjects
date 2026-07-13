const express = require('express');
const router = express.Router();
const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getAllProjectsAdmin,
} = require('../controllers/projectController');
const { protect, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/admin/all', protect, requireAdmin, getAllProjectsAdmin);
router.get('/', getProjects);
router.get('/:id', getProject);
router.post('/', protect, requireAdmin, upload.single('thumbnail'), createProject);
router.put('/:id', protect, requireAdmin, upload.single('thumbnail'), updateProject);
router.delete('/:id', protect, requireAdmin, deleteProject);

module.exports = router;

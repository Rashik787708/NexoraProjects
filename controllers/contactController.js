const Contact = require('../models/Contact');

exports.submitContact = async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email and message are required' });
    }
    const contact = await Contact.create({ name, email, phone, message });
    res.status(201).json({ success: true, message: 'Message sent successfully', data: contact });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

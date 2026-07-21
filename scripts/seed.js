require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Project = require('../models/Project');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nova-projects';

const sampleProjects = [
  {
    title: 'Smart Home Automation System',
    category: 'hardware',
    description: 'A comprehensive IoT-based smart home automation system using Arduino and Raspberry Pi. Control lights, fans, doors, and appliances from your phone. Features voice control integration, scheduling, and energy monitoring. Complete with mobile app and web dashboard.',
    technology: ['Arduino', 'Raspberry Pi', 'IoT', 'Blynk', 'Python'],
    difficulty: 'advanced',
    price: 2499,
    featured: true,
    status: 'published',
    github: 'https://github.com/nova/smart-home',
    demo: '',
  },
  {
    title: 'Automated Plant Watering System',
    category: 'hardware',
    description: 'An automatic plant watering system using soil moisture sensors and Arduino. Monitors soil conditions in real-time and waters plants automatically when moisture drops below threshold. Includes mobile notifications and data logging.',
    technology: ['Arduino', 'Soil Sensor', 'IoT', 'ESP8266', 'Blynk'],
    difficulty: 'beginner',
    price: 999,
    featured: true,
    status: 'published',
    github: 'https://github.com/nova/plant-watering',
  },
  {
    title: 'Line Following Robot',
    category: 'hardware',
    description: 'A high-speed line following robot using IR sensors and Arduino. Features PID control for smooth navigation, speed control, and obstacle avoidance. Perfect for robotics competitions and learning embedded systems.',
    technology: ['Arduino', 'IR Sensors', 'Motor Driver', 'Robotics', 'C++'],
    difficulty: 'intermediate',
    price: 1499,
    featured: false,
    status: 'published',
  },
  {
    title: 'IoT Weather Station',
    category: 'hardware',
    description: 'A complete weather monitoring station using ESP8266 and multiple sensors. Displays temperature, humidity, pressure, and air quality data on a web dashboard. Includes historical data logging and alert system.',
    technology: ['ESP8266', 'DHT22', 'BMP280', 'IoT', 'ThingSpeak'],
    difficulty: 'intermediate',
    price: 1799,
    featured: true,
    status: 'published',
    github: 'https://github.com/nova/weather-station',
  },
  {
    title: 'RFID Door Lock System',
    category: 'hardware',
    description: 'A secure RFID-based door access control system. Supports multiple RFID cards, admin mode, and access logs. Features buzzer feedback, LED indicators, and optional LCD display.',
    technology: ['Arduino', 'RFID', 'RC522', 'Security', 'C++'],
    difficulty: 'beginner',
    price: 799,
    featured: false,
    status: 'published',
  },
  {
    title: 'Full-Stack E-Commerce Platform',
    category: 'software',
    description: 'A complete e-commerce platform with React frontend, Node.js backend, and MongoDB database. Features product catalog, shopping cart, payment integration (Stripe), user authentication, admin dashboard, and order management.',
    technology: ['React', 'Node.js', 'MongoDB', 'Express', 'Stripe'],
    difficulty: 'advanced',
    price: 3999,
    featured: true,
    status: 'published',
    github: 'https://github.com/nova/ecommerce',
    demo: 'https://demo.novaprojects.com',
  },
  {
    title: 'Real-Time Chat Application',
    category: 'software',
    description: 'A modern real-time chat application with private messaging, group chats, file sharing, and emoji support. Built with Socket.io for real-time communication and React for the UI.',
    technology: ['React', 'Socket.io', 'Node.js', 'Express', 'MongoDB'],
    difficulty: 'intermediate',
    price: 2499,
    featured: true,
    status: 'published',
    github: 'https://github.com/nova/chat-app',
    demo: 'https://chat.novaprojects.com',
  },
  {
    title: 'AI-powered Image Classifier',
    category: 'software',
    description: 'A machine learning project that classifies images using TensorFlow.js. Train your own model or use pre-trained models. Features a clean web interface for uploading and classifying images in real-time.',
    technology: ['Python', 'TensorFlow', 'Flask', 'HTML/CSS', 'JavaScript'],
    difficulty: 'advanced',
    price: 2999,
    featured: false,
    status: 'published',
    github: 'https://github.com/nova/image-classifier',
  },
  {
    title: 'Personal Portfolio Generator',
    category: 'software',
    description: 'A dynamic portfolio website generator. Fill in a JSON config and get a beautiful, responsive portfolio site. Includes blog section, project showcase, contact form, and dark mode.',
    technology: ['HTML/CSS', 'JavaScript', 'Node.js', 'Markdown'],
    difficulty: 'beginner',
    price: 499,
    featured: false,
    status: 'published',
    github: 'https://github.com/nova/portfolio-gen',
    demo: 'https://portfolio.novaprojects.com',
  },
  {
    title: 'Task Management API',
    category: 'software',
    description: 'A RESTful API for task management with JWT authentication, role-based access control, pagination, filtering, and sorting. Includes comprehensive Swagger documentation and unit tests.',
    technology: ['Node.js', 'Express', 'MongoDB', 'JWT', 'Jest'],
    difficulty: 'intermediate',
    price: 1499,
    featured: false,
    status: 'published',
    github: 'https://github.com/nova/task-api',
  },
];

async function seed() {
  try {
    try {
      await mongoose.connect(MONGODB_URI);
      console.log('Connected to MongoDB');
    } catch (e) {
      console.log('Local MongoDB not found. Using in-memory database...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      await mongoose.connect(mongod.getUri());
      console.log('Connected to in-memory MongoDB');
    }

    await User.deleteMany({});
    await Project.deleteMany({});

    const admin = await User.create({
      name: 'Admin',
      email: 'admin@nova',
      password: 'novaadmin123',
      role: 'admin',
    });
    console.log('Admin user created: admin@nova / novaadmin123');

    const projects = await Project.insertMany(sampleProjects);
    console.log(`${projects.length} projects seeded`);

    console.log('Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();

import express from 'express';
import { connectDB } from './src/config/db.js';
import indexRouter from './src/routes/indexRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';

// ✅ Fix __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.json());

// ✅ Serve public folder correctly
app.use('/public', express.static(path.join(__dirname, 'public')));

// Routes
app.use("/api", indexRouter);

// DB connection
connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

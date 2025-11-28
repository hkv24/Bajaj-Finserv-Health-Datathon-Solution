import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import billExtractionRoutes from './routes/billExtraction.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/', billExtractionRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Bill Extraction API is running' });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    is_success: false,
    message: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`Bill Extraction API running on port ${PORT}`);
});

export default app;

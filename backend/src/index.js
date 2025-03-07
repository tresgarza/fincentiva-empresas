import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { scrapeAmazonProduct, scrapeMercadoLibreProduct, scrapeLiverpoolProduct, scrapeWalmartProduct, scrapePalacioHierroProduct } from './scrapers/index.js';
import companyRoutes from './routes/company.routes.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'development' 
    ? true // Allow all origins in development
    : process.env.CORS_ORIGIN || 'https://financiera-incentiva-0220.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.use(helmet());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Fincentest API is running',
    version: '1.0.0',
    endpoints: {
      '/api/companies': 'Company management endpoints',
      '/api/product/info': 'Product information scraping endpoint',
      '/health': 'Health check endpoint'
    }
  });
});

// Routes
app.post('/api/product/info', async (req, res) => {
  console.log('Received product info request:', req.body);
  
  try {
    const { url } = req.body;

    if (!url) {
      console.log('Missing URL in request');
      return res.status(400).json({ error: 'URL es requerida' });
    }

    let productData;
    console.log('Processing URL:', url);

    if (url.includes('amazon.com.mx')) {
      console.log('Detected Amazon URL, starting scraper...');
      productData = await scrapeAmazonProduct(url);
    } else if (url.includes('mercadolibre.com.mx')) {
      console.log('Detected MercadoLibre URL, starting scraper...');
      productData = await scrapeMercadoLibreProduct(url);
    } else if (url.includes('liverpool.com.mx')) {
      console.log('Detected Liverpool URL, starting scraper...');
      productData = await scrapeLiverpoolProduct(url);
    } else if (url.includes('walmart.com.mx')) {
      console.log('Detected Walmart URL, starting scraper...');
      productData = await scrapeWalmartProduct(url);
    } else if (url.includes('elpalaciodehierro.com')) {
      console.log('Detected Palacio de Hierro URL, starting scraper...');
      productData = await scrapePalacioHierroProduct(url);
    } else {
      console.log('Unsupported URL domain');
      return res.status(400).json({ 
        error: 'URL no soportada',
        message: 'Por favor ingresa una URL de Amazon, MercadoLibre, Liverpool, Walmart o El Palacio de Hierro'
      });
    }

    console.log('Successfully processed product:', productData);
    res.json(productData);
  } catch (error) {
    console.error('Detailed error processing product URL:', error);
    res.status(500).json({ 
      error: 'Error al procesar el producto',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API Routes
app.use('/api/companies', companyRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Algo salió mal!',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    timestamp: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
}); 
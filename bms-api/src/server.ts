import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { errorHandler, notFound } from './middleware/error';
import { authRouter } from './routes/auth';
import { productsRouter } from './routes/products';
import { categoriesRouter } from './routes/categories';
import { transactionsRouter } from './routes/transactions';
import { usersRouter } from './routes/users';
import { branchesRouter } from './routes/branches';
import { inventoryRouter } from './routes/inventory';
import { suppliersRouter } from './routes/suppliers';
import { purchaseOrdersRouter } from './routes/purchase-orders';
import { attendanceRouter } from './routes/attendance';
import { accountingRouter } from './routes/accounting';
import { messagesRouter } from './routes/messages';
import { exportRouter } from './routes/export';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
});
app.use(limiter);

// CORS configuration for multi-environment setup
const corsOptions = {
  origin: function (origin: string | undefined, callback: Function) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Dynamic origin validation for Tailscale and local environments
    const allowedPatterns = [
      // Local development patterns - allow localhost and 127.0.0.1 with any port
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
      
      // Local network patterns
      /^https?:\/\/(192\.168\.\d+\.\d+)(:\d+)?$/,     // Local network (192.168.x.x)
      /^https?:\/\/(10\.\d+\.\d+\.\d+)(:\d+)?$/,      // Local network (10.x.x.x)
      /^https?:\/\/(172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/, // Local network (172.16-31.x.x)
      
      // Tailscale patterns - allow all Tailscale IPs
      /^https?:\/\/([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)(:\d+)?$/,  // Any IP address (Tailscale)
      
      // Development frontend ports
      /:3000$/,   // Web Frontend (Next.js)
      /:5173$/,   // Vite development (React)
      /:5174$/,   // Alternative Vite port
      /:4173$/,   // Second display port
      
      // Backend API port
      /:3001$/    // Backend API
    ];
    
    // Check if origin matches any allowed pattern
    const isAllowed = allowedPatterns.some(pattern => pattern.test(origin));
    
    if (isAllowed) {
      console.log(`✅ CORS allowed origin: ${origin}`);
      callback(null, true);
    } else {
      console.warn(`❌ CORS blocked origin: ${origin}`);
      // In development, allow all origins but log the warning
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔧 Development mode: Allowing blocked origin ${origin}`);
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin ${origin} not allowed`));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'Pragma',
    'X-Client-Info',
    'X-Session-Id'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'X-Total-Count'],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/users', usersRouter);
app.use('/api/branches', branchesRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/purchase-orders', purchaseOrdersRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/accounting', accountingRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/export', exportRouter);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 BMS API Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Documentation: http://localhost:${PORT}/api-docs`);
});

export default app;
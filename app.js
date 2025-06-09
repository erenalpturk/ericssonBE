const express = require('express');
const app = express();
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Import routes
const iccidRoutes = require('./routes/iccidRoutes');
const userRoutes = require('./routes/userRoutes');
const mernisRoutes = require('./routes/mernisRoutes');
const oracleRoutes = require('./routes/oracleRoutes');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text()); // For text body parsing

// Routes
app.use('/iccid', iccidRoutes);
app.use('/mernis', mernisRoutes);
app.use('/user', userRoutes);
app.use('/oracle', oracleRoutes);

// Swagger yapılandırması
const swaggerDocument = YAML.load(path.join(__dirname, 'swagger/index.yaml'));
const iccidSpec = YAML.load(path.join(__dirname, 'swagger/iccid.yaml'));
const mernisSpec = YAML.load(path.join(__dirname, 'swagger/mernis.yaml'));
const userSpec = YAML.load(path.join(__dirname, 'swagger/user.yaml'));
const oracleSpec = YAML.load(path.join(__dirname, 'swagger/oracle.yaml'));

// Tüm spesifikasyonları birleştir
swaggerDocument.paths = {
  ...swaggerDocument.paths,
  ...iccidSpec.paths,
  ...mernisSpec.paths,
  ...userSpec.paths,
  ...oracleSpec.paths
};

swaggerDocument.components = {
  ...swaggerDocument.components,
  schemas: {
    ...swaggerDocument.components?.schemas,
    ...iccidSpec.components?.schemas,
    ...mernisSpec.components?.schemas,
    ...userSpec.components?.schemas,
    ...oracleSpec.components?.schemas
  }
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Ericsson Backend API Documentation"
}));

// Initialize Oracle connection pools
const { initializePools } = require('./database/oracleConnection');

// Test Supabase connection
const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('iccidTable').select('*').limit(1);
    if (error) throw error;
    console.log('Successfully connected to Supabase!');
  } catch (err) {
    console.error('Error connecting to Supabase:', err.message);
  }
};

// Initialize Oracle connections
const initializeOracle = async () => {
  try {
    await initializePools();
    console.log('Oracle bağlantı havuzları başarıyla başlatıldı!');
  } catch (error) {
    console.error('Oracle bağlantı havuzları başlatılırken hata:', error.message);
  }
};

// Server setup
const PORT = process.env.PORT || 5432;
app.listen(PORT, async () => {
  testConnection();
  await initializeOracle();
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Server shutting down');
  process.exit();
});
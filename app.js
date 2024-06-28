const express = require('express');
const app = express();
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const iccidRoutes = require('./routes/iccidRoutes');
const mernisRoutes = require('./routes/mernisRoutes');

const connectionString = process.env.CONNECTION_URL;
const pool = new Pool({ connectionString });
let client;

async function connectDB() {
    client = await pool.connect();
    console.log('Successfully connected to db!');
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text()); // Burada `express.text()` middleware'ini ekliyoruz

app.use('/iccid', iccidRoutes);
app.use('/mernis', mernisRoutes);

const PORT = 3050;
app.listen(PORT, () => {
    connectDB();
    console.log(`Server is running on http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
    console.log('Caught interrupt signal, closing database connection');
    closeDBConnection();
});

async function closeDBConnection() {
    if (client) {
        await client.release();
        console.log('Database connection closed');
    }
    process.exit();
}

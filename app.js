// import mysql from 'mysql2'

// const pool = mysql.createPool({
//     host: '127.0.0.1',
//     user: 'root',
//     password: '',
//     database: 'mco2'
// }).promise()

// const [result] = await pool.query("SELECT * FROM test_db LIMIT 1")
// console.log(result[0])

// IMPORTS

import util from 'util';
import express from 'express';
import { createPool } from 'mysql2';
import { connect } from 'http2';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const app = express();
const port = 3000;


// DATABASE CONNECTIONS

// central node database connection
const centralNode = createPool({
    connectionLimit: 10,
    host: 'ccscloud.dlsu.edu.ph',
    port: '20042',
    user: 'root',
    password: '12345678',
    database: 'appointments'
});

// visayas-mindanao database connection
const secondaryNode = createPool({
    connectionLimit: 10,
    host: 'ccscloud.dlsu.edu.ph',
    port: '20044',
    user: 'root',
    password: '12345678',
    database: 'test_schema'
});

function addToLog(log) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const filePath = `${__dirname}/log.json`;
    
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading log file:', err);
            return;
        }
        
        let logs = [];
        try {
            logs = JSON.parse(data);
        } catch (err) {
            console.error('Error parsing log file:', err);
            return;
        }
        
        logs.push(log);
        
        fs.writeFile(filePath, JSON.stringify(logs), 'utf8', (err) => {
            if (err) {
                console.error('Error writing to log file:', err);
                return;
            }
            
            console.log('Log added to file');
        });
    });
}

// Example usage

// APP ACTION FUNCTIONS

async function testConnections() {
    // test connection to centralNode pool
    const centralNodeConnection = util.promisify(centralNode.getConnection).bind(centralNode);
    try {
        const connection = await centralNodeConnection();
        console.log('Connected to centralNode pool');
        connection.release();
    } catch (err) {
        console.error('Error connecting to centralNode pool:', err);
    }

    // test connection to secondaryNode pool
    const secondaryNodeConnection = util.promisify(secondaryNode.getConnection).bind(secondaryNode);
    try {
        const connection = await secondaryNodeConnection();
        console.log('Connected to secondaryNode pool');
        connection.release();
    } catch (err) {
        console.error('Error connecting to secondaryNode pool:', err);
    }
}

// SERVER ROUTES

app.get('/', async (req, res) => {
    try {
        res.send('Hello World!');
        console.log('Hello World!');
        await testConnections();
        const log = { message: 'This is a log message', timestamp: new Date() };
        addToLog(log);
    } catch (error) {
        console.error('Error:', error);
    }
});

app.get('/write', async (req, res) => {
    try {
        const data = 1;
        const secondaryNodeConnection = await util.promisify(secondaryNode.getConnection).bind(secondaryNode)();
        const query = util.promisify(secondaryNodeConnection.query).bind(secondaryNodeConnection);
        
        // Start transaction
        var log = { message: 'Starting Transaction', timestamp: new Date() };
        addToLog(log);
        console.log(log);
        await query('START TRANSACTION');
        
        const result = await query('INSERT INTO test_table (test_column) VALUES (?)', (data));
        log = { message: 'Inserting', timestamp: new Date() };
        addToLog(log);
        console.log('Inserting data:', data);
        
        // Commit transaction
        console.log('Committing transaction');
        await query('COMMT');
        log = { message: 'Committing Transaction', timestamp: new Date() };
        addToLog(log);
        
        secondaryNodeConnection.release();
        
        if (result.affectedRows === 1) {
            console.log('Data inserted successfully');
            res.status(200).json({ message: 'Data inserted successfully' });
        } else {
            console.log('Failed to insert data');
            res.status(500).json({ message: 'Failed to insert data' });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
    console.log('Query uncommitted');
});

// do try catch in case of database failure

app.get('/read', (req, res) => {

});

app.post('/write', (req, res) => {
    
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
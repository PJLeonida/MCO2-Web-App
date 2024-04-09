// import mysql from 'mysql2'

// const pool = mysql.createPool({
//     host: '127.0.0.1',
//     user: 'root',
//     password: '',
//     database: 'mco2'
// }).promise()

// const [result] = await pool.query("SELECT * FROM test_db LIMIT 1")
// console.log(result[0])

/*

    CODE DUMP

    app.get('/add', async (req, res) => {
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
        await query('COMMIT');
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

*/

// IMPORTS

import util from 'util';
import express from 'express';
import { createPool } from 'mysql2';
import { connect } from 'http2';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';

const app = express();
const port = 3000;

// Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const viewsPath = path.join(__dirname, 'views');

// Serve static files from the 'views' directory
app.use(express.static(viewsPath));

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
const luzonNode = createPool({
    connectionLimit: 10,
    host: 'ccscloud.dlsu.edu.ph',
    port: '20043',
    user: 'root',
    password: '12345678',
    database: 'appointments_luzon'
});

const visayasMindanaoNode = createPool({
    connectionLimit: 10,
    host: 'ccscloud.dlsu.edu.ph',
    port: '20044',
    user: 'root',
    password: '12345678',
    database: 'appointments_visayas_mindanao'
});

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
    // TODO: right now secondary node is set to appointments_luzon. is this correct?
    const secondaryNodeConnection = util.promisify(luzonNode.getConnection).bind(luzonNode);
    try {
        const connection = await secondaryNodeConnection();
        console.log('Connected to secondaryNode pool');
        connection.release();
    } catch (err) {
        console.error('Error connecting to secondaryNode pool:', err);
    }
}

// * add options to write to different log files (we need 3, one for each database)
function addToLog(log) {
    const logPath = `${__dirname}/log.json`;
    
    fs.readFile(logPath, 'utf8', (err, data) => {
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
        
        fs.writeFile(logPath, JSON.stringify(logs), 'utf8', (err) => {
            if (err) {
                console.error('Error writing to log file:', err);
                return;
            }
            
            console.log('Log added to file');
        });
    });
}

//
async function addDataToTable(req, res, node) {
  //const data = req.body;   **CHANGE IT TO THIS ONE WHEN THE TIME COMES
    const data = 1;

    if(node == 'central') {
        const nodeConnection = await util.promisify(centralNode.getConnection).bind(secondaryNode)();
    }
    else if(node == 'visayas-mindanao') {
        const nodeConnection = await util.promisify(secondaryNode.getConnection).bind(secondaryNode)();
    }
    else {
        const nodeConnection = await util.promisify(secondaryNode.getConnection).bind(secondaryNode)();
    }

    const query = util.promisify(nodeConnection.query).bind(nodeConnection);

    // add query to set isolation level at some point

    // start transaction
    await query('START TRANSACTION');

    // log start of transaction
    var log = { message: 'Starting Transaction', timestamp: new Date() };
    addToLog(log);
    console.log(log);

    // ** EDIT QUERY WHEN THE TIME COMES
    const result = await query('INSERT INTO test_table (test_column) VALUES (?)', (data));

    // log query
    log = { message: 'Inserting', timestamp: new Date() };
    addToLog(log);
    console.log('Inserting data:', data);

    // commit transaction
    console.log('Committing transaction');
    await query('COMMIT');

    // log commit
    log = { message: 'Committing Transaction', timestamp: new Date() };
    addToLog(log);

    // release connection when finished
    nodeConnection.release();

    if (result.affectedRows === 1) {
        console.log('Data inserted successfully');
        res.status(200).json({ message: 'Data inserted successfully' });
    } else {
        console.log('Failed to insert data');
        res.status(500).json({ message: 'Failed to insert data' });
    }
}

// UPDATE APPOINTMENT
async function updateDataInTable(req, res, node, id, data) {
    if (node === 'central') {
        const nodeConnection = await util.promisify(centralNode.getConnection).bind(centralNode)();
    } else if (node === 'visayas-mindanao') {
        const nodeConnection = await util.promisify(visayasMindanaoNode.getConnection).bind(visayasMindanaoNode)();
    } else {
        const nodeConnection = await util.promisify(luzonNode.getConnection).bind(luzonNode)();
    }

    const query = util.promisify(nodeConnection.query).bind(nodeConnection);

    await query('START TRANSACTION');

    const log = { message: 'Starting Transaction', timestamp: new Date() };
    addToLog(log);
    console.log(log);

    const result = await query('UPDATE test_table SET test_column = ? WHERE id = ?', [data, id]);

    log = { message: 'Updating', timestamp: new Date() };
    addToLog(log);
    console.log('Updating data:', data);

    await query('COMMIT');

    console.log('Committing transaction');
    log = { message: 'Committing Transaction', timestamp: new Date() };
    addToLog(log);

    nodeConnection.release();

    if (result.affectedRows === 1) {
        console.log('Data updated successfully');
        res.status(200).json({ message: 'Data updated successfully' });
    } else {
        console.log('Failed to update data');
        res.status(500).json({ message: 'Failed to update data' });
    }
}

// DELETE APPOINTMENT
async function deleteDataFromTable(req, res, node, id) {
    if (node === 'central') {
        const nodeConnection = await util.promisify(centralNode.getConnection).bind(centralNode)();
    } else if (node === 'visayas-mindanao') {
        const nodeConnection = await util.promisify(visayasMindanaoNode.getConnection).bind(visayasMindanaoNode)();
    } else {
        const nodeConnection = await util.promisify(luzonNode.getConnection).bind(luzonNode)();
    }

    const query = util.promisify(nodeConnection.query).bind(nodeConnection);

    await query('START TRANSACTION');

    const log = { message: 'Starting Transaction', timestamp: new Date() };
    addToLog(log);
    console.log(log);

    const result = await query('DELETE FROM test_table WHERE id = ?', id);

    log = { message: 'Deleting', timestamp: new Date() };
    addToLog(log);
    console.log('Deleting data:', id);

    await query('COMMIT');

    console.log('Committing transaction');
    log = { message: 'Committing Transaction', timestamp: new Date() };
    addToLog(log);

    nodeConnection.release();

    if (result.affectedRows === 1) {
        console.log('Data deleted successfully');
        res.status(200).json({ message: 'Data deleted successfully' });
    } else {
        console.log('Failed to delete data');
        res.status(500).json({ message: 'Failed to delete data' });
    }
}

// SERVER ROUTES
/*
    Add Appointment

    Edit Appointment
        - Region
        - Type
        - Status
        - Virtual
    Delete Appointment
*/

// LANDING ROUTE
app.get('/', async (req, res) => {
    try {
        res.sendFile(path.join(viewsPath, 'landing page', 'index.html'));
        
        // test database connections
        await testConnections();

        // test logging system
        const log = { message: 'This is a log message', timestamp: new Date() };
        addToLog(log);
    } catch (error) {
        console.error('Error:', error);
    }
});

// ADD APPOINTMENT
app.get('/add', async (req, res) => {
    try {
        await addDataToTable(req, res, 'central');
    } catch (error) {

        // add try for other nodes

        console.error('Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
    console.log('Query uncommitted');
});

// EDIT APPOINTMENT
/*
    - Region
    - Type
    - Status
    - Virtual   

*/

app.patch('/edit/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data } = req.body;
        await updateDataInTable(req, res, 'central', id, data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// DELETE APPOINTMENT
app.delete('/delete/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await deleteDataFromTable(req, res, 'central', id);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
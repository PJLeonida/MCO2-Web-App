
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
import path, { dirname, parse } from 'path';
import mysql from 'mysql2'


const app = express();
const port = 3000;

// Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const viewsPath = path.join(__dirname, 'views');

// Serve static files from the 'views' directory
app.use(express.static(viewsPath));


// Middleware for JSON parsing and URL-encoding
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// CORS Middleware (allows our application to do cross-domain transfers (since we're accessing remote servers))
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});


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
    const data = req.body;  

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

function getRegionIsland(region) {
    const regionNum = parseInt(region);
    var island = "";

    if (regionNum >= 1 && regionNum <= 8) {
        island = "Luzon"
    } else if (regionNum >= 9 && regionNum <= 11) {
        island = "Visayas"
    } else if (regionNum >= 12 && regionNum <= 17) {
        island = "Mindanao"
    } else {
        island = "";
    }

    return island
}

// FUNCTION TO AUTOMATICALLY DETERMINE REGION NAME AND ISLAND BASED ON NUMBER.
function getRegionName(region) {
    
    const regionNum = parseInt(region);
    var regionName = "";
    
    switch (regionNum) {
        case 1:
            regionName = 'Ilocos Region (I)';
            break;
        case 2:
            regionName = 'Cagayan Valley (II)';
            break;
        case 3:
            regionName = 'Central Luzon (III)';
            break;
        case 4:
            regionName = 'CALABARZON (IV-A))';
            break;
        case 5:
            regionName = 'MIMAROPA (IV-B';
            break;
        case 6:
            regionName = 'Bicol Region (V)';
            break;
        case 7:
            regionName = 'Cordillera Administrative Region (CAR)';
            break;
        case 8:
            regionName = 'National Capital Region (NCR)';
            break;
        case 9:
            regionName = 'Western Visayas (VI)';
            break;
        case 10:
            regionName = 'Central Visayas (VII)';
            break;
        case 11:
            regionName = 'Eastern Visayas (VIII)';
            break;
        case 12:
            regionName = 'Zamboanga Peninsula (IX)';
            break;
        case 13:
            regionName = 'Northern Mindanao (X)';
            break;
        case 14:
            regionName = 'Davao Region (XI)';
            break;
        case 15:
            regionName = 'SOCCSKSARGEN (Cotabato Region) (XII)';
            break;
        case 16:
            regionName = 'Caraga (XIII)';
            break;
        case 17:
            regionName = 'Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)';
            break;
        default:
            regionName = "";
            break;

        }

    return regionName;
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


// APPOINTMENTS PAGE ROUTE
app.get('/appointments', async (req, res) => {
    try {

        res.sendFile(path.join(viewsPath, 'transaction_editor', 'transaction_editor.html'));
    } catch (error) {
        console.error('Error', error);
    }
})

// GET ALL APPOINTMENTS
app.get('/get-appointments', async (req, res) => {


    // if CENTRAL NODE ALIVE Try querying central node first.
    try {
        centralNode.query('SELECT * FROM appointments', (error, results, fields) => {
            if (error) {
                console.error('Error executing query:', error);
                res.status(500).send('Internal Server Error');
                return;
            }
            // Send feteched data as JSON response
            res.json(results); 
        })
    } catch (error) {
        console.log('Error querying central node: ', error);
    }

    // ELSE, QUERY SECONDARY NODE

    
})

// ADD APPOINTMENT
app.post('/add', async (req, res) => {
    // Get request body
    // TODO: For now request body is incomplete
    const { type, virtual, region } = req.body;
    const apptid = "11111111111111111111222222222222";

    const regionName = getRegionName(region);
    const regionIsland = getRegionIsland(region);

    await testConnections();
    // Do log check 
    
    // Add appointment to database
    try {
        // Also add apptid
        console.log(type, virtual, region, regionName, regionIsland)
        centralNode.query('INSERT INTO appointments (apptid, type, isVirtual, region, island) VALUES (?, ?, ?, ?, ?);', [apptid, type, virtual, regionName, regionIsland], (error, results, fields) => {
            if (error) {
                throw error;
            }
        })
    } catch (error) {
        
        // add try for other nodes
        
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }

    // Redirect to root to appointments directory
    res.redirect('/appointments');
});

// EDIT APPOINTMENT
/*
    - Region
    - Status
    - Virtual   

*/

app.post('/edit/:id', async (req, res) => {
    // Get request body
    const params = req.params;
    const { virtual, status, region } = req.body;
    const regionName = getRegionName(region);
    const regionIsland = getRegionIsland(region);
    // Do log functions
    
    // If each of the values exist, build the SQL script
    let script = "UPDATE appointments SET "
    let values = [];
    if (virtual) {
        script += "isVirtual = ?, ";
        values.push(virtual);
    }
    if (status) {
        script += "status = ?, ";
        values.push(status);
    } 
    if (region) {
        script += "region = ?, ";
        values.push(regionName);
    } 
    if (regionIsland) {
        script += "island = ?, ";
        values.push(regionIsland);
    }

    // Remove the last comma and space
    if (script.endsWith(', ')) {
        script = script.slice(0, -2);
    }

    script += " WHERE apptid = ?;";
    values.push(params.id);

    console.log("SCRIPT: ", script);
    console.log("VALUES: ", values);
    // Update the data
    try {
        centralNode.query(script, values, (error, results, fields) => {
            if (error) {
                throw error;
            }
        })
    } catch (e) {
        
        // add try for other nodes
        
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }

    res.redirect('/appointments');
});

// DELETE APPOINTMENT
app.post('/delete/:id', async (req, res) => {
    const id = req.params.id;

    try {
        centralNode.query('DELETE FROM appointments WHERE apptid = ?', [id], (error, results, fields) => {
            if (error) {
                throw error;
            }
        })
    } catch (e) {
        
        // add try for other nodes
        
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }


    console.log("DELETED")
    res.status(200)
    res.redirect('/appointments');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

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
import express, { query } from 'express';
import { createPool } from 'mysql2';
import { connect } from 'http2';
import fs, { write } from 'fs';
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

// check if log is empty
async function checkLogIsEmpty() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const filePath = `${__dirname}/log.json`;

    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading log file:', err);
                reject(err);
                return;
            }

            let logs = [];
            try {
                logs = JSON.parse(data);
                console.log(JSON.parse(data)    );
            } catch (parseError) {
                console.error('Error parsing log file:', parseError);
                reject(parseError);
                return;
            }

            console.log('Log size: ' + logs.length);

            if (logs.length > 0) {
                resolve(false);
            } else {
                
                resolve(true);
            }
        });
    });
}

const removeFromLog = async (transaction) => {
    try {
        const logPath = `${__dirname}/log.json`;
        const data = await fs.promises.readFile(logPath, 'utf8');
        const log = JSON.parse(data);
        const updatedLog = log.filter((entry) => entry.apptid !== transaction.apptid);
        await fs.promises.writeFile(logPath, JSON.stringify(updatedLog));
        console.log('Transaction removed from log file');
    } catch (error) {
        console.error('Error:', error);
    }
};

async function performRecovery() {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const filePath = `${__dirname}/log.json`;
        
        fs.readFile(filePath, 'utf8', async (err, data) => {
            if (err) {
                console.error('Error reading log file:', err);
                return;
            }
            
            const logs = JSON.parse(data);
            const logIndexes = [];
            
            //might have a shitty O() complexity
            for (const log of logs) {
                let result = await redoTransaction(log, log.island);
                if (result) {
                    console.log('Recovery successful');
                    logIndexes.push(logs.indexOf(log));
                }
                else {
                    console.log('Recovery failed');
                }
            }

            // Remove log indexes
            for (let i = logIndexes.length - 1; i >= 0; i--) {
                const index = logIndexes[i];
                logs.splice(index, 1);
            }

            // Save the updated logs to log.json
            fs.writeFile(filePath, JSON.stringify(logs), (err) => {
                if (err) {
                    console.error('Error writing to log file:', err);
                } else {
                    console.log('Recovery complete');
                }
            });

        });
    } catch (error) {
        console.error('Error during recovery:', error);
    }
}

async function redoAddTransaction(transaction, region) {
    return new Promise(async (resolve, reject) => {
        try {

            let primaryNodeConnection;
            let secondaryNodeConnection;
            let result;
            let queryPrimary;
            let querySecondary;
            // CONNECT TO DATABASES
            try {
                primaryNodeConnection = await util.promisify(centralNode.getConnection).bind(centralNode)();
                // Rest of the code...
            } catch (error) {
                console.log('Failed to connect to primary node database');
                console.log(error);
                resolve(false);
            }

            try {
                console.log("region: " + region);
                if (region === 'Luzon') {
                    secondaryNodeConnection = await util.promisify(luzonNode.getConnection).bind(luzonNode)();
                } else if (region === 'Visayas' || region === 'Mindanao') {
                    secondaryNodeConnection = await util.promisify(visayasMindanaoNode.getConnection).bind(visayasMindanaoNode)();
                }
            } catch (error) {
                console.log('Failed to connect to secondary node database');
                console.log(error);
                resolve(false);
            }

            console.log(transaction);
            
            
            
            try {
                // check check primary node
                queryPrimary = util.promisify(primaryNodeConnection.query).bind(primaryNodeConnection);
                result = await queryPrimary(
                    'SELECT * FROM appointments WHERE apptid = ?', transaction.apptid);

                if (result.length > 0) {
                    console.log('Rows returned:', result.length);
                    resolve(true);
                } else {
                    console.log('No rows returned');
                    result = await Promise.all([
                        queryPrimary('START TRANSACTION'),
                        queryPrimary('INSERT INTO appointments (apptid, status, StartTime, isVirtual, island, region) VALUES (?, ?, ?, ?, ?, ?)',
                            [
                                transaction.apptid,
                                transaction.status,
                                transaction.StartTime,
                                transaction.isVirtual,
                                transaction.island,
                                transaction.region
                            ]),
                        queryPrimary('COMMIT')
                    ]);
                }
            } catch (error) {
                console.log(error);
                resolve(false);
            }

            try {
                // check secondary node
                querySecondary = util.promisify(secondaryNodeConnection.query).bind(secondaryNodeConnection);
                result = await querySecondary('SELECT * FROM appointments WHERE apptid = ?', transaction.apptid)

                if (result.length > 0) {
                    console.log('Rows returned:', result.length);
                    resolve(true);
                } 
                else {{
                    console.log('No rows returned');
                    result = await Promise.all([
                        querySecondary('START TRANSACTION'),
                        querySecondary('INSERT INTO appointments (apptid, status, StartTime, isVirtual, island, region) VALUES (?, ?, ?, ?, ?, ?)',
                        [
                            transaction.apptid,
                            transaction.status,
                            transaction.StartTime,
                            transaction.isVirtual,
                            transaction.island,
                            transaction.region
                        ]),
                        querySecondary('COMMIT')
                    ]);
                }}
            } catch (error) {
                console.log(error);
                resolve(false);
            }

            let finalResultPrimary = await queryPrimary(
                'SELECT * FROM appointments WHERE apptid = ? AND status = ? AND StartTime = ? AND isVirtual = ? AND island = ? AND region = ?',
                [
                    transaction.apptid, 
                    transaction.status,
                    transaction.StartTime, 
                    transaction.isVirtual, 
                    transaction.island, 
                    transaction.region
                ]
            )

            let finalResultSecondary = await querySecondary(
                'SELECT * FROM appointments WHERE apptid = ? AND status = ? AND StartTime = ? AND isVirtual = ? AND island = ? AND region = ?',
                [
                    transaction.apptid, 
                    transaction.status,
                    transaction.StartTime, 
                    transaction.isVirtual, 
                    transaction.island, 
                    transaction.region
                ]
            )

            if (finalResultPrimary.length > 0 && finalResultSecondary.length > 0) {
                resolve(true);
            }
            else {
                resolve(false);
            }

            primaryNodeConnection.release();
            secondaryNodeConnection.release();
            
        } catch (error) {
            resolve(false);
            console.log(error);
        }
    });
}

async function redoEditTransaction(transaction, region) {
    return new Promise(async (resolve, reject) => {
        try {

            let primaryNodeConnection;
            let secondaryNodeConnection;
            let result;
            // CONNECT TO DATABASES
            try {
                primaryNodeConnection = await util.promisify(centralNode.getConnection).bind(centralNode)();
            } catch (error) {
                console.log('Failed to connect to the central node database');
                console.log(error);
                resolve(false);
            }

            
            try {
                console.log("region: " + region);
                if (region === 'Luzon') {
                    secondaryNodeConnection = await util.promisify(luzonNode.getConnection).bind(luzonNode)();
                } else if (region === 'Visayas' || region === 'Mindanao') {
                    secondaryNodeConnection = await util.promisify(visayasMindanaoNode.getConnection).bind(visayasMindanaoNode)();
                }
            } catch (error) {
                console.log('Failed to connect to the secondary node database');
                console.log(error);
                resolve(false);
            }

            console.log(transaction);
            
            
            
            // check check primary node
            try {
                const queryPrimary = util.promisify(primaryNodeConnection.query).bind(primaryNodeConnection);
                let finalResultPrimary = await queryPrimary(
                    'UPDATE appointments SET type = ?, status = ?, isVirtual = ?, StartTime = ? WHERE apptid = ?',
                    [
                        transaction.type,
                        transaction.status,
                        transaction.isVirtual,
                        transaction.StartTime,
                        transaction.apptid
                    ]
                );
                if (finalResultPrimary.affectedRows > 0) {
                    console.log(finalResultPrimary.message);
                    resolve(true);
                } else {
                    console.log(finalResultPrimary.message);
                    resolve(false);
                }
            } catch (error) {
                resolve(false);
                console.log(error);
            }

            try {
                const querySecondary = util.promisify(secondaryNodeConnection.query).bind(secondaryNodeConnection);
                let finalResultSecondary = await querySecondary(
                    'UPDATE appointments SET type = ?, status = ?, isVirtual = ?, StartTime = ? WHERE apptid = ?',
                    [
                        transaction.type,
                        transaction.status,
                        transaction.isVirtual,
                        transaction.StartTime,
                        transaction.apptid
                    ]
                );
                if (finalResultSecondary.affectedRows > 0) {
                    console.log(finalResultSecondary.message);
                    resolve(true);
                } else {
                    console.log(finalResultSecondary.message);
                    resolve(false);
                }
            } catch (error) {
                resolve(false);
                console.log(error);
            }

            if ((finalResultPrimary.affectedRows > 0) && finalResultSecondary.affectedRows > 0) {
                resolve(true);
            }
            else {
                resolve(false);
            }

            primaryNodeConnection.release();
            secondaryNodeConnection.release();
            
        } catch (error) {
            resolve(false);
            console.log(error);
        }
    });
}

async function redoDeleteTransaction(transaction, region) {
    return new Promise(async (resolve, reject) => {
        try {

            let primaryNodeConnection;
            let secondaryNodeConnection;
            let result;
            let queryPrimary;
            let querySecondary;

            // CONNECT TO DATABASES

            try {
                primaryNodeConnection = await util.promisify(centralNode.getConnection).bind(centralNode)();
            } catch (error) {
                console.log('Failed to connect to the central node database');
                console.log(error);
                resolve(false);
            }

            
            try {
                console.log("region: " + region);
                if (region === 'Luzon') {
                    secondaryNodeConnection = await util.promisify(luzonNode.getConnection).bind(luzonNode)();
                } else if (region === 'Visayas' || region === 'Mindanao') {
                    secondaryNodeConnection = await util.promisify(visayasMindanaoNode.getConnection).bind(visayasMindanaoNode)();
                }
            } catch (error) {
                console.log('Failed to connect to the secondary node database');
                console.log(error);
                resolve(false);
            }

            console.log(transaction);
            
            
            
            // action here
            // ...
            try {
                queryPrimary = util.promisify(primaryNodeConnection.query).bind(primaryNodeConnection);
                result = await queryPrimary(
                    'SELECT * FROM appointments WHERE apptid = ?', transaction.apptid)

                if (result.length > 0) {
                    console.log('Rows returned:', result.length);
                    result = await Promise.all([
                        queryPrimary('START TRANSACTION'),
                        queryPrimary('DELETE FROM appointments WHERE apptid = ?', transaction.apptid),
                        queryPrimary('COMMIT')
                    ]);
                } 
                else {
                    console.log('No rows returned');
                }
            } catch (error) {
                console.log('Failed to execute primary node query');
                console.log(error);
                resolve(false);
            }

            try {
                querySecondary = util.promisify(secondaryNodeConnection.query).bind(secondaryNodeConnection);
                result = await querySecondary('SELECT * FROM appointments WHERE apptid = ?', transaction.apptid)

                if (result.length > 0) {
                    console.log('Rows returned:', result.length);
                    result = await Promise.all([
                        querySecondary('START TRANSACTION'),
                        querySecondary('DELETE FROM appointments WHERE apptid = ?', transaction.apptid),
                        querySecondary('COMMIT')
                    ]);
                } 
                else {
                    console.log('No rows returned');
                }
            } catch (error) {
                console.log('Failed to execute secondary node query');
                console.log(error);
                resolve(false);
            }

            //
            let finalResultPrimary = await queryPrimary('SELECT * FROM appointments WHERE apptid = ?', transaction.apptid)
            let finalResultSecondary = await querySecondary('SELECT * FROM appointments WHERE apptid = ?', transaction.apptid)
            
            if(finalResultPrimary == 0 && finalResultSecondary == 0) {
                resolve(true);
            }
            else {
                resolve(false);
            }

            primaryNodeConnection.release();
            secondaryNodeConnection.release();
            
        } catch (error) {
            resolve(false);
            console.log(error);
        }
    });
}

async function redoTransaction(transaction) {
    return new Promise(async (resolve, reject) => {
        try {
            if(transaction.action == "add"){
                let result = await redoAddTransaction(transaction, transaction.island);
                resolve(result);
            }
            else if(transaction.action == "edit") {
                let result = await redoEditTransaction(transaction, transaction.island);
                resolve(result);
            }
            else if(transaction.action == "delete") {
                let result = await redoDeleteTransaction(transaction, transaction.island);
                resolve(result);
            }
            
        } catch (error) {
            resolve(false);
            console.log('Failed to insert data');
            console.log(error);
        }
    });
}

//
async function addDataToTable(req, res, node) {
    return new Promise(async (resolve, reject) => {
        try {

            let primaryNodeConnection;
            let secondaryNodeConnection;
            let result;
            let queryPrimary;
            let querySecondary;
            // CONNECT TO DATABASES
            try {
                primaryNodeConnection = await util.promisify(centralNode.getConnection).bind(centralNode)();
                // Rest of the code...
            } catch (error) {
                console.log('Failed to connect to primary node database');
                console.log(error);
                resolve(false);
            }

            try {
                console.log("region: " + region);
                if (region === 'luzon') {
                    secondaryNodeConnection = await util.promisify(luzonNode.getConnection).bind(luzonNode)();
                } else if (region === 'visayas' || region === 'mindanao') {
                    secondaryNodeConnection = await util.promisify(visayasMindanaoNode.getConnection).bind(visayasMindanaoNode)();
                }
            } catch (error) {
                console.log('Failed to connect to secondary node database');
                console.log(error);
                resolve(false);
            }

            console.log(transaction);
            
            
            
            try {
                // check check primary node
                queryPrimary = util.promisify(primaryNodeConnection.query).bind(primaryNodeConnection);
                result = await queryPrimary(
                    'SELECT * FROM appointments WHERE apptid = ?', transaction.apptid);

                if (result.length > 0) {
                    console.log('Rows returned:', result.length);
                    resolve(true);
                } else {
                    console.log('No rows returned');
                    result = await Promise.all([
                        queryPrimary('START TRANSACTION'),
                        queryPrimary('INSERT INTO appointments (pxid, clinicid, doctorid, apptid, status, TimeQueued, QueueDate, StartTime, EndTime, type, isVirtual, island, clinic, region) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                            [
                                transaction.pxid,
                                transaction.clinicid,
                                transaction.doctorid,
                                transaction.apptid,
                                transaction.status,
                                transaction.TimeQueued,
                                transaction.QueueDate,
                                transaction.StartTime,
                                transaction.EndTime,
                                transaction.type,
                                transaction.isVirtual,
                                transaction.island,
                                transaction.clinic,
                                transaction.region
                            ]),
                        queryPrimary('COMMIT')
                    ]);
                }
            } catch (error) {
                console.log(error);
                resolve(false);
            }

            try {
                // check secondary node
                querySecondary = util.promisify(secondaryNodeConnection.query).bind(secondaryNodeConnection);
                result = await querySecondary('SELECT * FROM appointments WHERE apptid = ?', transaction.apptid)

                if (result.length > 0) {
                    console.log('Rows returned:', result.length);
                    resolve(true);
                } 
                else {{
                    console.log('No rows returned');
                    result = await Promise.all([
                        querySecondary('START TRANSACTION'),
                        querySecondary('INSERT INTO appointments (pxid, clinicid, doctorid, apptid, status, TimeQueued, QueueDate, StartTime, EndTime, type, isVirtual, island, clinic, region) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
                        [
                            transaction.pxid, 
                            transaction.clinicid, 
                            transaction.doctorid, 
                            transaction.apptid, 
                            transaction.status,
                            transaction.TimeQueued, 
                            transaction.QueueDate, 
                            transaction.StartTime, 
                            transaction.EndTime,
                            transaction.type,
                            transaction.isVirtual, 
                            transaction.island, 
                            transaction.clinic,
                            transaction.region
                        ]),
                        querySecondary('COMMIT')
                    ]);
                }}
            } catch (error) {
                console.log(error);
                resolve(false);
            }

            let finalResultPrimary = await queryPrimary(
                'SELECT * FROM appointments WHERE pxid = ? AND clinicid = ? AND doctorid = ? AND apptid = ? AND status = ? AND TimeQueued = ? AND QueueDate = ? AND StartTime = ? AND EndTime = ? AND type = ? AND isVirtual = ? AND island = ? AND clinic = ? AND region = ?',
                [
                    transaction.pxid, 
                    transaction.clinicid, 
                    transaction.doctorid, 
                    transaction.apptid, 
                    transaction.status,
                    transaction.TimeQueued, 
                    transaction.QueueDate, 
                    transaction.StartTime, 
                    transaction.EndTime,
                    transaction.type,
                    transaction.isVirtual, 
                    transaction.island, 
                    transaction.clinic,
                    transaction.region
                ]
            )

            let finalResultSecondary = await querySecondary(
                'SELECT * FROM appointments WHERE pxid = ? AND clinicid = ? AND doctorid = ? AND apptid = ? AND status = ? AND TimeQueued = ? AND QueueDate = ? AND StartTime = ? AND EndTime = ? AND type = ? AND isVirtual = ? AND island = ? AND clinic = ? AND region = ?',
                [
                    transaction.pxid, 
                    transaction.clinicid, 
                    transaction.doctorid, 
                    transaction.apptid, 
                    transaction.status,
                    transaction.TimeQueued, 
                    transaction.QueueDate, 
                    transaction.StartTime, 
                    transaction.EndTime,
                    transaction.type,
                    transaction.isVirtual, 
                    transaction.island, 
                    transaction.clinic,
                    transaction.region
                ]
            )

            if (finalResultPrimary.length > 0 && finalResultSecondary.length > 0) {
                resolve(true);
            }
            else {
                resolve(false);
            }

            primaryNodeConnection.release();
            secondaryNodeConnection.release();
            
        } catch (error) {
            resolve(false);
            console.log(error);
        }
    });
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
        console.log('Connected to the MCO2 API');
        // test database connections
        await testConnections();

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
        const logIsEmpty = await checkLogIsEmpty();
        
        // if i want to do transactions of a visayas appointment
        if(logIsEmpty) {
            console.log('Log is empty, no recovery needed. Proceeding with transaction...');
            const results = await new Promise((resolve, reject) => {
                centralNode.query('SELECT * FROM appointments', (error, results, fields) => {
                    if (error) {
                        console.error('Error executing query:', error);
                        reject(error);
                    } else {
                        resolve(results);
                    }
                });
            });
            res.json(results);
        }else {
            console.log('Proceeding with recovery...');
            await performRecovery();
            const results = await new Promise((resolve, reject) => {
                centralNode.query('SELECT * FROM appointments', (error, results, fields) => {
                    if (error) {
                        console.error('Error executing query:', error);
                        reject(error);
                    } else {
                        resolve(results);
                    }
                });
            });
            res.json(results);
        }


        
    } catch (error) {
        console.log('ERROR CONNECTING TO CENTRAL NODE: ', error);
        try {
            const results2 = await new Promise((resolve, reject) => {
                luzonNode.query('SELECT * FROM appointments', (error, results, fields) => {
                    if (error) {
                        console.error('Error executing query:', error);
                        reject(error);
                    } else {
                        resolve(results);
                    }
                });
            });
            const results1 = await new Promise((resolve, reject) => {
                visayasMindanaoNode.query('SELECT * FROM appointments', (error, results, fields) => {
                    if (error) {
                        console.error('Error executing query:', error);
                        reject(error);
                    } else {
                        resolve(results);
                    }
                });
            });

            
            console.log('PEANUTBUTTER')
            const finalResults = [...results1, ...results2];
            res.json(finalResults);
        } catch (error) {
            console.error('Error querying secondary nodes:', error);
            res.status(500).send('Internal Server Error');
        }
    }

    // ELSE, QUERY SECONDARY NODE

    
})

app.get('/get-appointment/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const results = await new Promise((resolve, reject) => {
            centralNode.query('SELECT * FROM appointments WHERE apptid = ?', id, (error, results, fields) => {
                if (error) {
                    console.error('Error executing query:', error);
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });
        res.json(results);
    } catch (error) {
        console.error('Error querying central node:', error);
        try {
            const results = await new Promise((resolve, reject) => {
                luzonNode.query('SELECT * FROM appointments WHERE apptid = ?', id, (error, results, fields) => {
                    if (error) {
                        console.error('Error executing query:', error);
                        reject(error);
                    } else {
                        resolve(results);
                    }
                });
            });
            res.json(results);
        } catch (error) {
            console.error('Error querying secondary node:', error);
            res.status(500).send('Internal Server Error');
        }
    }
});

// ADD APPOINTMENT
app.post('/add', async (req, res) => {
    // Get request body
    // TODO: For now request body is incomplete

    const logIsEmpty = await checkLogIsEmpty();
        
    // if i want to do transactions of a visayas appointment
    if(logIsEmpty) {
        console.log('Log is empty, no recovery needed. Proceeding with transaction...');

        // transaction here
        // ... 
        // call actual transaction here
        // ...

        const { apptid, virtual, region, schedule } = req.body;
        const status = "Queued";

        const regionName = getRegionName(region);
        const regionIsland = getRegionIsland(region);

        console.log('DOING THE TRANSACTION');
        await testConnections();
        
        const transaction = {
            action: "add",
            apptid: apptid,
            status: status,
            StartTime: schedule,
            isVirtual: virtual,
            island: regionIsland,
            region: regionName
        };

        // save transaction change to log file
        addToLog(transaction, transaction.island);
        

        let result = await redoAddTransaction(transaction, transaction.island);

        if (result) {
            console.log('Add successful');
            // Call the function to remove transaction from log file
            removeFromLog(transaction);
            res.redirect('/appointments');
        }
        else {
            console.log('Add failed');
            res.redirect('/appointments');
        }

        // Redirect to root to appointments directory
        
    }
    else {
        console.log('Proceeding with recovery...');
        await performRecovery();

        // call actual transaction here
        // ...

        const { apptid, virtual, region, schedule } = req.body;
        const status = "Queued";

        const regionName = await util.promisify(getRegionName)(region);
        const regionIsland = await util.promisify(getRegionIsland)(region);

        await testConnections();
        
        const transaction = {
            action: "add",
            apptid: apptid,
            status: status,
            StartTime: schedule,
            isVirtual: virtual,
            island: regionIsland,
            region: regionName
        };

        // save transaction change to log file
        addToLog(transaction, transaction.island);

        let result = await redoAddTransaction(transaction, transaction.island);

        if (result) {
            console.log('Add successful');
            // Call the function to remove transaction from log file
            removeFromLog(transaction);
        }
        else {
            console.log('Add failed');
        }

        // Redirect to root to appointments directory
        res.redirect('/appointments');
    }
});

// EDIT APPOINTMENT
/*
    - Region
    - Status
    - Virtual   

*/

app.post('/edit/:id', async (req, res) => {
    // Get request body
    
    // Do log functions
    
    const logIsEmpty = await checkLogIsEmpty();
        
    // if i want to do transactions of a visayas appointment
    if(logIsEmpty) {
        console.log('Log is empty, no recovery needed. Proceeding with transaction...');

        // transaction here
        // ... 
        // call actual transaction here
        // ...

        const { virtual, status, schedule } = req.body;

        const id = req.params.id;
        const region = req.query.region; 
        const island = req.query.island;

        console.log("")

        console.log('DOING THE TRANSACTION');
        await testConnections();
        
        const transaction = {
            action: "edit",
            apptid: id,
            status: status,
            StartTime: schedule,
            isVirtual: virtual,
            island: island,
            region: region
        };

        // save transaction change to log file
        addToLog(transaction, transaction.island);
        
        let result = await redoEditTransaction(transaction, transaction.island);

        if (result) {
            console.log('Edit successful');
            // Call the function to remove transaction from log file
            removeFromLog(transaction);
            res.redirect('/appointments');
        }
        else {
            console.log('Edit failed');
            res.redirect('/appointments');
        }

        // Redirect to root to appointments directory
        
    }
    else {
        console.log('Proceeding with recovery...');
        await performRecovery();

        // call actual transaction here
        // ...

        // transaction here
        // ... 
        // call actual transaction here
        // ...

        const { virtual, status, schedule } = req.body;

        const id = req.params.id;
        const region = req.query.region; 
        const island = req.query.island;

        console.log("")

        console.log('DOING THE TRANSACTION');
        await testConnections();
        
        const transaction = {
            action: "edit",
            apptid: id,
            status: status,
            StartTime: schedule,
            isVirtual: virtual,
            island: island,
            region: region
        };

        // save transaction change to log file
        addToLog(transaction, transaction.island);
        
        let result = await redoEditTransaction(transaction, transaction.island);

        if (result) {
            console.log('Edit successful');
            // Call the function to remove transaction from log file
            removeFromLog(transaction);
            res.redirect('/appointments');
        }
        else {
            console.log('Edit failed');
            res.redirect('/appointments');
        }
    }
});

// DELETE APPOINTMENT
app.post('/delete/:id', async (req, res) => {
    // Get request body
    
    // Do log functions
    
    const logIsEmpty = await checkLogIsEmpty();
        
    // if i want to do transactions of a visayas appointment
    if(logIsEmpty) {
        console.log('Log is empty, no recovery needed. Proceeding with transaction...');

        // transaction here
        // ... 
        // call actual transaction here
        // ...

        const { virtual, status, schedule } = req.body;

        const id = req.params.id;
        const region = req.query.region;
        const island = req.query.island;

        console.log("")

        console.log('DOING THE TRANSACTION');
        await testConnections();
        
        const transaction = {
            action: "delete",
            apptid: id,
            region: region,
            island: island
        };

        // save transaction change to log file
        addToLog(transaction, transaction.island);
        
        let result = await redoDeleteTransaction(transaction, transaction.island);

        if (result) {
            console.log('Delete successful');
            // Call the function to remove transaction from log file
            removeFromLog(transaction);
            res.redirect('/appointments');
        }
        else {
            console.log('Delete failed');
            res.redirect('/appointments');
        }

        // Redirect to root to appointments directory
        
    }
    else {
        console.log('Proceeding with recovery...');
        await performRecovery();

        // call actual transaction here
        // ...

        console.log('Log is empty, no recovery needed. Proceeding with transaction...');

        // transaction here
        // ... 
        // call actual transaction here
        // ...

        const { virtual, status, schedule } = req.body;

        const id = req.params.id;
        const region = req.query.region;
        const island = req.query.island;

        console.log("")

        console.log('DOING THE TRANSACTION');
        await testConnections();
        
        const transaction = {
            action: "delete",
            apptid: id,
            region: region,
            island: island
        };

        // save transaction change to log file
        addToLog(transaction, transaction.island);
        
        let result = await redoDeleteTransaction(transaction, transaction.island);

        if (result) {
            console.log('Delete successful');
            // Call the function to remove transaction from log file
            removeFromLog(transaction);
            res.redirect('/appointments');
        }
        else {
            console.log('Delete failed');
            res.redirect('/appointments');
        }
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
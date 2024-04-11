let appointmentsContainer;

function showAddAppointmentModal() {
    let modal = document.getElementById('addAppointmentModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.classList.add('opacity-100');
}

function hideAddAppointmentModal() {
    let modal = document.getElementById('addAppointmentModal');
    modal.classList.remove('flex');
    modal.classList.remove('opacity-100');
    modal.classList.add('hidden');
}

// ROW COLUMNS
// 3 Region
// 5 Status
// 7 Virtual
// 8 Island
// 6 Type
function showEditAppointmentModal(row) {
    console.log(row);
    let editform = document.getElementById('editAppointments'); // Get the form
    let modal = document.getElementById('editAppointmentModal'); // Edit Modal
    
    // Form fields
    const virtualfield = editform.querySelector('#virtual');
    const statusfield  = editform.querySelector('#status');
    const schedulefield  = editform.querySelector('#schedule');
    
    const id = row.cells[0].data;                                   // Data from the table
    const region = row.cells[3].data;
    const island = row.cells[8].data;
    const deleteButton = document.getElementById('deleteButton');   // Delete Button

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.classList.add('opacity-100');

    // populate forms 
    virtualfield.value = row.cells[7].data;
    statusfield.value = row.cells[5].data;
    schedulefield.value = new Date(row.cells[4].data).toLocaleDateString();

    deleteButton.onclick = function() {
        editform.action = '/delete/' + id + '?region=' + encodeURIComponent(region) + '&island=' + encodeURIComponent(island);
    };

    console.log(id)
    
    editform.action = '/edit/' + id + '?region=' + encodeURIComponent(region) + '&island=' + encodeURIComponent(island);
    
}

function hideEditAppointmentModal() {
    let modal = document.getElementById('editAppointmentModal');
    modal.classList.remove('flex');
    modal.classList.remove('opacity-100');
    modal.classList.add('hidden');
}

async function getAllAppointments() {

    try {
        const response = await fetch('/get-appointments');

        if (!response.ok) {
            throw new Error ('Failed to fetch appointments');
        } 

        const data = await response.json();
        appointmentsContainer = data;
        return data;
    } catch (error) {
        console.error('Error fetching appointments', error);
        return null;
    }

}

async function getAppointment(appointmentID) {
    try {
        const response = await fetch('/get-appointment/' + appointmentID);
        if (!response.ok) {
            throw new Error('Failed to fetch appointment');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching appointment', error);
        return null;
    }
}

async function getAppointmentById(appointments, appointmendID) {
    try {
        
        let searchedAppointment = appointments.filter(appointment => appointment.apptid === appointmendID);
        return searchedAppointment;
        return JSON.stringify(searchedAppointment);
    } catch (error) {
        console.error('Error fetching appointment', error);
        return null;
    }
}

function loadAppointmentGrid(appointmentsJSON, containerID) {
    
    console.log(`ALL APPOINTMENTS: ${appointmentsJSON.forEach(appointment => {
        console.log(`Appointment: ${JSON.stringify(appointment)}`);
    })}`)

    let container = document.getElementById(containerID);
    container.innerHTML = ''; // Clear the container

    let aptsGrid = new gridjs.Grid({
        columns: [{
            id: 'apptid',
            name: 'Appointment ID'
        }, {
            id: 'pxid',
            name: 'Patient ID',
            hidden: true
        }, {
            id: 'clinicid',
            name: 'Clinic ID',
            hidden: true
        }, {
            id: 'region',
            name: 'Region'
        }, {
            id: 'StartTime',
            name: 'Schedule',
            formatter: (cell) => new Date(cell).toLocaleDateString()
        }, {
            id: 'status',
            name: 'Status'
        }, {
            id: 'type',
            name: 'Type',
            hidden: true
        }, {
            id: 'isVirtual',
            name: 'Virtual',
            formatter: (cell) => cell ? 'Yes' : 'No'
        }, {
            id: 'island',
            name: 'Island'
        }, {
            name: 'Actions',
            formatter: (cell, row) => {
                return gridjs.h('button', {
                    className: 'bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded',
                    onClick: () => showEditAppointmentModal(row)
                }, 'Edit');
            }
        }],
        //search: true, --- search function from gridjs library DD:
        pagination: {
            limit: 30
        },
        resizable: true,
        sort: true,
        data: appointmentsJSON,
        className: {
            table: 'shadow mt-4',
            thead: 'text-white',
            th: 'p-3 text-lg font-semibold bg-smdp-500',
            tr: 'hover:bg-gray-200',
            td: 'p-3 text-sm text-gray-700 text-center'
        },
        style: {
            thead: {
                color: 'white',
            }, 
            th: {
                color: 'white',
                'background-color': 'rgb(61, 53, 121)'
            }
        }
    })

    aptsGrid.render(document.getElementById(containerID));

    aptsGrid.updateConfig({
        columns: [{
            id: 'apptid',
            name: 'Appointment ID'
        }, {
            id: 'pxid',
            name: 'Patient ID',
            hidden: true
        }, {
            id: 'clinicid',
            name: 'Clinic ID',
            hidden: true
        }, {
            id: 'region',
            name: 'Region'
        }, {
            id: 'StartTime',
            name: 'Schedule',
            formatter: (cell) => new Date(cell).toLocaleDateString()
        }, {
            id: 'status',
            name: 'Status'
        }, {
            id: 'type',
            name: 'Type',
            hidden: true
        }, {
            id: 'isVirtual',
            name: 'Virtual',
            formatter: (cell) => cell ? 'Yes' : 'No'
        }, {
            id: 'island',
            name: 'Island'
        }, {
            name: 'Actions',
            formatter: (cell, row) => {
                return gridjs.h('button', {
                    className: 'bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded',
                    onClick: () => showEditAppointmentModal(row)
                }, 'Edit');
            }
        }],
        //search: true, --- search function from gridjs library DD:
        pagination: {
            limit: 30
        },
        resizable: true,
        sort: true,
        data: appointmentsJSON,
        className: {
            table: 'shadow mt-4',
            thead: 'text-white',
            th: 'p-3 text-lg font-semibold bg-smdp-500',
            tr: 'hover:bg-gray-200',
            td: 'p-3 text-sm text-gray-700 text-center'
        },
        style: {
            thead: {
                color: 'white',
            }, 
            th: {
                color: 'white',
                'background-color': 'rgb(61, 53, 121)'
            }
        }
    })

    aptsGrid.forceRender(document.getElementById(containerID));
}

async function reloadAppointment() {
    try {
        let searchInput = document.getElementById('search_item');
        let appointmentID = searchInput.value;
        if (appointmentID === '') {
            showInitialTable();
            return;
        }

        // Now, jsonData contains the data from the Grid in JSON format
        console.log('Searched Appointment');

        let appointmentsJSON = await getAppointmentById(appointmentsContainer, appointmentID);

        console.log(appointmentsJSON);

        loadAppointmentGrid(appointmentsJSON, 'search-table-container');
    } catch (error) {
        console.error('Error reloading appointment grid', error);
    }
    document.getElementById('initial-table-container').classList.add('hidden');
    document.getElementById('search-table-container').classList.remove('hidden');
}

function showInitialTable() {
    document.getElementById('initial-table-container').classList.remove('hidden');
    document.getElementById('search-table-container').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const appointmentsJSON = await getAllAppointments();
    
        if (appointmentsJSON) {
            loadAppointmentGrid(appointmentsJSON, 'apts-table');
        } else {
            console.log('No appointments available');
        }
    } catch (error) {
        console.error('Error loading appointments', error);
    }
    
})
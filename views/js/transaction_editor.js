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
    let editform = document.getElementById('editAppointments'); // Get the form
    let modal = document.getElementById('editAppointmentModal'); // Edit Modal
    
    // Form fields
    const typefield    = editform.querySelector('#type');
    const virtualfield = editform.querySelector('#virtual');
    const statusfield  = editform.querySelector('#status');
    const regionfield  = editform.querySelector('#region');
    
    const id = row.cells[0].data;                                   // Data from the table
    const deleteButton = document.getElementById('deleteButton');   // Delete Button

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.classList.add('opacity-100');

    // populate forms 
    typefield.value = row.cells[6].data;
    virtualfield.value = row.cells[7].data;
    statusfield.value = row.cells[5].data;
    regionfield.value = row.cells[3].data;

    deleteButton.onclick = function() {
        editform.action = '/delete/' + id;
    };

    console.log(id)
    editform.action = '/edit/' + id;
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
        return data;
    } catch (error) {
        console.error('Error fetching appointments', error);
        return null;
    }

    /*
    fetch('/get-appointments')
    .then(response => response.json())
    .then(data => {
        console.log(data);
        return data;
    })
    .catch(error => {
        console.error('Error fetching appointments', error);
    })
    */
}

function loadAppointmentGrid(appointmentsJSON) {

    console.log(`all appointments 1${appointmentsJSON}`);

    console.log(`ALL APPOINTMENTS: ${appointmentsJSON.forEach(appointment => {
        console.log(`Appointment: ${JSON.stringify(appointment)}`);
    })}`)

    const aptsGrid = new gridjs.Grid({
        columns: [{
            id: 'apptid',
            name: 'Appointment ID'
        }, {
            id: 'pxid',
            name: 'Patient ID'
        }, {
            id: 'clinicid',
            name: 'Clinic ID'
        }, {
            id: 'region',
            name: 'Region'
        }, {
            id: 'QueueDate',
            name: 'Schedule'
        }, {
            id: 'status',
            name: 'Status'
        }, {
            id: 'type',
            name: 'Type'
        }, {
            id: 'isVirtual',
            name: 'Virtual'
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
        pagination: {
            limit: 30
        },
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
    
    aptsGrid.render(document.getElementById('apts-table'));
}



document.addEventListener('DOMContentLoaded', async () => {
    try {
        const appointmentsJSON = await getAllAppointments();
    
        if (appointmentsJSON) {
            loadAppointmentGrid(appointmentsJSON);
        } else {
            console.log('No appointments available');
        }
    } catch (error) {
        console.error('Error loading appointments', error);
    }
    

})
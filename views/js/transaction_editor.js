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

function showEditAppointmentModal() {
    console.log('hi!');
    let modal = document.getElementById('editAppointmentModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.classList.add('opacity-100');
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
            id: 'QueueDate',
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
            formatter: () => {
                return gridjs.h('button', {
                    className: 'bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded',
                    onClick: showEditAppointmentModal
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
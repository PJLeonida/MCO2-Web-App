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

function loadAppointmentGrid(appointmentJSON) {


    const aptsGrid = new gridjs.Grid({
        columns: ['Appointment ID', 'Patient ID', 'Clinic ID',
                  'Region', 'Schedule', 'Status',
                  'Type', 'Virtual', 'Island'],
        data: [
                ['441F9A8E62AA75E437635DBE362C649C','3B8D83483189887A2F1A39D690463A8F','ACB3A881C7CE9ABCAE0CE8C99C86A906','National Capital Region (NCR)','2022-05-23 16:00:00','Queued','Consultation','1','Luzon'],
            ],
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
        const appointmentJSON = await getAllAppointments();
    
        if (appointmentJSON) {
            console.log(`ALL APPOINTMENTS: ${appointmentJSON}`)
            loadAppointmentGrid(appointmentJSON);
        } else {
            console.log('No appointments available');
        }
    } catch (error) {
        console.error('Error loading appointments', error);
    }
    

})
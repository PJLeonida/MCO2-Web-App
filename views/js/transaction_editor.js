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
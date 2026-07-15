// Sidebar toggle — wired up, ready for chat logic later
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const menuBtn = document.getElementById('menuBtn');
const sidebarClose = document.getElementById('sidebarClose');

function openSidebar() {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('active');
}

function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
}

menuBtn.addEventListener('click', openSidebar);
sidebarClose.addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

// Bottom sheet toggle
const bottomSheet = document.getElementById('bottomSheet');
const sheetOverlay = document.getElementById('sheetOverlay');
const sheetClose = document.getElementById('sheetClose');

function openSheet() {
    bottomSheet.classList.add('open');
    sheetOverlay.classList.add('active');
    document.getElementById('sheetInput').focus();
}

function closeSheet() {
    bottomSheet.classList.remove('open');
    sheetOverlay.classList.remove('active');
    document.getElementById('sheetInput').value = '';
}

// Wire thumbs down button to open the sheet
document.querySelectorAll('.feedback-btn--down').forEach(btn => {
    btn.addEventListener('click', openSheet);
});

sheetClose.addEventListener('click', closeSheet);
sheetOverlay.addEventListener('click', closeSheet);
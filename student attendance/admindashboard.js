const DB_NAME = "SchoolDB";
const DB_VERSION = 1; 
let db;

let studentCache = []; 
let adCurrentPage = 1;
let adItemsPerPage = 10; 


const request = indexedDB.open(DB_NAME, DB_VERSION);
request.onsuccess = e => {
    db = e.target.result;
    loadStudentsByClass('all');
    attachClassButtons();
};
request.onerror = e => console.error("DB error:", e.target.error);

function loadStudentsByClass(classFilter) {
    if (!db) return;
    const tx = db.transaction("students", "readonly");
    const store = tx.objectStore("students");
    const req = (classFilter === 'all') ? store.getAll() : store.index("Class").getAll(parseInt(classFilter));

    req.onsuccess = e => {
        studentCache = e.target.result.sort((a, b) => a.RollNo - b.RollNo); // Store and sort data
        adCurrentPage = 1; 
        renderStudentTable(); 
    };
    req.onerror = e => console.error("Error fetching students:", e.target.error);
}

function renderStudentTable(page = null) {
    if (page) adCurrentPage = page;

    const totalItems = studentCache.length;
    const totalPages = Math.ceil(totalItems / adItemsPerPage);
    if (adCurrentPage > totalPages) adCurrentPage = totalPages || 1;

    const startIndex = (adCurrentPage - 1) * adItemsPerPage;
    const paginatedItems = studentCache.slice(startIndex, startIndex + adItemsPerPage);

    const tbody = document.getElementById("studentTableBody");
    tbody.innerHTML = ""; 
    paginatedItems.forEach(student => {
        const row = document.createElement("tr");
        row.innerHTML = `<td>${student.StudentId}</td><td>${student.Name}</td><td>${student.Class}</td><td>${student.RollNo}</td>`;
        tbody.appendChild(row);
    });

    document.getElementById("paginationControls").innerHTML = buildPaginationControls(
        totalItems, totalPages, adCurrentPage, adItemsPerPage, 'renderStudentTable'
    );

    document.getElementById("studentDataSection").classList.remove("hidden");
}

function buildPaginationControls(totalItems, totalPages, currentPage, itemsPerPage, renderFnName) {
    if (totalPages <= 1) return '';

    const prevDisabled = currentPage === 1 ? 'disabled' : '';
    const nextDisabled = currentPage === totalPages ? 'disabled' : '';

    return `
        <span>Showing ${Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} to ${Math.min(currentPage * itemsPerPage, totalItems)} of ${totalItems} students</span>
        <div class="pagination-buttons">
            <button onclick="${renderFnName}(${currentPage - 1})" ${prevDisabled}>&laquo; Prev</button>
            <button onclick="${renderFnName}(${currentPage + 1})" ${nextDisabled}>Next &raquo;</button>
        </div>
    `;
}

function attachClassButtons() {
    document.querySelectorAll(".class-btn").forEach(btn =>
        btn.addEventListener("click", () => loadStudentsByClass(btn.dataset.class))
    );
}
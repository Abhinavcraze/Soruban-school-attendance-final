const DB_NAME = "SchoolDB";
const DB_VERSION = 1;
let db;

const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const viewDateRangeBtn = document.getElementById("viewDateRangeBtn");
const dateRangeReportResultDiv = document.getElementById("dateRangeReportResult");

const reportMonthInput = document.getElementById("reportMonth");
const classDropdown = document.getElementById("classDropdown");
const viewMonthlySummaryBtn = document.getElementById("viewMonthlySummaryBtn");
const monthlySummaryResultDiv = document.getElementById("monthlySummaryResult");


let dateRangeCache = [];
let drCurrentPage = 1;
let drItemsPerPage = 10;
let drCurrentFilter = 'all';


const request = indexedDB.open(DB_NAME, DB_VERSION);
request.onsuccess = e => { db = e.target.result; };
request.onerror = e => console.error("DB error:", e.target.error);


viewDateRangeBtn.addEventListener("click", () => {
    const startDate = startDateInput.value, endDate = endDateInput.value;
    if (!startDate || !endDate) return alert("Please select both a start and end date.");
    if (startDate > endDate) return alert("Start date cannot be after the end date.");
    
    const tx = db.transaction("attendance", "readonly");
    const index = tx.objectStore("attendance").index("Date");
    const range = IDBKeyRange.bound(startDate, endDate);
    const request = index.getAll(range);

    request.onsuccess = e => {
        dateRangeCache = e.target.result;
        drCurrentPage = 1; 
        drCurrentFilter = 'all'; 
        renderDateRangeReport(); 
    };
});

function renderDateRangeReport(newFilter = null, page = null) {
    if (newFilter) {
        drCurrentFilter = newFilter;
        drCurrentPage = 1; 
    }
    if (page) drCurrentPage = page;

    const filteredRecords = drCurrentFilter === 'all'
        ? dateRangeCache
        : dateRangeCache.filter(r => r.status.toLowerCase() === drCurrentFilter);

 
    const totalItems = filteredRecords.length;
    const totalPages = Math.ceil(totalItems / drItemsPerPage);
    if (drCurrentPage > totalPages) drCurrentPage = totalPages || 1;
    const startIndex = (drCurrentPage - 1) * drItemsPerPage;
    const paginatedRecords = filteredRecords.slice(startIndex, startIndex + drItemsPerPage);

    if (dateRangeCache.length === 0) {
        dateRangeReportResultDiv.innerHTML = `<p>No records found between ${startDateInput.value} and ${endDateInput.value}.</p>`;
        return;
    }

    const filterControlsHTML = buildFilterControls();
    const tableHTML = buildReportTable(paginatedRecords);
    const paginationControlsHTML = buildPaginationControls(totalItems, totalPages);

    dateRangeReportResultDiv.innerHTML = filterControlsHTML + tableHTML + paginationControlsHTML;
}


function buildFilterControls() {
    const allCount = dateRangeCache.length;
    const presentCount = dateRangeCache.filter(r => r.status === 'Present').length;
    const absentCount = dateRangeCache.filter(r => r.status === 'Absent').length;
    return `
        <div class="filter-controls">
            <button class="filter-btn ${drCurrentFilter === 'all' ? 'active' : ''}" onclick="renderDateRangeReport('all')">All (${allCount})</button>
            <button class="filter-btn ${drCurrentFilter === 'present' ? 'active' : ''}" onclick="renderDateRangeReport('present')">Present (${presentCount})</button>
            <button class="filter-btn ${drCurrentFilter === 'absent' ? 'active' : ''}" onclick="renderDateRangeReport('absent')">Absent (${absentCount})</button>
        </div>`;
}

function buildReportTable(records) {
    if (records.length === 0) return `<p>No records match the current filter.</p>`;
    return `
        <table>
            <thead><tr><th>Date</th><th>Student Name</th><th>Class</th><th>Status</th></tr></thead>
            <tbody>
                ${records.map(r => `
                    <tr>
                        <td>${r.date}</td>
                        <td>${r.name}</td>
                        <td>${r.class}</td>
                        <td class="status-${r.status.toLowerCase()}">${r.status}</td>
                    </tr>`).join("")}
            </tbody>
        </table>`;
}

function buildPaginationControls(totalItems, totalPages) {
    if (totalPages <= 1) return '';
    const prevDisabled = drCurrentPage === 1 ? 'disabled' : '';
    const nextDisabled = drCurrentPage === totalPages ? 'disabled' : '';

    return `
        <div class="pagination-controls">
            <span>
                Items per page:
                <select onchange="changeItemsPerPage(this.value)">
                    <option value="5" ${drItemsPerPage == 5 ? 'selected' : ''}>5</option>
                    <option value="10" ${drItemsPerPage == 10 ? 'selected' : ''}>10</option>
                    <option value="20" ${drItemsPerPage == 20 ? 'selected' : ''}>20</option>
                </select>
            </span>
            <span>Page ${drCurrentPage} of ${totalPages} (${totalItems} items)</span>
            <div class="pagination-buttons">
                <button onclick="renderDateRangeReport(null, ${drCurrentPage - 1})" ${prevDisabled}>&laquo; Prev</button>
                <button onclick="renderDateRangeReport(null, ${drCurrentPage + 1})" ${nextDisabled}>Next &raquo;</button>
            </div>
        </div>`;
}

function changeItemsPerPage(value) {
    drItemsPerPage = parseInt(value);
    drCurrentPage = 1; 
    renderDateRangeReport();
}


viewMonthlySummaryBtn.addEventListener("click", async () => { /* ... */ });
function renderMonthlySummary(summaryData, month, selectedClass) { /* ... */ }
function getStudentsByClass(classNumber) { /* ... */ }
function getAttendanceInRange(startDate, endDate) { /* ... */ }
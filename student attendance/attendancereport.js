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

const reportDateInput = document.getElementById("reportDate");
const viewByDateBtn = document.getElementById("viewByDate");
const dateReportDiv = document.getElementById("dateReport");

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
//-------------------------------------------
viewMonthlySummaryBtn.addEventListener("click", async () => {
    if (!db) {
        return alert("Database is not ready. Please wait a moment.");
    }

    const monthValue = reportMonthInput.value; 
    const selectedClass = classDropdown.value;

    if (!monthValue) {
        return alert("Please select a month.");
    }
    if (!selectedClass) {
        return alert("Please select a class.");
    }
    
    
    //"2025-10"
    const [year, month] = monthValue.split('-').map(Number);
    //[2025, 10]
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`; 
    //"2025-10-01"
    const nextMonthDate = new Date(year, month, 1); 
    //November 1st, 2025
    const exclusiveEndDate = nextMonthDate.toISOString().split('T')[0]; 
    //"2025-11-01T00:00:00.000Z"
    //2025-11-01

    try {
        const [allStudents, attendanceRecords] = await Promise.all([
            getStudentsByClass(selectedClass),
            getAttendanceInRange(startDate, exclusiveEndDate)
        ]);

        const summaryData = processMonthlySummary(allStudents, attendanceRecords);

        renderMonthlySummary(summaryData, monthValue, selectedClass);

    } 
    catch (error) {
        console.error("Error generating monthly report:", error);
        alert("An error occurred while generating the monthly report.");
        monthlySummaryResultDiv.innerHTML = `<p class="error-message">Error: ${error.message}. Check console for details.</p>`;
    }
});


function getStudentsByClass(classNumber) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction("students", "readonly");
        const store = tx.objectStore("students");
        
        let req;
        if (classNumber === 'all') {
            req = store.getAll();
        } else {
            const index = store.index("Class"); 
            req = index.getAll(parseInt(classNumber));
        }

        req.onsuccess = e => resolve(e.target.result);
        req.onerror = e => reject(e.target.error);
    });
}


function getAttendanceInRange(startDateString, exclusiveEndDateString) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction("attendance", "readonly");
        const index = tx.objectStore("attendance").index("Date"); 
        
        const range = IDBKeyRange.bound(startDateString, exclusiveEndDateString, false, true);
        const request = index.getAll(range);

        request.onsuccess = e => resolve(e.target.result);
        request.onerror = e => reject(e.target.error);
    });
}


function processMonthlySummary(allStudents, attendanceRecords) {
    const studentAttendanceMap = attendanceRecords.reduce((map, record) => {
        const studentId = record.studentId;
        if (!map[studentId]) {
            map[studentId] = { present: 0, absent: 0, total: 0 };
        }
        
        map[studentId].total++;
        if (record.status === 'Present') {
            map[studentId].present++;
        } else {
            map[studentId].absent++;
        }
        return map;
    }, {});

    const summary = allStudents.map(student => {
        const studentId = student.StudentId;
        const attendance = studentAttendanceMap[studentId] || { present: 0, absent: 0, total: 0 };

        const attendancePercentage = attendance.total > 0
            ? ((attendance.present / attendance.total) * 100).toFixed(2)
            : 'N/A';
        
        return {
            name: student.Name,
            class: student.Class,
            rollNo: student.RollNo,
            presentCount: attendance.present,
            absentCount: attendance.absent,
            totalDays: attendance.total,
            percentage: attendancePercentage
        };
    });

    return summary;
}

function renderMonthlySummary(summaryData, month, selectedClass) {
    monthlySummaryResultDiv.innerHTML = ''; // Clear previous results

    if (summaryData.length === 0) {
        monthlySummaryResultDiv.innerHTML = `<p>No students found in Class ${selectedClass}.</p>`;
        return;
    }

    const totalRecords = summaryData.reduce((sum, s) => sum + s.totalDays, 0);
    const monthText = new Date(`${month}-01`).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

    let headerHTML = `<h3>Monthly Attendance Summary for Class ${selectedClass} (${monthText})</h3>`;

    if (totalRecords === 0) {
        headerHTML += `<p>No attendance records found for this class in ${monthText}.</p>`;
        monthlySummaryResultDiv.innerHTML = headerHTML;
        return;
    }

    const tableHTML = `
        <table class="summary-table">
            <thead>
                <tr>
                    <th>Roll No</th>
                    <th>Student Name</th>
                    <th>Total Days</th>
                    <th>Present</th>
                    <th>Absent</th>
                    <th>Attendance %</th>
                </tr>
            </thead>
            <tbody>
                ${summaryData.sort((a, b) => a.rollNo - b.rollNo).map(s => `
                    <tr>
                        <td>${s.rollNo}</td>
                        <td>${s.name}</td>
                        <td>${s.totalDays}</td>
                        <td class="status-present">${s.presentCount}</td>
                        <td class="status-absent">${s.absentCount}</td>
                        <td><strong>${s.percentage}${s.percentage !== 'N/A' ? '%' : ''}</strong></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    monthlySummaryResultDiv.innerHTML = headerHTML + tableHTML;
}


// --- View By Date ---
viewByDateBtn.addEventListener("click", () => {
    const selectedDate = reportDateInput.value;
    if (!selectedDate) return alert("Select a date!");

    const tx = db.transaction("attendance", "readonly");
    const store = tx.objectStore("attendance");
    const index = store.index("Date");
    lastDateRecords = [];

    index.openCursor(IDBKeyRange.only(selectedDate)).onsuccess = e => {
        const cursor = e.target.result;
        if (cursor) {
            lastDateRecords.push(cursor.value);
            cursor.continue();
        } 
        else {
            renderTable(lastDateRecords, selectedDate);
        }
    };
});

// --- Render Table ---
function renderTable(records, selectedDate) {
    if (records.length === 0) {
        dateReportDiv.innerHTML = `<p>No records found</p>`;
        return;
    }

    dateReportDiv.innerHTML = `
        <h3>Attendance on ${selectedDate}</h3>
        <table class="attendance-table">
        <thead><tr><th>Name</th><th>Class</th><th>Status</th></tr></thead>
        <tbody>
            ${records.map(r => `
            <tr>
                <td>${r.name}</td>
                <td>${r.class}</td>
                <td class="${r.status === "Present" ? "present" : "absent"}">${r.status}</td>
            </tr>`).join("")}
        </tbody>
        </table>

        <div class="attendance-buttons">
            <button id="markPresent">Present</button>
            <button id="markAbsent">Absent</button>
        </div>
    `;

    document.getElementById("markPresent").addEventListener("click", () =>
        renderTable(lastDateRecords.filter(r => r.status === "Present"), selectedDate)
    );
    document.getElementById("markAbsent").addEventListener("click", () =>
        renderTable(lastDateRecords.filter(r => r.status === "Absent"), selectedDate)
    );
}
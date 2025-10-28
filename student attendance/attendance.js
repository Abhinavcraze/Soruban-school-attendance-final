// ==================== Attendance Page ====================
const DB_NAME = "SchoolDB";
const DB_VERSION = 1;
let db;

const request = indexedDB.open(DB_NAME, DB_VERSION);
request.onsuccess = e => { db = e.target.result; console.log("DB ready"); };
request.onerror = e => console.error("DB error:", e);

const classDropdown = document.getElementById("classDropdown");
const studentListDiv = document.getElementById("studentList");
const saveBtn = document.getElementById("saveBtn");
const attendanceDate = document.getElementById("attendanceDate");
const attendanceTableSection = document.getElementById("attendanceTableSection");

let currentStudents = [];

function getStudentsByClass(selectedClass) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("students", "readonly");
    const store = tx.objectStore("students");
    const index = store.index("Class");
    const req = index.getAll(selectedClass);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e);
  });
}

classDropdown.addEventListener("change", function () {
  const selectedClass = parseInt(this.value);
  if (!selectedClass) {
    studentListDiv.style.display = "none";
    saveBtn.style.display = "none";
    return;
  }

  getStudentsByClass(selectedClass).then(result => {
    currentStudents = result;
    studentListDiv.innerHTML = `
      <h3>Mark Attendance</h3>
      ${currentStudents.map(stu => `
        <div class="student-item">
          <span>${stu.Name}</span>
          <label><input type="checkbox" data-id="${stu.StudentId}" checked> Present</label>
        </div>
      `).join("")}
    `;
    studentListDiv.style.display = "block";
    saveBtn.style.display = "inline-block";
  });
});

saveBtn.addEventListener("click", function () {
  const date = attendanceDate.value;
  if (!date) return alert("Please select a date!");

  const attendanceData = [...studentListDiv.querySelectorAll("input[type='checkbox']")].map(cb => {
    const stuId = parseInt(cb.dataset.id);
    const student = currentStudents.find(s => s.StudentId === stuId);
    return {
      studentId: stuId,
      name: student.Name,
      class: student.Class,
      date,
      status: cb.checked ? "Present" : "Absent",
    };
  });

  const tx = db.transaction("attendance", "readwrite");
  const store = tx.objectStore("attendance");
  const index = store.index("Date");
  index.openCursor(IDBKeyRange.only(date)).onsuccess = e => {
    const cursor = e.target.result;
    if (cursor && cursor.value.class === currentStudents[0].Class) {
      store.delete(cursor.primaryKey);
    }
    if (cursor) cursor.continue();
  };

  tx.oncomplete = () => {
    const tx2 = db.transaction("attendance", "readwrite");
    const store2 = tx2.objectStore("attendance");
    attendanceData.forEach(rec => store2.add(rec));

    tx2.oncomplete = () => {
      attendanceTableSection.innerHTML = buildAttendanceTable(attendanceData, date);
      alert("Attendance saved!");
    };
  };
});

function buildAttendanceTable(attendanceData, date) {
  return `
    <h3>Attendance for ${date}</h3>
    <table class="attendance-table">
      <thead><tr><th>Name</th><th>Class</th><th>Date</th><th>Status</th></tr></thead>
      <tbody>
        ${attendanceData.map(a => `
          <tr>
            <td>${a.name}</td>
            <td>${a.class}</td>
            <td>${a.date}</td>
            <td class="${a.status === "Present" ? "present" : "absent"}">${a.status}</td>
          </tr>`).join("")}
      </tbody>
    </table>`;
}

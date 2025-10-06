const DB_NAME = "SchoolDB";
const DB_VERSION = 1;
let db;


const request = indexedDB.open(DB_NAME, DB_VERSION);

request.onsuccess = function (e) {
    db = e.target.result;
    console.log("Successfully connected to DB on add students page.");
};

request.onerror = function (e) {
    console.error("Error opening DB:", e.target.error);
    alert("Error connecting to the database. Please ensure it has been initialized by logging in first.");
};


document.getElementById("addStudentForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    if (!db) {
        alert("Database is not ready. Please wait a moment and try again.");
        return;
    }

    const name = document.getElementById("studentName").value.trim();
    const studentClass = parseInt(document.getElementById("studentClass").value);
    const rollNo = parseInt(document.getElementById("rollNo").value.trim());

    if (!name || !studentClass || !rollNo) {
        alert("Please fill in all fields correctly.");
        return;
    }

    
    const isDuplicate = await isRollNoDuplicate(studentClass, rollNo);

    if (isDuplicate) {
        alert(`Error: Roll No ${rollNo} already exists in Class ${studentClass}. Please choose another roll number.`);
        return;
    }

    addStudentToDB(name, studentClass, rollNo);
});

function isRollNoDuplicate(studentClass, rollNo) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction("students", "readonly");
        const store = tx.objectStore("students");
        const index = store.index("ClassAndRollNo");
        const request = index.get([studentClass, rollNo]);

        request.onsuccess = () => {
            resolve(!!request.result); 
        };

        request.onerror = (e) => {
            console.error("Error checking for duplicate roll number:", e.target.error);
            reject(e.target.error);
        };
    });
}


function addStudentToDB(name, studentClass, rollNo) {
    const tx = db.transaction("students", "readwrite");
    const store = tx.objectStore("students");

    let maxId = 0;
    store.openCursor(null, 'prev').onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
            maxId = cursor.value.StudentId;
        }

        const newStudent = {
            StudentId: maxId + 1,
            Name: name,
            Class: studentClass,
            RollNo: rollNo
        };

        const addRequest = store.add(newStudent);

        addRequest.onsuccess = () => {
            alert(`Student "${name}" added successfully with ID ${newStudent.StudentId}!`);
            document.getElementById("addStudentForm").reset();
        };

        addRequest.onerror = (e) => {
            console.error("Error adding student:", e.target.error);
            alert("An error occurred while adding the student. The roll number might already exist.");
        };
    };
}
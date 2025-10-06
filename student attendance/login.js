const DB_NAME = "SchoolDB";
const DB_VERSION = 1; 
let db;

const dbReady = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
        db = e.target.result;
        console.log("Database upgrade needed. Setting up schema...");

        if (!db.objectStoreNames.contains("users")) {
            const userStore = db.createObjectStore("users", { keyPath: "UserId", autoIncrement: true });
            userStore.createIndex("Name", "Name", { unique: true });
        }

        if (!db.objectStoreNames.contains("students")) {
            const studentStore = db.createObjectStore("students", { keyPath: "StudentId" });
            studentStore.createIndex("Class", "Class", { unique: false }); 
            studentStore.createIndex("ClassAndRollNo", ["Class", "RollNo"], { unique: true });
        }

        if (!db.objectStoreNames.contains("attendance")) {
            const attendanceStore = db.createObjectStore("attendance", { keyPath: "id", autoIncrement: true });
            attendanceStore.createIndex("StudentId", "studentId", { unique: false });
            attendanceStore.createIndex("Date", "date", { unique: false });
        }
    };

    request.onsuccess = (e) => {
        db = e.target.result;
        console.log("Database connection successful.");
        seedInitialData().then(() => resolve(db)).catch(reject);
    };

    request.onerror = (e) => {
        console.error("Database open error:", e);
        reject(e.target.error);
    };
});


async function seedInitialData() {
    const defaultUsers = [
        { Name: "Admin1", Role: "Admin", Password: "admin123" },
        { Name: "Staff1", Role: "Staff", Password: "staff123" },
    ];

    const defaultStudents = [
        { StudentId: 1, Name: "Arun Kumar", Class: 6, RollNo: 601 }, { StudentId: 2, Name: "Priyadharshini", Class: 6, RollNo: 602 }, { StudentId: 3, Name: "Karthick", Class: 6, RollNo: 603 }, { StudentId: 4, Name: "Kavin", Class: 7, RollNo: 704 }, { StudentId: 5, Name: "Kishore", Class: 7, RollNo: 703 }, { StudentId: 6, Name: "Kavya", Class: 8, RollNo: 802 }, { StudentId: 7, Name: "Kavimitraa", Class: 8, RollNo: 801 }, { StudentId: 8, Name: "Jamuna", Class: 8, RollNo: 803 }, { StudentId: 9, Name: "Kiruba", Class: 9, RollNo: 901 }, { StudentId: 10, Name: "Naveen", Class: 9, RollNo: 902 }, { StudentId: 11, Name: "Ravi Teja", Class: 6, RollNo: 604 }, { StudentId: 12, Name: "Janaki", Class: 7, RollNo: 702 }, { StudentId: 13, Name: "Sabarish", Class: 7, RollNo: 701 }, { StudentId: 14, Name: "Thulasi", Class: 8, RollNo: 804 }, { StudentId: 15, Name: "Abhinav", Class: 9, RollNo: 903 }, { StudentId: 16, Name: "Priyanka", Class: 9, RollNo: 904 }, { StudentId: 17, Name: "Gokul", Class: 10, RollNo: 1001 }, { StudentId: 18, Name: "Gobika", Class: 10, RollNo: 1002 }, { StudentId: 19, Name: "Jana", Class: 10, RollNo: 1003 }, { StudentId: 20, Name: "Premja", Class: 10, RollNo: 1004 },
    ];

    const tx = db.transaction(["users", "students"], "readwrite");
    const userStore = tx.objectStore("users");
    const studentStore = tx.objectStore("students");

    const userCount = await new Promise(res => userStore.count().onsuccess = e => res(e.target.result));
    if (userCount === 0) {
        console.log("Seeding default users...");
        defaultUsers.forEach(user => userStore.add(user));
    }

    const studentCount = await new Promise(res => studentStore.count().onsuccess = e => res(e.target.result));
    if (studentCount === 0) {
        console.log("Seeding default students...");
        defaultStudents.forEach(student => studentStore.add(student));
    }

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
    });
}


function validateLogin(name, password) {
    return dbReady.then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction("users", "readonly");
            const index = tx.objectStore("users").index("Name");
            const req = index.get(name);
            req.onsuccess = () => {
                const user = req.result;
                if (user && user.Password === password) {
                    resolve(user);
                } else {
                    reject("Invalid username or password.");
                }
            };
            req.onerror = () => reject("Error during login validation.");
        });
    });
}

document.getElementById("loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("username").value.trim();
    const pass = document.getElementById("password").value.trim();
    const msg = document.getElementById("msg");

    validateLogin(name, pass).then(user => {
        localStorage.setItem("loggedInUser", JSON.stringify(user));
        window.location.href = user.Role === "Admin" ? "admindashboard.html" : "staffdashboard.html";
    }).catch(err => {
        msg.textContent = err;
    });
});
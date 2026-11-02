
/* =================================
   1. YOUTUBE TUTORIAL LINKS
================================= */

// Replace VIDEO_ID with your actual
// YouTube video IDs.

const tutorials = {

    Option1: "https://www.youtube.com/watch?v=VIDEO_ID_1",
    Option2: "https://youtu.be/nCbH-CvAY8U?si=NyzAjJauEFuICOgC",
    Option3: "https://youtu.be/d5-tBOeRX98?si=SuRZPRoFibfctZ_n",
    Option4: "https://www.youtube.com/watch?v=VIDEO_ID_4",
    Option5: "https://www.youtube.com/watch?v=VIDEO_ID_5",
    Option6: "https://www.youtube.com/watch?v=VIDEO_ID_6",
    Option7: "https://www.youtube.com/watch?v=VIDEO_ID_7",
    Option8: "https://www.youtube.com/watch?v=VIDEO_ID_8",
    Option9: "https://www.youtube.com/watch?v=VIDEO_ID_9",
    Option10: "https://www.youtube.com/watch?v=VIDEO_ID_10",
    Option11: "https://www.youtube.com/watch?v=VIDEO_ID_11",
    Option12: "https://www.youtube.com/watch?v=VIDEO_ID_12",
    Option13: "https://www.youtube.com/watch?v=VIDEO_ID_13",
    Option14: "https://www.youtube.com/watch?v=VIDEO_ID_13",
    Option15: "https://www.youtube.com/watch?v=VIDEO_ID_13",
    Option16: "https://www.youtube.com/watch?v=VIDEO_ID_13",
    Option17: "https://youtu.be/r1dPdseoWQQ?si=C_s_ccMVKxhxbTxr",
    Option18: "https://youtube.com/shorts/7YG3CpV1o3c?si=VwxlBzkZpy2E3R8D",
    Option19: "https://www.youtube.com/watch?v=VIDEO_ID_13",

};


/* =================================
   2. OPEN YOUTUBE TUTORIAL
================================= */

function openTutorial() {

    let selected = document.getElementById("tutorialSelect").value;

    if (selected === "") {

        alert("Please select a computer concern first!");
        return;

    }

    let link = tutorials[selected];

    if (link.includes("VIDEO_ID")) {

        alert("YouTube tutorial link has not been added yet.");
        return;

    }

    // Open in the same browser tab

    window.location.href = link;

}


/* =================================
   3. DISABLE SUNDAYS IN CALENDAR
================================= */

const dateInput = document.getElementById("appointmentDate");

// Get today's date

let today = new Date();

let year = today.getFullYear();
let month = String(today.getMonth() + 1).padStart(2, "0");
let day = String(today.getDate()).padStart(2, "0");

// Prevent selecting past dates

dateInput.min = `${year}-${month}-${day}`;


// Check selected date

dateInput.addEventListener("change", function() {

    let selectedDate = new Date(this.value + "T12:00:00");

    // Sunday = 0

    if (selectedDate.getDay() === 0) {

        alert("Sorry! Sunday is not available for appointments.");

        this.value = "";

    }

});


/* =================================
   4. BOOK APPOINTMENT
================================= */

document.getElementById("bookingForm").addEventListener("submit", function(event) {

    event.preventDefault();

    let selectedDate = document.getElementById("appointmentDate").value;

    let date = new Date(selectedDate + "T12:00:00");

    // Check Sunday again

    if (date.getDay() === 0) {

        alert("Please select another date. Sunday is unavailable.");
        return;

    }

    // Display confirmation

    alert(
        "Your appointment request has been completed!\n\n" +

        "Date: " + selectedDate + "\n" +

        "Time: " + document.getElementById("appointmentTime").value +

        "\n\nPlease wait for confirmation from Computer Boss Davao."
    );

});
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz_sEtjR7NLy9DlHo33jXOylpdzTRTwrGWCS04ZIOt4BetqJ1F908hQD8vEqUqVAEv2Ug/exec"; 
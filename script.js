// Show Registration Form
function showRegister() {

    document.getElementById("loginForm")
        .classList.add("hidden");

    document.getElementById("registerForm")
        .classList.remove("hidden");
}


// Show Login Form
function showLogin() {

    document.getElementById("registerForm")
        .classList.add("hidden");

    document.getElementById("loginForm")
        .classList.remove("hidden");
}


// Login
async function loginUser(event) {

    event.preventDefault();

    const email =
        document.getElementById("loginEmail").value;

    const password =
        document.getElementById("loginPassword").value;


    if (email === "" || password === "") {

        alert("Please enter your email and password.");

        return;
    }


    try {

        const response = await fetch("/api/login", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                email: email,
                password: password
            })

        });


        const data = await response.json();


        if (!response.ok) {

            alert(data.message);

            return;
        }


        alert(
            "Login successful!\n\n" +
            "Welcome, " + data.user.name + "!"
        );
       localStorage.setItem("loggedInUser", JSON.stringify(data.user));
       localStorage.setItem("token", data.token);

if (data.user.role === "administrator") {
    window.location.href = "admin.html";
} else {
    window.location.href = "dashboard.html";
}


    } catch (error) {

        alert("Unable to connect to the server.");

        console.error(error);
    }
}


async function registerUser(event) {

    event.preventDefault();

    const name =
        document.getElementById("name").value;

    const email =
        document.getElementById("email").value;

    const phone =
        document.getElementById("phone").value;

    const role =
        document.getElementById("role").value;

    const location =
        document.getElementById("location").value;

    const password =
        document.getElementById("registerPassword").value;

    const confirmPassword =
        document.getElementById("confirmPassword").value;


    // Check passwords
    if (password !== confirmPassword) {

        alert("Passwords do not match.");

        return;
    }


    // Password length
    if (password.length < 6) {

        alert(
            "Password must contain at least 6 characters."
        );

        return;
    }


    try {

        const response = await fetch("/api/register", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                name: name,
                email: email,
                phone: phone,
                role: role,
                location: location,
                password: password
            })

        });


        const data = await response.json();


        if (!response.ok) {

            alert(data.message);

            return;
        }


        alert(
            "Registration successful!\n\n" +
            "Welcome, " + name + "!"
        );


        // Clear form
        document.querySelector("#registerForm form").reset();

        // Go to login
        showLogin();


    } catch (error) {

        alert(
            "Unable to connect to the server."
        );

        console.error(error);
    }
}


// Forgot Password
function forgotPassword() {

    const email = prompt(
        "Enter your registered email address:"
    );

    if (email) {

        alert(
            "If this email is registered, " +
            "a password reset link will be sent."
        );
    }
}

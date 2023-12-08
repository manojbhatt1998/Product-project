// validation.js

const validateEmail = (email) => {
    // Check if the email is valid
    // You can use any suitable email validation logic here
    // Example: Regular expression for email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

module.exports = {
    validateEmail,
};

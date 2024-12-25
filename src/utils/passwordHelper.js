const crypto = require('crypto');

function hashPassword(password) {
    if (!password) {
        throw new Error("Password cannot be empty");
    }
    const salt = crypto.randomBytes(16).toString('hex'); // Generate a random salt
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex'); // Derive the hash
    return { salt, hash }; // Return both the salt and the hash
}

module.exports = { hashPassword };
const mongoose = require('mongoose');

const resetTokens = new mongoose.Schema({
    token: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    created: {
        type: Date,
        default: () => Date.now(),
    },
    // Will automatically delete after 10 min
    expire_at: { type: Date, default: Date.now, expires: 600 }
});

module.exports = mongoose.model('resetTokens', resetTokens);
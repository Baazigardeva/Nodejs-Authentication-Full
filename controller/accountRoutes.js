const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const resetToken = require('../model/resetTokens');
const user = require('../model/user');
const mailer = require('./sendMail');
const bcryptjs = require('bcryptjs');

function checkAuth(req, res, next) {
    if (req.isAuthenticated()) {
        res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, post-check=0, pre-check=0');
        next();
    } else {
        req.flash('error_messages', "Please Login to continue !");
        res.redirect('/login');
    }
}

router.get('/user/send-verification-email', checkAuth, async (req, res) => {
        // Generate a token 
        var token = crypto.randomBytes(32).toString('hex');
        // Add that to database
        await resetToken({ token: token, email: req.user.email }).save();
        // Send an email for verification
        mailer.sendVerifyEmail(req.user.email, token);
        res.render('verify', { fullname: req.user.fullname, verified: req.user.isVerified, emailsent: true });
});

router.get('/user/verifyemail', async (req, res) => {
    // Grab the token
    const token = req.query.token;
    // Check if token exists 
    if (token) {
        var check = await resetToken.findOne({ token: token });
        if (check) {
            // Token verified ! Set the property of verified to true for the user
            var userData = await user.findOne({ email: check.email });
            userData.isVerified = true;
            await userData.save();
            // Delete the token now
            await resetToken.findOneAndDelete({ token: token });
            res.render('profile', { fullname: req.user.fullname, verified: true});
        } else {
            res.redirect('/login');
        }
    } else {
        // Doesnt have a token
        res.redirect('/login');
    }
});

router.get('/user/forgot-password', async (req, res) => {
    res.render('forgot-password.ejs', { csrfToken: req.csrfToken() });
});

router.post('/user/forgot-password', async (req, res) => {
    const { email } = req.body;
    // Check if a user exists with this email
    var userData = await user.findOne({ email: email });
    console.log(userData);
    if (userData) {
            // User exists Generate token
            var token = crypto.randomBytes(32).toString('hex');
            // Add that to database
            await resetToken({ token: token, email: email }).save();
            // Send an email for verification
            mailer.sendResetEmail(email, token);
            res.render('forgot-password.ejs', { csrfToken: req.csrfToken(), msg: "Reset email sent. Check your email.", type: 'success' });
    } else {
        res.render('forgot-password.ejs', { csrfToken: req.csrfToken(), msg: "No user Exists with this email.", type: 'danger' });
    }
});

router.get('/user/reset-password', async (req, res) => {
    const token = req.query.token;
    if (token) {
        var check = await resetToken.findOne({ token: token });
        if (check) {
            // Send forgot-password page with reset to true this will render the form to reset password sending token too to grab email later
            res.render('forgot-password.ejs', { csrfToken: req.csrfToken(), reset: true, email: check.email });
        } else {
            res.render('forgot-password.ejs', { csrfToken: req.csrfToken(), msg: "Token Tampered or Expired.", type: 'danger' });
        }
    } else {
        // Doesnt have a token
        res.redirect('/login');
    }

});

router.post('/user/reset-password', async (req, res) => {
    // Get passwords
    const { password, password2, email } = req.body;
    console.log(password);
    console.log(password2);
    if (!password || !password2 || (password2 != password)) {
        res.render('forgot-password.ejs', { csrfToken: req.csrfToken(), reset: true, err: "Password Don't Match !", email: email });
    } else {
        // Encrypt the password
        var salt = await bcryptjs.genSalt(12);
        if (salt) {
            var hash = await bcryptjs.hash(password, salt);
            await user.findOneAndUpdate({ email: email }, { $set: { password: hash } });
            res.redirect('/login');
        } else {
            res.render('forgot-password.ejs', { csrfToken: req.csrfToken(), reset: true, err: "Unexpected Error Try Again", email: email });
        }
    }
});


module.exports = router;
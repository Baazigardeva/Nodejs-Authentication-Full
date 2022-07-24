const express = require('express');
const router = express.Router();
const user = require('../model/user');
const bcryptjs = require('bcryptjs');
const passport = require('passport');
require('./passportLocal')(passport);
require('./googleAuth')(passport);
const userRoutes = require('./accountRoutes');

function checkAuth(req, res, next) {
    if (req.isAuthenticated()) {
        res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, post-check=0, pre-check=0');
        next();
    } else {
        req.flash('error_messages', "Please Login to continue !");
        res.redirect('/login');
    }
}

router.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        res.render("index", { logged: true });
    } else {
        res.render("index", { logged: false });
    }
});

router.get('/login', (req, res) => {
    if (req.isAuthenticated()) {
        res.render("profile", {csrfToken: req.csrfToken(), fullname: req.user.fullname, verified : req.user.isVerified});
    } else {
        res.render("login", {csrfToken: req.csrfToken()});
    }
});

router.get('/signup', (req, res) => {
    if (req.isAuthenticated()) {
        res.render("profile", {csrfToken: req.csrfToken(), fullname: req.user.fullname, verified : req.user.isVerified});
    } else {
    res.render("signup", {csrfToken: req.csrfToken()});
    }
});

router.post('/signup', (req, res) => {
    // Get all values 
    const { email, fullname, dob, password, confirmpassword } = req.body;
    // Checking if are empty 
    if (!email || !fullname || !dob || !password || !confirmpassword) {
        res.render("signup", { err: "All Fields Required !", csrfToken: req.csrfToken()});
    } else if (password != confirmpassword) {
        res.render("signup", { err: "Password Don't Match !", csrfToken: req.csrfToken()});
    } else {
        // Validate
        // Checking if a user exists
        user.findOne({ $or: [{ email: email }, { fullname: fullname }] }, function (err, data) {
            if (err) throw err;
            if (data) {
                res.render("signup", { err: "User Exists, Try Logging In !", csrfToken: req.csrfToken()});
            } else {
                // Generate a salt
                bcryptjs.genSalt(12, (err, salt) => {
                    if (err) throw err;
                    // Hash the password
                    bcryptjs.hash(password, salt, (err, hash) => {
                        if (err) throw err;
                        // Save user in db
                        user({
                            fullname: fullname,
                            email: email,
                            dob: dob,
                            password: hash,
                            googleId: null,
                            provider: 'email',
                        }).save((err, data) => {
                            if (err) throw err;
                            // Redirect , if don't want to login
                            res.redirect('/login');
                        });
                    })
                });
            }
        });
    }
});

router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        failureRedirect: '/login',
        successRedirect: '/verify',
        failureFlash: true,
    })(req, res, next);
});

router.get('/verify', (req, res) => {
    if(req.user.isVerified){
        res.render('profile', { fullname: req.user.fullname, verified : req.user.isVerified})
    } else 
    if(req.user.isVerified == undefined || req.user.isVerified == false) {
        res.render('verify', { fullname: req.user.fullname, verified : req.user.isVerified });
    }
});

router.get('/profile', checkAuth, (req, res) => {
    res.render('profile', { fullname: req.user.fullname, verified : req.user.isVerified });
});

router.get('/logout', (req, res) => {
    req.logout();
    req.session.destroy(function (err) {
        res.redirect('/');
    });
});

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email',] }));

router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
    res.redirect('/profile');
});

router.use(userRoutes);

module.exports = router;
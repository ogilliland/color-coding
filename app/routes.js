module.exports = function(app, passport) {

    // =====================================
    // LOGIN PAGE ==========================
    // =====================================
    app.get('/login', function(req, res) {
        if (req.isAuthenticated()) {
            res.redirect('/'); // nagivate to main app
        } else {
            res.render('login.ejs'); // load the login page
        }
    });

    // =====================================
    // MAIN APP SECTION ====================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)
    app.get('/', isLoggedIn, function(req, res) {
        res.render('main.ejs', {
            user : req.user // get the user out of session and pass to template
        });
    });

    // =====================================
    // LOGOUT ==============================
    // =====================================
    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/login');
    });

    // =====================================
    // GITHUB ROUTES =======================
    // =====================================
    // send to github to do the authentication
    // read:user gets us their basic information including their name and email
    // public_repo and repo give us access to git repositories and blame data
    app.get('/auth/github', passport.authenticate('github', { scope : [ 'read:user', 'public_repo', 'repo' ] }));

    // the callback after github has authenticated the user
    app.get('/auth/github/callback',
            passport.authenticate('github', {
                    successRedirect : '/',
                    failureRedirect : '/login'
            }));
};

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on 
    if (req.isAuthenticated())
        return next();

    // if they aren't redirect them to the login page
    res.redirect('/login');
}
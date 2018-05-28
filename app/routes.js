var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn; // middleware to redirect on login

module.exports = function(app, passport) {

    app.use(function(req, res, next) {
      if (!req.secure && req.get('x-forwarded-proto') !== 'https' && process.env.NODE_ENV !== "development") {
        return res.redirect('https://' + req.get('host') + req.url);
      }
      next();
    });

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
    // we will use route middleware to verify this (ensureLoggedIn)
    app.get('/', ensureLoggedIn('/login'), function(req, res) {
        // check if client sent cookie
        if (req.cookies.githubToken != req.user.github.token) {
            res.cookie('githubToken', req.user.github.token, { maxAge: 31536000 });
        }

        // render page
        res.render('main.ejs');
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
            successReturnToOrRedirect: '/',
            failureRedirect : '/login'
        }));
};
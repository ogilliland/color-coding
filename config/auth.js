// expose our config directly to our application using module.exports
module.exports = {

    'githubAuth' : {
        'clientID'      : process.env.GITHUB_AUTH_ID,
        'clientSecret'  : process.env.GITHUB_AUTH_SECRET,
        'callbackURL'   : process.env.GITHUB_AUTH_CALLBACK
    }

};
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

//Importing model
const User = require('../models/User');

module.exports = function(passport) {
    passport.use(new LocalStrategy((username,password,done) => {
        User.findOne({username})
            .then(user => {
                if(!user) {
                    return done(null, false, {err: 'User Not Found'});
                }
                
                bcrypt.compare(password, user.password, (err, isMatch) => {
                    if(err) throw err;

                    if(isMatch) {
                        return done(null, user, {success: 'Success'})
                    }else {
                        return done(null, false, {err: 'Passwords Do not match'})
                    }
                })
                
            })
            .catch(err => console.log(err))
    }))

    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });
       
    passport.deserializeUser(function(id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
    });
}
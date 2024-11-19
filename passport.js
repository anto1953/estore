const passport = require('passport');
const User=require('../project1/model/userSchema')
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const bcrypt=require('bcrypt');

// Serialize and deserialize user
// passport.serializeUser((user, done) => {
//     done(null, user);
// });

// passport.deserializeUser((user, done) => {
//     done(null, user);
// });

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: 'http://localhost:2000/auth/google/callback',
    passReqToCallback: true
},
async (request, accessToken, refreshToken, profile, done) => {
    try {
        console.log("Google strategy initiated");
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
            // Not storing a password for social users
            user = new User({
                googleId: profile.id,
                name: profile.displayName,
                email: (profile.emails && profile.emails[0]) ? profile.emails[0].value : '',
                profilephoto: (profile.photos && profile.photos[0]) ? profile.photos[0].value : ''
            });           
            await user.save();
        }

        done(null, user);
    } catch (error) {
        console.error("Error during Google authentication:", error);
        done(error, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id); // Store only the user ID in the session
    // console.log("User serialized:", user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        // console.log("Deserializing user:", id);
        const user = await User.findById(id);
        // console.log(user);
        
        done(null, user);
    } catch (err) {
        // console.error("Error during user deserialization:", err);
        done(err, null);
    }
});

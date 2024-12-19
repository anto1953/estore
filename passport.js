const passport = require('passport');
const User=require('./model/userSchema')
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const bcrypt=require('bcrypt');


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
            let newReferralCode;
        newReferralCode = Math.random().toString().slice(2, 8); // Generates referral code
      
            user = new User({
                googleId: profile.id,
                name: profile.displayName,
                email: (profile.emails && profile.emails[0]) ? profile.emails[0].value : '',
                profilephoto: (profile.photos && profile.photos[0]) ? profile.photos[0].value : '',
                referralCode:newReferralCode,
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
    done(null, user.id); 
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

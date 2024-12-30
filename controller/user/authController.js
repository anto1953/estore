const User = require("../../model/userSchema");
const mongoose = require("mongoose");
const passport = require("passport");
const { generate } = require("otp-generator");
const nodemailer = require("nodemailer");
const { json } = require("body-parser");


const admin = {
    email: process.env.ADMIN_ID,
    password: process.env.ADMIN_PASS,
  };

const login = async (req, res) => {
  try {
    res.render("login");
  } catch (error) {
    res.send(error.message);
  }
};

const loginpost = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email });
    if (email === admin.email && password === admin.password) {
      const isAnyUserLoggedIn = await User.findOne({ isLoggedIn: true });
      if (isAnyUserLoggedIn && req.session.user) {
        return res.json({
          status: "error",
          message: "A user already logged in.",
        });
      } else {
        req.session.admin = admin.email;
        return res.json({
          status: "success",
          message: "Admin login successful",
          redirectUrl: "/admin/adminhome",
        });
      }
    }
    if (user) {
      if (user.isBlocked) {
        return res.json({
          status: "error",
          message: "User is blocked",
        });
      }
      if (req.session.admin) {
        return res.json({
          status: "error",
          message: "Admin already logged in .",
          redirectUrl: "/login",
        });
      }
      if (password === user.password) {
        req.session.user = user;
        req.session.id = user.id;
        await User.updateOne({ _id: user._id }, { isLoggedIn: true });

        return res.json({
          status: "success",
          message: "User login successful",
          redirectUrl: "/userhome",
        });
      } else {
        return res.json({
          status: "error",
          message: "Invalid username or password",
        });
      }
    } else {
      return res.json({
        status: "error",
        message: "Invalid username or password",
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "something error",
    });
  }
};

const loadAuth = async (req, res) => {
  try {
    console.log('loadauth');
    
    const user = await User.findOne({ email: email });
    if (user.isBlocked == true) {
      return res.json({
        status: "error",
        message: "user is blocked",
      });
    } else {
        res.render("user/userhome");
    }
  } catch (error) {
    res.send(error.message);
  }
};

const success = async (req, res) => {
  try {
    console.log('success');
    
    if (req.session.user) {
      if (!req.user) res.redirect("/failure");
      res.send(`<script>
            alert('success')
            </script>`);
    }
  } catch (error) {
    res.send(error.message);
  }
};
const failure = async (req, res) => {
  try {
    console.log('failure');
    
    if (req.session.user) {
      res.render("/login");
    }
  } catch (error) {
    res.send(error.message);
  }
};

const profile = async (req, res) => {
  try {
    console.log('profile',req.session.user,'user',req.user);
    req.session.user=req.user
    
    const email = req.user.email;
    const user = await User.findOne({ email: email });

    const authenticated = await User.findOne({ email: email });
    req.session.authenticated = authenticated;
    if (!authenticated) {
      return res.render("/login");
    } else if (user.isBlocked == true) {
      res.send(`
            <html>
            <head>
                <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
            </head>
            <body>
                <script>
                    Swal.fire({
                        icon: 'error',
                        title: 'blocked',
                        text: 'user is blocked',
                        confirmButtonText: 'OK'
                    }).then(() => {
                  window.location.href='/login'
                  });;
                </script>
            </body>   
        </html>
      `);
    } else {
      req.session.user = authenticated;
      await User.updateOne({ _id: user._id }, { isLoggedIn: true });
      if(authenticated){
      res.status(200).redirect("/userhome");
      }else{
        res.send(`
          <html>
          <head>
              <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
          </head>
          <body>
              <script>
                  Swal.fire({
                      icon: 'info',
                      text: 'Another user is already loggedin',
                      confirmButtonText: 'OK'
                  }).then(() => {
                window.location.href='/login'
                });;
              </script>
          </body>   
      </html>
    `);
      }
    }
  } catch (error) {
    console.log(error);

    res.send(error.message);
  }
};


module.exports = {
  login,
  loginpost,
  loadAuth,
  success,
  failure,
  profile,
}
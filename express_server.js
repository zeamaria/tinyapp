// CONFIGURE  
const express = require("express");
const app = express();
const PORT = 8080; // default port 8080

app.set("view engine", "ejs");

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));

const cookieParser = require('cookie-parser');
app.use(cookieParser());

// DATABASES

let users = { 
  "userRandomID": {
    id: "userRandomID", 
    email: "user@example.com", 
    password: "purple-monkey-dinosaur"
  },
  "user2RandomID": {
    id: "user2RandomID", 
    email: "user2@example.com", 
    password: "dishwasher-funk"
  }
}

const urlDatabase = {};

// FUNCTIONS

function generateRandomString(length) {
  let chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

function getUserByEmail(email, password) {
  // loop through users and check if email exists
  for (const key in users) {
    if(users[key].email === email) {
      // email found, now check passwords match
      if(users[key].password === password) {
        return users[key];
      }
    }
  }

  return false;
}

function getLoggedInUser(req, res) {
  let user = {};
  if(req.cookies.user && req.cookies.user !== "undefined" && typeof req.cookies.user !== "undefined") {
    if(req.cookies.user.hasOwnProperty('id')) {
      if(users[req.cookies.user.id]) {
        user = req.cookies.user;
      } else {
        res.clearCookie("user");
      }
    }
  }
  return user;
}

// MIDDLEWARE
// check if cookie getLoggedInUser returns empty object then redirect to login page / deny access

// app.use(function (req, res, next) {
//   if (req.url === "/login" || req.url === "/register"){
//     next();
//   }
//   let user = getLoggedInUser(req, res)
//   //console.log("Hello here", req.url)
//   if (!user.hasOwnProperty("id")){
//     return res.redirect('/login');
//   }
//   next();
// })



// SHORT URLS

app.get("/urls", (req, res) => {
  const templateVars = {
    urls: urlDatabase,
    user: getLoggedInUser(req, res)
  };
  res.render("urls_index", templateVars);
});

app.get("/urls/new", (req, res) => {
  const templateVars = { 
    user: getLoggedInUser(req, res)
  };
  res.render("urls_new", templateVars);
});

app.post("/urls/new", (req, res) => {
  let user = getLoggedInUser(req, res);
  let shortURL = generateRandomString(6);
  // TO DO: ("https://") use regex to validate whether long URL starts with https://
  // if does not have https add to it before saving to database

  //Saving to database
  urlDatabase[shortURL] = {
    longURL: req.body.longURL,
    userID: user.id
  };
  res.redirect(`/urls/${shortURL}`);
});

app.get("/urls/:shortURL", (req, res) => {
  console.log("req.params", req.params);
  console.log("urlDatabase", urlDatabase);
  // req.params { shortURL: '3KMX3K' }
  // urlDatabase { '3KMX3K': { longURL: 'google.com', userID: 'O7OniKoc' } }
  
  const templateVars = { 
    shortURL: req.params.shortURL,
    longURL: urlDatabase[req.params.shortURL].longURL,
    user: getLoggedInUser(req, res)
  };
  console.log(templateVars);
  res.render("urls_show", templateVars);
});

app.post("/urls/:shortURL", (req, res) => {
  // define short url
  let shortURL = req.params.shortURL;
  // take in the new url // replace old url
  urlDatabase[shortURL].longURL = req.body.longURL;
  // redirect to new url 
  res.redirect(`/urls`);
});

app.get("/u/:shortURL", (req, res) => {
  console.log("test urlDatabase", urlDatabase)
  console.log("test req.params", req.params)
  const longURL = urlDatabase[req.params.shortURL].longURL;
  res.redirect(longURL);
});

app.post("/urls/:shortURL/delete", (req, res) => {
  let shortURL = req.params.shortURL;
  delete urlDatabase[shortURL];
  res.redirect(`/urls`);
});

// EDIT
// app.get("/urls/:shortURL/edit", (req, res) => {
//   console.log("edit test")
//   // let shortURL = req.params.shortURL;
//   // res.redirect(`/urls`);
//});


// LOGIN ROUTE

app.get("/login",(req,res) => {
  const templateVars = {
    user: {}
  };
  res.render("login", templateVars);
});

app.post("/login", function (req, res) {
  const email    = req.body.email;
  const password = req.body.password;

  const user = getUserByEmail(email, password);

  if( !email ){
    return res.status(403).send("User email or password cannot be found. Please include both a valid username AND password!");
  };

  if ( !password ){
    return res.status(403).send("Incorrect password");
  } else {
    res.cookie("user", user);
    return res.redirect("/urls");
  };
});

// LOGOUT ROUTE

app.post("/logout", function (req, res) {
  res.clearCookie("user");
  res.redirect("/urls");
});

// REGISTER ROUTES
app.get('/register', (req,res) => {
  const templateVars = { 
    user: {}
  };
  res.render("register", templateVars);
});

app.post("/register", function (req, res) {
  // create helper function to check for email in users object(getUserByEmail)
  let email    = req.body.email;
  let password = req.body.password;
  // check if email or pw are empty/ exists

  if( !email || !password ){
    // send back response with 400 status code
    res.status(400).send("Please include both a valid email AND password!");
    return;
  }
  
   
  // check if someone tries to register with an email that is already in users object
  if (getUserByEmail(email)){
  // send back response with 400 status code
    res.status(400).send("I am sorry user already exists!");
    return;
  }

  const id = generateRandomString(8)
  const user = {id, email, password}

  users[user.id] = user;

  res.cookie("user", user);
  res.redirect("/urls");
});


// PROFILE PAGE
app.get('/profile'), (req,res) =>{
  console.log("test req.cookies:", req.cookies)

  if(users[req.cookies.user]){
    const templateVars = {
      username:users[req.cookies.user],
      testPassword: users[req.cookies.user]
    };
    res.render('profile', templateVars);
  } else {
    res.redirect("/login");
  }
}


// HOMEPAGE

app.get("/", (req, res) => {
  res.redirect("/urls");
});

// OLD ROUTES

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});


// SERVER LISTEN 
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

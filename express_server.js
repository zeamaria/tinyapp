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

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

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
  if(req.cookies.user_id && req.cookies.user_id !== "undefined" && typeof req.cookies.user_id !== "undefined") {
    if(users[req.cookies.user_id]) {
      user = users[req.cookies.user_id];
    } else {
      res.clearCookie("user_id");
    }
  }
  return user;
}


// SHORT URLS

app.post("/urls", (req, res) => {
  let shortURL = generateRandomString(6);
  urlDatabase[shortURL] = req.body.longURL;
  res.redirect(`/urls/${shortURL}`);
});

app.get("/urls/:shortURL", (req, res) => {
  const templateVars = { 
    shortURL: req.params.shortURL,
    longURL: urlDatabase[req.params.shortURL],
    username: req.cookies["username"]
  };
  res.render("urls_show", templateVars);
});

app.post("/urls/:shortURL", (req, res) => {
  // define short url
  let shortURL = req.params.shortURL;
  // take in the new url // replace old url
  urlDatabase[shortURL] = req.body.longURL;
  // redirect to new url 
  res.redirect(`/urls`);
});

app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL];
  res.redirect(longURL);
});

app.post("/urls/:shortURL/delete", (req, res) => {
  let shortURL = req.params.shortURL;
  delete urlDatabase[shortURL];
  res.redirect(`/urls`);
});


// LOGIN ROUTE

app.get("/login",(req,res) => {
  res.render("login",);
});

app.post("/login", function (req, res) {
  const email    = req.body.email;
  const password = req.body.password;

  const user = getUserByEmail(email, password);
  
  if(user){
    res.cookie("user", user);
    res.redirect("/urls")
    res.end()
  }

  res.redirect("/login"); 
});

// LOGOUT ROUTE

app.post("/logout", function (req, res) {
  res.clearCookie("user_id");
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
  let email    = req.body.email;
  let password = req.body.password;
  // check if email or pw are empty/ exists

  if( !email || !password ){
    res.status(400).send("Please include both a valid email and password!");
    return;
  }
  
  if (getUserByEmail(email)){
    res.status(400).send("I am sorry user already exists!");
    return;
  }

  const id = generateRandomString(8)
  const user = {id, email, password}

  // send back response with 400 status code
  // check if someone tries to register with an email that is already in users object
  // send back response with 400 status code
  // create helper function to check for email in users object(getUserByEmail)

  users[userId] = user;

  res.cookie("user_id", id);
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

app.get("/urls", (req, res) => {
  const templateVars = {
    urls: urlDatabase,
    username: req.cookies["username"],
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


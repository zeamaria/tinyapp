// CONFIGURE  

const express = require("express");
const app = express();
const PORT = 8080; // default port 8080
const bcrypt = require('bcrypt'); // Password hashing

app.set("view engine", "ejs");

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));

const cookieSession = require('cookie-session');
app.use(cookieSession({
  name: 'session',
  keys: ['sghfigdifgdiuygfiudgfiudfyf98739dfh39'],

  // Cookie Options
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

const { getUserByEmail } = require("./helpers");

// DATABASES
 
let users = {};

const urlDatabase = {};

// HELPER FUNCTIONS 

// Generates random string for User IDs and short URLS
function generateRandomString(length) {
  let chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
};

// Check if user is logged in by cookie
// Note: this allows us to not have to constantly clear cookie cache on browser
function getLoggedInUser(req, res) {
  let user = {};
  if(req.session.user && req.session.user !== "undefined" && typeof req.session.user !== "undefined") {
    if(req.session.user.hasOwnProperty('id')) {
      if(users[req.session.user.id]) {
        user = req.session.user;
      } else {
        req.session = null;
      }
    }
  }
  return user;
};

// Returns the URLs where the userID is equal to the id of the currently logged-in user.
function urlsForUser(id){
  let urlDatabaseForUser = {};
  for (const key in urlDatabase) {
    if(urlDatabase[key].userID === id) {
      urlDatabaseForUser[urlDatabase[key].shortURL] = urlDatabase[key];
    }
  }
  return urlDatabaseForUser;
};

// MIDDLEWARE

// check if cookie getLoggedInUser returns empty object then redirect to login page / deny access
app.use(function (req, res, next) {
  if (req.url === "/login" || req.url === "/register"){
    return next();
  }
  if (req.url.split("/")[0] === 'u') {
    // /u/:id have an array of two items, check first item.
    return next();
  }
  let user = getLoggedInUser(req, res)
  
  if (!user.hasOwnProperty("id")){
    //return res.redirect('/login');
  }
  return next();
});


// GET REQUESTS

// Shows homepage
app.get("/", (req, res) => {
  res.redirect("/urls");
});

// Shows a page where user can create new shortlinks
// must be placed above /urls/:shortURL route (otherwise express will think its a new route param)
app.get("/urls/new", (req, res) => {
  const templateVars = { 
    user: getLoggedInUser(req, res)
  };
  res.render("urls_new", templateVars);
});

// Redirect from shortlink to long URL associated with :shortURL in the database
app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL].longURL;
  res.redirect(longURL);
});

// Shows all URLS in list
app.get("/urls", (req, res) => {
  let loggedUser = getLoggedInUser(req, res);
  let urlDatabaseForUser = urlsForUser(loggedUser.id);
  const templateVars = {
    urls: urlDatabaseForUser,
    user: loggedUser
  };
  res.render("urls_index", templateVars);
});

// Shows a page where user can edit short URLS
app.get("/urls/:shortURL", (req, res) => {
  // Check if real short code
  const details = urlDatabase[req.params.shortURL];
  if(!details) {
    res.redirect("/urls");
  }
  // Get logged in user
  let loggedUser = getLoggedInUser(req, res);
  // Check short code belongs to user
  if(loggedUser.id !== details.userID) {
    res.redirect("/urls");
  }
  const templateVars = { 
    shortURL: req.params.shortURL,
    longURL:  urlDatabase[req.params.shortURL].longURL,
    user:     loggedUser
  };
  res.render("urls_show", templateVars);
});

// Shows a page where a new user can register
app.get('/register', (req,res) => {
  const templateVars = { 
    user: {}
  };
  res.render("register", templateVars);
});

// Shows login page for existing users
app.get("/login",(req,res) => {
  const templateVars = {
    user: {}
  };
  res.render("login", templateVars);
});

// Shows a users profile page
app.get('/profile'), (req,res) =>{
  if(users[req.session.user]){
    const templateVars = {
      username:users[req.session.user],
      testPassword: users[req.session.user]
    };
    res.render('profile', templateVars);
  } else {
    res.redirect("/login");
  }
};
 
// POST REQUESTS

// Creates a new shortlink and adds to :shortURL database
app.post("/urls/new", (req, res) => {
  let user = getLoggedInUser(req, res);
  let shortURL = generateRandomString(6);

  urlDatabase[shortURL] = {
    shortURL: shortURL,
    longURL:  req.body.longURL,
    userID:   user.id
  };
  res.redirect(`/urls/${shortURL}`);
});

// Updates long URL with short URL
app.post("/urls/:shortURL", (req, res) => {
  const loggedUser = getLoggedInUser(req, res);
  const shortURL = req.params.shortURL;
  if(urlDatabase[shortURL].userID !== loggedUser.id) {
    return res.redirect(`/urls`);
  }
  urlDatabase[shortURL].longURL = req.body.longURL;
  return res.redirect(`/urls`);
});

// Delete :shortURL entry from database 
app.post("/urls/:shortURL/delete", (req, res) => {
  let shortURL = req.params.shortURL;
  const loggedUser = getLoggedInUser(req, res);
  if(urlDatabase[shortURL].userID !== loggedUser.id) {
    return res.redirect(`/urls`);
  }
  delete urlDatabase[shortURL];
  res.redirect(`/urls`);
});

// Login as existing user
app.post("/login", function (req, res) {
  const email    = req.body.email;
  const password = req.body.password;

  if( !email ){
    return res.status(403).send("Please enter an email!");
  }
  else if ( !password ){
    return res.status(403).send("Please enter a password!");
  }

  const user = getUserByEmail(email, users);

  if(!user) {
    return res.status(403).send("No user found with that email!");
  }

  bcrypt.compare(password, user.password).then(function(result) {
    if (!result) {
      return res.status(403).send("Incorrect password. Please try again!")
    } else {
      req.session.user = user;
      return res.redirect("/urls");
    };
  });
});

// Logout user and clear cookies
app.post("/logout", function (req, res) {
  req.session = null;
  res.redirect("/urls");
});

// Register new user
app.post("/register", function (req, res) {
  let email      = req.body.email;
  let password = req.body.password;

  const id   = generateRandomString(8)
  const user = {id, email, password}

  if( !email || !password ){
    res.status(400).send("Please include both a valid email AND password!");
    return;
  }

  if (getUserByEmail(email, users)){
    res.status(400).send("I am sorry user already exists!");
    return;
  } else {
    user.password = bcrypt.hashSync(password, 10);  
    users[user.id] = user;
  };

  req.session.user = user;
  res.redirect("/urls");
});


// SERVER LISTEN 

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

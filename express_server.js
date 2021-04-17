///////////////////////////////////////////////////////////
// CONFIGURE  
///////////////////////////////////////////////////////////

const express = require("express");
const app = express();
const PORT = 8080; // default port 8080
const bcrypt = require('bcrypt'); // Password hashing

app.set("view engine", "ejs");

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));

const cookieParser = require('cookie-parser');
app.use(cookieParser());

///////////////////////////////////////////////////////////
// DATABASES
///////////////////////////////////////////////////////////

// Database of user accounts 
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
};

// Database of URLs
const urlDatabase = {};

///////////////////////////////////////////////////////////
// HELPER FUNCTIONS 
///////////////////////////////////////////////////////////

// Generates random string for User IDs and short URLS
function generateRandomString(length) {
  let chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

// Checks if email is already in database
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

// Check if user is logged in by cookie
// 1. Check if user cookie exists, if not return empty object (user)
// 2. Check the cookie saved has a property of ID, if not return empty object (user)
// 3. Check that the cookie user matches a user in the database, if not clear cookie & return empty object (user)
// Note: this allows us to not have to constantly clear cookie cache on browser
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
///////////////////////////////////////////////////////////
// MIDDLEWARE
///////////////////////////////////////////////////////////

// check if cookie getLoggedInUser returns empty object then redirect to login page / deny access
app.use(function (req, res, next) {
  if (req.url === "/login" || req.url === "/register"){
    next();
  }
  let user = getLoggedInUser(req, res)
  //console.log("Hello here", req.url)
  if (!user.hasOwnProperty("id")){
    return res.redirect('/login');
  }
  next();
})


///////////////////////////////////////////////////////////
// GET REQUESTS
///////////////////////////////////////////////////////////

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
  console.log("test urlDatabase", urlDatabase)
  console.log("test req.params", req.params)
  const longURL = urlDatabase[req.params.shortURL].longURL;
  res.redirect(longURL);
});

// Shows all URLS in list
app.get("/urls", (req, res) => {
  const templateVars = {
    urls: urlDatabase,
    user: getLoggedInUser(req, res)
  };
  res.render("urls_index", templateVars);
});

// Shows a page where user can edit short URLS
app.get("/urls/:shortURL", (req, res) => {
  // console.log("req.params", req.params);
  // console.log("urlDatabase", urlDatabase);
  // // req.params { shortURL: '3KMX3K' }
  // // urlDatabase { '3KMX3K': { longURL: 'google.com', userID: 'O7OniKoc' } }
  const templateVars = { 
    shortURL: req.params.shortURL,
    longURL: urlDatabase[req.params.shortURL].longURL,
    user: getLoggedInUser(req, res)
  };
  console.log(templateVars);
  res.render("urls_show", templateVars);
});

// Shows a page where users can edit
// app.get("/urls/:shortURL/edit", (req, res) => {
//   console.log("edit test")
//   // let shortURL = req.params.shortURL;
//   // res.redirect(`/urls`);
// }); ****is this a duplicate?****


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
};
 

///////////////////////////////////////////////////////////
// POST REQUESTS
///////////////////////////////////////////////////////////

// Updates long URL with short URL by
  // 1. define short url
  // 2. take in the new url // replace old url
  // 3. redirect to new url 
  app.post("/urls/:shortURL", (req, res) => {
    let shortURL = req.params.shortURL;
    urlDatabase[shortURL].longURL = req.body.longURL;
    res.redirect(`/urls`);
  });

// Creates a new shortlink and adds to :shortURL database
app.post("/urls/new", (req, res) => {
  let user = getLoggedInUser(req, res);
  let shortURL = generateRandomString(6);
  // TO DO: ("https://") use regex to validate whether long URL starts with https://
  // if does not have https add to it before saving to database

  urlDatabase[shortURL] = {
    longURL: req.body.longURL,
    userID: user.id
  };
  res.redirect(`/urls/${shortURL}`);
});


// Delete :shortURL entry from database 
app.post("/urls/:shortURL/delete", (req, res) => {
  let shortURL = req.params.shortURL;
  delete urlDatabase[shortURL];
  res.redirect(`/urls`);
});

// Login as existing user
app.post("/login", function (req, res) {
  const email    = req.body.email;
  const enterPassword = req.body.password  
  const user = getUserByEmail(email, password);
  if( !email ){
    return res.status(403).send("User email or password cannot be found. Please include both a valid username AND password!");
  };
  if ( !password ){
    return res.status(403).send("Incorrect password");
  } 
  else if (!bcrypt.compareSync(req.body.password, getLoggedInUser.password)) {
   return res.status(403).send('Incorrect Password! Please try again!')
  } else {
    res.cookie("user", user);
    return res.redirect("/urls");
  };
});

// Logout user and clear cookies
app.post("/logout", function (req, res) {
  res.clearCookie("user");
  res.redirect("/urls");
});


// Register new user
// 1. create helper function to check for email in users object(getUserByEmail)
// 2. check if email or pw are empty/ exists
// 3. send back response with 400 status code
// 4. check if someone tries to register with an email that is already in users object
// 5. send back response with 400 status code
app.post("/register", function (req, res) {
  let email    = req.body.email;
  let password = req.body.password;

  const id = generateRandomString(8)
  const user = {id, email, password}

  users[user.id] = user;

  if( !email || !password ){
    res.status(400).send("Please include both a valid email AND password!");
    return;
  } 
  if (getUserByEmail(email)){
    res.status(400).send("I am sorry user already exists!");
    return;
  } else {
    let password = bcrypt.hashSync(req.body.password, 10);  
    users[id] = user
  };

 

  res.cookie("user", user);
  res.redirect("/urls");
});


///////////////////////////////////////////////////////////
// OLD ROUTES
///////////////////////////////////////////////////////////

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

///////////////////////////////////////////////////////////
// SERVER LISTEN 
///////////////////////////////////////////////////////////

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

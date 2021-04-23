// HELPER FUNCTIONS 

// TESTING HELLO 

// Generates random string for User IDs and short URLS
function generateRandomString(length) {
  let chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
};

// Check if user is logged in by cookie
// Note: this allows us to not have to constantly clear cookie cache on browser
function getLoggedInUser(req, users) {
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
function urlsForUser(id, urlDatabase){
  let urlDatabaseForUser = {};
  for (const key in urlDatabase) {
    if(urlDatabase[key].userID === id) {
      urlDatabaseForUser[urlDatabase[key].shortURL] = urlDatabase[key];
    }
  }
  return urlDatabaseForUser;
};

// Checks if email is already in database
function getUserByEmail(email, database) {
  for (const key in database) {
    if(database[key].email === email) {
      return database[key];
    }
  }
  return false;
}



module.exports = { getUserByEmail, urlsForUser, getLoggedInUser, generateRandomString };
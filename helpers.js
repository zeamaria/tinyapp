// Checks if email is already in database
function getUserByEmail(email, database) {
  // loop through users and check if email exists
  for (const key in database) {
    if(database[key].email === email) {
      return database[key];
    }
  }
  return false;
}

module.exports = { getUserByEmail };
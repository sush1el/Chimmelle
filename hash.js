const bcrypt = require('bcryptjs');

async function hashPassword() {
  const password = '!Admin123'; // Replace with your desired password
  const hashedPassword = await bcrypt.hash(password, 12);
  console.log(hashedPassword); // Copy this hashed password for the next step
}

hashPassword();

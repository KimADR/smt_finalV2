const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

async function updatePasswords() {
  const prisma = new PrismaClient();
  try {
    const hash = await bcrypt.hash('ChangeMe123!', 10);
    // Update all users with the new hash
    await prisma.user.updateMany({
      data: {
        password: hash
      }
    });
    console.log('Updated all user passwords');
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

updatePasswords();
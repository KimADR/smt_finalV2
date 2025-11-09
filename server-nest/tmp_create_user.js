const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
(async () => {
  const prisma = new PrismaClient();
  try {
    const hash = await bcrypt.hash('andria999', 10);
    const u = await prisma.user.create({
      data: {
        username: 'andria',
        email: 'andria@smt.com',
        password: hash,
        fullName: 'Andria Test'
      }
    });
    console.log('created user id:', u.id);
  } catch (e) {
    console.error('create user error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();

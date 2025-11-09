const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

async function createTestUser() {
  const prisma = new PrismaClient();
  try {
    const hash = await bcrypt.hash('test123', 10);
    const user = await prisma.user.create({
      data: {
        username: 'testuser',
        email: 'test@example.com',
        password: hash,
        fullName: 'Test User',
        role: 'ADMIN_FISCAL',
        isActive: true
      }
    });
    console.log('Created test user:', user.id);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
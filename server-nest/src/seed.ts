import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 1) Create or upsert enterprises
  const enterprises = [
    {
      name: 'MerakiTeam',
      siret: 'MT-0001',
      city: 'Antananarivo',
      contactEmail: 'contact@merakiteam.mg',
      phone: '+261207000111',
    },
    {
      name: 'Beta SAS',
      siret: 'BETA-0002',
      city: 'Antsirabe',
      contactEmail: 'info@beta-sas.mg',
      phone: '+261207000222',
    },
    {
      name: 'ACME SARL',
      siret: 'ACME-0003',
      city: 'Toamasina',
      contactEmail: 'hello@acme.mg',
      phone: '+261207000333',
    },
  ];

  const entrepriseBySiret: Record<string, number> = {};
  for (const e of enterprises) {
    const up = await prisma.entreprise.upsert({
      where: { siret: e.siret },
      update: {
        name: e.name,
        city: e.city,
        contactEmail: e.contactEmail,
        phone: e.phone,
      },
      create: {
        name: e.name,
        siret: e.siret,
        city: e.city,
        contactEmail: e.contactEmail,
        phone: e.phone,
      },
    });
    entrepriseBySiret[e.siret] = up.id;
  }

  // 2) Users with realistic emails and mapping to enterprises for ENTREPRISE role
  type SeedUser = {
    username: string;
    email: string;
    fullName: string;
    role: Role;
    phone: string;
    avatar?: string;
    entrepriseSiret?: string;
  };

  const users: SeedUser[] = [
    {
      username: 'admin1',
      email: 'rivo.andrian@dgf.mg',
      fullName: 'Rivo Andrian',
      role: Role.ADMIN_FISCAL,
      phone: '+261320000003',
      avatar: '/sefo.jpg',
    },
    {
      username: 'agent1',
      email: 'mamy.haja@impots.mg',
      fullName: 'Mamy Haja',
      role: Role.AGENT_FISCAL,
      phone: '+261320000001',
      avatar: '/Jyeuhair.jpg',
    },
    {
      username: 'patterson',
      email: 'patterson.johnson@merakiteam.mg',
      fullName: 'Patterson Johnson',
      role: Role.ENTREPRISE,
      phone: '+261341112223',
      entrepriseSiret: 'MT-0001',
      avatar: '/fitiavana.jpg',
    },
    {
      username: 'claire',
      email: 'claire.beta@beta-sas.mg',
      fullName: 'Claire Beta',
      role: Role.ENTREPRISE,
      phone: '+261330000002',
      entrepriseSiret: 'BETA-0002',
      avatar: '/rijade.png',
    },
    {
      username: 'aina.admin',
      email: 'aina.randria@dgf.mg',
      fullName: 'Aina Randria',
      role: Role.ADMIN_FISCAL,
      phone: '+261341234567',
      avatar: '/tsiaro.png',
    },
  ];

  const hashedPassword = await bcrypt.hash('ChangeMe123!', 10);

  for (const u of users) {
    const entrepriseId = u.entrepriseSiret
      ? entrepriseBySiret[u.entrepriseSiret]
      : undefined;
    await prisma.user.upsert({
      where: { username: u.username },
      update: {
        email: u.email,
        fullName: u.fullName,
        phone: u.phone,
        avatar: u.avatar,
        role: u.role,
        isActive: true,
        entrepriseId: entrepriseId ?? null,
      },
      create: {
        username: u.username,
        email: u.email,
        password: hashedPassword,
        fullName: u.fullName,
        phone: u.phone,
        avatar: u.avatar,
        role: u.role,
        isActive: true,
        entrepriseId: entrepriseId ?? null,
      },
    });
  }

  // Print result counts
  const eCount = await prisma.entreprise.count();
  const uCount = await prisma.user.count();
  console.log(
    `Seeded ${eCount} enterprises and users. Total users in DB: ${uCount}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });

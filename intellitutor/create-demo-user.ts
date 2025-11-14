import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'demo@intellitutor.com' },
    update: {},
    create: {
      id: 'demo-user-id',
      email: 'demo@intellitutor.com',
      name: 'Demo User',
      password: 'demo-password-hash'
    }
  })

  console.log('Demo user created:', user)
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Failed to create demo user:', message)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

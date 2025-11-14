import 'dotenv/config'
import { PrismaClient } from '@/generated/prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
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
    console.log('✅ Demo user created:', user)
  } catch (error) {
    console.error('Error creating user:', error)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

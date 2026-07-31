import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Query logging is opt-in via PRISMA_LOG_QUERIES=1.
//
// It used to be on unconditionally, which meant every write echoed the whole
// serialised project — a real .fet import is ~570 KB — to stdout, and `bun run
// dev` pipes stdout through `tee dev.log`, so each one was also appended to
// disk. That is a lot of allocation and I/O per request for output nobody
// reads, and it grows with the size of the imported timetable.
const log: ('query' | 'warn' | 'error')[] =
  process.env.PRISMA_LOG_QUERIES === '1'
    ? ['query', 'warn', 'error']
    : ['warn', 'error']

export const db = globalForPrisma.prisma ?? new PrismaClient({ log })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

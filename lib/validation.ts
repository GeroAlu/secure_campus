import { z } from 'zod'

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().max(10000).default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
})

export const addStudentSchema = z.object({
  clerkId: z.string().min(1),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  email: z.string().email(),
})

export const chatMessageSchema = z.object({
  message: z.string().min(1).max(5000),
})

export const roleActionSchema = z.object({
  targetUserId: z.string().min(1),
  targetRole: z.string().min(1),
})

export const updateStudentDetailSchema = z.object({
  studentId: z.string().min(1),
  detail: z.string(),
})

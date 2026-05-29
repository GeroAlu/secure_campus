import { describe, it, expect } from 'vitest';
import {
  paginationSchema,
  addStudentSchema,
  chatMessageSchema,
  roleActionSchema,
} from '../../lib/validation';

describe('Validation Schemas', () => {
  describe('paginationSchema', () => {
    it('should validate and parse correct values', () => {
      const result = paginationSchema.safeParse({ page: 2, limit: 15 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(15);
      }
    });

    it('should set default values for empty fields', () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
      }
    });

    it('should coerce string numbers to numbers', () => {
      const result = paginationSchema.safeParse({ page: '5', limit: '20' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(5);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should reject invalid values', () => {
      const result1 = paginationSchema.safeParse({ page: -1 });
      expect(result1.success).toBe(false);

      const result2 = paginationSchema.safeParse({ limit: 150 }); // max 100
      expect(result2.success).toBe(false);

      const result3 = paginationSchema.safeParse({ page: 10001 }); // max 10000
      expect(result3.success).toBe(false);
    });
  });

  describe('addStudentSchema', () => {
    it('should validate valid student data', () => {
      const student = {
        clerkId: 'user_123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
      };
      const result = addStudentSchema.safeParse(student);
      expect(result.success).toBe(true);
    });

    it('should allow null for optional name fields', () => {
      const student = {
        clerkId: 'user_123',
        firstName: null,
        lastName: null,
        email: 'john.doe@example.com',
      };
      const result = addStudentSchema.safeParse(student);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email and empty clerkId', () => {
      const student1 = {
        clerkId: '',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
      };
      expect(addStudentSchema.safeParse(student1).success).toBe(false);

      const student2 = {
        clerkId: 'user_123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
      };
      expect(addStudentSchema.safeParse(student2).success).toBe(false);
    });
  });

  describe('chatMessageSchema', () => {
    it('should validate normal message', () => {
      const result = chatMessageSchema.safeParse({ message: 'Hello!' });
      expect(result.success).toBe(true);
    });

    it('should reject empty or overly long message', () => {
      expect(chatMessageSchema.safeParse({ message: '' }).success).toBe(false);
      expect(chatMessageSchema.safeParse({ message: 'a'.repeat(5001) }).success).toBe(false);
    });
  });

  describe('roleActionSchema', () => {
    it('should validate valid role action data', () => {
      const result = roleActionSchema.safeParse({
        targetUserId: 'user_123',
        targetRole: 'Admin',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty fields', () => {
      expect(roleActionSchema.safeParse({ targetUserId: '', targetRole: 'Admin' }).success).toBe(false);
      expect(roleActionSchema.safeParse({ targetUserId: 'user_123', targetRole: '' }).success).toBe(false);
    });
  });
});

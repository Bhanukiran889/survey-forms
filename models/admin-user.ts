import type { ObjectId } from 'mongodb';
export interface AdminUser { _id?: ObjectId; email: string; passwordHash: string; role: 'admin'; createdAt: Date; updatedAt: Date; lastLoginAt?: Date; active: boolean; }
export interface AdminSession { _id?: ObjectId; tokenHash: string; adminId: ObjectId; createdAt: Date; expiresAt: Date; }

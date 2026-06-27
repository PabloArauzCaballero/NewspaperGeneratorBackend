import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(180),
  email: z.string().trim().email().max(220).transform((value) => value.toLowerCase()),
  password: z.string().min(10).max(120)
});

export type RegisterDto = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email().max(220).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(120)
});

export type LoginDto = z.infer<typeof loginSchema>;


export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(40).max(300)
});
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;

export const logoutSchema = refreshTokenSchema;
export type LogoutDto = RefreshTokenDto;

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().email().max(220).transform((value) => value.toLowerCase())
});
export type RequestPasswordResetDto = z.infer<typeof requestPasswordResetSchema>;

export const resetPasswordSchema = z.object({
  resetToken: z.string().min(40).max(300),
  newPassword: z.string().min(10).max(120)
});
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;

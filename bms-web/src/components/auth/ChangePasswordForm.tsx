'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Shield, Eye, EyeOff, Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  changePasswordSchema, 
  ChangePasswordFormData, 
  checkPasswordStrength, 
  getPasswordStrengthLevel,
  defaultChangePasswordValues 
} from '@/lib/validations/password';

interface ChangePasswordFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const ChangePasswordForm: React.FC<ChangePasswordFormProps> = ({ onSuccess, onError }) => {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: defaultChangePasswordValues,
    mode: 'onChange',
  });

  const watchedNewPassword = watch('newPassword');
  const watchedConfirmPassword = watch('confirmPassword');

  // Real-time password strength validation
  const passwordStrength = watchedNewPassword ? checkPasswordStrength(watchedNewPassword) : {
    score: 0,
    feedback: [],
    isValid: false,
  };

  const strengthLevel = getPasswordStrengthLevel(passwordStrength.score);

  // Password match validation
  const passwordsMatch = watchedNewPassword && watchedConfirmPassword && 
    watchedNewPassword === watchedConfirmPassword;
  const confirmPasswordError = watchedConfirmPassword && !passwordsMatch;

  const onSubmit = async (data: ChangePasswordFormData) => {
    if (!passwordStrength.isValid) {
      toast.error("Password Too Weak", {
        description: "Please create a stronger password.",
      });
      return;
    }

    if (confirmPasswordError) {
      toast.error("Password Mismatch", {
        description: "New password and confirmation do not match.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Success", {
          description: "Your password has been changed successfully.",
        });
        reset();
        onSuccess?.();
      } else {
        throw new Error(result.error || 'Failed to change password');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error("Error", {
        description: errorMessage,
      });
      onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStrengthColor = (level: string) => {
    switch (level) {
      case 'weak': return 'bg-red-500';
      case 'fair': return 'bg-orange-500';
      case 'good': return 'bg-yellow-500';
      case 'strong': return 'bg-green-500';
      default: return 'bg-gray-300';
    }
  };

  const getStrengthText = (level: string) => {
    switch (level) {
      case 'weak': return 'Weak';
      case 'fair': return 'Fair';
      case 'good': return 'Good';
      case 'strong': return 'Strong';
      default: return 'Too Short';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Ubah Kata Sandi
        </CardTitle>
        <CardDescription>
          Ubah kata sandi akun Anda untuk menjaga keamanan
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Kata Sandi Saat Ini</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                placeholder="Masukkan kata sandi saat ini"
                className="pr-10"
                {...register('currentPassword')}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-500" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-500" />
                )}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="text-sm text-red-600">{errors.currentPassword.message}</p>
            )}
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">Kata Sandi Baru</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Masukkan kata sandi baru"
                className="pr-10"
                {...register('newPassword')}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-500" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-500" />
                )}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-sm text-red-600">{errors.newPassword.message}</p>
            )}
          </div>

          {/* Password Strength Indicator */}
          {watchedNewPassword && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-gray-600">Kekuatan Kata Sandi</Label>
                <span className={`text-sm font-medium ${
                  strengthLevel === 'weak' ? 'text-red-600' :
                  strengthLevel === 'fair' ? 'text-orange-600' :
                  strengthLevel === 'good' ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {getStrengthText(strengthLevel)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(strengthLevel)}`}
                  style={{ width: `${passwordStrength.score}%` }}
                ></div>
              </div>
              {passwordStrength.feedback.length > 0 && (
                <div className="space-y-1">
                  {passwordStrength.feedback.map((feedback, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                      <X className="h-3 w-3 text-red-500" />
                      {feedback}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Konfirmasi Kata Sandi Baru</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Konfirmasi kata sandi baru"
                className="pr-10"
                {...register('confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-500" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-500" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
            {confirmPasswordError && (
              <p className="text-sm text-red-600">Kata sandi baru dan konfirmasi tidak cocok</p>
            )}
            {passwordsMatch && watchedNewPassword && watchedConfirmPassword && (
              <p className="text-sm text-green-600 flex items-center gap-2">
                <Check className="h-3 w-3" />
                Kata sandi cocok
              </p>
            )}
          </div>

          <Separator />

          {/* Password Requirements */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Persyaratan Kata Sandi:</Label>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Check className={`h-3 w-3 ${watchedNewPassword?.length >= 8 ? 'text-green-500' : 'text-gray-400'}`} />
                Minimal 8 karakter
              </div>
              <div className="flex items-center gap-2">
                <Check className={`h-3 w-3 ${/[A-Z]/.test(watchedNewPassword || '') ? 'text-green-500' : 'text-gray-400'}`} />
                Satu huruf besar
              </div>
              <div className="flex items-center gap-2">
                <Check className={`h-3 w-3 ${/[a-z]/.test(watchedNewPassword || '') ? 'text-green-500' : 'text-gray-400'}`} />
                Satu huruf kecil
              </div>
              <div className="flex items-center gap-2">
                <Check className={`h-3 w-3 ${/\d/.test(watchedNewPassword || '') ? 'text-green-500' : 'text-gray-400'}`} />
                Satu angka
              </div>
              <div className="flex items-center gap-2">
                <Check className={`h-3 w-3 ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(watchedNewPassword || '') ? 'text-green-500' : 'text-gray-400'}`} />
                Satu karakter khusus
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => reset()}
              disabled={isSubmitting}
            >
              Reset
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !passwordStrength.isValid || !!confirmPasswordError}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Mengubah...
                </>
              ) : (
                'Ubah Kata Sandi'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ChangePasswordForm;
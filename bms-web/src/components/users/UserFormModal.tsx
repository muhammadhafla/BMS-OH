'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiService } from '@/services/api';

interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF';
  branchId?: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF';
  branchId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  branch?: {
    id: string;
    name: string;
  };
}

interface Branch {
  id: string;
  name: string;
}

interface UserFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  user?: User | null;
  mode: 'create' | 'edit';
}

export function UserFormModal({ open, onOpenChange, onSuccess, user, mode }: UserFormModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);

  const form = useForm<UserFormData>({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'STAFF',
      branchId: '',
    },
  });

  // Load branches on component mount
  useEffect(() => {
    const loadBranches = async () => {
      try {
        const response = await apiService.getBranches();
        setBranches(response.data?.items || []);
      } catch (error) {
        console.error('Error loading branches:', error);
        // Set empty branches if API fails
        setBranches([]);
      }
    };

    if (open) {
      loadBranches();
    }
  }, [open]);

  // Set form values when user prop changes
  useEffect(() => {
    if (user && mode === 'edit') {
      form.reset({
        name: user.name,
        email: user.email,
        password: '', // Don't prefill password for security
        role: user.role,
        branchId: user.branchId || '',
      });
    } else {
      form.reset({
        name: '',
        email: '',
        password: '',
        role: 'STAFF',
        branchId: '',
      });
    }
  }, [user, mode, form]);

  const onSubmit = async (data: UserFormData) => {
    setIsLoading(true);
    try {
      if (mode === 'create') {
        // Only include password if it's not empty for create mode
        const submitData = {
          ...data,
          password: data.password || undefined,
        };
        const response = await apiService.createUser(submitData);
        
        if (response.success) {
          toast.success('User created successfully', {
            description: `${data.name} has been added to the system.`,
          });
        } else {
          throw new Error(response.message || 'Failed to create user');
        }
      } else {
        // For edit mode, only include non-empty fields
        const submitData = {
          ...data,
          password: data.password || undefined,
        };
        const response = await apiService.updateUser(user!.id, submitData);
        
        if (response.success) {
          toast.success('User updated successfully', {
            description: `${data.name} information has been updated.`,
          });
        } else {
          throw new Error(response.message || 'Failed to update user');
        }
      }

      onOpenChange(false);
      onSuccess();
      form.reset();
    } catch (error: any) {
      toast.error(`Failed to ${mode} user`, {
        description: error.response?.data?.message || error.message || 'An error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false);
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Add New User' : 'Edit User'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Create a new user account with appropriate role and permissions.'
              : 'Update user information, role, and permissions.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              rules={{ required: 'Name is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              rules={{
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="Enter email address" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              rules={{
                required: mode === 'create' ? 'Password is required' : false,
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters',
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Password {mode === 'edit' && '(Leave empty to keep current)'}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder={mode === 'create' ? "Enter password" : "Enter new password"}
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    {mode === 'create' 
                      ? 'Password must be at least 6 characters long'
                      : 'Leave blank to keep current password'
                    }
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              rules={{ required: 'Role is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || 'STAFF'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select user role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ADMIN">Administrator</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                      <SelectItem value="STAFF">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="branchId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || 'none'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No Branch</SelectItem>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Assign user to a specific branch (optional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading 
                  ? (mode === 'create' ? 'Creating...' : 'Updating...') 
                  : (mode === 'create' ? 'Create User' : 'Update User')
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
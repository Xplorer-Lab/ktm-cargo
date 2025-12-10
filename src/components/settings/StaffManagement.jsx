import React, { useState } from 'react';
import { db } from '@/api/db';
import { sendMessengerNotification } from '@/api/integrations';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  Crown,
  TrendingUp,
  Building2,
  Search,
  Filter,
  MoreVertical,
  Send,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ROLE_LABELS, ROLE_COLORS, ROLES } from '@/components/auth/RolePermissions';
import { AuditActions } from '@/components/audit/AuditService';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const staffFormSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  staff_role: z.string().min(1, 'Role is required'),
  department: z.string().optional(),
});

const roleOptions = [
  { value: 'finance_lead', label: 'Finance Lead', description: 'Financial operations & reporting', icon: TrendingUp, color: 'from-emerald-500 to-teal-600' },
  { value: 'marketing_manager', label: 'Marketing Manager', description: 'Customer relations & campaigns', icon: Users, color: 'from-blue-500 to-indigo-600' },
];

export default function StaffManagement() {
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['all-profiles'],
    queryFn: () => db.profiles.list(),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => db.profiles.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] });
      toast.success('User updated successfully');
    },
    onError: () => toast.error('Failed to update user'),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id) => db.profiles.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] });
      setUserToDelete(null);
      toast.success('User deleted successfully');
    },
    onError: () => toast.error('Failed to delete user'),
  });

  const handleUpdateRole = (userId, newRole) => {
    const user = users.find((u) => u.id === userId);
    const previousRole = user?.staff_role;
    updateUserMutation.mutate({ id: userId, data: { staff_role: newRole } });
    AuditActions.userRoleChanged(userId, user?.full_name, previousRole, newRole);
  };

  const handleToggleActive = (targetUser) => {
    const newStatus = targetUser.is_active === false ? true : false;
    updateUserMutation.mutate({
      id: targetUser.id,
      data: { is_active: newStatus },
    });
    if (!newStatus) {
      AuditActions.userDeactivated(targetUser.id, targetUser.full_name);
    }
  };

  const handleDeleteUser = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
      AuditActions.userDeleted(userToDelete.id, userToDelete.full_name);
    }
  };

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      !searchTerm ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.staff_role === filterRole || (filterRole === 'admin' && user.role === 'admin');
    return matchesSearch && matchesRole;
  });

  const staffUsers = users.filter((u) => u.role !== 'admin');
  const adminUsers = users.filter((u) => u.role === 'admin');

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{adminUsers.length}</p>
                <p className="text-xs text-purple-100">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {users.filter((u) => u.staff_role === 'finance_lead').length}
                </p>
                <p className="text-xs text-emerald-100">Finance</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {users.filter((u) => u.staff_role === 'marketing_manager').length}
                </p>
                <p className="text-xs text-blue-100">Marketing</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-600 to-slate-800 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-xs text-slate-300">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff List */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-t-lg">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Staff Members
            </CardTitle>
            <CardDescription>Manage team access and roles</CardDescription>
          </div>
          <Button
            onClick={() => setShowInviteForm(true)}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Staff
          </Button>
        </CardHeader>
        <CardContent className="p-4">
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full sm:w-48 h-11">
                <Filter className="w-4 h-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="finance_lead">Finance Lead</SelectItem>
                <SelectItem value="marketing_manager">Marketing Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="space-y-3">
              {filteredUsers.map((user) => {
                const roleColor =
                  user.role === 'admin'
                    ? 'bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 dark:from-purple-900/50 dark:to-indigo-900/50 dark:text-purple-300'
                    : ROLE_COLORS[user.staff_role] || 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
                const roleLabel =
                  user.role === 'admin'
                    ? 'Managing Director'
                    : ROLE_LABELS[user.staff_role] || 'Staff';

                return (
                  <div
                    key={user.id}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl border transition-all hover:shadow-md group",
                      user.is_active === false
                        ? 'bg-slate-50 dark:bg-slate-800/50 opacity-60 border-slate-200 dark:border-slate-700'
                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center text-lg font-semibold transition-transform group-hover:scale-105",
                        user.role === 'admin'
                          ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white'
                          : 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 text-slate-600 dark:text-slate-300'
                      )}>
                        {user.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {user.full_name || 'No Name'}
                          </p>
                          <Badge className={cn("font-medium", roleColor)}>
                            {user.role === 'admin' && <Crown className="w-3 h-3 mr-1" />}
                            {roleLabel}
                          </Badge>
                          {user.is_active === false && (
                            <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {user.role !== 'admin' && (
                        <>
                          <Select
                            value={user.staff_role || 'marketing_manager'}
                            onValueChange={(v) => handleUpdateRole(user.id, v)}
                          >
                            <SelectTrigger className="w-36 h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="finance_lead">
                                <div className="flex items-center gap-2">
                                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                                  Finance Lead
                                </div>
                              </SelectItem>
                              <SelectItem value="marketing_manager">
                                <div className="flex items-center gap-2">
                                  <Users className="w-3 h-3 text-blue-500" />
                                  Marketing
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleToggleActive(user)}
                            title={user.is_active === false ? 'Activate' : 'Deactivate'}
                            className={cn(
                              "transition-colors",
                              user.is_active === false
                                ? "hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                                : "hover:bg-amber-50 dark:hover:bg-amber-900/30"
                            )}
                          >
                            {user.is_active === false ? (
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-amber-600" />
                            )}
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                            onClick={() => setUserToDelete(user)}
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full inline-block mb-4">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 mb-4">
                {searchTerm || filterRole !== 'all' ? 'No users match your filters' : 'No staff members yet'}
              </p>
              <Button onClick={() => setShowInviteForm(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Invite First Staff
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={showInviteForm} onOpenChange={setShowInviteForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              Invite New Staff
            </DialogTitle>
            <DialogDescription>
              Send an invitation to add a new team member
            </DialogDescription>
          </DialogHeader>
          <InviteForm
            onSubmit={async (data) => {
              try {
                await sendMessengerNotification({
                  to: data.email,
                  message: `Welcome to BKK-YGN Cargo Portal\n\nHello ${data.full_name},\nYou have been invited to join as ${ROLE_LABELS[data.staff_role]}.`,
                  platform: 'Telegram'
                });
                AuditActions.userInvited(data.email, data.full_name, data.staff_role);
                toast.success(`Invitation sent to ${data.email}`);
                setShowInviteForm(false);
              } catch (error) {
                toast.error('Failed to send invitation');
              }
            }}
            onCancel={() => setShowInviteForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user account for "
              {userToDelete?.full_name}" ({userToDelete?.email}) and remove their access to the system. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InviteForm({ onSubmit, onCancel }) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      full_name: '',
      email: '',
      staff_role: 'marketing_manager',
      department: '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-4">
      <div className="space-y-2">
        <Label>Full Name <span className="text-rose-500">*</span></Label>
        <Input
          {...register('full_name')}
          placeholder="John Doe"
          className={cn("h-11", errors.full_name && "border-rose-500")}
        />
        {errors.full_name && (
          <p className="text-xs text-rose-500 flex items-center gap-1">
            <Info className="w-3 h-3" />
            {errors.full_name.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Email Address <span className="text-rose-500">*</span></Label>
        <Input
          type="email"
          {...register('email')}
          placeholder="john@company.com"
          className={cn("h-11", errors.email && "border-rose-500")}
        />
        {errors.email && (
          <p className="text-xs text-rose-500 flex items-center gap-1">
            <Info className="w-3 h-3" />
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <Label>Role <span className="text-rose-500">*</span></Label>
        <div className="grid grid-cols-1 gap-3">
          {roleOptions.map((role) => {
            const Icon = role.icon;
            return (
              <label
                key={role.value}
                className="flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-all has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-950/30"
              >
                <input
                  type="radio"
                  {...register('staff_role')}
                  value={role.value}
                  className="sr-only"
                />
                <div className={cn("p-2.5 rounded-xl bg-gradient-to-br text-white", role.color)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 dark:text-white">{role.label}</p>
                  <p className="text-sm text-slate-500">{role.description}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Department (Optional)</Label>
        <Input
          {...register('department')}
          placeholder="e.g. Operations"
          className="h-11"
        />
      </div>

      <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-200">Invitation Email</p>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              An invitation will be sent to the staff member with login instructions
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send Invitation
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

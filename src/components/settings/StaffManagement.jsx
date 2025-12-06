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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { ROLE_LABELS, ROLE_COLORS, ROLES } from '@/components/auth/RolePermissions';
import { AuditActions } from '@/components/audit/AuditService';

export default function StaffManagement() {
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [inviteData, setInviteData] = useState({
    email: '',
    full_name: '',
    staff_role: 'marketing_manager',
    department: '',
  });

  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => db.users.list(),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => db.users.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      setEditingUser(null);
      toast.success('User updated');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id) => db.users.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      setUserToDelete(null);
      toast.success('User deleted successfully');
    },
  });

  const handleInvite = async () => {
    if (!inviteData.email || !inviteData.full_name) {
      toast.error('Please fill in email and name');
      return;
    }

    try {
      // Send invitation email
      await sendMessengerNotification({
        to: inviteData.email,
        message: `Welcome to BKK-YGN Cargo Portal\n\nHello ${inviteData.full_name},\nYou have been invited to join as ${ROLE_LABELS[inviteData.staff_role]}.\nPlease contact admin to setup account.`,
        platform: 'Telegram'
      });

      // Audit log
      AuditActions.userInvited(inviteData.email, inviteData.full_name, inviteData.staff_role);

      toast.success(`Invitation sent to ${inviteData.email}`);
      setShowInviteForm(false);
      setInviteData({ email: '', full_name: '', staff_role: 'marketing_manager', department: '' });
    } catch (error) {
      toast.error('Failed to send invitation');
    }
  };

  const handleUpdateRole = (userId, newRole) => {
    const user = users.find((u) => u.id === userId);
    const previousRole = user?.staff_role;
    updateUserMutation.mutate({ id: userId, data: { staff_role: newRole } });
    AuditActions.userRoleChanged(userId, user?.full_name, previousRole, newRole);
  };

  const handleToggleActive = (targetUser) => {
    updateUserMutation.mutate({
      id: targetUser.id,
      data: { is_active: !targetUser.is_active },
    });
    if (targetUser.is_active !== false) {
      AuditActions.userDeactivated(targetUser.id, targetUser.full_name);
    }
  };

  const handleDeleteUser = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
      AuditActions.userDeleted(userToDelete.id, userToDelete.full_name);
    }
  };

  const staffUsers = users.filter((u) => u.role !== 'admin');
  const adminUsers = users.filter((u) => u.role === 'admin');

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{adminUsers.length}</p>
                <p className="text-xs text-slate-500">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {users.filter((u) => u.staff_role === 'finance_lead').length}
                </p>
                <p className="text-xs text-slate-500">Finance</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {users.filter((u) => u.staff_role === 'marketing_manager').length}
                </p>
                <p className="text-xs text-slate-500">Marketing</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Users className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-xs text-slate-500">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff List */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Staff Members
            </CardTitle>
            <CardDescription>Manage team access and roles</CardDescription>
          </div>
          <Button onClick={() => setShowInviteForm(true)} className="bg-blue-600 hover:bg-blue-700">
            <UserPlus className="w-4 h-4 mr-2" /> Invite Staff
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : users.length > 0 ? (
            <div className="space-y-3">
              {users.map((user) => {
                const roleColor =
                  user.role === 'admin'
                    ? 'bg-purple-100 text-purple-800'
                    : ROLE_COLORS[user.staff_role] || 'bg-slate-100 text-slate-800';
                const roleLabel =
                  user.role === 'admin'
                    ? 'Managing Director'
                    : ROLE_LABELS[user.staff_role] || 'Staff';

                return (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${user.is_active === false ? 'bg-slate-50 opacity-60' : 'bg-white'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                        <span className="font-medium text-slate-600">
                          {user.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{user.full_name || 'No Name'}</p>
                          <Badge className={roleColor}>{roleLabel}</Badge>
                          {user.is_active === false && (
                            <Badge className="bg-rose-100 text-rose-800">Inactive</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.role !== 'admin' && (
                        <>
                          <Select
                            value={user.staff_role || 'marketing_manager'}
                            onValueChange={(v) => handleUpdateRole(user.id, v)}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="finance_lead">Finance Lead</SelectItem>
                              <SelectItem value="marketing_manager">Marketing Manager</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleActive(user)}
                            title={user.is_active === false ? 'Activate' : 'Deactivate'}
                          >
                            {user.is_active === false ? (
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-600" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
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
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No staff members yet</p>
              <Button className="mt-4" onClick={() => setShowInviteForm(true)}>
                <UserPlus className="w-4 h-4 mr-2" /> Invite First Staff
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={showInviteForm} onOpenChange={setShowInviteForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              Invite New Staff
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={inviteData.full_name}
                onChange={(e) => setInviteData({ ...inviteData, full_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                value={inviteData.email}
                onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                placeholder="john@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={inviteData.staff_role}
                onValueChange={(v) => setInviteData({ ...inviteData, staff_role: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="finance_lead">Finance Lead</SelectItem>
                  <SelectItem value="marketing_manager">Marketing Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department (Optional)</Label>
              <Input
                value={inviteData.department}
                onChange={(e) => setInviteData({ ...inviteData, department: e.target.value })}
                placeholder="Operations"
              />
            </div>

            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              <Mail className="w-4 h-4 inline mr-2" />
              An invitation email will be sent to the staff member
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowInviteForm(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleInvite} className="flex-1 bg-blue-600 hover:bg-blue-700">
                <Mail className="w-4 h-4 mr-2" />
                Send Invitation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account for "
              {userToDelete?.full_name}" and remove their access to the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

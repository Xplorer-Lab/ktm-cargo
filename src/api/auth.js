import { supabase } from './supabaseClient';

export const auth = {
  isAuthenticated: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return !!session;
  },

  me: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    // Fetch profile data - only select needed columns for performance
    let { data: profile } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, staff_role, created_date, updated_date')
      .eq('id', user.id)
      .single();

    // If profile doesn't exist, create it (Self-healing for new sign-ups)
    if (!profile) {
      const newProfile = {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        role: 'customer',
        staff_role: null, // Customers have no staff role; must be explicitly promoted by admin
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
      };

      const { data: created, error } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select()
        .single();

      if (error) {
        // Do not silently fallback to a customer profile — fail explicitly so
        // callers can handle the unauthenticated state safely.
        throw new Error(`Profile creation failed: ${error.message}`);
      }
      profile = created;
    }

    return {
      ...user,
      ...profile,
      // Map Supabase user fields to expected app fields
      email: user.email,
      id: user.id,
      // Preserve actual roles from profile; default to customer (safe)
      staff_role: profile?.staff_role || null,
      role: profile?.role || 'customer',
    };
  },

  /**
   * Update current user's profile. Only allowed fields are written (mass-assignment safe).
   * Used by Settings (profile, notification_settings, business_settings) and NotificationPreferences.
   */
  updateMe: async (data) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const allowed = [
      'full_name',
      'phone',
      'company_name',
      'default_currency',
      'timezone',
      'notification_settings',
      'notification_preferences',
      'business_settings',
    ];
    const payload = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        payload[key] = data[key];
      }
    }
    if (Object.keys(payload).length === 0)
      return (await supabase.from('profiles').select('*').eq('id', user.id).single()).data;

    payload.updated_date = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw error;
    return updated;
  },

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  },

  logout: async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  },

  redirectToLogin: (redirectUrl) => {
    window.location.href = '/ClientPortal';
  },
};

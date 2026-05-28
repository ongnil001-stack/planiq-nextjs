import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // 1. Verify the requesting user via their session
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!user || authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // 2. Admin client (service role) — needed to delete auth user
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.error('[delete-account] SUPABASE_SERVICE_ROLE_KEY not set');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const admin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 3. Delete user data (order matters — FK constraints)
    await admin.from('feedback').delete().eq('user_id', userId);
    await admin.from('schedules').delete().eq('user_id', userId);

    // 4. Delete avatar from storage (best-effort)
    await admin.storage.from('avatars').remove([`${userId}/avatar`]);

    // 5. Delete profile row
    await admin.from('profiles').delete().eq('id', userId);

    // 6. Delete the auth user — this is irreversible
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('[delete-account] deleteUser error:', deleteError.message);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[delete-account] unexpected error:', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

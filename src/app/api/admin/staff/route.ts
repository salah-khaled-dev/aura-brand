import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Creates a real Supabase Auth user (`auth.users`) plus its `profiles` row for a
 * staff member added from the admin dashboard's Users page, so staff created
 * here can immediately sign in via `AuthService.signInWithPassword`.
 *
 * Gated to an authenticated, active `super_admin` — mirrors the `profiles_insert_super_admin`
 * RLS policy, since this route uses the service-role key and bypasses RLS entirely.
 */

/** Lists admin/super_admin staff — any active admin can view the directory (mirrors `profiles_select_admin`). */
export async function GET() {
  const caller = await createServerClient();
  const {
    data: { user: callerUser },
  } = await caller.auth.getUser();

  if (!callerUser) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  const { data: callerProfile } = await caller
    .from('profiles')
    .select('role, is_active')
    .eq('id', callerUser.id)
    .single();

  if (!callerProfile || !callerProfile.is_active || (callerProfile.role !== 'admin' && callerProfile.role !== 'super_admin')) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  }

  const { data, error } = await caller
    .from('profiles')
    .select('*')
    .in('role', ['admin', 'super_admin'])
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ staff: data });
}

export async function POST(request: Request) {
  const caller = await createServerClient();
  const {
    data: { user: callerUser },
  } = await caller.auth.getUser();

  if (!callerUser) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  const { data: callerProfile } = await caller
    .from('profiles')
    .select('role, is_active')
    .eq('id', callerUser.id)
    .single();

  if (!callerProfile || !callerProfile.is_active || callerProfile.role !== 'super_admin') {
    return NextResponse.json({ error: 'غير مصرح لك بإنشاء مستخدمين' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const email = body?.email?.trim();
  const password = body?.password;
  const full_name = body?.full_name?.trim();
  const username = body?.username?.trim() || null;
  const phone = body?.phone || null;
  const avatar_url = body?.avatar_url || null;
  const staff_role_key = body?.staff_role_key || null;
  const is_active = body?.is_active ?? true;

  if (!email || !password || !full_name) {
    return NextResponse.json(
      { error: 'بيانات ناقصة: البريد الإلكتروني وكلمة المرور والاسم مطلوبة' },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: 'admin',
      full_name,
    },
  });

  if (authError || !authData?.user) {
    console.error('Auth user creation failed:', authError?.message);
    return NextResponse.json(
      { error: authError?.message ?? 'فشل إنشاء المستخدم في نظام المصادقة' },
      { status: 400 }
    );
  }

  const authUser = authData.user;

  // `handle_new_user` (see supabase/migrations/20260714120002_profiles.sql) already
  // inserted a bare profile row (id, email, full_name) via an `auth.users` trigger,
  // so this is an update-by-upsert, not a fresh insert.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: authUser.id,
        email,
        full_name,
        username,
        phone,
        avatar_url,
        role: 'admin',
        staff_role_key,
        is_active,
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (profileError || !profile) {
    console.error('Profile creation failed, rolling back auth user:', profileError?.message);
    const { error: deleteError } = await supabase.auth.admin.deleteUser(authUser.id);
    if (deleteError) {
      console.error('Rollback failed — orphaned auth user left in auth.users:', authUser.id, deleteError.message);
    }
    return NextResponse.json(
      { error: profileError?.message ?? 'فشل إنشاء الملف الشخصي' },
      { status: 500 }
    );
  }

  return NextResponse.json({ user: { id: authUser.id, email: authUser.email }, profile });
}

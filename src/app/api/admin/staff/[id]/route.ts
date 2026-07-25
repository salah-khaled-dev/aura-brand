import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/** Verifies the caller is an authenticated, active `super_admin` — same gate as `POST /api/admin/staff`. */
async function requireSuperAdmin() {
  const caller = await createServerClient();
  const {
    data: { user: callerUser },
  } = await caller.auth.getUser();

  if (!callerUser) {
    return { ok: false as const, response: NextResponse.json({ error: 'غير مصرح' }, { status: 401 }) };
  }

  const { data: callerProfile } = await caller
    .from('profiles')
    .select('role, is_active')
    .eq('id', callerUser.id)
    .single();

  if (!callerProfile || !callerProfile.is_active || callerProfile.role !== 'super_admin') {
    return { ok: false as const, response: NextResponse.json({ error: 'غير مصرح لك بهذا الإجراء' }, { status: 403 }) };
  }

  return { ok: true as const, callerId: callerUser.id };
}

/** Admin password reset — no current-password check, mirrors `UsersService.setPassword`. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const password = body?.password;
  if (!password || typeof password !== 'string' || password.length < 6) {
    return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(id, { password });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

/** Deletes the Supabase Auth user — cascades the `profiles` row via `profiles.id references auth.users(id) on delete cascade`. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: target } = await supabase.from('profiles').select('role').eq('id', id).single();
  if (target?.role === 'super_admin') {
    return NextResponse.json({ error: 'Cannot delete the super admin' }, { status: 400 });
  }

  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function seedSupabaseDatabase(_force = false): Promise<{ success: boolean; message: string; seededCount: number }> {
  return {
    success: true,
    message: 'Using live Supabase data',
    seededCount: 0,
  }
}

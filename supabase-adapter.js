/*
 * LabTrack Supabase adapter boundary
 *
 * The UI currently runs in mock mode so it can be previewed without credentials.
 * Replace the methods below with Supabase Auth + PostgREST calls when the backend is ready.
 * Keep the same return shapes so the UI does not need to change.
 */

export const supabaseConfig = {
  mode: 'mock',
  url: window.__LABTRACK_SUPABASE_URL__ || '',
  anonKey: window.__LABTRACK_SUPABASE_ANON_KEY__ || '',
};

export const supabaseAdapter = {
  async signIn({ email }) {
    return { data: { user: { email } }, error: null };
  },
  async signUp({ email }) {
    return { data: { user: { email } }, error: null };
  },
  async signOut() {
    return { error: null };
  },
  async listEquipment(filters = {}) {
    return { data: [], error: null, filters };
  },
  async createBorrowRequest(payload) {
    return { data: payload, error: null };
  },
  async updateBorrowRequest(id, patch) {
    return { data: { id, ...patch }, error: null };
  },
  async updateEquipment(id, patch) {
    return { data: { id, ...patch }, error: null };
  },
};

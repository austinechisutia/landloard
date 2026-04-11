'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Modal from '@/components/Modal';

interface House {
  id: number;
  unit_number: string;
  house_type: string;
  status: string;
}

interface Tenant {
  id: number;
  name: string;
  phone: string;
  house_id: number;
  unit_number: string;
  house_type: string;
  rent_amount: number;
  move_in_date: string;
}

const blank = { name: '', phone: '', house_id: '', move_in_date: '' };

export default function TenantsPage() {
  const [tenants,    setTenants]    = useState<Tenant[]>([]);
  const [houses,     setHouses]     = useState<House[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [editing,    setEditing]    = useState<Tenant | null>(null);
  const [form,       setForm]       = useState<typeof blank>(blank);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId,   setDeleteId]   = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([api.get<Tenant[]>('/tenants'), api.get<House[]>('/houses')])
      .then(([t, h]) => { setTenants(t); setHouses(h); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(blank);
    setShowModal(true);
  };

  const openEdit = (t: Tenant) => {
    setEditing(t);
    setForm({
      name:         t.name,
      phone:        t.phone,
      house_id:     String(t.house_id),
      move_in_date: t.move_in_date?.split('T')[0] || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form, house_id: parseInt(form.house_id) };
      if (editing) await api.put(`/tenants/${editing.id}`, payload);
      else         await api.post('/tenants', payload);
      setShowModal(false);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error saving tenant');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/tenants/${id}`);
      setDeleteId(null);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deleting tenant');
    }
  };

  const field = (key: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  // When editing, include the tenant's current house even if occupied
  const availableHouses = editing
    ? houses.filter(h => h.status === 'vacant' || h.id === editing.house_id)
    : houses.filter(h => h.status === 'vacant');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tenants.length} tenant{tenants.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={openAdd}
          className="bg-indigo-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          + Add Tenant
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-400">Loading…</div>
        ) : tenants.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">No tenants yet. Add your first tenant.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Name</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Phone</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">House</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Rent</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Move-in</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tenants.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3.5 font-medium text-gray-900">{t.name}</td>
                    <td className="px-6 py-3.5 text-gray-600">{t.phone}</td>
                    <td className="px-6 py-3.5 text-gray-600">{t.unit_number} — {t.house_type}</td>
                    <td className="px-6 py-3.5 text-right text-gray-700">
                      KSh {parseFloat(String(t.rent_amount)).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-gray-600">
                      {new Date(t.move_in_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3.5 text-right space-x-3">
                      <button onClick={() => openEdit(t)} className="text-indigo-600 hover:text-indigo-800 font-medium">Edit</button>
                      <button onClick={() => setDeleteId(t.id)} className="text-red-500 hover:text-red-700 font-medium">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Tenant' : 'Add Tenant'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text" value={form.name} onChange={field('name')} placeholder="e.g. John Mwangi"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel" value={form.phone} onChange={field('phone')} placeholder="e.g. 0712345678"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign House</label>
              <select
                value={form.house_id} onChange={field('house_id')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Select a house…</option>
                {availableHouses.map(h => (
                  <option key={h.id} value={h.id}>{h.unit_number} — {h.house_type}</option>
                ))}
              </select>
              {!editing && availableHouses.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">No vacant houses available. Add a house first.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Move-in Date</label>
              <input
                type="date" value={form.move_in_date} onChange={field('move_in_date')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium">
                {submitting ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteId !== null && (
        <Modal title="Delete Tenant" onClose={() => setDeleteId(null)}>
          <p className="text-sm text-gray-600 mb-6">
            Are you sure? The tenant will be removed and their house marked as vacant.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteId(null)}
              className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={() => handleDelete(deleteId)}
              className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm hover:bg-red-700 transition-colors font-medium">
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

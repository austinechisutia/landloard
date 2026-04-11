'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Modal from '@/components/Modal';

interface House {
  id: number;
  unit_number: string;
  house_type: string;
  rent_amount: number;
  status: 'occupied' | 'vacant';
}

const HOUSE_TYPES = ['Single Room', 'Bedsitter', 'Studio', '1 Bedroom', '2 Bedroom', '3 Bedroom'];

const blank = { unit_number: '', house_type: HOUSE_TYPES[0], rent_amount: '', status: 'vacant' };

export default function HousesPage() {
  const [houses,     setHouses]     = useState<House[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [editing,    setEditing]    = useState<House | null>(null);
  const [form,       setForm]       = useState<typeof blank>(blank);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId,   setDeleteId]   = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    api.get<House[]>('/houses').then(setHouses).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(blank);
    setShowModal(true);
  };

  const openEdit = (h: House) => {
    setEditing(h);
    setForm({
      unit_number: h.unit_number,
      house_type:  h.house_type,
      rent_amount: String(h.rent_amount),
      status:      h.status,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form, rent_amount: parseFloat(form.rent_amount) };
      if (editing) await api.put(`/houses/${editing.id}`, payload);
      else         await api.post('/houses', payload);
      setShowModal(false);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error saving house');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/houses/${id}`);
      setDeleteId(null);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deleting house');
    }
  };

  const field = (key: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Houses</h1>
          <p className="text-sm text-gray-500 mt-0.5">{houses.length} unit{houses.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={openAdd}
          className="bg-indigo-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          + Add House
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-400">Loading…</div>
        ) : houses.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">No houses yet. Add your first unit.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Unit</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Type</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Rent (KSh)</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Status</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {houses.map(h => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3.5 font-semibold text-gray-900">{h.unit_number}</td>
                    <td className="px-6 py-3.5 text-gray-600">{h.house_type}</td>
                    <td className="px-6 py-3.5 text-right text-gray-700">
                      {parseFloat(String(h.rent_amount)).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        h.status === 'occupied'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {h.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right space-x-3">
                      <button onClick={() => openEdit(h)} className="text-indigo-600 hover:text-indigo-800 font-medium">Edit</button>
                      <button onClick={() => setDeleteId(h.id)} className="text-red-500 hover:text-red-700 font-medium">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <Modal title={editing ? 'Edit House' : 'Add House'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Number</label>
              <input
                type="text" value={form.unit_number} onChange={field('unit_number')}
                placeholder="e.g. A1, B2, 101"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">House Type</label>
              <select
                value={form.house_type} onChange={field('house_type')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {HOUSE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rent Amount (KSh)</label>
              <input
                type="number" value={form.rent_amount} onChange={field('rent_amount')} min="0" step="100"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status} onChange={field('status')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="vacant">Vacant</option>
                <option value="occupied">Occupied</option>
              </select>
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

      {/* Delete confirm */}
      {deleteId !== null && (
        <Modal title="Delete House" onClose={() => setDeleteId(null)}>
          <p className="text-sm text-gray-600 mb-6">Are you sure you want to delete this house? This cannot be undone.</p>
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

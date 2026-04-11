'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Modal from '@/components/Modal';

interface HouseType {
  id: number;
  name: string;
  rentAmount: number;
}

interface Unit {
  id: number;
  name: string;
  status: 'VACANT' | 'OCCUPIED';
  houseTypeId: number;
  houseType: HouseType;
}

const blank = { name: '', houseTypeId: '' };

export default function UnitsPage() {
  const [units,      setUnits]      = useState<Unit[]>([]);
  const [types,      setTypes]      = useState<HouseType[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [form,       setForm]       = useState(blank);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId,   setDeleteId]   = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([api.get<Unit[]>('/units'), api.get<HouseType[]>('/house-types')])
      .then(([u, t]) => { setUnits(u); setTypes(t); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm({ ...blank, houseTypeId: types[0] ? String(types[0].id) : '' });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/units', { name: form.name, houseTypeId: parseInt(form.houseTypeId) });
      setShowModal(false);
      setForm(blank);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error saving unit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/units/${id}`);
      setDeleteId(null);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deleting unit');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Units</h1>
          <p className="text-sm text-gray-500 mt-0.5">{units.length} unit{units.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={openAdd}
          className="bg-indigo-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          + Add Unit
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-400">Loading…</div>
        ) : units.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">No units yet. Add a house type first, then add units.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Unit</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">House Type</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Rent (KSh)</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Status</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {units.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3.5 font-semibold text-gray-900">{u.name}</td>
                    <td className="px-6 py-3.5 text-gray-600">{u.houseType.name}</td>
                    <td className="px-6 py-3.5 text-right text-gray-700">
                      {Number(u.houseType.rentAmount).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        u.status === 'OCCUPIED'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {u.status === 'OCCUPIED' ? 'Occupied' : 'Vacant'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      {u.status === 'VACANT' && (
                        <button
                          onClick={() => setDeleteId(u.id)}
                          className="text-red-500 hover:text-red-700 font-medium text-sm"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <Modal title="Add Unit" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">House Type</label>
              <select
                value={form.houseTypeId}
                onChange={e => setForm(f => ({ ...f, houseTypeId: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Select house type…</option>
                {types.map(t => (
                  <option key={t.id} value={t.id}>{t.name} — KSh {Number(t.rentAmount).toLocaleString()}</option>
                ))}
              </select>
              {types.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">Add a house type first before adding units.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. A1, B2, 101"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submitting || !form.houseTypeId}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium">
                {submitting ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteId !== null && (
        <Modal title="Delete Unit" onClose={() => setDeleteId(null)}>
          <p className="text-sm text-gray-600 mb-6">Delete this vacant unit? This cannot be undone.</p>
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

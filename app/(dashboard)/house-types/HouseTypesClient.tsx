'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import Modal from '@/components/Modal';

interface HouseType {
  id: number;
  name: string;
  rentAmount: number;
  _count: { units: number };
}

const blank = { name: '', rentAmount: '' };

export default function HouseTypesClient({ initialTypes }: { initialTypes: HouseType[] }) {
  const [types,      setTypes]      = useState<HouseType[]>(initialTypes);
  const [showModal,  setShowModal]  = useState(false);
  const [editing,    setEditing]    = useState<HouseType | null>(null);
  const [form,       setForm]       = useState(blank);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId,   setDeleteId]   = useState<number | null>(null);

  const openAdd = () => {
    setEditing(null);
    setForm(blank);
    setShowModal(true);
  };

  const openEdit = (t: HouseType) => {
    setEditing(t);
    setForm({ name: t.name, rentAmount: String(t.rentAmount) });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { name: form.name, rentAmount: parseFloat(form.rentAmount) };
      if (editing) {
        const updated = await api.patch<HouseType>(`/house-types/${editing.id}`, payload);
        setTypes(prev => prev.map(t => t.id === editing.id ? { ...updated, _count: t._count } : t));
      } else {
        const created = await api.post<HouseType>('/house-types', payload);
        setTypes(prev => [...prev, { ...created, _count: { units: 0 } }]);
      }
      setShowModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error saving house type');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/house-types/${id}`);
      setTypes(prev => prev.filter(t => t.id !== id));
      setDeleteId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deleting house type');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#11430F]">House Types</h1>
          <p className="mt-0.5 text-sm text-[#11430F]/60">{types.length} type{types.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openAdd}
          className="brand-primary-btn whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors"
        >
          + Add House Type
        </button>
      </div>

      <div className="brand-surface overflow-hidden rounded-[1.5rem]">
        {types.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">No house types yet. Add your first.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Name</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Rent (KSh)</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Units</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {types.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3.5 font-medium text-gray-900">{t.name}</td>
                    <td className="px-6 py-3.5 text-right text-gray-700">{Number(t.rentAmount).toLocaleString()}</td>
                    <td className="px-6 py-3.5 text-right text-gray-500">{t._count.units}</td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(t)} title="Edit" className="brand-edit-btn rounded-lg p-1.5 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button onClick={() => setDeleteId(t.id)} title="Delete" className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteId !== null && (
        <Modal title="Delete House Type" onClose={() => setDeleteId(null)}>
          <p className="text-sm text-gray-600 mb-6">
            Delete this house type? This will fail if any units or tenants are still assigned to it.
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

      {showModal && (
        <Modal title={editing ? 'Edit House Type' : 'Add House Type'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Bedsitter, 1 Bedroom"
                className="brand-input w-full rounded-lg border px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rent Amount (KSh)</label>
              <input
                type="number"
                value={form.rentAmount}
                onChange={e => setForm(f => ({ ...f, rentAmount: e.target.value }))}
                min="0" step="100"
                placeholder="e.g. 8000"
                className="brand-input w-full rounded-lg border px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="brand-primary-btn flex-1 rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50">
                {submitting ? 'Saving…' : editing ? 'Save Changes' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

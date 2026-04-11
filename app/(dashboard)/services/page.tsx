'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';

interface Service {
  id: number;
  name: string;
  type: 'FIXED' | 'PER_UNIT';
  unitPrice: number;
  unitLabel: string | null;
  active: boolean;
}

const blank = { name: '', type: 'FIXED' as 'FIXED' | 'PER_UNIT', unitPrice: '', unitLabel: '' };

export default function ServicesPage() {
  const [services,   setServices]   = useState<Service[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [editing,    setEditing]    = useState<Service | null>(null);
  const [form,       setForm]       = useState(blank);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId,   setDeleteId]   = useState<number | null>(null);
  const [toast,      setToast]      = useState<{ msg: string; type: 'error' | 'success' } | null>(null);

  const load = () => {
    setLoading(true);
    api.get<Service[]>('/services').then(setServices).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(blank);
    setShowModal(true);
  };

  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({ name: s.name, type: s.type, unitPrice: String(s.unitPrice), unitLabel: s.unitLabel ?? '' });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name:      form.name,
        type:      form.type,
        unitPrice: parseFloat(form.unitPrice),
        unitLabel: form.unitLabel || null,
      };
      if (editing) await api.patch(`/services/${editing.id}`, payload);
      else         await api.post('/services', payload);
      setShowModal(false);
      load();
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : 'Error saving service', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (s: Service) => {
    await api.patch(`/services/${s.id}`, { active: !s.active });
    load();
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/services/${id}`);
      setDeleteId(null);
      load();
    } catch (err) {
      setDeleteId(null);
      setToast({ msg: err instanceof Error ? err.message : 'Error deleting service', type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="text-sm text-gray-500 mt-0.5">Extra charges added on top of rent</p>
        </div>
        <button
          onClick={openAdd}
          className="bg-indigo-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-indigo-700 transition-colors font-medium whitespace-nowrap"
        >
          + Add Service
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-400">Loading…</div>
        ) : services.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">No services yet. Add water, garbage, etc.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Service</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Type</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Price (KSh)</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Unit</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Status</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {services.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3.5 font-medium text-gray-900">{s.name}</td>
                    <td className="px-6 py-3.5 text-gray-600">
                      {s.type === 'PER_UNIT' ? 'Per unit' : 'Fixed'}
                    </td>
                    <td className="px-6 py-3.5 text-right text-gray-700">
                      {Number(s.unitPrice).toLocaleString()}
                      {s.type === 'PER_UNIT' && s.unitLabel && (
                        <span className="text-gray-400"> /{s.unitLabel}</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-gray-500">{s.unitLabel ?? '—'}</td>
                    <td className="px-6 py-3.5">
                      <button
                        onClick={() => toggleActive(s)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                          s.active
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {s.active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(s)} title="Edit" className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button onClick={() => setDeleteId(s.id)} title="Delete" className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors">
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

      {showModal && (
        <Modal title={editing ? 'Edit Service' : 'Add Service'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Water, Garbage, Security"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Billing Type</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as 'FIXED' | 'PER_UNIT' }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="FIXED">Fixed — same charge every month</option>
                <option value="PER_UNIT">Per unit — calculated from meter reading</option>
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {form.type === 'PER_UNIT' ? 'Price per unit (KSh)' : 'Fixed amount (KSh)'}
                </label>
                <input
                  type="number"
                  value={form.unitPrice}
                  onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))}
                  min="0" step="1"
                  placeholder="e.g. 50"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              {form.type === 'PER_UNIT' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit label</label>
                  <input
                    type="text"
                    value={form.unitLabel}
                    onChange={e => setForm(f => ({ ...f, unitLabel: e.target.value }))}
                    placeholder="e.g. m³, litre"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>

            {form.type === 'PER_UNIT' && (
              <p className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                When recording a payment, you'll enter the units consumed and the total will be calculated automatically.
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium">
                {submitting ? 'Saving…' : editing ? 'Save Changes' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteId !== null && (
        <Modal title="Delete Service" onClose={() => setDeleteId(null)}>
          <p className="text-sm text-gray-600 mb-6">Delete this service? It cannot be removed if it is linked to existing payments.</p>
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

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

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

interface HouseType {
  id: number;
  name: string;
  rent_amount: number;
}

const blankForm = { unit_number: '', house_type: '', rent_amount: '', status: 'vacant' };
const blankType = { name: '', rent_amount: '' };

export default function HousesPage() {
  const [houses,       setHouses]       = useState<House[]>([]);
  const [houseTypes,   setHouseTypes]   = useState<HouseType[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showModal,    setShowModal]    = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editing,      setEditing]      = useState<House | null>(null);
  const [form,         setForm]         = useState(blankForm);
  const [typeForm,     setTypeForm]     = useState(blankType);
  const [submitting,   setSubmitting]   = useState(false);
  const [deleteId,     setDeleteId]     = useState<number | null>(null);
  const [deleteTypeId, setDeleteTypeId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get<House[]>('/houses'),
      api.get<HouseType[]>('/house-types'),
    ]).then(([h, t]) => { setHouses(h); setHouseTypes(t); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    const first = houseTypes[0];
    setForm({ unit_number: '', house_type: first?.name ?? '', rent_amount: String(first?.rent_amount ?? ''), status: 'vacant' });
    setShowModal(true);
  };

  const openEdit = (h: House) => {
    setEditing(h);
    setForm({ unit_number: h.unit_number, house_type: h.house_type, rent_amount: String(h.rent_amount), status: h.status });
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

  const handleAddType = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/house-types', { name: typeForm.name, rent_amount: parseFloat(typeForm.rent_amount) });
      setShowTypeModal(false);
      setTypeForm(blankType);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error saving house type');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteType = async (id: number) => {
    try {
      await api.delete(`/house-types/${id}`);
      setDeleteTypeId(null);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deleting house type');
    }
  };

  const onTypeSelect = (name: string) => {
    const match = houseTypes.find(t => t.name === name);
    setForm(f => ({ ...f, house_type: name, rent_amount: match ? String(match.rent_amount) : '' }));
  };

  return (
    <div className="space-y-6">
      {/* ── Houses header ── */}
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

      {/* ── Houses table ── */}
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
                        h.status === 'occupied' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
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

      {/* ── House Types section ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">House Types</h2>
        <button
          onClick={() => { setTypeForm(blankType); setShowTypeModal(true); }}
          className="bg-white border border-gray-300 text-gray-700 px-4 py-2 text-sm rounded-lg hover:bg-gray-50 transition-colors font-medium"
        >
          + Add Type
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {houseTypes.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No house types yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Type Name</th>
                <th className="text-right px-6 py-3 text-gray-500 font-medium">Rent (KSh)</th>
                <th className="text-right px-6 py-3 text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {houseTypes.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3.5 font-medium text-gray-900">{t.name}</td>
                  <td className="px-6 py-3.5 text-right text-gray-700">{Number(t.rent_amount).toLocaleString()}</td>
                  <td className="px-6 py-3.5 text-right">
                    <button onClick={() => setDeleteTypeId(t.id)} className="text-red-500 hover:text-red-700 font-medium">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Add/Edit House Modal ── */}
      {showModal && (
        <Modal title={editing ? 'Edit House' : 'Add House'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Number</label>
              <input
                type="text" value={form.unit_number}
                onChange={e => setForm(f => ({ ...f, unit_number: e.target.value }))}
                placeholder="e.g. A1, B2, 101"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">House Type</label>
              <select
                value={form.house_type}
                onChange={e => onTypeSelect(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Select type…</option>
                {houseTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rent Amount (KSh)</label>
              <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700 flex items-center gap-1">
                <span className="text-gray-400">KSh</span>
                <span className="font-medium">{form.rent_amount ? Number(form.rent_amount).toLocaleString() : '—'}</span>
              </div>
              <input type="hidden" value={form.rent_amount} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
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
              <button type="submit" disabled={submitting || !form.house_type}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium">
                {submitting ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Add House Type Modal ── */}
      {showTypeModal && (
        <Modal title="Add House Type" onClose={() => setShowTypeModal(false)}>
          <form onSubmit={handleAddType} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type Name</label>
              <input
                type="text" value={typeForm.name}
                onChange={e => setTypeForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. 2 Bedroom"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rent Amount (KSh)</label>
              <input
                type="number" value={typeForm.rent_amount} min="0" step="100"
                onChange={e => setTypeForm(f => ({ ...f, rent_amount: e.target.value }))}
                placeholder="e.g. 15000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowTypeModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium">
                {submitting ? 'Saving…' : 'Add Type'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Delete House confirm ── */}
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

      {/* ── Delete House Type confirm ── */}
      {deleteTypeId !== null && (
        <Modal title="Delete House Type" onClose={() => setDeleteTypeId(null)}>
          <p className="text-sm text-gray-600 mb-6">
            Delete this house type? Existing houses with this type won&apos;t be affected.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteTypeId(null)}
              className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={() => handleDeleteType(deleteTypeId)}
              className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm hover:bg-red-700 transition-colors font-medium">
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}


interface House {
  id: number;
  unit_number: string;
  house_type: string;
  rent_amount: number;
  status: 'occupied' | 'vacant';
}

const HOUSE_TYPES: { label: string; rent: number }[] = [
  { label: 'Single',    rent: 4000  },
  { label: 'Bedsitter', rent: 6500  },
  { label: '1 Bedroom', rent: 12000 },
];

const blank = {
  unit_number: '',
  house_type:  HOUSE_TYPES[0].label,
  rent_amount: String(HOUSE_TYPES[0].rent),
  status:      'vacant',
};

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

  const field = (key: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.value;
    if (key === 'house_type') {
      const match = HOUSE_TYPES.find(t => t.label === value);
      setForm(f => ({ ...f, house_type: value, rent_amount: match ? String(match.rent) : f.rent_amount }));
    } else {
      setForm(f => ({ ...f, [key]: value }));
    }
  };

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
                {HOUSE_TYPES.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rent Amount (KSh)</label>
              <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700 flex items-center gap-1">
                <span className="text-gray-400">KSh</span>
                <span className="font-medium">{Number(form.rent_amount).toLocaleString()}</span>
              </div>
              <input type="hidden" value={form.rent_amount} name="rent_amount" />
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

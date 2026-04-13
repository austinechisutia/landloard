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
  depositMonths: number;
  houseTypeId: number;
  houseType: HouseType;
}

const DEPOSIT_OPTIONS = [1, 2, 3, 4, 5, 6];

const blank = { name: '', houseTypeId: '', depositMonths: '1' };

export default function UnitsPage() {
  const [units,      setUnits]      = useState<Unit[]>([]);
  const [types,      setTypes]      = useState<HouseType[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [editing,    setEditing]    = useState<Unit | null>(null);
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
    setEditing(null);
    setForm({ ...blank, houseTypeId: types[0] ? String(types[0].id) : '' });
    setShowModal(true);
  };

  const openEdit = (u: Unit) => {
    setEditing(u);
    setForm({
      name:          u.name,
      houseTypeId:   String(u.houseTypeId),
      depositMonths: String(u.depositMonths),
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editing) {
        await api.patch(`/units/${editing.id}`, {
          name:          form.name,
          depositMonths: parseInt(form.depositMonths),
        });
      } else {
        await api.post('/units', {
          name:          form.name,
          houseTypeId:   parseInt(form.houseTypeId),
          depositMonths: parseInt(form.depositMonths),
        });
      }
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

  const selectedType = types.find(t => String(t.id) === form.houseTypeId);
  const depositAmount = selectedType
    ? Number(selectedType.rentAmount) * parseInt(form.depositMonths || '1')
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#11430F]">Units</h1>
          <p className="mt-0.5 text-sm text-[#11430F]/60">{units.length} unit{units.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={openAdd}
          className="brand-primary-btn whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors"
        >
          + Add Unit
        </button>
      </div>

      <div className="brand-surface overflow-hidden rounded-[1.5rem]">
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
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Deposit</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Deposit Amount</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Status</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {units.map(u => {
                  const rent = Number(u.houseType.rentAmount);
                  const depAmt = rent * u.depositMonths;
                  return (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3.5 font-semibold text-gray-900">{u.name}</td>
                      <td className="px-6 py-3.5 text-gray-600">{u.houseType.name}</td>
                      <td className="px-6 py-3.5 text-right text-gray-700">{rent.toLocaleString()}</td>
                      <td className="px-6 py-3.5">
                        <span className="brand-pill inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
                          {u.depositMonths} month{u.depositMonths !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-medium text-gray-800">
                        {depAmt.toLocaleString()}
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
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(u)}
                            title="Edit"
                            className="brand-edit-btn rounded-lg p-1.5 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          {u.status === 'VACANT' && (
                            <button
                              onClick={() => setDeleteId(u.id)}
                              title="Delete"
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Unit' : 'Add Unit'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* House type — only selectable on create */}
            {!editing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">House Type</label>
                <select
                  value={form.houseTypeId}
                  onChange={e => setForm(f => ({ ...f, houseTypeId: e.target.value }))}
                  className="brand-input w-full rounded-lg border px-3 py-2 text-sm"
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
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. A1, B2, 101"
                className="brand-input w-full rounded-lg border px-3 py-2 text-sm"
                required
              />
            </div>

            {/* Deposit months */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deposit Required</label>
              <div className="flex gap-2 flex-wrap">
                {DEPOSIT_OPTIONS.map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, depositMonths: String(n) }))}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      form.depositMonths === String(n)
                        ? 'bg-[#11430F] text-[#e4f386] border-[#11430F]'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {n} month{n !== 1 ? 's' : ''}
                  </button>
                ))}
              </div>
              {depositAmount !== null && (
                <p className="mt-2 rounded-lg bg-[#eef8cf] px-3 py-2 text-xs text-[#11430F]">
                  Deposit = <strong>KSh {depositAmount.toLocaleString()}</strong>
                  {' '}({form.depositMonths} × KSh {Number(selectedType?.rentAmount ?? 0).toLocaleString()})
                </p>
              )}
              {editing && (
                <p className="mt-1 text-xs text-gray-400">
                  Current: KSh {(Number(editing.houseType.rentAmount) * editing.depositMonths).toLocaleString()} ({editing.depositMonths} month{editing.depositMonths !== 1 ? 's' : ''})
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submitting || (!editing && !form.houseTypeId)}
                className="brand-primary-btn flex-1 rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50">
                {submitting ? 'Saving…' : editing ? 'Save Changes' : 'Add Unit'}
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

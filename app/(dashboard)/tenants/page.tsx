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
}

interface Tenant {
  id: number;
  name: string;
  phone: string;
  houseTypeId: number;
  unitId: number;
  moveInDate: string;
  houseType: HouseType;
  unit: Unit;
}

const blank = { name: '', phone: '', houseTypeId: '', unitId: '', moveInDate: '' };

export default function TenantsPage() {
  const [tenants,    setTenants]    = useState<Tenant[]>([]);
  const [types,      setTypes]      = useState<HouseType[]>([]);
  const [units,      setUnits]      = useState<Unit[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [form,       setForm]       = useState(blank);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId,   setDeleteId]   = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([api.get<Tenant[]>('/tenants'), api.get<HouseType[]>('/house-types')])
      .then(([t, ht]) => { setTenants(t); setTypes(ht); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // When house type changes, fetch available (vacant) units for that type
  const onTypeChange = async (typeId: string) => {
    setForm(f => ({ ...f, houseTypeId: typeId, unitId: '' }));
    setUnits([]);
    if (!typeId) return;
    setLoadingUnits(true);
    try {
      const available = await api.get<Unit[]>(`/units?typeId=${typeId}&status=VACANT`);
      setUnits(available);
    } finally {
      setLoadingUnits(false);
    }
  };

  const openAdd = () => {
    setForm(blank);
    setUnits([]);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/tenants', {
        name:        form.name,
        phone:       form.phone,
        houseTypeId: parseInt(form.houseTypeId),
        unitId:      parseInt(form.unitId),
        moveInDate:  form.moveInDate,
      });
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
          <div className="p-10 text-center text-sm text-gray-400">No tenants yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Name</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Phone</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">House Type</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Unit</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Rent (KSh)</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Move-in</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tenants.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3.5 font-medium text-gray-900">{t.name}</td>
                    <td className="px-6 py-3.5 text-gray-600">{t.phone}</td>
                    <td className="px-6 py-3.5 text-gray-600">{t.houseType.name}</td>
                    <td className="px-6 py-3.5 font-semibold text-gray-900">{t.unit.name}</td>
                    <td className="px-6 py-3.5 text-right text-gray-700">
                      {Number(t.houseType.rentAmount).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-gray-600">
                      {new Date(t.moveInDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button onClick={() => setDeleteId(t.id)} className="text-red-500 hover:text-red-700 font-medium">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <Modal title="Add Tenant" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. John Mwangi"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="e.g. 0712345678"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">House Type</label>
              <select
                value={form.houseTypeId}
                onChange={e => onTypeChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Select house type…</option>
                {types.map(t => (
                  <option key={t.id} value={t.id}>{t.name} — KSh {Number(t.rentAmount).toLocaleString()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Available Unit</label>
              <select
                value={form.unitId}
                onChange={e => setForm(f => ({ ...f, unitId: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                disabled={!form.houseTypeId || loadingUnits}
                required
              >
                <option value="">
                  {!form.houseTypeId
                    ? 'Select a house type first…'
                    : loadingUnits
                    ? 'Loading units…'
                    : units.length === 0
                    ? 'No vacant units available'
                    : 'Select a unit…'}
                </option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              {form.houseTypeId && !loadingUnits && units.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  No vacant units for this type. Add more units first.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Move-in Date</label>
              <input
                type="date"
                value={form.moveInDate}
                onChange={e => setForm(f => ({ ...f, moveInDate: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submitting || !form.unitId}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium">
                {submitting ? 'Saving…' : 'Add Tenant'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteId !== null && (
        <Modal title="Remove Tenant" onClose={() => setDeleteId(null)}>
          <p className="text-sm text-gray-600 mb-6">
            Remove this tenant? Their unit will be marked as vacant.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteId(null)}
              className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={() => handleDelete(deleteId)}
              className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm hover:bg-red-700 transition-colors font-medium">
              Remove
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';

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
  payments: {
    id: number;
    status: 'PAID' | 'PENDING';
    dueDate: string;
    rentAmount: number;
    amountDue: number;
    amountPaid: number;
    paymentDate: string | null;
    services: { amount: number; service: { name: string } }[];
  }[];
}

const blank = { name: '', phone: '', houseTypeId: '', unitId: '', moveInDate: '' };

export default function TenantsPage() {
  const [tenants,      setTenants]      = useState<Tenant[]>([]);
  const [types,        setTypes]        = useState<HouseType[]>([]);
  const [units,        setUnits]        = useState<Unit[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showModal,    setShowModal]    = useState(false);
  const [editing,      setEditing]      = useState<Tenant | null>(null);
  const [form,         setForm]         = useState(blank);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [deleteId,     setDeleteId]     = useState<number | null>(null);
  const [toast,        setToast]        = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get<Tenant[]>('/tenants'),
      api.get<HouseType[]>('/house-types'),
    ])
      .then(([t, ht]) => { setTenants(t); setTypes(ht); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const fetchUnits = async (typeId: string, includeUnitId?: number) => {
    if (!typeId) { setUnits([]); return; }
    setLoadingUnits(true);
    try {
      const vacant = await api.get<Unit[]>(`/units?typeId=${typeId}&status=VACANT`);
      if (includeUnitId && !vacant.find(u => u.id === includeUnitId)) {
        const all = await api.get<Unit[]>(`/units?typeId=${typeId}`);
        const current = all.find(u => u.id === includeUnitId);
        if (current) setUnits([current, ...vacant]);
        else setUnits(vacant);
      } else {
        setUnits(vacant);
      }
    } finally {
      setLoadingUnits(false);
    }
  };

  const onTypeChange = async (typeId: string) => {
    setForm(f => ({ ...f, houseTypeId: typeId, unitId: '' }));
    await fetchUnits(typeId, editing ? editing.unitId : undefined);
  };

  const openAdd = () => {
    setEditing(null);
    setForm(blank);
    setUnits([]);
    setShowModal(true);
  };

  const openEdit = async (t: Tenant) => {
    setEditing(t);
    setForm({
      name:        t.name,
      phone:       t.phone,
      houseTypeId: String(t.houseTypeId),
      unitId:      String(t.unitId),
      moveInDate:  t.moveInDate.split('T')[0],
    });
    await fetchUnits(String(t.houseTypeId), t.unitId);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name:        form.name,
        phone:       form.phone,
        houseTypeId: parseInt(form.houseTypeId),
        unitId:      parseInt(form.unitId),
        moveInDate:  form.moveInDate,
      };
      if (editing) await api.patch(`/tenants/${editing.id}`, payload);
      else         await api.post('/tenants', payload);
      setShowModal(false);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error saving tenant');
    } finally {
      setSubmitting(false);
    }
  };

  const updatePaymentStatus = async (tenantId: number, payment: Tenant['payments'][0], status: 'PAID' | 'PENDING') => {
    if (status === 'PENDING' && Number(payment.amountPaid) >= Number(payment.amountDue)) {
      setToast('Cannot mark as pending — this payment has been fully paid.');
      return;
    }
    const due        = Number(payment.amountDue);
    const amountPaid = status === 'PAID' ? due : Number(payment.amountPaid);
    const updated    = { ...payment, status, amountPaid };
    setTenants(prev => prev.map(t =>
      t.id === tenantId ? { ...t, payments: [updated] } : t
    ));
    try {
      await api.patch(`/payments/${payment.id}`, {
        amountDue:   due,
        amountPaid,
        dueDate:     payment.dueDate,
        paymentDate: payment.paymentDate,
        status,
      });
    } catch (err) {
      setTenants(prev => prev.map(t =>
        t.id === tenantId ? { ...t, payments: [{ ...payment }] } : t
      ));
      alert(err instanceof Error ? err.message : 'Failed to update payment status');
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tenants.length} tenant{tenants.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={openAdd}
          className="bg-indigo-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-indigo-700 transition-colors font-medium whitespace-nowrap"
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
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Unit</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Rent (KSh)</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Services</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Total</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Move-in</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Payment</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tenants.map(t => {
                  const p         = t.payments[0] ?? null;
                  const rent      = p ? Number(p.rentAmount) : Number(t.houseType.rentAmount);
                  const svcTotal  = p ? p.services.reduce((s, c) => s + Number(c.amount), 0) : 0;
                  const total     = p ? Number(p.amountDue) : rent;
                  return (
                    <tr key={t.id} className="hover:bg-gray-50 align-top">
                      <td className="px-6 py-3.5">
                        <div className="font-medium text-gray-900">{t.name}</div>
                        <div className="text-xs text-gray-400">{t.houseType.name}</div>
                      </td>
                      <td className="px-6 py-3.5 text-gray-600">{t.phone}</td>
                      <td className="px-6 py-3.5 font-semibold text-gray-900">{t.unit.name}</td>
                      <td className="px-6 py-3.5 text-right text-gray-700">{rent.toLocaleString()}</td>
                      <td className="px-6 py-3.5">
                        {!p || p.services.length === 0 ? (
                          <span className="text-gray-400 text-xs">—</span>
                        ) : (
                          <div className="space-y-0.5">
                            {p.services.map((c, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                                <span className="text-gray-600">{c.service.name}</span>
                                <span className="text-gray-500 ml-auto pl-3 font-medium">
                                  +{Number(c.amount).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="font-semibold text-gray-900">{total.toLocaleString()}</div>
                        {svcTotal > 0 && (
                          <div className="text-xs text-gray-400 mt-0.5">
                            {rent.toLocaleString()} + {svcTotal.toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-gray-600">
                        {new Date(t.moveInDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3.5">
                        {!p ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                            No payments
                          </span>
                        ) : (
                          <select
                            value={p.status}
                            onChange={e => updatePaymentStatus(t.id, p, e.target.value as 'PAID' | 'PENDING')}
                            className={`text-xs font-medium rounded-full px-2.5 py-0.5 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                              p.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}
                          >
                            <option value="PAID">Paid</option>
                            <option value="PENDING">Pending</option>
                          </select>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(t)} title="Edit" className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button onClick={() => setDeleteId(t.id)} title="Remove" className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                          </button>
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
        <Modal title={editing ? 'Edit Tenant' : 'Add Tenant'} onClose={() => setShowModal(false)}>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {editing ? 'Unit' : 'Available Unit'}
              </label>
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
                  <option key={u.id} value={u.id}>
                    {u.name}{editing && u.id === editing.unitId ? ' (current)' : ''}
                  </option>
                ))}
              </select>
              {form.houseTypeId && !loadingUnits && units.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">No vacant units for this type. Add more units first.</p>
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
                {submitting ? 'Saving…' : editing ? 'Save Changes' : 'Add Tenant'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteId !== null && (
        <Modal title="Remove Tenant" onClose={() => setDeleteId(null)}>
          <p className="text-sm text-gray-600 mb-6">Remove this tenant? Their unit will be marked as vacant.</p>
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

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

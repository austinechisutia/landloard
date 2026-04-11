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

interface MonthEntry {
  period: string;
  periodDate: string;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  status: string;
  paymentId: number | null;
  paymentDate: string | null;
  effectiveDue: number;
  effectiveBalance: number;
  effectiveStatus: string;
}

interface Ledger {
  tenant: { id: number; name: string; rentAmount: number; moveInDate: string; unit: string };
  deposit: {
    id: number | null;
    amountDue: number;
    amountPaid: number;
    balance: number;
    status: string;
    paymentDate: string | null;
  };
  months: MonthEntry[];
  carryOver: number;
  summary: { totalDue: number; totalPaid: number; totalBalance: number };
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

  // Ledger state
  const [ledgerTenant,   setLedgerTenant]   = useState<Tenant | null>(null);
  const [ledger,         setLedger]         = useState<Ledger | null>(null);
  const [ledgerLoading,  setLedgerLoading]  = useState(false);
  const [payTarget,      setPayTarget]      = useState<string>('');
  const [payAmount,      setPayAmount]      = useState('');
  const [payDate,        setPayDate]        = useState(() => new Date().toISOString().split('T')[0]);
  const [paySubmitting,  setPaySubmitting]  = useState(false);

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
        const all     = await api.get<Unit[]>(`/units?typeId=${typeId}`);
        const current = all.find(u => u.id === includeUnitId);
        setUnits(current ? [current, ...vacant] : vacant);
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

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/tenants/${id}`);
      setDeleteId(null);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deleting tenant');
    }
  };

  const openLedger = async (t: Tenant) => {
    setLedgerTenant(t);
    setLedger(null);
    setPayTarget('');
    setPayAmount('');
    setLedgerLoading(true);
    try {
      const data = await api.get<Ledger>(`/tenants/${t.id}/ledger`);
      setLedger(data);
    } catch {
      setToast('Failed to load ledger');
    } finally {
      setLedgerLoading(false);
    }
  };

  const closeLedger = () => {
    setLedgerTenant(null);
    setLedger(null);
  };

  const recordPayment = async () => {
    if (!ledgerTenant || !payTarget || !payAmount) return;
    setPaySubmitting(true);
    try {
      await api.post(`/tenants/${ledgerTenant.id}/ledger`, {
        target:      payTarget,
        amount:      parseFloat(payAmount),
        paymentDate: payDate,
      });
      setPayAmount('');
      setPayTarget('');
      // Reload ledger
      const data = await api.get<Ledger>(`/tenants/${ledgerTenant.id}/ledger`);
      setLedger(data);
      setToast('Payment recorded');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setPaySubmitting(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PAID:    'bg-green-100 text-green-700',
      PARTIAL: 'bg-amber-100 text-amber-700',
      PENDING: 'bg-red-100 text-red-700',
    };
    return `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-500'}`;
  };

  const fmtMonth = (period: string) => {
    const [yr, mo] = period.split('-');
    const date = new Date(parseInt(yr), parseInt(mo) - 1, 1);
    return date.toLocaleString('default', { month: 'short', year: 'numeric' });
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
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tenants.map(t => {
                  const p        = t.payments[0] ?? null;
                  const rent     = p ? Number(p.rentAmount) : Number(t.houseType.rentAmount);
                  const svcTotal = p ? p.services.reduce((s, c) => s + Number(c.amount), 0) : 0;
                  const total    = p ? Number(p.amountDue) : rent;
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
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Ledger / payment tracking */}
                          <button onClick={() => openLedger(t)} title="View Ledger" className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                          </button>
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

      {/* Add / Edit tenant modal */}
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

      {/* Delete confirmation */}
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

      {/* Ledger modal */}
      {ledgerTenant && (
        <Modal title={`Payment Ledger — ${ledgerTenant.name}`} onClose={closeLedger}>
          {ledgerLoading ? (
            <div className="py-12 text-center text-sm text-gray-400">Loading ledger…</div>
          ) : ledger ? (
            <div className="space-y-5">

              {/* Summary bar */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500 mb-1">Total Due</div>
                  <div className="font-semibold text-gray-900 text-sm">KSh {ledger.summary.totalDue.toLocaleString()}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500 mb-1">Total Paid</div>
                  <div className="font-semibold text-green-700 text-sm">KSh {ledger.summary.totalPaid.toLocaleString()}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500 mb-1">Outstanding</div>
                  <div className={`font-semibold text-sm ${ledger.summary.totalBalance > 0 ? 'text-red-600' : 'text-green-700'}`}>
                    KSh {ledger.summary.totalBalance.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Deposit row */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Deposit</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs text-gray-500 font-medium">Due</th>
                        <th className="text-right px-3 py-2 text-xs text-gray-500 font-medium">Amount Due</th>
                        <th className="text-right px-3 py-2 text-xs text-gray-500 font-medium">Paid</th>
                        <th className="text-right px-3 py-2 text-xs text-gray-500 font-medium">Balance</th>
                        <th className="text-center px-3 py-2 text-xs text-gray-500 font-medium">Status</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-gray-100">
                        <td className="px-3 py-2.5 text-gray-600">
                          {new Date(ledger.tenant.moveInDate).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-700">{ledger.deposit.amountDue.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right text-gray-700">{ledger.deposit.amountPaid.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right font-medium text-gray-900">{ledger.deposit.balance.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={statusBadge(ledger.deposit.status)}>{ledger.deposit.status}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {ledger.deposit.status !== 'PAID' && (
                            <button
                              onClick={() => setPayTarget('DEPOSIT')}
                              className={`text-xs px-2 py-1 rounded-md transition-colors ${payTarget === 'DEPOSIT' ? 'bg-indigo-600 text-white' : 'text-indigo-600 hover:bg-indigo-50'}`}
                            >
                              Pay
                            </button>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Monthly rent */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Monthly Rent
                  {ledger.carryOver > 0 && (
                    <span className="ml-2 text-green-600 normal-case font-normal">
                      (carry-over credit: KSh {ledger.carryOver.toLocaleString()})
                    </span>
                  )}
                </h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 text-xs text-gray-500 font-medium">Month</th>
                          <th className="text-right px-3 py-2 text-xs text-gray-500 font-medium">Due</th>
                          <th className="text-right px-3 py-2 text-xs text-gray-500 font-medium">Paid</th>
                          <th className="text-right px-3 py-2 text-xs text-gray-500 font-medium">Balance</th>
                          <th className="text-center px-3 py-2 text-xs text-gray-500 font-medium">Status</th>
                          <th className="px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {ledger.months.map(m => (
                          <tr key={m.period} className={payTarget === m.period ? 'bg-indigo-50' : 'hover:bg-gray-50'}>
                            <td className="px-3 py-2.5 text-gray-700 font-medium">{fmtMonth(m.period)}</td>
                            <td className="px-3 py-2.5 text-right text-gray-600">{m.effectiveDue.toLocaleString()}</td>
                            <td className="px-3 py-2.5 text-right text-gray-600">{m.amountPaid.toLocaleString()}</td>
                            <td className="px-3 py-2.5 text-right font-medium text-gray-900">{m.effectiveBalance.toLocaleString()}</td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={statusBadge(m.effectiveStatus)}>{m.effectiveStatus}</span>
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {m.effectiveStatus !== 'PAID' && (
                                <button
                                  onClick={() => setPayTarget(m.period)}
                                  className={`text-xs px-2 py-1 rounded-md transition-colors ${payTarget === m.period ? 'bg-indigo-600 text-white' : 'text-indigo-600 hover:bg-indigo-50'}`}
                                >
                                  Pay
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Record payment form */}
              {payTarget && (
                <div className="border border-indigo-200 bg-indigo-50 rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-indigo-800">
                    Record Payment — {payTarget === 'DEPOSIT' ? 'Deposit' : fmtMonth(payTarget)}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Amount (KSh)</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={payAmount}
                        onChange={e => setPayAmount(e.target.value)}
                        placeholder="e.g. 8000"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Payment Date</label>
                      <input
                        type="date"
                        value={payDate}
                        onChange={e => setPayDate(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setPayTarget(''); setPayAmount(''); }}
                      className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={recordPayment}
                      disabled={paySubmitting || !payAmount}
                      className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
                    >
                      {paySubmitting ? 'Saving…' : 'Save Payment'}
                    </button>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="py-12 text-center text-sm text-red-400">Failed to load ledger.</div>
          )}
        </Modal>
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

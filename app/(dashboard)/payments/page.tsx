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

interface ServiceCharge {
  serviceId: number;
  units: string;   // input value; empty for FIXED
  amount: number;  // calculated
  included: boolean;
}

interface Tenant {
  id: number;
  name: string;
  unitId: number;
  unit: { name: string; houseType: { rentAmount: number } };
}

interface Payment {
  id: number;
  tenantId: number;
  unitId: number;
  rentAmount: number;
  amountDue: number;
  amountPaid: number;
  balance: number;
  status: 'PAID' | 'PENDING';
  dueDate: string;
  paymentDate: string | null;
  tenant: { name: string };
  unit: { name: string };
  services: { service: { name: string }; units: number | null; amount: number }[];
}

const blank = { tenantId: '', amountPaid: '', dueDate: '', paymentDate: '' };
type Filter = '' | 'PAID' | 'PENDING';

export default function PaymentsPage() {
  const [payments,      setPayments]      = useState<Payment[]>([]);
  const [tenants,       setTenants]       = useState<Tenant[]>([]);
  const [services,      setServices]      = useState<Service[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [filter,        setFilter]        = useState<Filter>('');
  const [showModal,     setShowModal]     = useState(false);
  const [editing,       setEditing]       = useState<Payment | null>(null);
  const [form,          setForm]          = useState(blank);
  const [charges,       setCharges]       = useState<ServiceCharge[]>([]);
  const [submitting,    setSubmitting]    = useState(false);
  const [deleteId,      setDeleteId]      = useState<number | null>(null);
  const [toast,         setToast]         = useState<string | null>(null);

  const load = (f: Filter = filter) => {
    setLoading(true);
    const url = f ? `/payments?status=${f}` : '/payments';
    Promise.all([
      api.get<Payment[]>(url),
      api.get<Tenant[]>('/tenants'),
      api.get<Service[]>('/services'),
    ])
      .then(([p, t, s]) => { setPayments(p); setTenants(t); setServices(s); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(filter); }, [filter]);

  // Build charge rows from active services, optionally pre-filling meter readings from localStorage
  const initCharges = (svcList: Service[], tenantId?: string): ServiceCharge[] => {
    let savedReadings: Record<string, string> = {};
    if (tenantId) {
      try {
        const all = JSON.parse(localStorage.getItem('landlord_meter_readings') ?? '{}');
        savedReadings = all[parseInt(tenantId)] ?? {};
      } catch {}
    }
    return svcList.filter(s => s.active).map(s => {
      if (s.type === 'FIXED') {
        return { serviceId: s.id, units: '', amount: Number(s.unitPrice), included: true };
      }
      const units  = savedReadings[s.id] ?? '';
      const qty    = parseInt(units) || 0;
      return { serviceId: s.id, units, amount: qty * Number(s.unitPrice), included: qty > 0 };
    });
  };

  const selectedTenant = tenants.find(t => String(t.id) === form.tenantId);
  const rent = Number(selectedTenant?.unit.houseType.rentAmount ?? 0);
  const servicesTotal = charges.filter(c => c.included).reduce((s, c) => s + c.amount, 0);
  const totalDue = rent + servicesTotal;
  const paid = parseFloat(form.amountPaid) || 0;
  const balance = totalDue - paid;
  const previewStatus = paid >= totalDue && totalDue > 0 ? 'PAID' : 'PENDING';

  const onTenantChange = (id: string) => {
    setForm(f => ({ ...f, tenantId: id }));
    setCharges(initCharges(services, id));
  };

  const updateCharge = (serviceId: number, field: 'units' | 'included', value: string | boolean) => {
    setCharges(prev => prev.map(c => {
      if (c.serviceId !== serviceId) return c;
      if (field === 'included') return { ...c, included: value as boolean };
      // units changed — recalculate amount
      const svc = services.find(s => s.id === serviceId)!;
      const units = parseInt(value as string) || 0;
      return { ...c, units: value as string, amount: units * Number(svc.unitPrice), included: units > 0 };
    }));
  };

  const openAdd = () => {
    setEditing(null);
    setForm(blank);
    setCharges(initCharges(services));
    setShowModal(true);
  };

  const openEdit = (p: Payment) => {
    setEditing(p);
    setForm({
      tenantId:    String(p.tenantId),
      amountPaid:  String(p.amountPaid),
      dueDate:     p.dueDate?.split('T')[0]     || '',
      paymentDate: p.paymentDate?.split('T')[0] || '',
    });
    setCharges(initCharges(services));
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const tenant = tenants.find(t => String(t.id) === form.tenantId);
      const serviceCharges = charges
        .filter(c => c.included && c.amount > 0)
        .map(c => ({ serviceId: c.serviceId, units: parseFloat(c.units) || undefined, amount: c.amount }));

      if (editing) {
        await api.patch(`/payments/${editing.id}`, {
          amountDue:   Number(editing.amountDue),
          amountPaid:  paid,
          dueDate:     form.dueDate,
          paymentDate: form.paymentDate || null,
        });
      } else {
        await api.post('/payments', {
          tenantId:      parseInt(form.tenantId),
          unitId:        tenant?.unitId,
          rentAmount:    rent,
          amountPaid:    paid,
          dueDate:       form.dueDate,
          paymentDate:   form.paymentDate || null,
          serviceCharges,
        });
      }
      setShowModal(false);
      load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Error saving payment');
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: number, status: 'PAID' | 'PENDING') => {
    const p = payments.find(x => x.id === id);
    if (!p) return;
    if (status === 'PENDING' && Number(p.amountPaid) >= Number(p.amountDue)) {
      setToast('Cannot mark as pending — this payment has been fully paid.');
      return;
    }
    const due        = Number(p.amountDue);
    const amountPaid = status === 'PAID' ? due : Number(p.amountPaid);
    const balance    = due - amountPaid;
    setPayments(prev => prev.map(x => x.id === id ? { ...x, status, amountPaid, balance } : x));
    try {
      await api.patch(`/payments/${id}`, {
        amountDue: due, amountPaid, dueDate: p.dueDate, paymentDate: p.paymentDate, status,
      });
      load();
    } catch (err) {
      setPayments(prev => prev.map(x => x.id === id ? { ...x, status: p.status, amountPaid: Number(p.amountPaid), balance: Number(p.balance) } : x));
      setToast(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/payments/${id}`);
      setDeleteId(null);
      load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Error deleting payment');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-sm text-gray-500 mt-0.5">{payments.length} record{payments.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openAdd} className="bg-indigo-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-indigo-700 transition-colors font-medium whitespace-nowrap">
          + Record Payment
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['', 'PAID', 'PENDING'] as Filter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}>
            {f === '' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-400">Loading…</div>
        ) : payments.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">No payments found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Tenant</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Rent</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Services</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Total Due</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Paid</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Balance</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Due Date</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Status</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Group payments by tenantId, preserving order of first appearance
                  const groups: { tenantId: number; rows: typeof payments }[] = [];
                  const seen = new Map<number, typeof payments>();
                  for (const p of payments) {
                    if (!seen.has(p.tenantId)) {
                      const rows: typeof payments = [];
                      seen.set(p.tenantId, rows);
                      groups.push({ tenantId: p.tenantId, rows });
                    }
                    seen.get(p.tenantId)!.push(p);
                  }
                  return groups.map(({ rows }) =>
                    rows.map((p, rowIdx) => {
                  const svcTotal = p.services.reduce((s, c) => s + Number(c.amount), 0);
                  const isFirst  = rowIdx === 0;
                  const span     = rows.length;
                  return (
                    <tr key={p.id} className={`hover:bg-gray-50 ${rowIdx > 0 ? 'border-t border-dashed border-gray-100' : 'border-t border-gray-100'}`}>
                      {isFirst && (
                        <td rowSpan={span} className="px-6 py-3.5 font-medium text-gray-900 align-top border-r border-gray-100">
                          <div>{p.tenant.name}</div>
                          <div className="text-xs text-gray-400 font-normal">{p.unit.name}</div>
                        </td>
                      )}
                      <td className="px-6 py-3.5 text-right text-gray-700">
                        {(Number(p.rentAmount) || (Number(p.amountDue) - p.services.reduce((s, c) => s + Number(c.amount), 0))).toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 text-right text-gray-500">
                        {svcTotal > 0 ? (
                          <span title={p.services.map(c => `${c.service.name}: ${Number(c.amount).toLocaleString()}`).join('\n')}>
                            {svcTotal.toLocaleString()}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-3.5 text-right font-medium text-gray-800">{Number(p.amountDue).toLocaleString()}</td>
                      <td className="px-6 py-3.5 text-right text-gray-700">{Number(p.amountPaid).toLocaleString()}</td>
                      <td className={`px-6 py-3.5 text-right font-medium ${Number(p.balance) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {Number(p.balance).toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 text-gray-600">{new Date(p.dueDate).toLocaleDateString()}</td>
                      <td className="px-6 py-3.5">
                        <select
                          value={p.status}
                          onChange={e => updateStatus(p.id, e.target.value as 'PAID' | 'PENDING')}
                          className={`text-xs font-medium rounded-full px-2.5 py-0.5 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            p.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          <option value="PAID">Paid</option>
                          <option value="PENDING">Pending</option>
                        </select>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(p)} title="Edit" className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button onClick={() => setDeleteId(p.id)} title="Delete" className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }));
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Payment' : 'Record Payment'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tenant */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tenant</label>
              <select
                value={form.tenantId}
                onChange={e => onTenantChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required disabled={!!editing}
              >
                <option value="">Select tenant…</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name} — Unit {t.unit.name}</option>
                ))}
              </select>
            </div>

            {/* Rent info */}
            {selectedTenant && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 text-xs text-indigo-700">
                Unit <strong>{selectedTenant.unit.name}</strong> · Rent:{' '}
                <strong>KSh {Number(selectedTenant.unit.houseType.rentAmount).toLocaleString()}</strong>
              </div>
            )}

            {/* Services */}
            {!editing && charges.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Additional Services</p>
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {charges.map(c => {
                    const svc = services.find(s => s.id === c.serviceId)!;
                    return (
                      <div key={c.serviceId} className="flex items-center gap-3 px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={c.included}
                          onChange={e => updateCharge(c.serviceId, 'included', e.target.checked)}
                          disabled={svc.type === 'PER_UNIT'}
                          className="accent-indigo-600"
                        />
                        <span className="flex-1 text-sm text-gray-800">{svc.name}</span>
                        {svc.type === 'PER_UNIT' ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              value={c.units}
                              onChange={e => updateCharge(c.serviceId, 'units', e.target.value)}
                              placeholder="0"
                              min="0"
                              step="1"
                              className="w-20 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <span className="text-xs text-gray-400">{svc.unitLabel ?? 'units'}</span>
                            <span className="text-xs text-gray-500 w-20 text-right">
                              = KSh {c.amount.toLocaleString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-600 font-medium">
                            KSh {Number(svc.unitPrice).toLocaleString()}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Totals summary */}
            {!editing && selectedTenant && (
              <div className="bg-gray-50 rounded-lg px-3 py-2.5 space-y-1 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Rent</span>
                  <span>KSh {rent.toLocaleString()}</span>
                </div>
                {charges.filter(c => c.included && c.amount > 0).map(c => {
                  const svc = services.find(s => s.id === c.serviceId)!;
                  return (
                    <div key={c.serviceId} className="flex justify-between text-gray-600">
                      <span>{svc.name}</span>
                      <span>KSh {c.amount.toLocaleString()}</span>
                    </div>
                  );
                })}
                <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-1 mt-1">
                  <span>Total Due</span>
                  <span>KSh {totalDue.toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Amount paid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid (KSh)</label>
                <input
                  type="number"
                  value={form.amountPaid}
                  onChange={e => setForm(f => ({ ...f, amountPaid: e.target.value }))}
                  min="0" step="100"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex flex-col justify-end pb-0.5">
                {totalDue > 0 && !editing && (
                  <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <span className={`font-semibold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      Balance: KSh {balance.toLocaleString()}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      previewStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {previewStatus === 'PAID' ? 'Paid' : 'Pending'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input type="date" value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                <input type="date" value={form.paymentDate}
                  onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium">
                {submitting ? 'Saving…' : editing ? 'Save Changes' : 'Record Payment'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteId !== null && (
        <Modal title="Delete Payment" onClose={() => setDeleteId(null)}>
          <p className="text-sm text-gray-600 mb-6">Delete this payment record?</p>
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

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

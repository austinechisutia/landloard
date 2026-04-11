'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Modal from '@/components/Modal';

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
  amountDue: number;
  amountPaid: number;
  balance: number;
  status: 'PAID' | 'PENDING';
  dueDate: string;
  paymentDate: string | null;
  tenant: { name: string };
  unit: { name: string };
}

const blank = {
  tenantId:    '',
  amountDue:   '',
  amountPaid:  '',
  dueDate:     '',
  paymentDate: '',
};

type Filter = '' | 'PAID' | 'PENDING';

export default function PaymentsPage() {
  const [payments,   setPayments]   = useState<Payment[]>([]);
  const [tenants,    setTenants]    = useState<Tenant[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState<Filter>('');
  const [showModal,  setShowModal]  = useState(false);
  const [editing,    setEditing]    = useState<Payment | null>(null);
  const [form,       setForm]       = useState(blank);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId,   setDeleteId]   = useState<number | null>(null);

  const load = (f: Filter = filter) => {
    setLoading(true);
    const url = f ? `/payments?status=${f}` : '/payments';
    Promise.all([api.get<Payment[]>(url), api.get<Tenant[]>('/tenants')])
      .then(([p, t]) => { setPayments(p); setTenants(t); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(filter); }, [filter]);

  const due     = parseFloat(form.amountDue)  || 0;
  const paid    = parseFloat(form.amountPaid) || 0;
  const balance = due - paid;
  const previewStatus = paid >= due && due > 0 ? 'PAID' : 'PENDING';

  const selectedTenant = tenants.find(t => String(t.id) === form.tenantId);

  const onTenantChange = (id: string) => {
    const t = tenants.find(x => String(x.id) === id);
    setForm(f => ({
      ...f,
      tenantId:  id,
      amountDue: t ? String(t.unit.houseType.rentAmount) : '',
    }));
  };

  const openAdd = () => {
    setEditing(null);
    setForm(blank);
    setShowModal(true);
  };

  const openEdit = (p: Payment) => {
    setEditing(p);
    setForm({
      tenantId:    String(p.tenantId),
      amountDue:   String(p.amountDue),
      amountPaid:  String(p.amountPaid),
      dueDate:     p.dueDate?.split('T')[0]      || '',
      paymentDate: p.paymentDate?.split('T')[0]  || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const tenant = tenants.find(t => String(t.id) === form.tenantId);
      const payload = {
        tenantId:    parseInt(form.tenantId),
        unitId:      tenant?.unitId,
        amountDue:   parseFloat(form.amountDue),
        amountPaid:  parseFloat(form.amountPaid) || 0,
        dueDate:     form.dueDate,
        paymentDate: form.paymentDate || null,
      };
      if (editing) await api.patch(`/payments/${editing.id}`, payload);
      else         await api.post('/payments', payload);
      setShowModal(false);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error saving payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/payments/${id}`);
      setDeleteId(null);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deleting payment');
    }
  };

  const field = (key: keyof typeof blank) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-sm text-gray-500 mt-0.5">{payments.length} record{payments.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openAdd}
          className="bg-indigo-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          + Record Payment
        </button>
      </div>

      <div className="flex gap-2">
        {(['', 'PAID', 'PENDING'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
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
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Unit</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Due</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Paid</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Balance</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Due Date</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Status</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3.5 font-medium text-gray-900">{p.tenant.name}</td>
                    <td className="px-6 py-3.5 text-gray-600">{p.unit.name}</td>
                    <td className="px-6 py-3.5 text-right text-gray-700">
                      {Number(p.amountDue).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-right text-gray-700">
                      {Number(p.amountPaid).toLocaleString()}
                    </td>
                    <td className={`px-6 py-3.5 text-right font-medium ${
                      Number(p.balance) > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {Number(p.balance).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-gray-600">
                      {new Date(p.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        p.status === 'PAID'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {p.status === 'PAID' ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right space-x-3">
                      <button onClick={() => openEdit(p)} className="text-indigo-600 hover:text-indigo-800 font-medium">Edit</button>
                      <button onClick={() => setDeleteId(p.id)} className="text-red-500 hover:text-red-700 font-medium">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Payment' : 'Record Payment'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tenant</label>
              <select
                value={form.tenantId}
                onChange={e => onTenantChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
                disabled={!!editing}
              >
                <option value="">Select tenant…</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name} — Unit {t.unit.name}</option>
                ))}
              </select>
            </div>

            {selectedTenant && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 text-xs text-indigo-700">
                Unit <strong>{selectedTenant.unit.name}</strong> •{' '}
                Monthly rent: <strong>KSh {Number(selectedTenant.unit.houseType.rentAmount).toLocaleString()}</strong>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Due (KSh)</label>
                <input
                  type="number" value={form.amountDue} onChange={field('amountDue')} min="0" step="100"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid (KSh)</label>
                <input
                  type="number" value={form.amountPaid} onChange={field('amountPaid')} min="0" step="100"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {due > 0 && (
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                <span className="text-gray-500">Balance</span>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    KSh {balance.toLocaleString()}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    previewStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {previewStatus === 'PAID' ? 'Paid' : 'Pending'}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date" value={form.dueDate} onChange={field('dueDate')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                <input
                  type="date" value={form.paymentDate} onChange={field('paymentDate')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
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
    </div>
  );
}

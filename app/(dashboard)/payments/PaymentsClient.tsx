'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';

interface BillingRow {
  type: 'DEPOSIT' | 'RENT'; period: string | null; monthIndex: number; dueDate: string;
  rentAmount: number; servicesTotal: number;
  services: { name: string; units: number | null; amount: number }[];
  amountDue: number; amountPaid: number; balance: number;
  status: string; paymentId: number | null; paymentDate: string | null;
}
interface TenantSchedule {
  id: number; name: string; unitId: number; unitName: string; moveInDate: string;
  rentAmount: number; depositMonths: number; depositAmount: number; rows: BillingRow[];
  totalDue: number; totalPaid: number; totalBalance: number;
}
interface Service { id: number; name: string; type: 'FIXED' | 'PER_UNIT'; unitPrice: number; unitLabel: string | null; active: boolean }

type FilterMode = 'all' | 'pending' | 'paid';

const emptyForm = {
  tenantId: 0, tenantName: '', totalOutstanding: 0, pendingRows: [] as BillingRow[],
  amountPaid: '', paymentDate: '', customLabel: '', customAmount: '',
};

function fmtPeriod(period: string) {
  const [yr, mo] = period.split('-');
  return new Date(parseInt(yr), parseInt(mo) - 1, 1).toLocaleString('default', { month: 'short', year: 'numeric' });
}

export default function PaymentsClient({
  initialSchedule,
  initialServices,
  orgId,
}: {
  initialSchedule: TenantSchedule[];
  initialServices: Service[];
  orgId: string;
}) {
  const router = useRouter();
  const [schedule,      setSchedule]      = useState<TenantSchedule[]>(initialSchedule);
  const [services]                        = useState<Service[]>(initialServices);
  const [filter,        setFilter]        = useState<FilterMode>('all');
  const [expanded,      setExpanded]      = useState<Set<number>>(
    () => new Set(initialSchedule.filter(t => t.totalBalance > 0).map(t => t.id))
  );
  const [showModal,     setShowModal]     = useState(false);
  const [form,          setForm]          = useState(emptyForm);
  const [submitting,    setSubmitting]    = useState(false);
  const [svcModal,      setSvcModal]      = useState<{ tenantId: number; tenantName: string; unitId: number; row: BillingRow } | null>(null);
  const [svcLines,      setSvcLines]      = useState<{ serviceId: string; units: string; amount: number }[]>([]);
  const [svcSubmitting, setSvcSubmitting] = useState(false);
  const [toast,         setToast]         = useState<{ msg: string; type: 'error' | 'success' } | null>(null);

  const refreshTenant = async (tenantId: number) => {
    try {
      const data = await api.get<TenantSchedule[]>(`/payments/schedule?tenantId=${tenantId}`);
      if (data[0]) {
        setSchedule(prev => prev.map(t => t.id === tenantId ? data[0] : t));
      }
    } catch {
      // Fall back to full server refresh if targeted fetch fails
      router.refresh();
    }
  };

  const visible      = schedule.filter(t => filter === 'pending' ? t.totalBalance > 0 : filter === 'paid' ? t.totalBalance <= 0 : true);
  const pendingCount = schedule.filter(t => t.totalBalance > 0).length;

  const customAmt = parseFloat(form.customAmount) || 0;
  const paid      = parseFloat(form.amountPaid) || 0;
  const totalDue  = form.totalOutstanding + customAmt;
  const balance   = totalDue - paid;

  const distribution = (() => {
    let remaining = paid;
    return form.pendingRows.map(row => {
      const toApply    = Math.min(remaining, row.balance);
      remaining        = Math.max(0, remaining - toApply);
      const newBalance = row.balance - toApply;
      return { row, applied: toApply, newBalance, willClear: toApply > 0 && newBalance === 0, partial: toApply > 0 && newBalance > 0, untouched: toApply === 0 };
    });
  })();

  const openTenantRecord = (t: TenantSchedule) => {
    const pendingRows = t.rows.filter(r => r.balance > 0);
    setForm({
      tenantId: t.id, tenantName: t.name, totalOutstanding: t.totalBalance,
      pendingRows, amountPaid: String(t.totalBalance),
      paymentDate: new Date().toISOString().split('T')[0], customLabel: '', customAmount: '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const now          = new Date();
      const targetPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      let remaining      = paid;
      const paidAt       = form.paymentDate || null;

      const depositRow = form.pendingRows.find(r => r.type === 'DEPOSIT');
      if (depositRow && remaining > 0) {
        const toDeposit = Math.min(remaining, depositRow.balance);
        const newPaid   = depositRow.amountPaid + toDeposit;
        if (depositRow.paymentId) {
          await api.patch(`/payments/${depositRow.paymentId}`, {
            amountDue: depositRow.amountDue, amountPaid: newPaid,
            dueDate: depositRow.dueDate.split('T')[0], paymentDate: paidAt,
          });
        } else {
          await api.post(`/tenants/${form.tenantId}/ledger`, { target: 'DEPOSIT', amount: toDeposit, paymentDate: paidAt });
        }
        remaining -= toDeposit;
      }

      if (remaining > 0 || customAmt > 0) {
        await api.post(`/tenants/${form.tenantId}/ledger`, {
          target: targetPeriod, amount: remaining, paymentDate: paidAt,
          customAmount: customAmt || undefined, customLabel: form.customLabel || undefined,
        });
      }

      setShowModal(false);
      await refreshTenant(form.tenantId);
      setToast({ msg: 'Payment recorded successfully', type: 'success' });
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : 'Error saving payment', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const openSvcEdit = (tenantId: number, tenantName: string, unitId: number, row: BillingRow) => {
    const lines = row.services.map(rs => {
      const svc = services.find(s => s.name === rs.name);
      return { serviceId: svc ? String(svc.id) : '', units: rs.units !== null ? String(rs.units) : '', amount: rs.amount };
    });
    setSvcLines(lines.length > 0 ? lines : [{ serviceId: '', units: '', amount: 0 }]);
    setSvcModal({ tenantId, tenantName, unitId, row });
  };

  const calcLineAmount = (serviceId: string, units: string) => {
    const svc = services.find(s => s.id === parseInt(serviceId));
    if (!svc) return 0;
    return svc.type === 'FIXED' ? Number(svc.unitPrice) : Number(svc.unitPrice) * (parseFloat(units) || 0);
  };

  const updateSvcLine = (i: number, field: 'serviceId' | 'units', value: string) => {
    setSvcLines(prev => prev.map((line, idx) => {
      if (idx !== i) return line;
      const next = { ...line, [field]: value };
      next.amount = calcLineAmount(field === 'serviceId' ? value : line.serviceId, field === 'units' ? value : line.units);
      return next;
    }));
  };

  const handleSvcSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!svcModal) return;
    setSvcSubmitting(true);
    try {
      const { tenantId, unitId, row } = svcModal;
      const validLines     = svcLines.filter(l => l.serviceId);
      const serviceCharges = validLines.map(l => ({
        serviceId: parseInt(l.serviceId),
        units: services.find(s => s.id === parseInt(l.serviceId))?.type === 'PER_UNIT' ? parseFloat(l.units) || null : null,
        amount: l.amount,
      }));
      const svcTotal     = serviceCharges.reduce((s, c) => s + c.amount, 0);
      const newAmountDue = row.rentAmount + svcTotal;

      if (row.paymentId) {
        await api.patch(`/payments/${row.paymentId}`, {
          rentAmount: row.rentAmount, amountDue: newAmountDue, amountPaid: row.amountPaid,
          dueDate: row.dueDate.split('T')[0], paymentDate: row.paymentDate ? row.paymentDate.split('T')[0] : null,
          serviceCharges,
        });
      } else {
        await api.post('/payments', {
          tenantId, unitId, period: row.period, rentAmount: row.rentAmount,
          dueDate: row.dueDate.split('T')[0], amountPaid: 0, serviceCharges,
        });
      }
      setSvcModal(null);
      await refreshTenant(tenantId);
      setToast({ msg: 'Services updated', type: 'success' });
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : 'Error saving services', type: 'error' });
    } finally {
      setSvcSubmitting(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = { PAID: 'bg-green-100 text-green-700', PARTIAL: 'bg-amber-100 text-amber-700', PENDING: 'bg-red-100 text-red-700' };
    return `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {schedule.length} tenant{schedule.length !== 1 ? 's' : ''}
            {pendingCount > 0 && <span className="ml-2 text-red-600 font-medium">· {pendingCount} with outstanding balance</span>}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {([{ key: 'all', label: 'All Tenants' }, { key: 'pending', label: 'Pending' }, { key: 'paid', label: 'Fully Paid' }] as { key: FilterMode; label: string }[]).map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === f.key ? 'bg-[#11430F] text-[#e4f386]' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="p-10 text-center text-sm text-gray-400 bg-white rounded-xl border border-gray-200">No tenants found.</div>
      ) : (
        <div className="space-y-2">
          {visible.map(t => {
            const isOpen = expanded.has(t.id);
            const toggle = () => setExpanded(prev => { const next = new Set(prev); isOpen ? next.delete(t.id) : next.add(t.id); return next; });
            return (
              <div key={t.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-gray-50 border-b border-gray-100">
                  <button type="button" onClick={toggle} className="flex items-center gap-3 min-w-0 text-left flex-1">
                    <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-semibold text-gray-900">{t.name}</span>
                      <span className="text-xs text-gray-400">Unit {t.unitName}</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-400">Move-in {new Date(t.moveInDate).toLocaleDateString()}</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-400">Rent KSh {t.rentAmount.toLocaleString()}</span>
                    </div>
                  </button>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-5 text-sm">
                      <div className="text-right"><div className="text-xs text-gray-400">Charged</div><div className="font-medium text-gray-900">KSh {t.totalDue.toLocaleString()}</div></div>
                      <div className="text-right"><div className="text-xs text-gray-400">Paid</div><div className="font-medium text-green-700">KSh {t.totalPaid.toLocaleString()}</div></div>
                      <div className="text-right">
                        <div className="text-xs text-gray-400">{t.totalBalance < 0 ? 'Credit' : 'Outstanding'}</div>
                        <div className={`font-semibold ${t.totalBalance > 0 ? 'text-red-600' : t.totalBalance < 0 ? 'text-blue-700' : 'text-green-700'}`}>
                          {t.totalBalance < 0 ? '-' : ''}KSh {Math.abs(t.totalBalance).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    {t.totalBalance > 0 && (
                      <button type="button" onClick={() => openTenantRecord(t)}
                        className="brand-primary-btn whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors">
                        Record Payment
                      </button>
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div className="overflow-x-auto border-t border-gray-100">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          {['Type','Period','Rent','Services','Total Due','Paid','Balance','Due Date','Paid On','Status',''].map((h, i) => (
                            <th key={i} className={`px-4 py-2.5 text-xs text-gray-500 font-medium ${['Rent','Services','Total Due','Paid','Balance'].includes(h) ? 'text-right' : h === 'Status' ? 'text-center' : 'text-left'}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {t.rows.map((row, i) => (
                          <tr key={i} className={`${row.status === 'PENDING' && row.amountPaid === 0 ? 'bg-red-50/40' : 'hover:bg-gray-50'}`}>
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${row.type === 'DEPOSIT' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                                {row.type === 'DEPOSIT' ? 'Deposit' : 'Rent'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-gray-700 text-xs">
                              {row.type === 'RENT' && row.period ? <div><span className="font-medium">{fmtPeriod(row.period)}</span><span className="text-gray-400 ml-1">Month {row.monthIndex}</span></div> : <span className="text-gray-500">Move-in</span>}
                            </td>
                            <td className="px-4 py-2.5 text-right text-gray-700">{row.rentAmount > 0 ? row.rentAmount.toLocaleString() : '—'}</td>
                            <td className="px-4 py-2.5 text-right text-gray-500">
                              {row.servicesTotal > 0 ? (
                                <span title={row.services.map(s => `${s.name}${s.units !== null ? ` (${s.units})` : ''}: KSh ${s.amount.toLocaleString()}`).join('\n')} className="cursor-help underline decoration-dotted">{row.servicesTotal.toLocaleString()}</span>
                              ) : row.paymentId ? '—' : <span className="text-gray-300 text-xs">not yet recorded</span>}
                            </td>
                            <td className="px-4 py-2.5 text-right font-medium text-gray-800">{row.amountDue.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right text-gray-700">{row.amountPaid > 0 ? row.amountPaid.toLocaleString() : '—'}</td>
                            <td className={`px-4 py-2.5 text-right font-medium ${row.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{row.balance.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">{new Date(row.dueDate).toLocaleDateString()}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">
                              {row.paymentDate ? new Date(row.paymentDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : row.amountPaid > 0 ? <span className="text-amber-500">partial</span> : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {(() => { const s = row.status === 'PENDING' && row.amountPaid > 0 ? 'PARTIAL' : row.status; return <span className={statusBadge(s)}>{s === 'PARTIAL' ? 'Partial' : s.charAt(0) + s.slice(1).toLowerCase()}</span>; })()}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {row.type === 'RENT' && (
                                <button title="Edit Services" onClick={() => openSvcEdit(t.id, t.name, t.unitId, row)}
                                  className="p-1.5 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded-lg transition-colors">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                        <tr>
                          <td colSpan={4} className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Totals</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{t.totalDue.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-green-700">{t.totalPaid.toLocaleString()}</td>
                          <td className={`px-4 py-2.5 text-right font-semibold ${t.totalBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>{t.totalBalance.toLocaleString()}</td>
                          <td colSpan={4} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <Modal title={`Record Payment — ${form.tenantName}`} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {form.pendingRows.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden text-sm">
                <div className="px-3 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">Payment Distribution</div>
                <div className="divide-y divide-gray-100">
                  {distribution.map(({ row, applied, newBalance, willClear, partial, untouched }, i) => (
                    <div key={i} className={`flex items-center justify-between px-3 py-2.5 transition-colors ${willClear ? 'bg-green-50/60' : partial ? 'bg-amber-50/60' : ''}`}>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${row.type === 'DEPOSIT' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                          {row.type === 'DEPOSIT' ? 'Deposit' : row.period ? fmtPeriod(row.period) : 'Rent'}
                        </span>
                        {row.type === 'RENT' && row.period && <span className="text-xs text-gray-400">Month {row.monthIndex}</span>}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {applied > 0 && <span className="text-gray-500">−{applied.toLocaleString()}</span>}
                        <span className={`font-semibold ${willClear ? 'text-green-600' : partial ? 'text-amber-600' : 'text-red-600'}`}>KSh {newBalance.toLocaleString()}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${willClear ? 'bg-green-100 text-green-700' : partial ? 'bg-amber-100 text-amber-700' : untouched ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                          {willClear ? 'Cleared' : partial ? 'Partial' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center px-3 py-2 bg-red-50 border-t border-red-100 font-semibold text-sm">
                  <span className="text-gray-700">Total Outstanding</span>
                  <span className="text-red-600">KSh {form.totalOutstanding.toLocaleString()}</span>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-gray-700">Custom Charge <span className="text-xs font-normal text-gray-400">(optional)</span></p>
              <div className="flex gap-2">
                <input type="text" value={form.customLabel} onChange={e => setForm(f => ({ ...f, customLabel: e.target.value }))}
                  placeholder="Description (e.g. Penalty, Repairs)" className="brand-input flex-1 rounded-lg border px-3 py-2 text-sm" />
                <input type="number" value={form.customAmount} onChange={e => setForm(f => ({ ...f, customAmount: e.target.value }))}
                  placeholder="0" min="0" step="100" className="brand-input w-32 rounded-lg border px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2.5 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600"><span>Outstanding</span><span>KSh {form.totalOutstanding.toLocaleString()}</span></div>
              {customAmt > 0 && <div className="flex justify-between text-amber-700"><span>{form.customLabel || 'Custom charge'}</span><span>+ KSh {customAmt.toLocaleString()}</span></div>}
              <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-1.5"><span>Total to Clear</span><span>KSh {totalDue.toLocaleString()}</span></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid (KSh)</label>
                <input type="number" value={form.amountPaid} onChange={e => setForm(f => ({ ...f, amountPaid: e.target.value }))}
                  min="0" step="100" autoFocus className="brand-input w-full rounded-lg border px-3 py-2 text-sm" required />
              </div>
              <div className="flex flex-col justify-end pb-0.5">
                {totalDue > 0 && (
                  <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <span className={`font-semibold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>Balance: KSh {Math.max(0, balance).toLocaleString()}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${balance <= 0 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{balance <= 0 ? 'Cleared' : 'Partial'}</span>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
              <input type="date" value={form.paymentDate} onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))}
                className="brand-input w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors">Cancel</button>
              <button type="submit" disabled={submitting}
                className="brand-primary-btn flex-1 rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50">
                {submitting ? 'Saving…' : 'Save Payment'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {svcModal && (
        <Modal title={`Services — ${svcModal.tenantName} · ${svcModal.row.period ? fmtPeriod(svcModal.row.period) : ''}`} onClose={() => setSvcModal(null)}>
          <form onSubmit={handleSvcSave} className="space-y-4">
            <p className="text-xs text-gray-500">Add or edit service charges for this month. Leave empty lines to remove.</p>
            <div className="space-y-2">
              {svcLines.map((line, i) => {
                const svc = services.find(s => s.id === parseInt(line.serviceId));
                return (
                  <div key={i} className="flex items-center gap-2">
                    <select value={line.serviceId} onChange={e => updateSvcLine(i, 'serviceId', e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                      <option value="">Select service…</option>
                      {services.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.name} ({s.type === 'FIXED' ? `KSh ${Number(s.unitPrice).toLocaleString()}` : `KSh ${Number(s.unitPrice).toLocaleString()}/${s.unitLabel ?? 'unit'}`})</option>)}
                    </select>
                    {svc?.type === 'PER_UNIT' && (
                      <input type="number" value={line.units} onChange={e => updateSvcLine(i, 'units', e.target.value)}
                        placeholder={svc.unitLabel ?? 'Units'} min="0" step="1"
                        className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    )}
                    <div className="w-28 text-right text-sm font-medium text-gray-700 border border-gray-200 bg-gray-50 rounded-lg px-3 py-2">
                      {line.amount > 0 ? `KSh ${line.amount.toLocaleString()}` : '—'}
                    </div>
                    <button type="button" onClick={() => setSvcLines(prev => prev.filter((_, idx) => idx !== i))}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                );
              })}
            </div>
            <button type="button" onClick={() => setSvcLines(prev => [...prev, { serviceId: '', units: '', amount: 0 }])}
              className="text-sm text-teal-600 hover:text-teal-800 font-medium flex items-center gap-1">
              <span className="text-lg leading-none">+</span> Add service line
            </button>
            {svcLines.some(l => l.amount > 0) && (
              <div className="bg-gray-50 rounded-lg px-3 py-2.5 space-y-1 text-sm">
                <div className="flex justify-between text-gray-600"><span>Rent</span><span>KSh {svcModal.row.rentAmount.toLocaleString()}</span></div>
                <div className="flex justify-between text-gray-600"><span>Services total</span><span>KSh {svcLines.reduce((s, l) => s + l.amount, 0).toLocaleString()}</span></div>
                <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-1.5"><span>New Total Due</span><span>KSh {(svcModal.row.rentAmount + svcLines.reduce((s, l) => s + l.amount, 0)).toLocaleString()}</span></div>
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setSvcModal(null)}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors">Cancel</button>
              <button type="submit" disabled={svcSubmitting}
                className="flex-1 bg-teal-600 text-white rounded-lg py-2 text-sm hover:bg-teal-700 disabled:opacity-50 transition-colors font-medium">
                {svcSubmitting ? 'Saving…' : 'Save Services'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

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
  depositMonths: number;
  houseTypeId: number;
}

interface Tenant {
  id: number;
  name: string;
  phone: string;
  houseTypeId: number;
  unitId: number;
  moveInDate: string;
  idNumber: string | null;
  country: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  householdCount: number;
  householdMembers: string | null;
  houseType: HouseType;
  unit: Unit;
}

const blankForm = {
  name: '', phone: '', houseTypeId: '', unitId: '', moveInDate: '',
  idNumber: '', country: '', emergencyContact: '', emergencyPhone: '',
  householdCount: '1', householdMembers: '',
};

interface BillingRow {
  type:          'DEPOSIT' | 'RENT';
  period:        string | null;
  monthIndex:    number;
  dueDate:       string;
  rentAmount:    number;
  servicesTotal: number;
  services:      { name: string; units: number | null; amount: number }[];
  amountDue:     number;
  amountPaid:    number;
  balance:       number;
  status:        string;
  paymentId:     number | null;
  paymentDate:   string | null;
}

interface TenantSchedule {
  id:            number;
  name:          string;
  unitName:      string;
  moveInDate:    string;
  rentAmount:    number;
  depositMonths: number;
  depositAmount: number;
  rows:          BillingRow[];
  totalDue:      number;
  totalPaid:     number;
  totalBalance:  number;
}

function fmtPeriod(period: string): string {
  const [yr, mo] = period.split('-');
  return new Date(parseInt(yr), parseInt(mo) - 1, 1)
    .toLocaleString('default', { month: 'short', year: 'numeric' });
}

export default function TenantsPage() {
  const [tenants,      setTenants]      = useState<Tenant[]>([]);
  const [types,        setTypes]        = useState<HouseType[]>([]);
  const [units,        setUnits]        = useState<Unit[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showModal,    setShowModal]    = useState(false);
  const [editing,      setEditing]      = useState<Tenant | null>(null);
  const [form,         setForm]         = useState(blankForm);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [deleteId,       setDeleteId]       = useState<number | null>(null);
  const [infoTenant,     setInfoTenant]     = useState<Tenant | null>(null);
  const [paymentTenant,  setPaymentTenant]  = useState<Tenant | null>(null);
  const [paymentSchedule, setPaymentSchedule] = useState<TenantSchedule | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [toast,          setToast]          = useState<{ msg: string; type: 'error' | 'success' } | null>(null);

  const load = () => {
    setLoading(true);
    Promise.allSettled([
      api.get<Tenant[]>('/tenants'),
      api.get<HouseType[]>('/house-types'),
    ])
      .then(([tr, htr]) => {
        if (tr.status  === 'fulfilled') setTenants(tr.value);
        if (htr.status === 'fulfilled') setTypes(htr.value);
      })
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
    setForm(blankForm);
    setUnits([]);
    setShowModal(true);
  };

  const openEdit = async (t: Tenant) => {
    setEditing(t);
    setForm({
      name:             t.name,
      phone:            t.phone,
      houseTypeId:      String(t.houseTypeId),
      unitId:           String(t.unitId),
      moveInDate:       t.moveInDate.split('T')[0],
      idNumber:         t.idNumber        ?? '',
      country:          t.country         ?? '',
      emergencyContact: t.emergencyContact ?? '',
      emergencyPhone:   t.emergencyPhone  ?? '',
      householdCount:   String(t.householdCount ?? 1),
      householdMembers: t.householdMembers ?? '',
    });
    await fetchUnits(String(t.houseTypeId), t.unitId);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name:             form.name,
        phone:            form.phone,
        houseTypeId:      parseInt(form.houseTypeId),
        unitId:           parseInt(form.unitId),
        moveInDate:       form.moveInDate,
        idNumber:         form.idNumber        || null,
        country:          form.country         || null,
        emergencyContact: form.emergencyContact || null,
        emergencyPhone:   form.emergencyPhone  || null,
        householdCount:   parseInt(form.householdCount) || 1,
        householdMembers: form.householdMembers || null,
      };
      if (editing) await api.patch(`/tenants/${editing.id}`, payload);
      else         await api.post('/tenants', payload);
      setShowModal(false);
      load();
      setToast({ msg: editing ? 'Tenant updated successfully' : 'Tenant added successfully', type: 'success' });
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : 'Error saving tenant', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/tenants/${id}`);
      setDeleteId(null);
      load();
      setToast({ msg: 'Tenant removed', type: 'error' });
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : 'Error deleting tenant', type: 'error' });
    }
  };

  const openPaymentStatus = async (t: Tenant) => {
    setPaymentTenant(t);
    setPaymentSchedule(null);
    setPaymentLoading(true);
    try {
      const data = await api.get<TenantSchedule[]>(`/payments/schedule?tenantId=${t.id}`);
      setPaymentSchedule(data[0] ?? null);
    } catch {
      setToast({ msg: 'Failed to load payment status', type: 'error' });
    } finally {
      setPaymentLoading(false);
    }
  };

  // Parse household members from stored string (newline or comma separated)
  const parseMembers = (raw: string | null): string[] =>
    raw ? raw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#11430F]">Tenants</h1>
          <p className="mt-0.5 text-sm text-[#11430F]/60">{tenants.length} tenant{tenants.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={openAdd}
          className="brand-primary-btn whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors"
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
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">House Type</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Move-in</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tenants.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3.5">
                      <div className="font-medium text-gray-900">{t.name}</div>
                      {t.idNumber && (
                        <div className="text-xs text-gray-400">ID: {t.idNumber}</div>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-gray-600">{t.phone}</td>
                    <td className="px-6 py-3.5 font-semibold text-gray-900">{t.unit.name}</td>
                    <td className="px-6 py-3.5 text-gray-600">{t.houseType.name}</td>
                    <td className="px-6 py-3.5 text-gray-600">
                      {new Date(t.moveInDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Info */}
                        <button
                          onClick={() => setInfoTenant(t)}
                          title="Client Details"
                          className="p-1.5 text-sky-500 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="16" x2="12" y2="12"/>
                            <line x1="12" y1="8" x2="12.01" y2="8"/>
                          </svg>
                        </button>
                        {/* Payment Status */}
                        <button
                          onClick={() => openPaymentStatus(t)}
                          title="Payment Status"
                          className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                            <line x1="1" y1="10" x2="23" y2="10"/>
                          </svg>
                        </button>
                        {/* Edit */}
                        <button onClick={() => openEdit(t)} title="Edit" className="brand-edit-btn rounded-lg p-1.5 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        {/* Delete */}
                        <button onClick={() => setDeleteId(t.id)} title="Remove" className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors">
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

      {/* Add / Edit tenant modal */}
      {showModal && (
        <Modal title={editing ? 'Edit Tenant' : 'Add Tenant'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Basic info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input type="text" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. John Mwangi"
                  className="brand-input w-full rounded-lg border px-3 py-2 text-sm"
                  required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input type="tel" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="e.g. 0712345678"
                  className="brand-input w-full rounded-lg border px-3 py-2 text-sm"
                  required />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
                <input type="text" value={form.idNumber}
                  onChange={e => setForm(f => ({ ...f, idNumber: e.target.value }))}
                  placeholder="National ID / Passport"
                  className="brand-input w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input type="text" value={form.country}
                  onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                  placeholder="e.g. Kenya"
                  className="brand-input w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
            </div>

            {/* House */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">House Type</label>
                <select value={form.houseTypeId} onChange={e => onTypeChange(e.target.value)}
                  className="brand-input w-full rounded-lg border px-3 py-2 text-sm"
                  required>
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
                <select value={form.unitId}
                  onChange={e => setForm(f => ({ ...f, unitId: e.target.value }))}
                  className="brand-input w-full rounded-lg border px-3 py-2 text-sm disabled:bg-gray-50"
                  disabled={!form.houseTypeId || loadingUnits}
                  required>
                  <option value="">
                    {!form.houseTypeId ? 'Select a house type first…'
                      : loadingUnits ? 'Loading units…'
                      : units.length === 0 ? 'No vacant units available'
                      : 'Select a unit…'}
                  </option>
                  {units.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name}{editing && u.id === editing.unitId ? ' (current)' : ''}
                    </option>
                  ))}
                </select>
                {form.houseTypeId && !loadingUnits && units.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No vacant units. Add more units first.</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Move-in Date</label>
              <input type="date" value={form.moveInDate}
                onChange={e => setForm(f => ({ ...f, moveInDate: e.target.value }))}
                className="brand-input w-full rounded-lg border px-3 py-2 text-sm"
                required />
            </div>

            {/* Emergency contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Name</label>
                <input type="text" value={form.emergencyContact}
                  onChange={e => setForm(f => ({ ...f, emergencyContact: e.target.value }))}
                  placeholder="e.g. Jane Mwangi"
                  className="brand-input w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Phone</label>
                <input type="tel" value={form.emergencyPhone}
                  onChange={e => setForm(f => ({ ...f, emergencyPhone: e.target.value }))}
                  placeholder="e.g. 0722000000"
                  className="brand-input w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
            </div>

            {/* Household */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Number of People in Household</label>
              <input type="number" value={form.householdCount} min="1"
                onChange={e => setForm(f => ({ ...f, householdCount: e.target.value }))}
                className="brand-input w-24 rounded-lg border px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Household Members <span className="font-normal text-gray-400">(names, one per line)</span>
              </label>
              <textarea value={form.householdMembers}
                onChange={e => setForm(f => ({ ...f, householdMembers: e.target.value }))}
                placeholder={"Alice Mwangi\nBob Mwangi"}
                rows={3}
                className="brand-input w-full resize-none rounded-lg border px-3 py-2 text-sm" />
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submitting || !form.unitId}
                className="brand-primary-btn flex-1 rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50">
                {submitting ? 'Saving…' : editing ? 'Save Changes' : 'Add Tenant'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Client details info modal */}
      {infoTenant && (
        <Modal title={`Client Details — ${infoTenant.name}`} onClose={() => setInfoTenant(null)}>
          <div className="space-y-4 text-sm">

            {/* Identity */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Identity</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <div>
                  <div className="text-xs text-gray-400">Full Name</div>
                  <div className="font-medium text-gray-900">{infoTenant.name}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Phone</div>
                  <div className="text-gray-700">{infoTenant.phone}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">ID / Passport Number</div>
                  <div className="text-gray-700">{infoTenant.idNumber || <span className="text-gray-300">—</span>}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Country</div>
                  <div className="text-gray-700">{infoTenant.country || <span className="text-gray-300">—</span>}</div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100" />

            {/* Residence */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Residence</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <div>
                  <div className="text-xs text-gray-400">Unit</div>
                  <div className="font-semibold text-gray-900">{infoTenant.unit.name}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">House Type</div>
                  <div className="text-gray-700">{infoTenant.houseType.name}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Move-in Date</div>
                  <div className="text-gray-700">{new Date(infoTenant.moveInDate).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100" />

            {/* Emergency contact */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Emergency Contact</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <div>
                  <div className="text-xs text-gray-400">Name</div>
                  <div className="text-gray-700">{infoTenant.emergencyContact || <span className="text-gray-300">—</span>}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Phone</div>
                  <div className="text-gray-700">{infoTenant.emergencyPhone || <span className="text-gray-300">—</span>}</div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100" />

            {/* Household */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Household</h3>
              <div className="mb-2">
                <div className="text-xs text-gray-400">Number of People</div>
                <div className="text-gray-700 font-medium">{infoTenant.householdCount}</div>
              </div>
              {parseMembers(infoTenant.householdMembers).length > 0 ? (
                <div>
                  <div className="text-xs text-gray-400 mb-1">Members</div>
                  <ul className="space-y-1">
                    {parseMembers(infoTenant.householdMembers).map((m, i) => (
                      <li key={i} className="flex items-center gap-2 text-gray-700">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-medium flex-shrink-0">
                          {i + 1}
                        </span>
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-xs text-gray-300">No members listed.</div>
              )}
            </div>

            <div className="pt-1">
              <button
                onClick={() => { setInfoTenant(null); openEdit(infoTenant); }}
                className="w-full border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors"
              >
                Edit Details
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Payment Status modal */}
      {paymentTenant && (
        <Modal
          title={`Payment Status — ${paymentTenant.name}`}
          onClose={() => { setPaymentTenant(null); setPaymentSchedule(null); }}
          size="lg"
        >
          {paymentLoading ? (
            <div className="py-10 text-center text-sm text-gray-400">Loading…</div>
          ) : !paymentSchedule ? (
            <div className="py-10 text-center text-sm text-gray-400">No data available.</div>
          ) : (
            <div className="space-y-5">
              {/* Tenant meta */}
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
                <span><span className="text-gray-400">Unit:</span> <span className="font-medium text-gray-900">{paymentSchedule.unitName}</span></span>
                <span><span className="text-gray-400">Rent:</span> <span className="font-medium text-gray-900">KSh {paymentSchedule.rentAmount.toLocaleString()}/mo</span></span>
                <span><span className="text-gray-400">Move-in:</span> <span className="font-medium text-gray-900">{new Date(paymentSchedule.moveInDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span></span>
                <span><span className="text-gray-400">Deposit:</span> <span className="font-medium text-gray-900">KSh {paymentSchedule.depositAmount.toLocaleString()} ({paymentSchedule.depositMonths} mo)</span></span>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-gray-200 px-4 py-3 text-center">
                  <div className="text-xs text-gray-400 mb-1">Total Charged</div>
                  <div className="text-lg font-semibold text-gray-900">KSh {paymentSchedule.totalDue.toLocaleString()}</div>
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-center">
                  <div className="text-xs text-green-600 mb-1">Total Paid</div>
                  <div className="text-lg font-semibold text-green-700">KSh {paymentSchedule.totalPaid.toLocaleString()}</div>
                </div>
                <div className={`rounded-lg border px-4 py-3 text-center ${paymentSchedule.totalBalance > 0 ? 'border-red-200 bg-red-50' : paymentSchedule.totalBalance < 0 ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-green-50'}`}>
                  <div className={`text-xs mb-1 ${paymentSchedule.totalBalance > 0 ? 'text-red-500' : paymentSchedule.totalBalance < 0 ? 'text-blue-600' : 'text-green-600'}`}>
                    {paymentSchedule.totalBalance < 0 ? 'Credit (Overpaid)' : 'Outstanding'}
                  </div>
                  <div className={`text-lg font-semibold ${paymentSchedule.totalBalance > 0 ? 'text-red-600' : paymentSchedule.totalBalance < 0 ? 'text-blue-700' : 'text-green-700'}`}>
                    KSh {Math.abs(paymentSchedule.totalBalance).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Breakdown table */}
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-3 py-2.5 text-gray-500 font-medium">Type</th>
                      <th className="text-left px-3 py-2.5 text-gray-500 font-medium">Period</th>
                      <th className="text-right px-3 py-2.5 text-gray-500 font-medium">Rent</th>
                      <th className="text-right px-3 py-2.5 text-gray-500 font-medium">Services</th>
                      <th className="text-right px-3 py-2.5 text-gray-500 font-medium">Due</th>
                      <th className="text-right px-3 py-2.5 text-gray-500 font-medium">Paid</th>
                      <th className="text-right px-3 py-2.5 text-gray-500 font-medium">Balance</th>
                      <th className="text-left px-3 py-2.5 text-gray-500 font-medium">Due Date</th>
                      <th className="text-left px-3 py-2.5 text-gray-500 font-medium">Paid On</th>
                      <th className="text-center px-3 py-2.5 text-gray-500 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paymentSchedule.rows.map((row, i) => {
                      const displayStatus = row.status === 'PENDING' && row.amountPaid > 0 ? 'PARTIAL' : row.status;
                      const statusClass = displayStatus === 'PAID'
                        ? 'bg-green-100 text-green-700'
                        : displayStatus === 'PARTIAL'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700';
                      return (
                        <tr key={i} className={row.status === 'PENDING' && row.amountPaid === 0 ? 'bg-red-50/30' : 'hover:bg-gray-50'}>
                          <td className="px-3 py-2">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${row.type === 'DEPOSIT' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                              {row.type === 'DEPOSIT' ? 'Deposit' : 'Rent'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-700">
                            {row.type === 'RENT' && row.period ? (
                              <span>{fmtPeriod(row.period)} <span className="text-gray-400">#{row.monthIndex}</span></span>
                            ) : (
                              <span className="text-gray-500">Move-in</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700">
                            {row.rentAmount > 0 ? row.rentAmount.toLocaleString() : '—'}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-500">
                            {row.servicesTotal > 0 ? (
                              <span title={row.services.map(s => `${s.name}: KSh ${s.amount.toLocaleString()}`).join('\n')} className="cursor-help underline decoration-dotted">
                                {row.servicesTotal.toLocaleString()}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-gray-800">{row.amountDue.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right text-gray-700">{row.amountPaid > 0 ? row.amountPaid.toLocaleString() : '—'}</td>
                          <td className={`px-3 py-2 text-right font-medium ${row.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {row.balance.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-gray-500">{new Date(row.dueDate).toLocaleDateString()}</td>
                          <td className="px-3 py-2 text-gray-500">
                            {row.paymentDate
                              ? new Date(row.paymentDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
                              : row.amountPaid > 0
                                ? <span className="text-amber-500">partial</span>
                                : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${statusClass}`}>
                              {displayStatus === 'PARTIAL' ? 'Partial' : displayStatus.charAt(0) + displayStatus.slice(1).toLowerCase()}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                    <tr>
                      <td colSpan={4} className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Totals</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-gray-900">{paymentSchedule.totalDue.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-green-700">{paymentSchedule.totalPaid.toLocaleString()}</td>
                      <td className={`px-3 py-2.5 text-right font-semibold ${paymentSchedule.totalBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {paymentSchedule.totalBalance.toLocaleString()}
                      </td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
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

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const EMPTY_FORM = {
  ReportType: '',
  ReportTitle: '',
  ReportDescription: '',
  ReportDate: '',
  ReportLocation: '',
  ReportLGA: '',
  ReportState: '',
  ReportRegion: ''
};

const FIELD_LABELS = {
  ReportType: 'Report type',
  ReportTitle: 'Report title',
  ReportDescription: 'Description',
  ReportDate: 'Incident date',
  ReportLocation: 'Location',
  ReportLGA: 'LGA / Area Council',
  ReportState: 'State / FCT',
  ReportRegion: 'Region'
};

async function apiRequest(url, options = {}) {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || `Request failed (${response.status})`);
  }
  return payload;
}

function toDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function App() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest('/api/reports');
      setReports(result.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const filteredReports = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return reports;
    return reports.filter((report) =>
      [
        report.ReportType,
        report.ReportTitle,
        report.ReportDescription,
        report.ReportLocation,
        report.ReportLGA,
        report.ReportState,
        report.ReportRegion
      ].some((value) => String(value || '').toLowerCase().includes(term))
    );
  }, [reports, search]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function startEdit(report) {
    setForm({
      ReportType: report.ReportType || '',
      ReportTitle: report.ReportTitle || '',
      ReportDescription: report.ReportDescription || '',
      ReportDate: toDateInput(report.ReportDate),
      ReportLocation: report.ReportLocation || '',
      ReportLGA: report.ReportLGA || '',
      ReportState: report.ReportState || '',
      ReportRegion: report.ReportRegion || ''
    });
    setEditingId(report._id);
    setSelectedReport(null);
    setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submitForm(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');

    const payload = {
      ...form,
      ReportDate: new Date(form.ReportDate).toISOString()
    };

    try {
      if (editingId) {
        await apiRequest(`/api/reports/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        setNotice('Report updated successfully.');
      } else {
        await apiRequest('/api/reports', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setNotice('Report captured successfully.');
      }

      resetForm();
      await loadReports();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteReport(report) {
    const confirmed = window.confirm(
      `Permanently delete "${report.ReportTitle}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    setError('');
    setNotice('');
    try {
      await apiRequest(`/api/reports/${report._id}`, { method: 'DELETE' });
      setNotice('Report deleted successfully.');
      if (selectedReport?._id === report._id) setSelectedReport(null);
      if (editingId === report._id) resetForm();
      await loadReports();
    } catch (err) {
      setError(err.message);
    }
  }

  async function createCollection() {
    setError('');
    setNotice('');
    try {
      const result = await apiRequest('/api/create-reports-collection', {
        method: 'POST'
      });
      setNotice(result.message);
      await loadReports();
    } catch (err) {
      setError(err.message);
    }
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? '—'
      : date.toLocaleString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">R</div>
          <div>
            <div className="brand-title">Reports Management</div>
            <div className="brand-subtitle">Conflict incident reporting</div>
          </div>
        </div>
        <button className="button button-outline top-action" onClick={createCollection}>
          Create collection
        </button>
      </header>

      <main className="main-content">
        <section className="page-heading">
          <div>
            <p className="eyebrow">INCIDENT DATABASE</p>
            <h1>Reports</h1>
            <p className="muted">Capture, review and manage conflict incident reports.</p>
          </div>
          <div className="stats-card">
            <span className="stats-number">{reports.length}</span>
            <span className="stats-label">Total reports</span>
          </div>
        </section>

        {error && <div className="alert alert-error" role="alert">{error}</div>}
        {notice && <div className="alert alert-success" role="status">{notice}</div>}


  <section className="panel form-panel">
          <div className="panel-heading">
            <div>
              <h2>{editingId ? 'Update report' : 'Capture a report'}</h2>
              <p className="muted">Complete the fields below. All fields are required.</p>
            </div>
            {editingId && (
              <button className="button button-light" type="button" onClick={resetForm}>
                Cancel edit
              </button>
            )}
          </div>

          <form onSubmit={submitForm}>
            <div className="form-grid">
              <label>
                {FIELD_LABELS.ReportType}
                <input name="ReportType" value={form.ReportType} onChange={updateField}
                  placeholder="e.g. Armed conflict" required />
              </label>
              <label>
                {FIELD_LABELS.ReportTitle}
                <input name="ReportTitle" value={form.ReportTitle} onChange={updateField}
                  placeholder="Short incident title" required />
              </label>
              <label className="full-width">
                {FIELD_LABELS.ReportDescription}
                <textarea name="ReportDescription" value={form.ReportDescription}
                  onChange={updateField} rows="4" placeholder="Describe what happened..."
                  required />
              </label>
              <label>
                {FIELD_LABELS.ReportDate}
                <input type="datetime-local" name="ReportDate" value={form.ReportDate}
                  onChange={updateField} required />
              </label>
              <label>
                {FIELD_LABELS.ReportLocation}
                <input name="ReportLocation" value={form.ReportLocation} onChange={updateField}
                  placeholder="Community / town" required />
              </label>
              <label>
                {FIELD_LABELS.ReportLGA}
                <input name="ReportLGA" value={form.ReportLGA} onChange={updateField}
                  placeholder="LGA / Area Council" required />
              </label>
              <label>
                {FIELD_LABELS.ReportState}
                <input name="ReportState" value={form.ReportState} onChange={updateField}
                  placeholder="State or FCT" required />
              </label>
              <label>
                {FIELD_LABELS.ReportRegion}
                <input name="ReportRegion" value={form.ReportRegion} onChange={updateField}
                  placeholder="e.g. North Central" required />
              </label>
            </div>

            <div className="form-actions">
              <button className="button button-primary" type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Save changes' : 'Save report'}
              </button>
              <button className="button button-light" type="button" onClick={resetForm}>
                Clear form
              </button>
            </div>
          </form>
        </section>



        <section className="panel list-panel">
          <div className="panel-heading list-heading">
            <div>
              <h2>All reports</h2>
              <p className="muted">{filteredReports.length} of {reports.length} reports displayed</p>
            </div>
            <div className="list-tools">
              <input
                className="search-input"
                type="search"
                placeholder="Search reports..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <button className="button button-light" onClick={loadReports} disabled={loading}>
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">Loading reports...</div>
          ) : filteredReports.length === 0 ? (
            <div className="empty-state">
              {reports.length === 0 ? 'No reports have been captured yet.' : 'No matching reports found.'}
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Report</th>
                    <th>Type</th>
                    <th>Incident date</th>
                    <th>Location</th>
                    <th>State / Region</th>
                    <th className="actions-heading">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((report) => (
                    <tr key={report._id}>
                      <td>
                        <button className="report-title-link"
                          onClick={() => setSelectedReport(report)}>
                          {report.ReportTitle}
                        </button>
                        <div className="subcell">{report.ReportLGA || '—'}</div>
                      </td>
                      <td><span className="type-pill">{report.ReportType}</span></td>
                      <td>{formatDate(report.ReportDate)}</td>
                      <td>{report.ReportLocation || '—'}</td>
                      <td>
                        {report.ReportState || '—'}
                        <div className="subcell">{report.ReportRegion || '—'}</div>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button className="text-button" onClick={() => setSelectedReport(report)}>
                            View
                          </button>
                          <button className="text-button" onClick={() => startEdit(report)}>
                            Edit
                          </button>
                          <button className="text-button danger-text" onClick={() => deleteReport(report)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        
        </section>

        {selectedReport && (
          <div className="modal-backdrop" onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedReport(null);
          }}>
            <section className="modal" role="dialog" aria-modal="true" aria-labelledby="detail-title">
              <div className="modal-heading">
                <div>
                  <p className="eyebrow">REPORT DETAILS</p>
                  <h2 id="detail-title">{selectedReport.ReportTitle}</h2>
                </div>
                <button className="icon-button" onClick={() => setSelectedReport(null)}
                  aria-label="Close details">×</button>
              </div>
              <div className="detail-grid">
                {fieldsForDetails(selectedReport, formatDate).map(([label, value]) => (
                  <div className="detail-item" key={label}>
                    <span>{label}</span>
                    <p>{value || '—'}</p>
                  </div>
                ))}
              </div>
              <div className="modal-actions">
                <button className="button button-primary" onClick={() => startEdit(selectedReport)}>
                  Edit report
                </button>
                <button className="button button-light" onClick={() => setSelectedReport(null)}>
                  Close
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
      <footer className="footer">Reports Management · MongoDB database: testDB · Collection: Reports</footer>
    </div>
  );
}

function fieldsForDetails(report, formatDate) {
  return [
    ['Report type', report.ReportType],
    ['Incident date', formatDate(report.ReportDate)],
    ['Description', report.ReportDescription],
    ['Location', report.ReportLocation],
    ['LGA / Area Council', report.ReportLGA],
    ['State / FCT', report.ReportState],
    ['Region', report.ReportRegion],
    ['MongoDB document ID', report._id]
  ];
}

export default App;

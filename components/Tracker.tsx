'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Task,
  parseSheets,
  isDone,
  isOverdue,
  formatDisplayDate,
  normalizeDate
} from '../lib/model';
import {
  LayoutDashboard,
  BriefcaseBusiness,
  ClipboardList,
  RefreshCcw,
  Plus,
  Search,
  Save,
  X,
  Loader2,
  CheckCircle2,
  Clock,
  History,
  FileEdit,
  Trash2,
  Layers,
  ArrowRight
} from 'lucide-react';
import AnalyticsCharts from './AnalyticsCharts';

const empty = {
  change: '',
  type: 'Change',
  givenDate: new Date().toISOString().slice(0, 10),
  approval: 'FALSE',
  status: 'Listed',
  deliverDate: '',
  dueDate: '',
  assignee: ''
};

type Edit = typeof empty & { client: string; row?: number };

type ActivityLog = {
  id: string;
  action: 'create' | 'update' | 'delete' | 'sync';
  client: string;
  change: string;
  type?: string;
  status?: string;
  timestamp: string;
};

function isApproved(approval: string) {
  return ['true', 'yes', '1', 'approved'].includes((approval || '').trim().toLowerCase());
}

function getStatusPill(status: string, overdue: boolean) {
  const s = (status || '').trim().toLowerCase();
  if (isDone(s)) return <span className="pill done">Done</span>;
  if (overdue) return <span className="pill late">{status || 'Overdue'}</span>;
  if (s === 'progress' || s === 'in progress') return <span className="pill progress">Progress</span>;
  if (s === 'listed') return <span className="pill listed">Listed</span>;
  return <span className="pill pending">{status || 'Listed'}</span>;
}

function matchesDateFilter(
  t: Task,
  preset: string,
  field: 'givenDate' | 'dueDate' | 'deliverDate',
  start: string,
  end: string
): boolean {
  if (preset === 'all' && !start && !end) return true;
  const raw = t[field];
  if (!raw) return false;
  const val = normalizeDate(raw);
  if (!val || !/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;

  const now = new Date();
  const today = now.toLocaleDateString('en-CA');

  if (preset === 'today') {
    return val === today;
  }

  if (preset === '7days') {
    const d7 = new Date();
    d7.setDate(now.getDate() - 7);
    const d7Str = d7.toLocaleDateString('en-CA');
    return val >= d7Str && val <= today;
  }

  if (preset === '30days') {
    const d30 = new Date();
    d30.setDate(now.getDate() - 30);
    const d30Str = d30.toLocaleDateString('en-CA');
    return val >= d30Str && val <= today;
  }

  if (preset === 'thisMonth') {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return val.startsWith(`${y}-${m}`);
  }

  if (preset === 'custom') {
    if (start && val < start) return false;
    if (end && val > end) return false;
    return true;
  }

  return true;
}

function formatTimeAgo(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return date.toLocaleDateString();
  } catch {
    return 'Recent';
  }
}

export default function Tracker({ initialClient }: { initialClient?: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<string[]>([]);
  const [selected, setSelected] = useState(initialClient || 'All clients');
  const [view, setView] = useState<'dashboard' | 'tasks' | 'clients' | 'logs'>('dashboard');
  const [overviewTab, setOverviewTab] = useState<'recent' | 'priority'>('recent');
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [logsTab, setLogsTab] = useState<'actions' | 'sheetChanges'>('actions');
  const [query, setQuery] = useState('');
  const [clientQuery, setClientQuery] = useState('');
  const [logSearch, setLogSearch] = useState('');
  const [logFilter, setLogFilter] = useState<'all' | 'create' | 'update' | 'delete' | 'sync'>('all');
  const [filter, setFilter] = useState('All');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | '7days' | '30days' | 'thisMonth' | 'custom'>('all');
  const [dateField, setDateField] = useState<'givenDate' | 'dueDate' | 'deliverDate'>('givenDate');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [editing, setEditing] = useState<Edit | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  // Load activity logs from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('apptimate_activity_logs');
      if (saved) {
        setLogs(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const addLog = (entry: Omit<ActivityLog, 'id' | 'timestamp'>) => {
    const newLog: ActivityLog = {
      ...entry,
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toISOString()
    };
    setLogs((prev) => {
      const updated = [newLog, ...prev].slice(0, 100);
      try {
        localStorage.setItem('apptimate_activity_logs', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const clearLogs = () => {
    if (confirm('Clear your local activity log history?')) {
      setLogs([]);
      try {
        localStorage.removeItem('apptimate_activity_logs');
      } catch {}
    }
  };

  async function api(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', body?: unknown) {
    const r = await fetch('/api/workbook', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store'
    });
    const data = await r.json();
    if (!r.ok) throw Error(data.error || 'Request failed');
    return data;
  }

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const d = await api('GET');
      setTasks(parseSheets(d.sheets));
      setClients(
        d.sheets
          .filter((s: { name: string; values: unknown[][] }) =>
            s.values.length && s.values[0].some((x) => String(x).trim().toLowerCase() === 'changes')
          )
          .map((s: { name: string }) => s.name)
      );
      if (!initialLoading) {
        addLog({
          action: 'sync',
          client: 'Google Sheets',
          change: `Synchronized ${d.sheets.length} client worksheets`
        });
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const visible = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (selected === 'All clients' || t.client === selected) &&
          (filter === 'All' ||
            (filter === 'Overdue'
              ? isOverdue(t)
              : filter === 'Listed'
              ? t.status.toLowerCase() === 'listed'
              : filter === 'Progress'
              ? t.status.toLowerCase() === 'progress'
              : filter === 'Done'
              ? isDone(t.status)
              : filter === 'Pending'
              ? !isDone(t.status)
              : t.status.toLowerCase() === filter.toLowerCase())) &&
          matchesDateFilter(t, datePreset, dateField, startDate, endDate) &&
          `${t.client} ${t.change} ${t.type} ${t.status} ${t.approval} ${t.assignee} ${formatDisplayDate(t.givenDate)} ${formatDisplayDate(t.dueDate)}`
            .toLowerCase()
            .includes(query.toLowerCase())
      ),
    [tasks, selected, filter, datePreset, dateField, startDate, endDate, query]
  );

  const filteredClients = useMemo(
    () => clients.filter((c) => c.toLowerCase().includes(clientQuery.toLowerCase())),
    [clients, clientQuery]
  );

  const pending = tasks.filter((t) => !isDone(t.status));
  const overdue = tasks.filter(isOverdue);
  const completed = tasks.filter((t) => isDone(t.status));

  // Recent works: newest givenDate first, then latest row
  const recentWorks = useMemo(() => {
    return [...tasks]
      .sort((a, b) => {
        const da = normalizeDate(a.givenDate);
        const db = normalizeDate(b.givenDate);
        if (db !== da) return db.localeCompare(da);
        return (b.row || 0) - (a.row || 0);
      })
      .slice(0, 20);
  }, [tasks]);

  // Priority works: overdue first, then pending
  const priorityWorks = useMemo(() => {
    return [...overdue, ...pending.filter((t) => !isOverdue(t))].slice(0, 20);
  }, [overdue, pending]);

  // Filtered Activity Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const matchAction = logFilter === 'all' || l.action === logFilter;
      const matchSearch =
        !logSearch ||
        `${l.client} ${l.change} ${l.action}`.toLowerCase().includes(logSearch.toLowerCase());
      return matchAction && matchSearch;
    });
  }, [logs, logFilter, logSearch]);

  async function save() {
    if (!editing) return;
    setLoading(true);
    setError('');
    try {
      await api(editing.row ? 'PATCH' : 'POST', {
        client: editing.client,
        row: editing.row,
        task: editing
      });

      addLog({
        action: editing.row ? 'update' : 'create',
        client: editing.client,
        change: editing.change,
        type: editing.type,
        status: editing.status
      });

      setEditing(null);
      await refresh();
      setNotice('Saved to Google Sheets');
      setTimeout(() => setNotice(''), 3000);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!editing?.row || !confirm('Delete this task permanently?')) return;
    setLoading(true);
    try {
      await api('DELETE', { client: editing.client, row: editing.row });

      addLog({
        action: 'delete',
        client: editing.client,
        change: editing.change
      });

      setEditing(null);
      await refresh();
      setNotice('Task deleted from Google Sheets');
      setTimeout(() => setNotice(''), 3000);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const openNew = (client?: string) =>
    setEditing({
      ...empty,
      client: client || (selected !== 'All clients' ? selected : clients[0] || '')
    });

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brandIcon">A</span>
          <span>
            Apptimate<small>WORK TRACKER</small>
          </span>
        </div>
        <div className="nav">
          <button
            className={view === 'dashboard' ? 'active' : ''}
            onClick={() => {
              setView('dashboard');
              setSelected('All clients');
            }}
          >
            <LayoutDashboard size={18} /> Overview
          </button>
          <button className={view === 'tasks' ? 'active' : ''} onClick={() => setView('tasks')}>
            <ClipboardList size={18} /> All tasks
          </button>
          <button className={view === 'clients' ? 'active' : ''} onClick={() => setView('clients')}>
            <BriefcaseBusiness size={18} /> Clients
            {clients.length > 0 && <span className="navBadge">{clients.length}</span>}
          </button>
          <button className={view === 'logs' ? 'active' : ''} onClick={() => setView('logs')}>
            <History size={18} /> Recent changes
            {logs.length > 0 && <span className="navBadge">{logs.length}</span>}
          </button>
        </div>
        <div className="sideFoot">
          <div className="sheetBadge">
            <span className={`statusDot ${loading ? 'syncing' : 'online'}`} />
            {loading ? 'Syncing Sheets...' : 'Google Sheets Active'}
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="top">
          <div>
            <div className="eyebrow">WORK MANAGEMENT</div>
            <h1>
              {view === 'dashboard'
                ? 'Overview'
                : view === 'clients'
                ? 'Client Workspaces'
                : view === 'logs'
                ? 'Recent Changes & Activity'
                : selected === 'All clients'
                ? 'All Client Tasks'
                : `${selected} Tasks`}
            </h1>
            <p>Track client requests, recent works, and delivery deadlines synced with Google Sheets.</p>
          </div>
          <div className="actions">
            <span className="user">
              {loading ? (
                <span className="syncTag">
                  <Loader2 size={13} className="spin" /> Syncing with Google Sheets
                </span>
              ) : (
                `Synced (${clients.length} clients · ${tasks.length} requests)`
              )}
            </span>
            <button className="btn light" onClick={refresh} disabled={loading} title="Sync with Google Sheets">
              <RefreshCcw size={16} className={loading ? 'spin' : ''} /> {loading ? 'Syncing...' : 'Refresh'}
            </button>
          </div>
        </header>

        {loading && !initialLoading && (
          <div className="syncBanner">
            <RefreshCcw size={14} className="spin" /> Updating latest changes from Google Sheets...
          </div>
        )}

        {error && <div className="alert">{error}</div>}
        {notice && (
          <div className="notice" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{notice}</span>
            <button className="iconBtn" onClick={() => setNotice('')} title="Dismiss">
              <X size={14} />
            </button>
          </div>
        )}

        {initialLoading ? (
          <div className="initialLoader">
            <div className="loaderCard">
              <RefreshCcw size={36} className="spin loaderIcon" />
              <h3>Connecting to Google Sheets</h3>
              <p>Fetching client worksheets, task logs, and deadlines from your workbook...</p>
              <div className="loadingBarTrack">
                <div className="loadingBarIndeterminate" />
              </div>
            </div>
          </div>
        ) : (
          <>
            {view === 'dashboard' && (
              <>
                <section className="stats">
                  <div className="stat">
                    <span>Total requests</span>
                    <strong>{tasks.length}</strong>
                    <small>Across {clients.length} clients</small>
                  </div>
                  <div className="stat">
                    <span>Pending work</span>
                    <strong>{pending.length}</strong>
                    <small>Not marked completed</small>
                  </div>
                  <div className="stat">
                    <span>Overdue</span>
                    <strong className="red">{overdue.length}</strong>
                    <small>Past due date</small>
                  </div>
                  <div className="stat">
                    <span>Completed</span>
                    <strong className="green">{completed.length}</strong>
                    <small>Closed requests</small>
                  </div>
                </section>

                {/* Analytics Suite */}
                <div className="analyticsSection">
                  <div className="sectionHead" style={{ marginTop: 10, marginBottom: 14 }}>
                    <div>
                      <h2>Work Analytics & Distribution</h2>
                      <p className="muted">
                        Visual breakdown of request statuses, client workloads, and task classifications
                      </p>
                    </div>
                    <button
                      className="btn light btnSm"
                      onClick={() => setShowAnalytics(!showAnalytics)}
                    >
                      {showAnalytics ? 'Hide Graphs' : 'Show Graphs'}
                    </button>
                  </div>
                  {showAnalytics && <AnalyticsCharts tasks={tasks} clients={clients} />}
                </div>

                <div className="sectionHead">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                      <h2>{overviewTab === 'recent' ? 'Recent Works' : 'Priority & Overdue Work'}</h2>
                      <div className="tabPills">
                        <button
                          className={`tabPill ${overviewTab === 'recent' ? 'active' : ''}`}
                          onClick={() => setOverviewTab('recent')}
                        >
                          Recent Works ({recentWorks.length})
                        </button>
                        <button
                          className={`tabPill ${overviewTab === 'priority' ? 'active' : ''}`}
                          onClick={() => setOverviewTab('priority')}
                        >
                          Priority / Overdue ({priorityWorks.length})
                        </button>
                      </div>
                    </div>
                    <p className="muted">
                      {overviewTab === 'recent'
                        ? 'Latest requests recorded across all client worksheets, sorted by date'
                        : 'Overdue items and tasks requiring immediate attention'}
                    </p>
                  </div>
                  <button className="btn primary" onClick={() => openNew()}>
                    <Plus size={16} /> New task
                  </button>
                </div>

                <TaskTable
                  tasks={overviewTab === 'recent' ? recentWorks : priorityWorks}
                  onEdit={(t) => setEditing({ ...t })}
                />
              </>
            )}

            {view === 'clients' && (
              <>
                <div className="sectionHead">
                  <div>
                    <h2>Client Workspaces</h2>
                    <p className="muted">
                      Select a workspace to view and edit its tasks ({clients.length} total clients)
                    </p>
                  </div>
                </div>

                <div className="toolbar">
                  <label className="search">
                    <Search size={16} />
                    <input
                      placeholder="Search clients by name (e.g. Emipos, Bakery, Fashion)..."
                      value={clientQuery}
                      onChange={(e) => setClientQuery(e.target.value)}
                    />
                  </label>
                  {clientQuery && (
                    <button className="btn light" onClick={() => setClientQuery('')}>
                      Clear
                    </button>
                  )}
                  <span className="countBadge">
                    Showing {filteredClients.length} of {clients.length} clients
                  </span>
                </div>

                {filteredClients.length === 0 ? (
                  <div className="emptyState">
                    <BriefcaseBusiness size={40} className="mutedIcon" />
                    <h3>No clients matching &quot;{clientQuery}&quot;</h3>
                    <p>Check the spelling or clear your search to see all {clients.length} clients.</p>
                    <button className="btn light" onClick={() => setClientQuery('')}>
                      Reset search
                    </button>
                  </div>
                ) : (
                  <div className="clientGrid">
                    {filteredClients.map((c) => {
                      const clientTasks = tasks.filter((t) => t.client === c);
                      const clientPending = clientTasks.filter((t) => !isDone(t.status)).length;
                      return (
                        <button
                          key={c}
                          className="clientCard"
                          onClick={() => {
                            setSelected(c);
                            setView('tasks');
                          }}
                        >
                          <div className="clientCardTop">
                            <BriefcaseBusiness size={20} className="clientIcon" />
                            <span className={`clientBadge ${clientPending > 0 ? 'late' : 'done'}`}>
                              {clientPending} pending
                            </span>
                          </div>
                          <b>{c}</b>
                          <span>{clientTasks.length} total requests in sheet</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {view === 'tasks' && (
              <>
                <div className="sectionHead">
                  <h2>
                    Requests <span className="muted">({visible.length})</span>
                  </h2>
                  <button className="btn primary" onClick={() => openNew()}>
                    <Plus size={16} /> New task
                  </button>
                </div>

                <div className="toolbar">
                  <label className="search">
                    <Search size={16} />
                    <input
                      placeholder="Search by request description, client, type, assignee..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>

                  <select value={selected} onChange={(e) => setSelected(e.target.value)}>
                    <option>All clients</option>
                    {clients.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>

                  <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                    {['All', 'Listed', 'Progress', 'Done', 'Overdue'].map((f) => (
                      <option key={f} value={f}>
                        {f === 'All' ? 'All statuses' : f}
                      </option>
                    ))}
                  </select>

                  {/* Date Filter Group */}
                  <div className="dateFilterGroup">
                    <select
                      value={datePreset}
                      onChange={(e) => {
                        const val = e.target.value as typeof datePreset;
                        setDatePreset(val);
                        if (val !== 'custom') {
                          setStartDate('');
                          setEndDate('');
                        }
                      }}
                      title="Quick date filter"
                    >
                      <option value="all">All Dates</option>
                      <option value="today">Today</option>
                      <option value="7days">Last 7 Days</option>
                      <option value="30days">Last 30 Days</option>
                      <option value="thisMonth">This Month</option>
                      <option value="custom">Custom Range...</option>
                    </select>

                    {datePreset !== 'all' && (
                      <select
                        value={dateField}
                        onChange={(e) => setDateField(e.target.value as typeof dateField)}
                        className="dateFieldSelect"
                        title="Date field to filter by"
                      >
                        <option value="givenDate">By: Given Date</option>
                        <option value="dueDate">By: Due Date</option>
                        <option value="deliverDate">By: Delivered Date</option>
                      </select>
                    )}

                    {datePreset === 'custom' && (
                      <div className="customDateRange">
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          title="Start date"
                        />
                        <span className="dateSep">to</span>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          title="End date"
                        />
                      </div>
                    )}

                    {(datePreset !== 'all' || startDate || endDate) && (
                      <button
                        className="btn light btnSm"
                        onClick={() => {
                          setDatePreset('all');
                          setStartDate('');
                          setEndDate('');
                        }}
                        title="Reset date filter"
                      >
                        Reset Date
                      </button>
                    )}
                  </div>
                </div>

                <TaskTable tasks={visible} onEdit={(t) => setEditing({ ...t })} />
              </>
            )}

            {view === 'logs' && (
              <>
                <div className="sectionHead">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                      <h2>Recent Changes & Activity</h2>
                      <div className="tabPills">
                        <button
                          className={`tabPill ${logsTab === 'actions' ? 'active' : ''}`}
                          onClick={() => setLogsTab('actions')}
                        >
                          App Actions ({logs.length})
                        </button>
                        <button
                          className={`tabPill ${logsTab === 'sheetChanges' ? 'active' : ''}`}
                          onClick={() => setLogsTab('sheetChanges')}
                        >
                          Latest Sheet Requests ({recentWorks.length})
                        </button>
                      </div>
                    </div>
                    <p className="muted">
                      {logsTab === 'actions'
                        ? 'Audit trail of recent create, edit, delete, and sync actions'
                        : 'Recent work entries recorded across your Google Sheet worksheets'}
                    </p>
                  </div>
                  {logsTab === 'actions' && logs.length > 0 && (
                    <button className="btn light btnSm" onClick={clearLogs} title="Clear action history">
                      Clear log history
                    </button>
                  )}
                </div>

                {logsTab === 'actions' ? (
                  <>
                    <div className="toolbar">
                      <label className="search">
                        <Search size={16} />
                        <input
                          placeholder="Search activity by client or description..."
                          value={logSearch}
                          onChange={(e) => setLogSearch(e.target.value)}
                        />
                      </label>
                      <select
                        value={logFilter}
                        onChange={(e) => setLogFilter(e.target.value as typeof logFilter)}
                      >
                        <option value="all">All Events</option>
                        <option value="create">Created Tasks</option>
                        <option value="update">Updated Tasks</option>
                        <option value="delete">Deleted Tasks</option>
                        <option value="sync">Sync Events</option>
                      </select>
                      <span className="countBadge">
                        {filteredLogs.length} logged events
                      </span>
                    </div>

                    {filteredLogs.length === 0 ? (
                      <div className="emptyState">
                        <History size={40} className="mutedIcon" />
                        <h3>No activity logs found</h3>
                        <p>Actions you perform (saving, creating, deleting, and syncing tasks) will be logged here.</p>
                        {logs.length === 0 && (
                          <p style={{ marginTop: 8 }}>
                            You can also view the <strong>Latest Sheet Requests</strong> tab to see recent records from your Google Sheet.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="logTimeline">
                        {filteredLogs.map((log) => (
                          <div key={log.id} className="logCard">
                            <div className={`logIconCol ${log.action}`}>
                              {log.action === 'create' && <Plus size={18} />}
                              {log.action === 'update' && <FileEdit size={18} />}
                              {log.action === 'delete' && <Trash2 size={18} />}
                              {log.action === 'sync' && <RefreshCcw size={18} />}
                            </div>
                            <div className="logBody">
                              <div className="logHeader">
                                <div className="logBadgeGroup">
                                  <span className={`logTag ${log.action}`}>
                                    {log.action === 'create'
                                      ? 'Task Created'
                                      : log.action === 'update'
                                      ? 'Task Updated'
                                      : log.action === 'delete'
                                      ? 'Task Deleted'
                                      : 'Sheets Synced'}
                                  </span>
                                  <span className="clientTag">{log.client}</span>
                                </div>
                                <span className="logTime">
                                  <Clock size={12} /> {formatTimeAgo(log.timestamp)}
                                </span>
                              </div>
                              <p className="logDescription">{log.change}</p>
                              <div className="logMeta">
                                {log.type && (
                                  <span className="logMetaItem">
                                    Type: <strong>{log.type}</strong>
                                  </span>
                                )}
                                {log.status && (
                                  <span className="logMetaItem">
                                    Status: <strong>{log.status}</strong>
                                  </span>
                                )}
                                <span className="logMetaItem">
                                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(log.timestamp).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <TaskTable tasks={recentWorks} onEdit={(t) => setEditing({ ...t })} />
                )}
              </>
            )}
          </>
        )}

        {editing && (
          <div className="overlay">
            <div className="modal">
              <div className="modalHead">
                <div>
                  <h2>{editing.row ? 'Edit Request' : 'New Request'}</h2>
                  <small className="muted">
                    {editing.row ? `Row ${editing.row} in tab: ${editing.client}` : `Adding to tab: ${editing.client}`}
                  </small>
                </div>
                <button className="iconBtn" onClick={() => setEditing(null)}>
                  <X />
                </button>
              </div>

              <div className="fields">
                <label>
                  Client Worksheet
                  <select
                    disabled={!!editing.row}
                    value={editing.client}
                    onChange={(e) => setEditing({ ...editing, client: e.target.value })}
                  >
                    {clients.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Task Type
                  <select
                    value={editing.type || 'Change'}
                    onChange={(e) => setEditing({ ...editing, type: e.target.value })}
                  >
                    {['Bug', 'Task', 'Change'].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                    {editing.type && !['Bug', 'Task', 'Change'].includes(editing.type) && (
                      <option value={editing.type}>{editing.type}</option>
                    )}
                  </select>
                </label>

                <label className="wide">
                  Change / Task Description
                  <textarea
                    rows={3}
                    placeholder="Describe the requested work or issue..."
                    value={editing.change}
                    onChange={(e) => setEditing({ ...editing, change: e.target.value })}
                  />
                </label>

                <label>
                  Status
                  <select
                    value={editing.status || 'Listed'}
                    onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                  >
                    {['Done', 'Progress', 'Listed'].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                    {editing.status && !['Done', 'Progress', 'Listed'].includes(editing.status) && (
                      <option value={editing.status}>{editing.status}</option>
                    )}
                  </select>
                </label>

                <div className="checkboxField">
                  <label className="checkboxLabel">
                    <input
                      type="checkbox"
                      checked={isApproved(editing.approval)}
                      onChange={(e) =>
                        setEditing({ ...editing, approval: e.target.checked ? 'TRUE' : 'FALSE' })
                      }
                    />
                    <span>Approved</span>
                  </label>
                </div>

                <label>
                  Assignee
                  <input
                    placeholder="Team member name"
                    value={editing.assignee}
                    onChange={(e) => setEditing({ ...editing, assignee: e.target.value })}
                  />
                </label>

                <label>
                  Given Date
                  <input
                    type="date"
                    value={normalizeDate(editing.givenDate)}
                    onChange={(e) => setEditing({ ...editing, givenDate: e.target.value })}
                  />
                </label>

                <label>
                  Due Date
                  <input
                    type="date"
                    value={normalizeDate(editing.dueDate)}
                    onChange={(e) => setEditing({ ...editing, dueDate: e.target.value })}
                  />
                </label>

                <label>
                  Delivered Date
                  <input
                    type="date"
                    value={normalizeDate(editing.deliverDate)}
                    onChange={(e) => setEditing({ ...editing, deliverDate: e.target.value })}
                  />
                </label>
              </div>

              <div className="modalActions">
                {editing.row && (
                  <button className="btn light btnDanger" onClick={remove} disabled={loading}>
                    Delete task
                  </button>
                )}
                <button className="btn light" onClick={() => setEditing(null)}>
                  Cancel
                </button>
                <button
                  className="btn primary"
                  onClick={save}
                  disabled={loading || !editing.change.trim()}
                >
                  <Save size={16} className={loading ? 'spin' : ''} />
                  {loading ? 'Saving to Google Sheets...' : 'Save to Google Sheets'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function TaskTable({ tasks, onEdit }: { tasks: Task[]; onEdit: (t: Task) => void }) {
  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            <th>Request</th>
            <th>Client</th>
            <th>Type</th>
            <th>Status</th>
            <th>Approval</th>
            <th>Given date</th>
            <th>Due date</th>
            <th>Assignee</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id}>
              <td className="taskTitle">{t.change}</td>
              <td>
                <span className="clientTag">{t.client}</span>
              </td>
              <td>
                <span className={`typeBadge ${(t.type || 'change').toLowerCase()}`}>
                  {t.type || 'Change'}
                </span>
              </td>
              <td>{getStatusPill(t.status, isOverdue(t))}</td>
              <td>
                {isApproved(t.approval) ? (
                  <span className="pill done" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={12} /> Approved
                  </span>
                ) : (
                  <span className="pill listed" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} /> Pending
                  </span>
                )}
              </td>
              <td>{formatDisplayDate(t.givenDate)}</td>
              <td className={isOverdue(t) ? 'red fontBold' : ''}>{formatDisplayDate(t.dueDate)}</td>
              <td>{t.assignee || '—'}</td>
              <td>
                <button className="link" onClick={() => onEdit(t)}>
                  Edit
                </button>
              </td>
            </tr>
          ))}
          {!tasks.length && (
            <tr>
              <td colSpan={9} className="empty">
                No requests found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
